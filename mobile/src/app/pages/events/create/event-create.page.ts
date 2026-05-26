import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Member } from '../../../core/models/api.models';

@Component({
  selector: 'app-event-create',
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
    IonRange,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/events" /></ion-buttons>
        <ion-title>Proposer un évènement</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <div class="info">
        🗳️ Votre proposition sera <strong>soumise au vote</strong> de la famille (majorité 2/3, quorum 2/3).
        <span *ngIf="auth.isAdmin">En tant qu'admin, vous pourrez aussi l'activer directement.</span>
        <span *ngIf="!auth.isAdmin">Les membres seront notifiés pour voter.</span>
      </div>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <p class="form-legend"><span class="star">*</span> Champ obligatoire</p>
        <label class="fld-label req">Type</label>
        <ion-select class="fld" formControlName="type" interface="alert" placeholder="Choisir">
          <ion-select-option value="wedding">💍 Mariage</ion-select-option>
          <ion-select-option value="death">🕯️ Décès</ion-select-option>
          <ion-select-option value="project">🏗️ Projet</ion-select-option>
          <ion-select-option value="birthday">🎂 Anniversaire</ion-select-option>
          <ion-select-option value="other">📌 Autre</ion-select-option>
        </ion-select>

        <label class="fld-label req">Titre</label>
        <ion-input class="fld" formControlName="title" placeholder="Ex : Mariage de Sophie"></ion-input>

        <label class="fld-label">Description</label>
        <ion-textarea class="fld" formControlName="description" [rows]="3" placeholder="Détails…"></ion-textarea>

        <!-- Slider montant -->
        <label class="fld-label">🎯 Montant objectif : <span class="val">{{ form.value.targetAmount }} €</span></label>
        <ion-range class="rng" formControlName="targetAmount" [min]="100" [max]="10000" [step]="100" [pin]="true" [snaps]="false">
          <span slot="start" class="rng-end">100</span>
          <span slot="end" class="rng-end">10k</span>
        </ion-range>

        <!-- Slider délai avant échéance -->
        <label class="fld-label">⏳ Clôture des cotisations dans : <span class="val">{{ form.value.deadlineDays }} jours</span> ({{ deadlineLabel() }})</label>
        <ion-range class="rng" formControlName="deadlineDays" [min]="7" [max]="365" [step]="1" [pin]="true">
          <span slot="start" class="rng-end">7j</span>
          <span slot="end" class="rng-end">1 an</span>
        </ion-range>

        <label class="fld-label">🎉 Date de l'évènement (optionnel)</label>
        <ion-input class="fld" type="date" formControlName="eventDate"></ion-input>

        <label class="fld-label req">🗳️ Fin du vote (décision)</label>
        <ion-input class="fld" type="date" formControlName="decisionDeadline"></ion-input>

        <label class="fld-label req">👤 Responsable (reçoit les fonds)</label>
        <ion-select class="fld" formControlName="responsibleId" interface="alert" placeholder="Choisir un membre">
          <ion-select-option *ngFor="let m of members" [value]="m.id">{{ m.firstName }} {{ m.lastName }}</ion-select-option>
        </ion-select>

        <ion-button type="submit" expand="block" [disabled]="form.invalid" class="ion-margin-top">
          Soumettre au vote
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: [
    `
      .info { background: rgba(245,158,11,.14); border: 1px solid rgba(245,158,11,.3); color: #fde68a; border-radius: 14px; padding: 14px; font-size: .9rem; line-height: 1.5; margin-bottom: 8px; }
      .info strong { color: #fff; }
      .val { color: var(--facam-accent); font-weight: 800; }
      .rng { --bar-background: rgba(255,255,255,.15); --bar-background-active: var(--ion-color-primary); --knob-background: #fff; --pin-background: var(--ion-color-primary); --pin-color: #fff; padding: 0 6px; }
      .rng-end { color: #94a3b8; font-size: .75rem; }
    `,
  ],
})
export class EventCreatePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  members: Member[] = [];
  readonly form = this.fb.nonNullable.group({
    type: ['wedding' as 'wedding' | 'death' | 'project' | 'birthday' | 'other', Validators.required],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    targetAmount: [1000, [Validators.required, Validators.min(1)]],
    deadlineDays: [60, [Validators.required, Validators.min(1)]],
    eventDate: [''],
    decisionDeadline: ['', Validators.required],
    responsibleId: ['', Validators.required],
  });

  ngOnInit() {
    this.api.members().subscribe((m) => (this.members = m));
  }

  private addDays(days: number): Date {
    return new Date(Date.now() + days * 86_400_000);
  }

  deadlineLabel(): string {
    return this.addDays(this.form.value.deadlineDays ?? 0).toLocaleDateString('fr-FR');
  }

  async submit() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Envoi…' });
    await loading.present();
    const v = this.form.getRawValue();
    const deadlineIso = this.addDays(v.deadlineDays).toISOString().slice(0, 10);
    this.api
      .createEvent({
        type: v.type,
        title: v.title,
        description: v.description || undefined,
        targetAmount: Number(v.targetAmount),
        eventDate: v.eventDate || undefined,
        deadline: deadlineIso,
        decisionDeadline: v.decisionDeadline || undefined,
        responsibleId: v.responsibleId,
      })
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const t = await this.toastCtrl.create({ message: 'Proposition soumise au vote', color: 'success', duration: 2500 });
          await t.present();
          this.router.navigateByUrl('/events');
        },
        error: () => loading.dismiss(),
      });
  }
}
