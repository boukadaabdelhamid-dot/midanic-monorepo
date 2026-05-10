import { Storage } from "@google-cloud/storage";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export type { ObjectAclPolicy, ObjectPermission } from "./objectAcl";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface StorageFile {
  exists(): Promise<[boolean]>;
  createReadStream(): NodeJS.ReadableStream;
  getMetadata(): Promise<[{ contentType?: string; size?: number | string }]>;
  save(buffer: Buffer, options: { contentType: string; resumable?: boolean }): Promise<void>;
}

class LocalFile implements StorageFile {
  constructor(
    private readonly filePath: string,
    private readonly contentType: string = "application/octet-stream",
  ) {}

  async exists(): Promise<[boolean]> {
    try {
      await fsPromises.access(this.filePath);
      return [true];
    } catch {
      return [false];
    }
  }

  createReadStream(): NodeJS.ReadableStream {
    return fs.createReadStream(this.filePath);
  }

  async getMetadata(): Promise<[{ contentType?: string; size?: number | string }]> {
    const stat = await fsPromises.stat(this.filePath);
    return [{ contentType: this.contentType, size: stat.size }];
  }

  async save(buffer: Buffer, options: { contentType: string }): Promise<void> {
    await fsPromises.mkdir(path.dirname(this.filePath), { recursive: true });
    await fsPromises.writeFile(this.filePath, buffer);
    this._contentType = options.contentType;
  }

  private _contentType = "application/octet-stream";
}

type StorageMode = "gcs" | "replit" | "local";

function detectStorageMode(): StorageMode {
  if (process.env.GOOGLE_CREDENTIALS_JSON) return "gcs";
  if (process.env.REPL_ID || process.env.REPLIT_DEV_DOMAIN) return "replit";
  if (process.env.STORAGE_LOCAL_PATH) return "local";
  throw new Error(
    "Object storage is not configured. Set one of:\n" +
    "  GOOGLE_CREDENTIALS_JSON — GCS service account JSON (recommended for production)\n" +
    "  STORAGE_LOCAL_PATH — absolute directory path for Railway Volume or similar persistent disk\n" +
    "Without it, /api/uploads and image serving endpoints will be unavailable."
  );
}

let _mode: StorageMode | undefined;
let _gcsClient: Storage | undefined;

function getMode(): StorageMode {
  if (!_mode) _mode = detectStorageMode();
  return _mode;
}

function getGcsClient(): Storage {
  if (!_gcsClient) {
    const mode = getMode();
    if (mode === "gcs") {
      const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON!) as object;
      _gcsClient = new Storage({ credentials });
    } else if (mode === "replit") {
      _gcsClient = new Storage({
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      });
    } else {
      throw new Error("GCS client not available in local storage mode");
    }
  }
  return _gcsClient;
}

function getLocalBasePath(): string {
  return process.env.STORAGE_LOCAL_PATH!;
}

function parseObjectPath(p: string): { bucketName: string; objectName: string } {
  if (!p.startsWith("/")) p = `/${p}`;
  const parts = p.split("/");
  if (parts.length < 3) throw new Error("Invalid path: must contain at least a bucket name");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const mode = getMode();
  if (mode === "gcs") {
    const file = getGcsClient().bucket(bucketName).file(objectName);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: method === "PUT" ? "write" : method === "DELETE" ? "delete" : "read",
      expires: Date.now() + ttlSec * 1000,
    });
    return url;
  }
  if (mode === "replit") {
    const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method,
        expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Failed to sign object URL: ${response.status}`);
    const json = await response.json() as { signed_url: string };
    return json.signed_url;
  }
  throw new Error("Signed URLs are not supported in local storage mode; use the /api/uploads/:id endpoint directly.");
}

export class ObjectStorageService {
  getPublicObjectSearchPaths(): string[] {
    const mode = getMode();
    if (mode === "local") return [getLocalBasePath() + "/public"];
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(pathsStr.split(",").map(p => p.trim()).filter(p => p.length > 0))
    );
    if (paths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set.");
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const mode = getMode();
    if (mode === "local") return getLocalBasePath() + "/private";
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set.");
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<StorageFile | null> {
    const mode = getMode();
    if (mode === "local") {
      const base = getLocalBasePath() + "/public";
      const fullPath = path.join(base, filePath);
      const f = new LocalFile(fullPath);
      const [exists] = await f.exists();
      return exists ? f : null;
    }
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = getGcsClient().bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) return file as unknown as StorageFile;
    }
    return null;
  }

  async downloadObject(file: StorageFile, cacheTtlSec: number = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (metadata.size) headers["Content-Length"] = String(metadata.size);
    return new Response(webStream, { headers });
  }

  async uploadBuffer(
    buffer: Buffer,
    contentType: string,
  ): Promise<{ objectPath: string; publicUrl: string }> {
    const objectId = randomUUID();
    const mode = getMode();
    if (mode === "local") {
      const base = getLocalBasePath();
      const filePath = path.join(base, "private", "uploads", objectId);
      const f = new LocalFile(filePath, contentType);
      await f.save(buffer, { contentType });
      const objectPath = `/objects/uploads/${objectId}`;
      const publicUrl = `/api/uploads/${objectId}`;
      return { objectPath, publicUrl };
    }
    const privateObjectDir = this.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = getGcsClient().bucket(bucketName);
    const file = bucket.file(objectName);
    await file.save(buffer, { contentType, resumable: false });
    const objectPath = `/objects/uploads/${objectId}`;
    const publicUrl = `/api/uploads/${objectId}`;
    return { objectPath, publicUrl };
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    const mode = getMode();
    if (mode === "local") {
      throw new Error("Signed upload URLs are not supported in local mode; use POST /api/uploads instead.");
    }
    const privateObjectDir = this.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) objectEntityDir = `${objectEntityDir}/`;
    if (!rawObjectPath.startsWith(objectEntityDir)) return rawObjectPath;
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async getObjectEntityFile(objectPath: string): Promise<StorageFile> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();
    const entityId = parts.slice(1).join("/");
    const mode = getMode();
    if (mode === "local") {
      const base = getLocalBasePath();
      const filePath = path.join(base, "private", entityId);
      const f = new LocalFile(filePath);
      const [exists] = await f.exists();
      if (!exists) throw new ObjectNotFoundError();
      return f;
    }
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = getGcsClient().bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile as unknown as StorageFile;
  }
}
