import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, IonHeader, IonToolbar, IonTitle, IonContent, IonButton],
  template: `
    <ion-header>
      <ion-toolbar color="primary"><ion-title>Vérification email</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="facam-bg ion-padding">
      <div class="box" *ngIf="state === 'pending'"><p class="t-muted">Vérification en cours…</p></div>
      <div class="box" *ngIf="state === 'ok'">
        <div class="emoji">✅</div>
        <h2 class="h-title">Email vérifié</h2>
        <p class="t-muted" *ngIf="identifier">Identifiant de votre famille : <strong>{{ identifier }}</strong></p>
        <ion-button expand="block" routerLink="/auth/login">Se connecter</ion-button>
      </div>
      <div class="box" *ngIf="state === 'fail'">
        <div class="emoji">⚠️</div>
        <h2 class="h-title">Lien invalide ou déjà utilisé</h2>
        <ion-button expand="block" fill="outline" routerLink="/auth/login">Retour à la connexion</ion-button>
      </div>
    </ion-content>
  `,
  styles: [`.box { text-align: center; padding-top: 30px; } .emoji { font-size: 3rem; }`],
})
export class VerifyEmailPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  state: 'pending' | 'ok' | 'fail' = 'pending';
  identifier?: string;

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!token) {
      this.state = 'fail';
      return;
    }
    this.api.verifyEmail(token).subscribe({
      next: (r) => {
        this.state = r.verified ? 'ok' : 'fail';
        this.identifier = r.identifier;
      },
      error: () => (this.state = 'fail'),
    });
  }
}
