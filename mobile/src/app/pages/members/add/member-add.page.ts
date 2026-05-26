import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonToggle,
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { Member } from '../../../core/models/api.models';

@Component({
  selector: 'app-member-add',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/members" /></ion-buttons>
        <ion-title>Ajouter un membre</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <form *ngIf="!created" [formGroup]="form" (ngSubmit)="submit()">
        <label class="fld-label">Prénom</label>
        <ion-input class="fld" formControlName="firstName" placeholder="Sophie"></ion-input>

        <label class="fld-label">Nom</label>
        <ion-input class="fld" formControlName="lastName" placeholder="DUPONT"></ion-input>

        <label class="fld-label">Email</label>
        <ion-input class="fld" type="email" formControlName="email" placeholder="sophie@email.com"></ion-input>

        <label class="fld-label">Téléphone</label>
        <ion-input class="fld" type="tel" formControlName="phone" placeholder="+33 6 …"></ion-input>

        <label class="fld-label">Date de naissance</label>
        <ion-input class="fld" type="date" formControlName="birthDate"></ion-input>

        <label class="fld-label">Sexe</label>
        <ion-select class="fld" formControlName="gender" interface="alert" placeholder="Choisir">
          <ion-select-option value="M">Masculin</ion-select-option>
          <ion-select-option value="F">Féminin</ion-select-option>
          <ion-select-option value="O">Autre</ion-select-option>
        </ion-select>

        <label class="fld-label">Email PayPal</label>
        <ion-input class="fld" type="email" formControlName="paypalEmail" placeholder="paypal@email.com"></ion-input>

        <h3 class="h-title sec">Filiation</h3>
        <label class="fld-label">Père</label>
        <ion-select class="fld" formControlName="fatherId" interface="alert" placeholder="— Aucun —">
          <ion-select-option [value]="''">— Aucun —</ion-select-option>
          <ion-select-option *ngFor="let m of males" [value]="m.id">{{ m.firstName }} {{ m.lastName }}</ion-select-option>
        </ion-select>

        <label class="fld-label">Mère</label>
        <ion-select class="fld" formControlName="motherId" interface="alert" placeholder="— Aucune —">
          <ion-select-option [value]="''">— Aucune —</ion-select-option>
          <ion-select-option *ngFor="let m of females" [value]="m.id">{{ m.firstName }} {{ m.lastName }}</ion-select-option>
        </ion-select>

        <div class="toggle-row">
          <span>Le membre peut se connecter</span>
          <ion-toggle formControlName="canLogin"></ion-toggle>
        </div>
        <ng-container *ngIf="form.value.canLogin">
          <label class="fld-label">Mot de passe initial (optionnel)</label>
          <ion-input class="fld" type="password" formControlName="password" placeholder="Laissez vide → lien d'invitation"></ion-input>
          <p class="hint">💡 Laissez vide (recommandé) : on génère un <strong>lien d'invitation</strong> que vous partagez par WhatsApp ; le membre choisira lui-même son mot de passe. Sinon, vous devrez lui communiquer ce mot de passe.</p>
        </ng-container>

        <ion-button type="submit" expand="block" [disabled]="form.invalid" class="ion-margin-top">
          Ajouter le membre
        </ion-button>
      </form>

      <!-- Result: invite link to share -->
      <div *ngIf="created" class="facam-card result">
        <div class="emoji">✅</div>
        <h3 class="h-title">Membre ajouté</h3>
        <ng-container *ngIf="inviteLink; else noInvite">
          <p class="t-muted">Partagez ce lien d'invitation : le membre définira son mot de passe et rejoindra la famille.</p>
          <div class="link" (click)="copyLink()">{{ inviteLink }} 📋</div>
          <ion-button expand="block" class="wa" (click)="inviteWhatsApp()">💬 Inviter par WhatsApp</ion-button>
        </ng-container>
        <ng-template #noInvite>
          <p class="t-muted">Ce membre a été créé{{ createdHasPassword ? ' avec un mot de passe' : ' sans accès connexion' }}.</p>
        </ng-template>
        <ion-button expand="block" fill="outline" (click)="router.navigateByUrl('/members')">Retour à la famille</ion-button>
        <ion-button expand="block" fill="clear" (click)="reset()">Ajouter un autre membre</ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .sec { margin: 22px 0 4px; font-size: 1.1rem; }
      .toggle-row { display: flex; justify-content: space-between; align-items: center; color: #cbd5e1; margin-top: 18px; }
      .hint { color: #94a3b8; font-size: .82rem; margin: 6px 0 0; }
      .result { text-align: center; }
      .result .emoji { font-size: 2.4rem; }
      .result .link { background: rgba(99,102,241,.18); border: 1px solid rgba(99,102,241,.35); color: #fff; border-radius: 12px; padding: 12px; margin: 12px 0; font-size: .8rem; word-break: break-all; cursor: pointer; }
      .result .wa { --background: #25D366; --background-activated: #1da851; --color: #062e16; font-weight: 700; }
      .result ion-button { margin-top: 8px; }
    `,
  ],
})
export class MemberAddPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly whatsapp = inject(WhatsappService);
  readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  members: Member[] = [];

  created = false;
  inviteLink = '';
  createdHasPassword = false;
  private createdName = '';
  private createdPhone = '';

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    birthDate: [''],
    gender: [''],
    paypalEmail: [''],
    fatherId: [''],
    motherId: [''],
    canLogin: [false],
    password: [''],
  });

  get males() {
    return this.members.filter((m) => m.gender === 'M');
  }
  get females() {
    return this.members.filter((m) => m.gender === 'F');
  }

  ngOnInit() {
    this.api.members().subscribe((m) => (this.members = m));
  }

  async submit() {
    const loading = await this.loadingCtrl.create({ message: 'Ajout…' });
    await loading.present();
    const v = this.form.getRawValue();
    this.createdName = `${v.firstName} ${v.lastName}`;
    this.createdPhone = v.phone;
    this.createdHasPassword = !!(v.canLogin && v.password);
    this.api
      .createMember({
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || undefined,
        birthDate: v.birthDate || undefined,
        gender: (v.gender as 'M' | 'F' | 'O') || undefined,
        paypalEmail: v.paypalEmail || undefined,
        fatherId: v.fatherId || undefined,
        motherId: v.motherId || undefined,
        canLogin: v.canLogin,
        password: v.canLogin ? v.password : undefined,
      })
      .subscribe({
        next: async (res) => {
          await loading.dismiss();
          const identifier = this.auth.snapshot?.family.identifier ?? '';
          this.inviteLink = res.inviteToken
            ? `${window.location.origin}/auth/accept-invite?identifier=${encodeURIComponent(identifier)}&token=${res.inviteToken}`
            : '';
          this.created = true;
        },
        error: () => loading.dismiss(),
      });
  }

  async copyLink() {
    try {
      await navigator.clipboard.writeText(this.inviteLink);
      const t = await this.toastCtrl.create({ message: 'Lien copié', color: 'success', duration: 1500 });
      await t.present();
    } catch {
      /* clipboard unavailable */
    }
  }

  inviteWhatsApp() {
    const fam = this.auth.snapshot?.family.name ?? 'notre famille';
    const msg =
      `Bonjour ${this.createdName}, tu es invité(e) à rejoindre ${fam} sur Family Cash Management. ` +
      `Ouvre ce lien pour définir ton mot de passe : ${this.inviteLink}`;
    this.whatsapp.share(msg, this.createdPhone);
  }

  reset() {
    this.form.reset({ canLogin: false });
    this.created = false;
    this.inviteLink = '';
  }
}
