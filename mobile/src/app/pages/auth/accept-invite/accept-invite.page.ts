import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent, IonInput, IonButton],
  template: `
    <ion-header>
      <ion-toolbar color="primary"><ion-title>Rejoindre ma famille</ion-title></ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <div *ngIf="state === 'loading'" class="t-muted">Chargement de l'invitation…</div>

      <div *ngIf="state === 'invalid'" class="box">
        <div class="emoji">⚠️</div>
        <h2 class="h-title">Invitation invalide ou expirée</h2>
        <ion-button expand="block" fill="outline" (click)="router.navigateByUrl('/auth/login')">Aller à la connexion</ion-button>
      </div>

      <div *ngIf="state === 'ready'">
        <h2 class="h-title">Bonjour {{ info?.firstName }} 👋</h2>
        <p class="t-muted" *ngIf="!info?.needsEmail">Choisissez votre mot de passe pour rejoindre la famille. Vous vous connecterez ensuite avec l'identifiant <strong>{{ identifier }}</strong> et votre email <strong>{{ info?.email }}</strong>.</p>
        <p class="t-muted" *ngIf="info?.needsEmail">Pour finaliser votre inscription, indiquez votre <strong>email</strong> (qui vous servira à vous connecter ensuite, avec l'identifiant <strong>{{ identifier }}</strong>) et choisissez votre mot de passe.</p>

        <ng-container *ngIf="info?.needsEmail">
          <label class="fld-label">Votre email</label>
          <ion-input class="fld" type="email" [(ngModel)]="email" placeholder="votre@email.com" autocomplete="email"></ion-input>
        </ng-container>

        <label class="fld-label">Nouveau mot de passe</label>
        <div class="pwd-wrap">
          <ion-input class="fld" [type]="showPwd ? 'text' : 'password'" [(ngModel)]="password" placeholder="min. 8 caractères"></ion-input>
          <button type="button" class="eye" (click)="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
        </div>

        <label class="fld-label">Confirmer le mot de passe</label>
        <ion-input class="fld" [type]="showPwd ? 'text' : 'password'" [(ngModel)]="confirm" placeholder="••••••••"></ion-input>

        <ion-button expand="block" class="ion-margin-top" [disabled]="!valid()" (click)="accept()">
          Définir mon mot de passe & entrer
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`.box { text-align: center; padding-top: 30px; } .emoji { font-size: 3rem; }`],
})
export class AcceptInvitePage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  state: 'loading' | 'ready' | 'invalid' = 'loading';
  identifier = '';
  token = '';
  info: { firstName: string; lastName: string; email: string | null; phone: string | null; needsEmail: boolean } | null = null;
  email = '';
  password = '';
  confirm = '';
  showPwd = false;

  ngOnInit() {
    this.identifier = this.route.snapshot.queryParamMap.get('identifier') ?? '';
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.identifier || !this.token) {
      this.state = 'invalid';
      return;
    }
    this.api.inviteInfo(this.identifier, this.token).subscribe({
      next: (i) => {
        this.info = i;
        this.state = 'ready';
      },
      error: () => (this.state = 'invalid'),
    });
  }

  private emailOk(): boolean {
    if (!this.info?.needsEmail) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim());
  }

  valid(): boolean {
    return this.password.length >= 8 && this.password === this.confirm && this.emailOk();
  }

  async accept() {
    const loading = await this.loadingCtrl.create({ message: 'Activation…' });
    await loading.present();
    const emailArg = this.info?.needsEmail ? this.email.trim().toLowerCase() : undefined;
    this.api.acceptInvite(this.identifier, this.token, this.password, emailArg).subscribe({
      next: async (res) => {
        await this.auth.applySession(res);
        await loading.dismiss();
        const t = await this.toastCtrl.create({ message: 'Bienvenue dans la famille !', color: 'success', duration: 2000 });
        await t.present();
        this.router.navigateByUrl('/dashboard');
      },
      error: () => loading.dismiss(),
    });
  }
}
