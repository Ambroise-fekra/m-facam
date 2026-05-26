import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';

/**
 * Modal page that lets the user pan/zoom a picked image to choose the square
 * area that will be saved as their avatar (or family logo). Returns a base64
 * JPEG data URL of the cropped square via modal.dismiss(data, 'confirm').
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
    IonContent,
    ImageCropperComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">Annuler</ion-button>
        </ion-buttons>
        <ion-title>Recadrer la photo</ion-title>
        <ion-buttons slot="end">
          <ion-button strong="true" [disabled]="!cropped" (click)="confirm()">OK</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <p class="hint">Faites glisser l'image et pincez pour zoomer afin de centrer ce qui apparaîtra dans le rond. Puis tapez sur <strong>OK</strong>.</p>
      <div class="wrap">
        <image-cropper
          [imageBase64]="imageBase64"
          [maintainAspectRatio]="true"
          [aspectRatio]="1"
          [roundCropper]="true"
          [resizeToWidth]="resizeToWidth"
          [allowMoveImage]="true"
          format="jpeg"
          [imageQuality]="quality"
          output="base64"
          (imageCropped)="onCropped($event)"
        ></image-cropper>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .facam-bg { --background: #0f172a; --color: #f1f5f9; }
      .hint { color: #cbd5e1; font-size: .9rem; line-height: 1.5; margin: 0 0 10px; }
      .hint strong { color: #fff; }
      .wrap { background: rgba(255,255,255,.04); border-radius: 14px; overflow: hidden; }
      :host ::ng-deep image-cropper { display: block; max-height: 70vh; }
    `,
  ],
})
export class PhotoCropPage {
  @Input() imageBase64 = '';
  @Input() resizeToWidth = 256;
  @Input() quality = 85;

  cropped = '';
  private readonly modal = inject(ModalController);

  onCropped(e: ImageCroppedEvent) {
    this.cropped = e.base64 ?? '';
  }

  cancel() {
    void this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    if (this.cropped) void this.modal.dismiss(this.cropped, 'confirm');
  }
}
