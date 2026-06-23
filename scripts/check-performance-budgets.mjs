import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const root = process.cwd();
const assets = path.join(root, "apps/web/dist/assets");
const limits = { javascriptGzipBytes: 160_000, cssGzipBytes: 16_000 };
if (!existsSync(assets)) {
  console.error(
    "Performance budget check requires a web build at apps/web/dist. Run pnpm build first.",
  );
  process.exit(1);
}
const measurements = readdirSync(assets)
  .map((entry) => path.join(assets, entry))
  .filter((entry) => statSync(entry).isFile())
  .map((entry) => ({
    extension: path.extname(entry),
    gzipBytes: gzipSync(readFileSync(entry)).byteLength,
  }));
const javascriptGzipBytes = measurements
  .filter((item) => item.extension === ".js")
  .reduce((total, item) => total + item.gzipBytes, 0);
const cssGzipBytes = measurements
  .filter((item) => item.extension === ".css")
  .reduce((total, item) => total + item.gzipBytes, 0);
const failures = [];
if (javascriptGzipBytes > limits.javascriptGzipBytes)
  failures.push(`web JavaScript gzip ${javascriptGzipBytes} exceeds ${limits.javascriptGzipBytes}`);
if (cssGzipBytes > limits.cssGzipBytes)
  failures.push(`web CSS gzip ${cssGzipBytes} exceeds ${limits.cssGzipBytes}`);
if (failures.length > 0) {
  console.error("Performance budget check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(
  `Performance budgets passed: web JavaScript ${javascriptGzipBytes} B gzip, web CSS ${cssGzipBytes} B gzip.`,
);
