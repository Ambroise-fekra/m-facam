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
  IonSelect,
  IonSelectOption,
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
    IonSelect,
    IonSelectOption,
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

      <p class="t-muted small">💡 La famille peut accepter <strong>PayPal</strong> (pour les membres en Europe) <strong>et</strong> <strong>Mobile Money</strong> (pour les membres au Congo) <strong>simultanément</strong>. Renseignez les deux si nécessaire.</p>

      <label class="fld-label">Email PayPal famille</label>
      <ion-input class="fld" type="email" [(ngModel)]="paypalEmail" placeholder="famille@paypal.com"></ion-input>

      <label class="fld-label">Opérateur Mobile Money de la famille</label>
      <ion-select class="fld" [(ngModel)]="mobileMoneyOperator" interface="alert" placeholder="— Aucun —">
        <ion-select-option value="">— Aucun —</ion-select-option>
        <ion-select-option value="mtn">MTN MoMo</ion-select-option>
        <ion-select-option value="orange">Orange Money</ion-select-option>
        <ion-select-option value="airtel">Airtel Money</ion-select-option>
        <ion-select-option value="moov">Moov Money</ion-select-option>
        <ion-select-option value="other">Autre</ion-select-option>
      </ion-select>

      <label class="fld-label">Numéro Mobile Money de la famille</label>
      <ion-input class="fld" type="tel" [(ngModel)]="mobileMoneyNumber" placeholder="+242 06 …"></ion-input>

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

  family:
    | {
        identifier: string;
        name: string;
        paypalEmail: string | null;
        whatsappUrl: string | null;
        mobileMoneyNumber?: string | null;
        mobileMoneyOperator?: string | null;
      }
    | null = null;
  paypalEmail = '';
  whatsappUrl = '';
  mobileMoneyNumber = '';
  mobileMoneyOperator = '';

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    this.api.family().subscribe((f) => {
      this.family = f;
      this.paypalEmail = f.paypalEmail ?? '';
      this.whatsappUrl = f.whatsappUrl ?? '';
      this.mobileMoneyNumber = f.mobileMoneyNumber ?? '';
      this.mobileMoneyOperator = f.mobileMoneyOperator ?? '';
    });
  }

  async save() {
    this.api
      .updateFamily({
        paypalEmail: this.paypalEmail,
        whatsappUrl: this.whatsappUrl,
        mobileMoneyNumber: this.mobileMoneyNumber,
        mobileMoneyOperator: this.mobileMoneyOperator,
      })
      .subscribe(async () => {
        const t = await this.toastCtrl.create({ message: 'Paramètres enregistrés', color: 'success', duration: 2200 });
        await t.present();
      });
  }
}
