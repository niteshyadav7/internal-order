import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a base64 (data URL) image to Firebase Storage and returns the public download URL.
 * Falls back to the base64 string if Firebase Storage is not initialized.
 */
export async function uploadImageToStorage(base64Data: string, filename: string): Promise<string> {
  if (!storage) {
    console.warn("Firebase Storage is not initialized. Falling back to inline base64.");
    return base64Data;
  }

  try {
    // Sanitize filename to avoid folder path issues or special character problems
    const safeFilename = filename.trim().replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const path = `products/${Date.now()}_${safeFilename}`;
    const storageRef = ref(storage, path);

    // uploadString in 'data_url' format automatically parses base64 data URLs
    await uploadString(storageRef, base64Data, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.error("Firebase Storage upload error:", err);
    throw err;
  }
}
