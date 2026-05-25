import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
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
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Administration</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding" *ngIf="family">
      <div class="facam-card">
        <div class="row"><span>Famille</span><strong>{{ family.name }}</strong></div>
        <div class="row"><span>Identifiant</span><strong>{{ family.identifier }}</strong></div>
      </div>

      <label class="fld-label">Email PayPal famille</label>
      <ion-input class="fld" type="email" [(ngModel)]="paypalEmail" placeholder="famille@paypal.com"></ion-input>

      <label class="fld-label">Lien WhatsApp</label>
      <ion-input class="fld" [(ngModel)]="whatsappUrl" placeholder="https://chat.whatsapp.com/…"></ion-input>

      <ion-button expand="block" (click)="save()" class="ion-margin-top">Enregistrer</ion-button>
      <ion-button expand="block" fill="outline" routerLink="/subscription" class="ion-margin-top">
        Gérer l'abonnement
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .facam-card { margin-bottom: 8px; }
      .row { display: flex; justify-content: space-between; padding: 7px 0; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,.06); }
      .row:last-child { border-bottom: none; }
      .row strong { color: #fff; }
    `,
  ],
})
export class AdminPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toastCtrl = inject(ToastController);

  family: { identifier: string; name: string; paypalEmail: string | null; whatsappUrl: string | null } | null = null;
  paypalEmail = '';
  whatsappUrl = '';

  ngOnInit() {
    this.api.family().subscribe((f) => {
      this.family = f;
      this.paypalEmail = f.paypalEmail ?? '';
      this.whatsappUrl = f.whatsappUrl ?? '';
    });
  }

  async save() {
    this.api
      .updateFamily({ paypalEmail: this.paypalEmail || undefined, whatsappUrl: this.whatsappUrl || undefined })
      .subscribe(async () => {
        const t = await this.toastCtrl.create({ message: 'Paramètres enregistrés', color: 'success', duration: 2200 });
        await t.present();
      });
  }
}
