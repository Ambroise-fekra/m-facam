import { Injectable, inject } from '@angular/core';
import { ModalController } from '@ionic/angular/standalone';

/**
 * Lets the user pick an image and returns a resized JPEG data URL — small
 * enough to store inline in the DB (no file server needed).
 *
 *  - `pick()`         : just resize (kept for backward compatibility).
 *  - `pickCropped()`  : open a modal to let the user pan/zoom and **crop** a
 *                       square area (round preview) — what you want for the
 *                       circular avatars and the family logo.
 */
@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly modalCtrl = inject(ModalController);

  /** Pick a new image and open the crop modal. */
  async pickCropped(maxSize = 256, quality = 85): Promise<string | null> {
    const file = await this.pickFile();
    if (!file) return null;
    let base64: string;
    try {
      base64 = await this.fileToDataUrl(file);
    } catch {
      return null;
    }
    return this.openCropper(base64, maxSize, quality);
  }

  /** Re-crop a photo that's already been picked/saved (no new file dialog). */
  async cropExisting(imageBase64: string, maxSize = 256, quality = 85): Promise<string | null> {
    if (!imageBase64) return null;
    return this.openCropper(imageBase64, maxSize, quality);
  }

  private async openCropper(base64: string, maxSize: number, quality: number): Promise<string | null> {
    // Lazy-import the modal page to keep it out of the initial bundle.
    const { PhotoCropPage } = await import('../../pages/photo-crop/photo-crop.page');
    const modal = await this.modalCtrl.create({
      component: PhotoCropPage,
      componentProps: { imageBase64: base64, resizeToWidth: maxSize, quality },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<string>();
    if (role !== 'confirm' || !data) return null;
    return data;
  }

  /** Original behaviour: just resize the picked image (no crop). */
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

  private pickFile(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
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
