import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonContent, IonInput, IonText, LoadingController } from '@ionic/angular/standalone';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonButton, IonText],
  template: `
    <ion-content class="facam-login ion-padding">
      <div class="hero">
        <div class="logo">💰</div>
        <h1>Family Cash Management</h1>
        <p class="by">By ALICSIA — Ambroise Fouti LOEMBA</p>
        <p>La trésorerie de votre famille, simple et privée.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()" class="card">
        <label class="fld-label">Identifiant famille</label>
        <ion-input class="fld" formControlName="identifier" placeholder="FAM-DUPONT-2024" autocapitalize="characters"></ion-input>

        <label class="fld-label">Email</label>
        <ion-input class="fld" type="email" formControlName="email" placeholder="jean.dupont@email.com"></ion-input>

        <label class="fld-label">Mot de passe</label>
        <div class="pwd-wrap">
          <ion-input class="fld" [type]="showPwd ? 'text' : 'password'" formControlName="password" placeholder="••••••••"></ion-input>
          <button type="button" class="eye" (click)="showPwd = !showPwd">{{ showPwd ? '🙈' : '👁️' }}</button>
        </div>

        <ion-button type="submit" expand="block" [disabled]="form.invalid" class="ion-margin-top">
          Se connecter
        </ion-button>

        <p class="links">
          <a routerLink="/auth/forgot-identifier">Identifiant oublié&nbsp;?</a>
          &nbsp;·&nbsp;
          <a routerLink="/auth/forgot-password">Mot de passe oublié&nbsp;?</a>
        </p>
        <p class="links">Pas encore de famille&nbsp;? <a routerLink="/auth/create-family">Créer une famille</a></p>
        <p class="links"><a routerLink="/help">📖 Aide &amp; guide d'utilisation</a></p>
      </form>

      <ion-text class="trial">🎁 1 mois gratuit, puis 20 €/an</ion-text>
    </ion-content>
  `,
  styles: [
    `
      .facam-login { --background: linear-gradient(160deg, #1e1b4b 0%, #2e1065 55%, #4c1d95 100%); }
      .hero { text-align: center; color: #fff; padding: 36px 12px 18px; }
      .hero .logo { font-size: 3.6rem; }
      .hero h1 { font-weight: 800; font-size: 1.8rem; margin: 6px 0 2px; }
      .hero .alicsia { display: inline-block; width: 72%; max-width: 240px; background: #fff; border-radius: 12px; padding: 8px 12px; margin: 8px 0 4px; }
      .hero .by { color: #c4b5fd; font-weight: 600; font-size: .85rem; margin: 0 0 6px; }
      .hero p { opacity: .85; }
      .card { background: rgba(0,0,0,.28); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,.12); border-radius: 20px; padding: 8px 18px 20px; }
      .links { text-align: center; margin-top: 14px; color: rgba(255,255,255,.9); }
      .links a { color: #a5b4fc; text-decoration: underline; font-weight: 600; }
      .trial { display: block; text-align: center; margin-top: 26px; color: rgba(255,255,255,.75); }
    `,
  ],
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);

  showPwd = false;

  onLogoError(e: Event) {
    (e.target as HTMLImageElement).style.display = 'none';
  }

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  async submit() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Connexion…' });
    await loading.present();
    this.auth.login(this.form.getRawValue()).subscribe({
      next: async () => {
        await loading.dismiss();
        await this.router.navigateByUrl('/dashboard');
      },
      error: () => loading.dismiss(),
    });
  }
}
