import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCheckbox,
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
import { ApiService, FamilyInfo } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Member } from '../../core/models/api.models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonCheckbox,
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

        <label class="fld-label req">Sexe</label>
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

        <!-- Statut "actif" + Décès : éditable uniquement par admin ou chef. -->
        <ng-container *ngIf="canMarkDeceased()">
          <h3 class="h-title sec">⚙️ Statut</h3>
          <div class="deceased-row">
            <ion-checkbox
              [checked]="!!form.value.isActive"
              [disabled]="!!form.value.deceasedAt || !targetHasPassword()"
              (ionChange)="onActiveToggle($event)"
            ></ion-checkbox>
            <span>Membre <strong>actif</strong> (peut voter, compté dans le quorum)</span>
          </div>
          <p class="t-muted small" *ngIf="!targetHasPassword()">
            ⚠️ Ce membre n'a pas encore de mot de passe : il ne peut pas être actif. Cliquez d'abord sur « 🔓 Activer la connexion » dans la liste Famille pour lui envoyer le lien d'invitation.
          </p>

          <h3 class="h-title sec">🕯️ Décès</h3>
          <div class="deceased-row">
            <ion-checkbox
              [checked]="isDeceasedChecked()"
              (ionChange)="onDeceasedToggle($event)"
            ></ion-checkbox>
            <span>Membre décédé(e)</span>
          </div>
          <ng-container *ngIf="isDeceasedChecked()">
            <label class="fld-label">Date du décès</label>
            <ion-input class="fld" type="date" formControlName="deceasedAt"></ion-input>
            <p class="t-muted small">Le membre sera automatiquement marqué inactif (exclu du quorum, non sélectionnable comme responsable).</p>
          </ng-container>
        </ng-container>

        <ion-button type="submit" expand="block" [disabled]="form.invalid" class="ion-margin-top">
          Enregistrer
        </ion-button>
      </form>

      <!-- Ma descendance : seul un membre éditant SON PROPRE profil peut déclarer ses enfants. -->
      <div class="facam-card kids" *ngIf="isSelf">
        <h3 class="h-title">👶 Ma descendance</h3>
        <p class="t-muted small">Ajoutez vos enfants pour enrichir l'arbre généalogique. Ils sont créés <strong>inactifs</strong> ; l'admin ou le chef de famille les activera plus tard (notamment à leur majorité).</p>

        <div class="kids-list" *ngIf="myChildren().length">
          <div class="kid" *ngFor="let c of myChildren()">
            <span class="gender">{{ c.gender === 'M' ? '♂' : c.gender === 'F' ? '♀' : '⚪' }}</span>
            <span class="name">{{ c.firstName }} {{ c.lastName }}</span>
            <span *ngIf="c.birthDate" class="year">{{ c.birthDate | date: 'yyyy' }}</span>
            <span *ngIf="c.isActive === false" class="badge badge-closed">💤 Inactif</span>
            <span *ngIf="c.canLogin" class="badge badge-active">🔓 Connecté</span>
          </div>
        </div>
        <p *ngIf="!myChildren().length" class="t-muted small empty">Aucun enfant déclaré pour le moment.</p>

        <h4 class="h-sub">+ Ajouter un enfant</h4>
        <form [formGroup]="childForm" (ngSubmit)="addChild()">
          <p class="form-legend"><span class="star">*</span> Champ obligatoire</p>
          <label class="fld-label req">Prénom</label>
          <ion-input class="fld" formControlName="firstName" placeholder="Sophie"></ion-input>
          <label class="fld-label req">Nom</label>
          <ion-input class="fld" formControlName="lastName" placeholder="DUPONT"></ion-input>
          <label class="fld-label req">Sexe</label>
          <ion-select class="fld" formControlName="gender" interface="alert" placeholder="Choisir">
            <ion-select-option value="M">Masculin</ion-select-option>
            <ion-select-option value="F">Féminin</ion-select-option>
            <ion-select-option value="O">Autre</ion-select-option>
          </ion-select>
          <label class="fld-label">Date de naissance</label>
          <ion-input class="fld" type="date" formControlName="birthDate"></ion-input>
          <label class="fld-label">Téléphone</label>
          <ion-input class="fld" type="tel" formControlName="phone" placeholder="+33 6 …"></ion-input>
          <label class="fld-label">Email</label>
          <ion-input class="fld" type="email" formControlName="email" placeholder="prenom@email.com"></ion-input>
          <ion-button type="submit" expand="block" [disabled]="childForm.invalid" class="ion-margin-top">
            Ajouter cet enfant
          </ion-button>
        </form>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .intro { margin: 0 0 8px; line-height: 1.5; }
      .sec { margin: 22px 0 4px; font-size: 1.1rem; }
      .kids { margin-top: 18px; }
      .kids h3 { margin: 0 0 6px; }
      .kids-list { margin: 8px 0 4px; }
      .kid { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: rgba(255,255,255,.04); border-radius: 10px; margin-bottom: 6px; color: #cbd5e1; }
      .kid .gender { color: #cbd5e1; }
      .kid .name { color: #fff; font-weight: 600; flex: 1; min-width: 0; }
      .kid .year { color: #94a3b8; font-size: .82rem; }
      .h-sub { color: #fff; font-size: 1rem; margin: 18px 0 4px; }
      .empty { padding: 6px 0 0; }
      .small { font-size: .82rem; }
      .deceased-row { display: flex; align-items: center; gap: 10px; color: #cbd5e1; margin: 8px 0 6px; }
      .deceased-row ion-checkbox { --size: 22px; }
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
    gender: ['', Validators.required],
    paypalEmail: [''],
    fatherId: [''],
    motherId: [''],
    deceasedAt: [''],
    isActive: [false],
  });

  /** True when the edited member already has a password (so they CAN be active). */
  private memberHasPassword = false;

  /** Family info needed to detect "I am the chef de famille" for permission checks. */
  familyInfo: FamilyInfo | null = null;

  readonly childForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    gender: ['' as '' | 'M' | 'F' | 'O', Validators.required],
    birthDate: [''],
    phone: [''],
    email: ['', Validators.email],
  });

  get males() {
    return this.members.filter((m) => m.gender === 'M' && m.id !== this.targetId);
  }
  get females() {
    return this.members.filter((m) => m.gender === 'F' && m.id !== this.targetId);
  }

  myChildren(): Member[] {
    return this.members
      .filter((m) => m.fatherId === this.targetId || m.motherId === this.targetId)
      .sort((a, b) => (a.birthDate ?? '').localeCompare(b.birthDate ?? '') || a.firstName.localeCompare(b.firstName));
  }

  async addChild() {
    if (this.childForm.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Ajout…' });
    await loading.present();
    const v = this.childForm.getRawValue();
    this.api
      .declareDescendant({
        firstName: v.firstName,
        lastName: v.lastName,
        gender: v.gender as 'M' | 'F' | 'O',
        birthDate: v.birthDate || undefined,
        phone: v.phone || undefined,
        email: v.email || undefined,
      })
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const t = await this.toastCtrl.create({
            message: 'Enfant ajouté (inactif — à activer par l\'admin/chef)',
            color: 'success',
            duration: 2500,
          });
          await t.present();
          this.childForm.reset({
            firstName: '', lastName: '', gender: '', birthDate: '', phone: '', email: '',
          });
          this.api.members().subscribe((list) => (this.members = list));
        },
        error: () => loading.dismiss(),
      });
  }

  ngOnInit() {
    const routeId = this.route.snapshot.paramMap.get('id');
    const myId = this.auth.snapshot?.member?.id ?? '';
    this.targetId = routeId || myId;
    this.isSelf = this.targetId === myId;

    this.api.familyInfo().subscribe((i) => (this.familyInfo = i));
    this.api.members().subscribe((list) => {
      this.members = list;
      const m = list.find((x) => x.id === this.targetId);
      if (m) {
        this.memberHasPassword = !!m.hasPassword;
        this.form.patchValue({
          firstName: m.firstName,
          lastName: m.lastName,
          phone: m.phone ?? '',
          birthDate: m.birthDate ? m.birthDate.substring(0, 10) : '',
          gender: m.gender ?? '',
          paypalEmail: m.paypalEmail ?? '',
          fatherId: m.fatherId ?? '',
          motherId: m.motherId ?? '',
          deceasedAt: m.deceasedAt ?? '',
          isActive: !!m.isActive,
        });
      }
    });
  }

  /** Admin or chef de famille may mark/un-mark a member as deceased. */
  canMarkDeceased(): boolean {
    const meId = this.auth.snapshot?.member?.id;
    return this.auth.isAdmin || (!!meId && meId === this.familyInfo?.chief?.id);
  }

  isDeceasedChecked(): boolean {
    return !!this.form.value.deceasedAt;
  }

  targetHasPassword(): boolean {
    return this.memberHasPassword;
  }

  onActiveToggle(e: Event) {
    const checked = (e as CustomEvent).detail?.checked;
    this.form.controls.isActive.setValue(!!checked);
  }

  onDeceasedToggle(e: Event) {
    const checked = (e as CustomEvent).detail?.checked;
    if (checked) {
      // default to today's date if no date already set
      if (!this.form.value.deceasedAt) {
        const today = new Date().toISOString().substring(0, 10);
        this.form.controls.deceasedAt.setValue(today);
      }
    } else {
      this.form.controls.deceasedAt.setValue('');
    }
  }

  async submit() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    const v = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      firstName: v.firstName,
      lastName: v.lastName,
      phone: v.phone,
      birthDate: v.birthDate,
      gender: (v.gender as 'M' | 'F' | 'O') || undefined,
      paypalEmail: v.paypalEmail,
      fatherId: v.fatherId,
      motherId: v.motherId,
    };
    // Only include deceasedAt + isActive when the caller has the right to
    // set them, so the backend doesn't reject normal self-edits.
    if (this.canMarkDeceased()) {
      payload['deceasedAt'] = v.deceasedAt;
      payload['isActive'] = v.isActive;
    }
    this.api.updateMember(this.targetId, payload).subscribe({
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
