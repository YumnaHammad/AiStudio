import { saveLocalMedia } from './local-media.js';
import { isObjectStorageConfigured, uploadObject } from './object-storage.js';

/** Save to local disk (worker/renderer) and mirror to R2 when configured. */
export async function persistMedia(
  relativePath: string,
  data: Buffer,
  contentType: string,
): Promise<void> {
  saveLocalMedia(relativePath, data);
  if (isObjectStorageConfigured()) {
    await uploadObject(relativePath, data, contentType);
  }
}
