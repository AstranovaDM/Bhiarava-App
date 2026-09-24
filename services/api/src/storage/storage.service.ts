import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';

export interface StoredObject {
  key: string;
  bucket: string;
  etag?: string;
}

/** S3/MinIO abstraction — local stub stores metadata only; Wave 2 wires AWS SDK. */
@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  get bucket() {
    return this.config.get('S3_BUCKET') || 'bhairava';
  }

  get endpoint() {
    return this.config.get('S3_ENDPOINT') || 'http://localhost:9000';
  }

  buildKey(orgId: string, folder: string, filename: string) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${orgId}/${folder}/${randomUUID()}-${safe}`;
  }

  /** Presign stub — returns a local-dev placeholder URL. */
  async getUploadUrl(key: string, contentType: string) {
    const token = createHash('sha256').update(key + contentType).digest('hex').slice(0, 16);
    return {
      uploadUrl: `${this.endpoint}/${this.bucket}/${key}?uploadToken=${token}`,
      key,
      bucket: this.bucket,
      method: 'PUT',
      headers: { 'Content-Type': contentType },
    };
  }

  async getDownloadUrl(key: string) {
    return {
      downloadUrl: `${this.endpoint}/${this.bucket}/${key}`,
      key,
      bucket: this.bucket,
    };
  }
}
