/**
 * Compresses an image file client-side using a canvas element.
 * Resizes the image to fit within maxWidth/maxHeight (maintaining aspect ratio)
 * and outputs a base64 encoded JPEG string with the specified quality.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If we're on the server, skip compression
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio resizing
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // If canvas context fails, fall back to the original base64 URL
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => {
        reject(err);
      };
    };
    reader.onerror = (err) => {
      reject(err);
    };
  });
}

/**
 * Transforms image sharing URLs (like Google Drive or Dropbox) into direct, renderable image URLs.
 */
export function transformImageUrl(url: string): string {
  if (!url) return '';

  let processedUrl = url.trim();

  // Auto-prepend https:// if protocol is missing for common sharing domains
  if (
    (processedUrl.startsWith('drive.google.com') ||
     processedUrl.startsWith('docs.google.com') ||
     processedUrl.startsWith('dropbox.com') ||
     processedUrl.startsWith('www.dropbox.com')) &&
    !processedUrl.startsWith('http://') &&
    !processedUrl.startsWith('https://')
  ) {
    processedUrl = 'https://' + processedUrl;
  }

  // Check if it's a Google Drive link
  if (processedUrl.includes('drive.google.com') || processedUrl.includes('docs.google.com')) {
    let fileId = '';

    // Match Pattern 1: /file/d/FILE_ID/view...
    const pathMatch = processedUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (pathMatch && pathMatch[1]) {
      fileId = pathMatch[1];
    } else {
      // Match Pattern 2: ?id=FILE_ID or &id=FILE_ID
      const paramMatch = processedUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (paramMatch && paramMatch[1]) {
        fileId = paramMatch[1];
      }
    }

    if (fileId) {
      // Using drive.google.com/thumbnail endpoint is fast and extremely reliable for embedding in standard <img> tags
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
    }
  }

  // Check if it's a Dropbox link
  if (processedUrl.includes('dropbox.com')) {
    // Convert sharing link to direct download link
    // e.g. https://www.dropbox.com/s/abc/xyz.jpg?dl=0 -> https://dl.dropboxusercontent.com/s/abc/xyz.jpg
    return processedUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '').replace('?dl=1', '');
  }

  return processedUrl;
}
