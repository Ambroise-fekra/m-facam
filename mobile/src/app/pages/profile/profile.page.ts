import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonToolbar,
  LoadingController,
  ToastController,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Member } from '../../core/models/api.models';

@Component({
  selector: 'app-profile',
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
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/members" /></ion-buttons>
        <ion-title>{{ isSelf ? 'Mon profil' : 'Modifier le membre' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <p class="t-muted intro" *ngIf="isSelf">
        Complétez vos informations : téléphone, date de naissance (pour les anniversaires) et vos parents
        (sélectionnez-les une fois qu'ils ont été créés comme membres).
      </p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <p class="form-legend"><span class="star">*</span> Champ obligatoire</p>

        <label class="fld-label req">Prénom</label>
        <ion-input class="fld" formControlName="firstName" placeholder="Jean"></ion-input>

        <label class="fld-label req">Nom</label>
        <ion-input class="fld" formControlName="lastName" placeholder="DUPONT"></ion-input>

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

        <ion-button type="submit" expand="block" [disabled]="form.invalid" class="ion-margin-top">
          Enregistrer
        </ion-button>
      </form>
    </ion-content>
  `,
  styles: [
    `
      .intro { margin: 0 0 8px; line-height: 1.5; }
      .sec { margin: 22px 0 4px; font-size: 1.1rem; }
    `,
  ],
})
export class ProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly toastCtrl = inject(ToastController);

  members: Member[] = [];
  targetId = '';
  isSelf = true;

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    birthDate: [''],
    gender: [''],
    paypalEmail: [''],
    fatherId: [''],
    motherId: [''],
  });

  get males() {
    return this.members.filter((m) => m.gender === 'M' && m.id !== this.targetId);
  }
  get females() {
    return this.members.filter((m) => m.gender === 'F' && m.id !== this.targetId);
  }

  ngOnInit() {
    const routeId = this.route.snapshot.paramMap.get('id');
    const myId = this.auth.snapshot?.member?.id ?? '';
    this.targetId = routeId || myId;
    this.isSelf = this.targetId === myId;

    this.api.members().subscribe((list) => {
      this.members = list;
      const m = list.find((x) => x.id === this.targetId);
      if (m) {
        this.form.patchValue({
          firstName: m.firstName,
          lastName: m.lastName,
          phone: m.phone ?? '',
          birthDate: m.birthDate ? m.birthDate.substring(0, 10) : '',
          gender: m.gender ?? '',
          paypalEmail: m.paypalEmail ?? '',
          fatherId: m.fatherId ?? '',
          motherId: m.motherId ?? '',
        });
      }
    });
  }

  async submit() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    const v = this.form.getRawValue();
    this.api
      .updateMember(this.targetId, {
        firstName: v.firstName,
        lastName: v.lastName,
        phone: v.phone,
        birthDate: v.birthDate,
        gender: (v.gender as 'M' | 'F' | 'O') || undefined,
        paypalEmail: v.paypalEmail,
        fatherId: v.fatherId,
        motherId: v.motherId,
      })
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const t = await this.toastCtrl.create({ message: 'Profil mis à jour', color: 'success', duration: 1500 });
          await t.present();
          this.router.navigateByUrl('/members');
        },
        error: () => loading.dismiss(),
      });
  }
}
