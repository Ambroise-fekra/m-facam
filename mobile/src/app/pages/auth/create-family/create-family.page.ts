import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-create-family',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonCheckbox,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/auth/login" /></ion-buttons>
        <ion-title>Créer une famille</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <div class="steps" *ngIf="step < 4">
        <span [class.on]="step >= 1">1 Famille</span>
        <span [class.on]="step >= 2">2 Admin</span>
        <span [class.on]="step >= 3">3 Essai</span>
      </div>

      <ng-container *ngIf="step === 1">
        <form [formGroup]="formFamily" (ngSubmit)="next()">
          <p class="form-legend"><span class="star">*</span> Champ obligatoire</p>
          <label class="fld-label req">Nom de la famille</label>
          <ion-input class="fld" formControlName="name" placeholder="DUPONT"></ion-input>

          <label class="fld-label req">Code famille (3 à 10 caractères)</label>
          <ion-input class="fld" formControlName="code" maxlength="10" placeholder="DUPONT" autocapitalize="characters"></ion-input>
          <p class="hint">Lettres/chiffres uniquement. L'identifiant complet sera généré automatiquement au format <strong>FAM-CODE-0001</strong> et garanti unique.</p>

          <label class="fld-label">Email PayPal famille (optionnel)</label>
          <ion-input class="fld" type="email" formControlName="paypalEmail" placeholder="famille@paypal.com"></ion-input>

          <label class="fld-label">Groupe WhatsApp (optionnel)</label>
          <ion-input class="fld" formControlName="whatsappUrl" placeholder="https://chat.whatsapp.com/…"></ion-input>

          <ion-button type="submit" expand="block" [disabled]="formFamily.invalid" class="ion-margin-top">Suivant →</ion-button>
        </form>
      </ng-container>

      <ng-container *ngIf="step === 2">
        <form [formGroup]="formAdmin" (ngSubmit)="next()">
          <p class="form-legend"><span class="star">*</span> Champ obligatoire</p>
          <label class="fld-label req">Prénom</label>
          <ion-input class="fld" formControlName="adminFirstName" placeholder="Jean"></ion-input>
          <label class="fld-label req">Nom</label>
          <ion-input class="fld" formControlName="adminLastName" placeholder="DUPONT"></ion-input>
          <label class="fld-label req">Email (servira à recevoir votre identifiant)</label>
          <ion-input class="fld" type="email" formControlName="adminEmail" placeholder="jean@email.com"></ion-input>
          <label class="fld-label req">Mot de passe</label>
          <div class="pwd-wrap">
            <ion-input class="fld" [type]="showPwd ? 'text' : 'password'" formControlName="adminPassword" placeholder="min. 8 caractères"></ion-input>
            <button type="button" class="eye" (click)="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
          </div>

          <ion-button expand="block" fill="clear" color="medium" (click)="step = 1">← Précédent</ion-button>
          <ion-button type="submit" expand="block" [disabled]="formAdmin.invalid">Suivant →</ion-button>
        </form>
      </ng-container>

      <ng-container *ngIf="step === 3">
        <div class="facam-card trial">
          <h3 class="h-title">🎁 1 mois gratuit</h3>
          <p class="t-muted">Puis <strong style="color:#fff">20 €/an</strong>. Aucun paiement aujourd'hui.</p>
          <ul>
            <li>✅ Membres illimités</li>
            <li>✅ Cotisations PayPal</li>
            <li>✅ Évènements, votes et allocations</li>
            <li>✅ Arbre généalogique & notifications</li>
          </ul>
        </div>

        <div class="facam-card reassure">
          🔒 <strong>Votre argent reste le vôtre.</strong> Le compte PayPal de la famille vous appartient : même en cas de non-paiement de l'abonnement, vous ne perdez pas la caisse et pouvez continuer à gérer ce compte PayPal directement.
        </div>

        <div class="legal">
          <ion-checkbox [(ngModel)]="accepted" [ngModelOptions]="{ standalone: true }"></ion-checkbox>
          <span>J'accepte les <a routerLink="/legal" class="facam-link">conditions d'utilisation et la politique de confidentialité (RGPD)</a>.</span>
        </div>

        <ion-button expand="block" fill="clear" color="medium" (click)="step = 2">← Précédent</ion-button>
        <ion-button expand="block" [disabled]="!accepted" (click)="submit()">Démarrer l'essai gratuit</ion-button>
      </ng-container>

      <!-- Step 4: confirmation with the generated identifier -->
      <ng-container *ngIf="step === 4">
        <div class="facam-card done">
          <div class="emoji">🎉</div>
          <h3 class="h-title">Famille créée !</h3>
          <p class="t-muted">Voici votre <strong>identifiant de famille</strong>. Notez-le : il est indispensable pour vous connecter (vous et tous les membres).</p>
          <div class="ident" (click)="copyId()">{{ createdId }} 📋</div>
          <p class="t-muted small">📧 Un email contenant cet identifiant et un lien de vérification a été envoyé à <strong>{{ formAdmin.value.adminEmail }}</strong> (pensez à vérifier les indésirables).</p>
          <ion-button expand="block" (click)="goLogin()">J'ai noté mon identifiant → Se connecter</ion-button>
        </div>
      </ng-container>
    </ion-content>
  `,
  styles: [
    `
      .steps { display: flex; justify-content: space-between; margin-bottom: 14px; }
      .steps span { flex: 1; text-align: center; color: #64748b; font-size: .8rem; font-weight: 600; padding: 8px 0; border-bottom: 2px solid rgba(255,255,255,.1); }
      .steps span.on { color: #fff; border-color: var(--ion-color-primary); }
      .hint { color: #94a3b8; font-size: .8rem; margin: 6px 0 0; }
      .trial h3 { font-size: 1.3rem; margin: 0 0 6px; }
      .trial ul { padding-left: 18px; line-height: 1.9; color: #cbd5e1; }
      .reassure { margin-top: 12px; color: #cbd5e1; font-size: .9rem; line-height: 1.5; background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.3); }
      .reassure strong { color: #fff; }
      .legal { display: flex; gap: 10px; align-items: flex-start; color: #cbd5e1; margin: 16px 4px; font-size: .9rem; }
      .done { text-align: center; }
      .done .emoji { font-size: 2.6rem; }
      .ident { background: rgba(99,102,241,.2); border: 1px solid rgba(99,102,241,.4); color: #fff; font-weight: 800; letter-spacing: 1px; border-radius: 14px; padding: 16px; margin: 12px 0; font-family: 'Space Grotesk', monospace; font-size: 1.2rem; cursor: pointer; }
      .small { font-size: .82rem; }
    `,
  ],
})
export class CreateFamilyPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  step: 1 | 2 | 3 | 4 = 1;
  showPwd = false;
  accepted = false;
  createdId = '';

  readonly formFamily = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]+$/), Validators.minLength(3), Validators.maxLength(10)]],
    paypalEmail: [''],
    whatsappUrl: [''],
  });

  readonly formAdmin = this.fb.nonNullable.group({
    adminFirstName: ['', Validators.required],
    adminLastName: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  next() {
    if (this.step === 1 && this.formFamily.valid) this.step = 2;
    else if (this.step === 2 && this.formAdmin.valid) this.step = 3;
  }

  async submit() {
    if (!this.accepted) return;
    const loading = await this.loadingCtrl.create({ message: 'Création de votre famille…' });
    await loading.present();
    this.api
      .createFamily({ ...this.formFamily.getRawValue(), ...this.formAdmin.getRawValue() })
      .subscribe({
        next: async (res) => {
          await loading.dismiss();
          this.createdId = res.identifier;
          this.step = 4;
        },
        error: () => loading.dismiss(),
      });
  }

  async copyId() {
    try {
      await navigator.clipboard.writeText(this.createdId);
      const t = await this.toastCtrl.create({ message: 'Identifiant copié', color: 'success', duration: 1500 });
      await t.present();
    } catch {
      /* clipboard unavailable */
    }
  }

  goLogin() {
    this.router.navigateByUrl('/auth/login');
  }
}
