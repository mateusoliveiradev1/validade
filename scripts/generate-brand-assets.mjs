import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const assetDirectory = resolve(root, "apps/mobile/assets");
const appConfigPath = resolve(root, "apps/mobile/app.json");
const easConfigPath = resolve(root, "apps/mobile/eas.json");
const colors = {
  field: [22, 101, 52, 255],
  mark: [255, 255, 255, 255],
};

const assets = [
  { filename: "icon.png", width: 1024, height: 1024, variant: "icon" },
  { filename: "adaptive-icon.png", width: 1024, height: 1024, variant: "adaptive" },
  { filename: "splash.png", width: 1242, height: 2688, variant: "splash" },
];

const pixelFont = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
};

function setPixel(pixels, width, height, x, y, color) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const offset = (y * width + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

function drawDisc(pixels, width, height, centerX, centerY, radius, color) {
  const squaredRadius = radius * radius;
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distanceX = x - centerX;
      const distanceY = y - centerY;
      if (distanceX * distanceX + distanceY * distanceY <= squaredRadius) {
        setPixel(pixels, width, height, x, y, color);
      }
    }
  }
}

function drawRing(pixels, width, height, centerX, centerY, radius, thickness, color) {
  const outerSquared = radius * radius;
  const innerRadius = radius - thickness;
  const innerSquared = innerRadius * innerRadius;
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distanceX = x - centerX;
      const distanceY = y - centerY;
      const distanceSquared = distanceX * distanceX + distanceY * distanceY;
      if (distanceSquared <= outerSquared && distanceSquared >= innerSquared) {
        setPixel(pixels, width, height, x, y, color);
      }
    }
  }
}

function drawLine(pixels, width, height, startX, startY, endX, endY, thickness, color) {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY));
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    drawDisc(
      pixels,
      width,
      height,
      Math.round(startX + (endX - startX) * progress),
      Math.round(startY + (endY - startY) * progress),
      thickness / 2,
      color,
    );
  }
}

function drawSeal(pixels, width, height, centerX, centerY, radius) {
  const ringThickness = Math.max(10, Math.round(radius * 0.055));
  drawRing(pixels, width, height, centerX, centerY, radius, ringThickness, colors.mark);
  drawRing(
    pixels,
    width,
    height,
    centerX,
    centerY,
    Math.round(radius * 0.78),
    ringThickness,
    colors.mark,
  );

  const dotDistance = Math.round(radius * 0.9);
  const dotRadius = Math.max(8, Math.round(radius * 0.045));
  drawDisc(pixels, width, height, centerX, centerY - dotDistance, dotRadius, colors.mark);
  drawDisc(pixels, width, height, centerX + dotDistance, centerY, dotRadius, colors.mark);
  drawDisc(pixels, width, height, centerX, centerY + dotDistance, dotRadius, colors.mark);
  drawDisc(pixels, width, height, centerX - dotDistance, centerY, dotRadius, colors.mark);

  const markThickness = Math.max(18, Math.round(radius * 0.1));
  const topY = centerY - Math.round(radius * 0.3);
  const bottomY = centerY + Math.round(radius * 0.34);
  const leftX = centerX - Math.round(radius * 0.52);
  const middleX = centerX - Math.round(radius * 0.23);
  const rightX = centerX + Math.round(radius * 0.05);
  drawLine(pixels, width, height, leftX, topY, middleX, bottomY, markThickness, colors.mark);
  drawLine(pixels, width, height, middleX, bottomY, rightX, topY, markThickness, colors.mark);

  const zLeft = centerX + Math.round(radius * 0.14);
  const zRight = centerX + Math.round(radius * 0.55);
  drawLine(pixels, width, height, zLeft, topY, zRight, topY, markThickness, colors.mark);
  drawLine(pixels, width, height, zRight, topY, zLeft, bottomY, markThickness, colors.mark);
  drawLine(pixels, width, height, zLeft, bottomY, zRight, bottomY, markThickness, colors.mark);
}

