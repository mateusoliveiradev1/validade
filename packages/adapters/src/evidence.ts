export type EvidenceStoreBody =
  | ReadableStream<Uint8Array>
  | ArrayBuffer
  | Uint8Array
  | Blob
  | string;

export interface EvidenceStoreObjectMetadata {
  sizeBytes: number;
  mimeType: string;
  sha256: string;
  uploadedAt: string;
}

export interface EvidenceStoreObject extends EvidenceStoreObjectMetadata {
  body: ReadableStream<Uint8Array>;
}

export interface EvidenceStore {
  put(input: {
    objectKey: string;
    body: EvidenceStoreBody;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  }): Promise<EvidenceStoreObjectMetadata>;
  head(objectKey: string): Promise<EvidenceStoreObjectMetadata | undefined>;
  get(objectKey: string): Promise<EvidenceStoreObject | undefined>;
  delete(objectKey: string): Promise<void>;
}

export interface InMemoryEvidenceStore extends EvidenceStore {
  putCount(): number;
}

interface R2ObjectLike {
  size: number;
  uploaded: Date;
  httpMetadata?: { contentType?: string | undefined } | undefined;
  customMetadata?: Record<string, string> | undefined;
}

interface R2ObjectBodyLike extends R2ObjectLike {
  body: ReadableStream<Uint8Array>;
}

export interface R2BucketLike {
  put(
    key: string,
    body: EvidenceStoreBody,
    options: {
      httpMetadata: { contentType: string };
      customMetadata: { sha256: string };
      sha256: string;
    },
  ): Promise<R2ObjectLike | null>;
  head(key: string): Promise<R2ObjectLike | null>;
  get(key: string): Promise<R2ObjectBodyLike | null>;
  delete(key: string): Promise<void>;
}

export function createInMemoryEvidenceStore(): InMemoryEvidenceStore {
  const objects = new Map<string, EvidenceStoreObjectMetadata & { bytes: Uint8Array }>();
  let writes = 0;

  return {
    async put(input) {
      const bytes = await bodyToBytes(input.body);
      const sha256 = await sha256Hex(bytes);

      if (bytes.byteLength !== input.sizeBytes || sha256 !== input.sha256.toLowerCase()) {
        throw new Error("Evidence body failed size or SHA-256 verification.");
      }

      const existing = objects.get(input.objectKey);

      if (existing !== undefined) {
        if (existing.sha256 !== sha256 || existing.sizeBytes !== bytes.byteLength) {
          throw new Error("Evidence object key already contains different content.");
        }

        return withoutBytes(existing);
      }

      writes += 1;
      const stored = {
        bytes,
        sizeBytes: bytes.byteLength,
        mimeType: input.mimeType,
        sha256,
        uploadedAt: new Date().toISOString(),
      };
      objects.set(input.objectKey, stored);

      return withoutBytes(stored);
    },
    head(objectKey) {
      const stored = objects.get(objectKey);

      return Promise.resolve(stored === undefined ? undefined : withoutBytes(stored));
    },
    get(objectKey) {
      const stored = objects.get(objectKey);

      if (stored === undefined) {
        return Promise.resolve(undefined);
      }

      return Promise.resolve({
        ...withoutBytes(stored),
        body: bytesToStream(stored.bytes),
      });
    },
    delete(objectKey) {
      objects.delete(objectKey);
      return Promise.resolve();
    },
    putCount() {
      return writes;
    },
  };
}

export function createR2EvidenceStore(bucket: R2BucketLike): EvidenceStore {
  return {
    async put(input) {
      const stored = await bucket.put(input.objectKey, input.body, {
        httpMetadata: { contentType: input.mimeType },
        customMetadata: { sha256: input.sha256 },
        sha256: input.sha256,
      });

      if (stored === null) {
        throw new Error("Private evidence store did not acknowledge the upload.");
      }

      return mapR2Metadata(stored);
    },
    async head(objectKey) {
      const stored = await bucket.head(objectKey);

      return stored === null ? undefined : mapR2Metadata(stored);
    },
    async get(objectKey) {
      const stored = await bucket.get(objectKey);

      return stored === null ? undefined : { ...mapR2Metadata(stored), body: stored.body };
    },
    delete(objectKey) {
      return bucket.delete(objectKey);
    },
  };
}

function mapR2Metadata(object: R2ObjectLike): EvidenceStoreObjectMetadata {
  const sha256 = object.customMetadata?.sha256;
  const mimeType = object.httpMetadata?.contentType;

  if (sha256 === undefined || mimeType === undefined) {
    throw new Error("Private evidence object is missing verified metadata.");
  }

  return {
    sizeBytes: object.size,
    mimeType,
    sha256,
    uploadedAt: object.uploaded.toISOString(),
  };
}

async function bodyToBytes(body: EvidenceStoreBody): Promise<Uint8Array> {
  if (body instanceof Uint8Array) {
    return body;
  }

  if (body instanceof ArrayBuffer) {
    return new Uint8Array(body);
  }

  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }

  if (body instanceof Blob) {
    return new Uint8Array(await body.arrayBuffer());
  }

  return new Uint8Array(await new Response(body).arrayBuffer());
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes));

  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(toArrayBuffer(bytes)));
      controller.close();
    },
  });
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function withoutBytes(
  stored: EvidenceStoreObjectMetadata & { bytes: Uint8Array },
): EvidenceStoreObjectMetadata {
  return {
    sizeBytes: stored.sizeBytes,
    mimeType: stored.mimeType,
    sha256: stored.sha256,
    uploadedAt: stored.uploadedAt,
  };
}
