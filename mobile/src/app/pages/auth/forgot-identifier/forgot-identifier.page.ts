import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-forgot-identifier',
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
        <ion-title>Identifiant oublié</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="facam-bg ion-padding">
      <p class="t-muted">Saisissez votre email : nous retrouverons l'identifiant de votre famille.</p>
      <label class="fld-label">Email</label>
      <ion-input class="fld" type="email" [(ngModel)]="email" placeholder="jean@email.com"></ion-input>
      <ion-button expand="block" class="ion-margin-top" (click)="recover()" [disabled]="!email">
        Retrouver mon identifiant
      </ion-button>

      <div *ngIf="done" class="result">
        <ng-container *ngIf="identifiers.length; else none">
          <p class="t-muted">Identifiant(s) de famille trouvé(s) :</p>
          <div class="ident" *ngFor="let id of identifiers">{{ id }}</div>
          <p class="t-muted small">Astuce : l'admin de votre famille peut aussi vous le rappeler.</p>
        </ng-container>
        <ng-template #none>
          <p class="warn">Aucune famille trouvée pour cet email. Vérifiez l'adresse ou contactez l'admin de votre famille.</p>
        </ng-template>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .result { margin-top: 22px; }
      .ident { background: rgba(99,102,241,.18); border: 1px solid rgba(99,102,241,.35); color: #fff; font-weight: 800; letter-spacing: .5px; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 8px; font-family: 'Space Grotesk', monospace; }
      .small { font-size: .82rem; }
      .warn { color: #fbbf24; }
    `,
  ],
})
export class ForgotIdentifierPage {
  private readonly api = inject(ApiService);
  email = '';
  done = false;
  identifiers: string[] = [];

  recover() {
    this.api.recoverIdentifier(this.email).subscribe((res) => {
      this.identifiers = res.identifiers;
      this.done = true;
    });
  }
}