function drawText(pixels, width, height, value, centerX, topY, scale) {
  const glyphWidth = 5 * scale;
  const glyphGap = 2 * scale;
  const textWidth = value.length * (glyphWidth + glyphGap) - glyphGap;
  let leftX = Math.round(centerX - textWidth / 2);

  for (const character of value) {
    if (character === " ") {
      leftX += glyphWidth + glyphGap;
      continue;
    }

    const glyph = pixelFont[character];
    if (glyph === undefined) throw new Error(`Unsupported brand glyph: ${character}`);
    glyph.forEach((row, rowIndex) => {
      [...row].forEach((enabled, columnIndex) => {
        if (enabled !== "1") return;
        for (let vertical = 0; vertical < scale; vertical += 1) {
          for (let horizontal = 0; horizontal < scale; horizontal += 1) {
            setPixel(
              pixels,
              width,
              height,
              leftX + columnIndex * scale + horizontal,
              topY + rowIndex * scale + vertical,
              colors.mark,
            );
          }
        }
      });
    });
    leftX += glyphWidth + glyphGap;
  }
}

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const chunkType = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([chunkType, data])));
  return Buffer.concat([length, chunkType, data, checksum]);
}

function encodePng(width, height, pixels) {
  const scanlines = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const targetOffset = y * (width * 4 + 1);
    scanlines[targetOffset] = 0;
    pixels.copy(scanlines, targetOffset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderAsset({ width, height, variant }) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = colors.field[0];
    pixels[offset + 1] = colors.field[1];
    pixels[offset + 2] = colors.field[2];
    pixels[offset + 3] = colors.field[3];
  }

  const centerX = Math.round(width / 2);
  const centerY = variant === "splash" ? Math.round(height * 0.41) : Math.round(height / 2);
  const radius = variant === "splash" ? Math.round(width * 0.27) : Math.round(width * 0.35);
  drawSeal(pixels, width, height, centerX, centerY, radius);

  if (variant === "splash") {
    drawText(pixels, width, height, "OPERACAO DE RISCO ZERO", centerX, centerY + radius + 108, 7);
  }

  return encodePng(width, height, pixels);
}

function readPngInfo(path) {
  const content = readFileSync(path);
  const signature = "89504e470d0a1a0a";
  if (content.subarray(0, 8).toString("hex") !== signature)
    throw new Error(`${path} is not a PNG.`);

  const types = [];
  let offset = 8;
  while (offset < content.length) {
    const length = content.readUInt32BE(offset);
    const type = content.subarray(offset + 4, offset + 8).toString("ascii");
    types.push(type);
    offset += 12 + length;
  }

  return {
    width: content.readUInt32BE(16),
    height: content.readUInt32BE(20),
    types,
  };
}

function checkAssets() {
  for (const asset of assets) {
    const path = resolve(assetDirectory, asset.filename);
    if (!existsSync(path)) throw new Error(`Missing generated brand asset: ${asset.filename}`);
    const info = readPngInfo(path);
    if (info.width !== asset.width || info.height !== asset.height) {
      throw new Error(`Unexpected dimensions for ${asset.filename}: ${info.width}x${info.height}`);
    }
    if (info.types.some((type) => !["IHDR", "IDAT", "IEND"].includes(type))) {
      throw new Error(`${asset.filename} contains unsupported metadata chunks.`);
    }
  }

  const appConfig = JSON.parse(readFileSync(appConfigPath, "utf8"));
  const expo = appConfig.expo ?? {};
  if (
    expo.icon !== "./assets/icon.png" ||
    expo.splash?.image !== "./assets/splash.png" ||
    expo.android?.adaptiveIcon?.foregroundImage !== "./assets/adaptive-icon.png"
  ) {
    throw new Error("Expo config does not reference the generated Validade Zero assets.");
  }

  const easConfig = JSON.parse(readFileSync(easConfigPath, "utf8"));
  const profile = easConfig.build?.pilot;
  if (profile?.distribution !== "internal" || profile?.android?.buildType !== "apk") {
    throw new Error("EAS pilot profile must produce an internal Android APK.");
  }
}

if (process.argv.includes("--check")) {
  checkAssets();
  console.log("Validade Zero brand assets and pilot config are valid.");
} else {
  mkdirSync(assetDirectory, { recursive: true });
  for (const asset of assets) {
    const path = resolve(assetDirectory, asset.filename);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, renderAsset(asset));
  }
  checkAssets();
  console.log("Generated deterministic Validade Zero Android brand assets.");
}
