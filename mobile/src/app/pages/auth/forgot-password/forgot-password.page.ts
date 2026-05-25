import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/login" /></ion-buttons>
        <ion-title>Mot de passe oublié</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="facam-bg ion-padding">
      <p class="t-muted">Saisissez l'email lié à votre famille, nous vous enverrons un lien de réinitialisation.</p>
      <label class="fld-label">Email</label>
      <ion-input class="fld" type="email" [(ngModel)]="email" placeholder="jean@email.com"></ion-input>
      <ion-button expand="block" class="ion-margin-top" (click)="sent = true" [disabled]="!email">
        Envoyer le lien
      </ion-button>
      <p *ngIf="sent" class="ok">✅ Si un compte existe, un email vient d'être envoyé.</p>
    </ion-content>
  `,
  styles: [`.ok { color: #34d399; margin-top: 16px; }`],
})
export class ForgotPasswordPage {
  email = '';
  sent = false;
}
