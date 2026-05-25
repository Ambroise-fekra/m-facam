import { Injectable } from '@angular/core';

/**
 * Lets the user pick an image and returns a small, resized JPEG data URL —
 * small enough to store inline in the DB (no file server needed).
 */
@Injectable({ providedIn: 'root' })
export class ImageService {
  /** Opens the file picker and resolves a resized data URL (or null if cancelled). */
  pick(maxSize = 256, quality = 0.8): Promise<string | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        try {
          resolve(await this.resize(file, maxSize, quality));
        } catch {
          resolve(null);
        }
      };
      input.click();
    });
  }

  private resize(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('no canvas'));
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
