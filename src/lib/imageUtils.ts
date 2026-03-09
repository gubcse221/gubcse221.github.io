export async function compressImage(
  file: File,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        // No resizing, use original dimensions after potential crop
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, img.width, img.height);
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

export async function cropImage(
  file: File,
  cropX: number,
  cropY: number,
  cropWidth: number,
  cropHeight: number,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = cropWidth;
        canvas.height = cropHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          cropWidth,
          cropHeight
        );

        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

export function getBase64Size(base64: string): number {
  const base64String = base64.split(',')[1];
  const binaryString = atob(base64String);
  return binaryString.length;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
