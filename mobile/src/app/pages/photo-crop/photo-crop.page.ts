import { CommonModule } from '@angular/common';
import { Component, Input, ViewChild, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonRange,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import {
  ImageCropperComponent,
  ImageCroppedEvent,
  ImageTransform,
} from 'ngx-image-cropper';

/**
 * Modal page that lets the user pan/zoom a picked (or existing) image to
 * choose the square area used as their avatar / family logo. Returns a base64
 * JPEG via `modal.dismiss(data, 'confirm')`.
 *
 * Zoom is driven by a slider (ngx-image-cropper v9 has no native pinch/wheel
 * zoom) and a − / ＋ pair so it works on every device.
 */
@Component({
  selector: 'app-photo-crop',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonFooter,
    IonRange,
    ImageCropperComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">Annuler</ion-button>
        </ion-buttons>
        <ion-title>Recadrer la photo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <p class="hint">
        Glissez l'image pour la centrer, puis utilisez le <strong>zoom</strong> ci-dessous (le rond
        montre ce qui sera enregistré). Tapez ensuite sur <strong>Valider</strong>.
      </p>

      <div class="wrap">
        <image-cropper
          #cropper
          [imageBase64]="imageBase64"
          [maintainAspectRatio]="true"
          [aspectRatio]="1"
          [roundCropper]="true"
          [resizeToWidth]="resizeToWidth"
          [allowMoveImage]="true"
          [transform]="transform"
          format="jpeg"
          [imageQuality]="quality"
          [autoCrop]="true"
          output="base64"
          (imageCropped)="onCropped($event)"
          (imageLoaded)="onLoaded()"
        ></image-cropper>
      </div>

      <div class="zoom-row">
        <ion-button fill="clear" size="large" (click)="changeZoom(-0.2)" [disabled]="!ready">−</ion-button>
        <ion-range
          class="zoom"
          [min]="0.5"
          [max]="3"
          [step]="0.05"
          [value]="zoom"
          (ionInput)="onZoom($event)"
          [disabled]="!ready"
        ></ion-range>
        <ion-button fill="clear" size="large" (click)="changeZoom(0.2)" [disabled]="!ready">+</ion-button>
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()" color="medium">Annuler</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            fill="solid"
            color="success"
            shape="round"
            [disabled]="!ready"
            (click)="confirm()"
          >✓ Valider</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [
    `
      .facam-bg { --background: #0f172a; --color: #f1f5f9; }
      .hint { color: #cbd5e1; font-size: .9rem; line-height: 1.5; margin: 0 0 10px; }
      .hint strong { color: #fff; }
      .wrap { background: rgba(255,255,255,.04); border-radius: 14px; overflow: hidden; }
      :host ::ng-deep image-cropper { display: block; max-height: 55vh; }
      .zoom-row { display: flex; align-items: center; gap: 6px; margin-top: 14px; }
      .zoom { flex: 1; --bar-background-active: var(--ion-color-primary); }
      ion-footer ion-button { font-weight: 700; --padding-start: 18px; --padding-end: 18px; }
    `,
  ],
})
export class PhotoCropPage {
  @Input() imageBase64 = '';
  @Input() resizeToWidth = 256;
  @Input() quality = 85;

  @ViewChild('cropper', { static: false }) cropper?: ImageCropperComponent;

  /** True once the image has finished loading inside the cropper. */
  ready = false;
  zoom = 1;
  transform: ImageTransform = { scale: 1 };

  private latestBase64 = '';
  private readonly modal = inject(ModalController);

  onLoaded() {
    this.ready = true;
  }

  onCropped(e: ImageCroppedEvent) {
    this.latestBase64 = e.base64 ?? '';
  }

  onZoom(e: Event) {
    const val = Number((e as CustomEvent).detail?.value);
    if (!Number.isNaN(val)) this.setScale(val);
  }

  changeZoom(delta: number) {
    this.setScale(Math.min(3, Math.max(0.5, this.zoom + delta)));
  }

  private setScale(s: number) {
    this.zoom = s;
    this.transform = { ...this.transform, scale: s };
  }

  cancel() {
    void this.modal.dismiss(null, 'cancel');
  }

  /**
   * On confirm, prefer the most recent imageCropped value, but fall back to a
   * direct synchronous crop on the component so OK works even if no event has
   * fired yet (e.g. the user hits Valider immediately after image load).
   */
  confirm() {
    let out = this.latestBase64;
    if (!out && this.cropper) {
      const r = this.cropper.crop('base64');
      if (r && r.base64) out = r.base64;
    }
    if (out) void this.modal.dismiss(out, 'confirm');
  }
}
