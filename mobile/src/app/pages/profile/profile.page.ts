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

        <label class="fld-label">Surnom <span class="t-muted">(petit nom dans la famille)</span></label>
        <ion-input class="fld" formControlName="nickname" placeholder="ex : Tonton, Bébé…"></ion-input>

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

        <h3 class="h-title sec">💸 Coordonnées de paiement</h3>
        <p class="t-muted small">Pour recevoir un versement quand vous êtes responsable d'un évènement. Vous pouvez renseigner les deux canaux si nécessaire.</p>

        <label class="fld-label">Email PayPal</label>
        <ion-input class="fld" type="email" formControlName="paypalEmail" placeholder="paypal@email.com"></ion-input>

        <label class="fld-label">Opérateur Mobile Money</label>
        <ion-select class="fld" formControlName="mobileMoneyOperator" interface="alert" placeholder="— Aucun —">
          <ion-select-option [value]="''">— Aucun —</ion-select-option>
          <ion-select-option value="mtn">MTN MoMo</ion-select-option>
          <ion-select-option value="orange">Orange Money</ion-select-option>
          <ion-select-option value="airtel">Airtel Money</ion-select-option>
          <ion-select-option value="moov">Moov Money</ion-select-option>
          <ion-select-option value="other">Autre</ion-select-option>
        </ion-select>

        <label class="fld-label">Numéro Mobile Money</label>
        <ion-input class="fld" type="tel" formControlName="mobileMoneyNumber" placeholder="+242 06 …"></ion-input>

        <label class="fld-label">Canal préféré (pour vos cotisations)</label>
        <ion-select class="fld" formControlName="preferredChannel" interface="alert" placeholder="Au cas par cas">
          <ion-select-option [value]="''">— Au cas par cas (choisir au moment de cotiser) —</ion-select-option>
          <ion-select-option value="paypal">PayPal</ion-select-option>
          <ion-select-option value="mobile_money">Mobile Money</ion-select-option>
        </ion-select>

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
              [checked]="!!form.value.isDeceased"
              (ionChange)="onDeceasedToggle($event)"
            ></ion-checkbox>
            <span>Membre décédé(e)</span>
          </div>
          <ng-container *ngIf="form.value.isDeceased">
            <label class="fld-label">Date du décès <span class="t-muted">(facultatif si inconnue, ex. ancêtre)</span></label>
            <ion-input class="fld" type="date" formControlName="deceasedAt"></ion-input>
            <p class="t-muted small">Le membre sera automatiquement marqué inactif (exclu du quorum, non sélectionnable comme responsable).</p>
          </ng-container>
        </ng-container>

        <ion-button type="submit" expand="block" [disabled]="form.invalid" class="ion-margin-top">
          Enregistrer
        </ion-button>
      </form>

      <!-- Conjoint(e) : éditable par le membre lui-même, ou par admin/chef (même
           pour un membre décédé, dans le cadre de l'arbre généalogique). -->
      <div class="facam-card kids" *ngIf="isSelf || canMarkDeceased()">
        <h3 class="h-title">💍 {{ isSelf ? 'Mon/Ma' : 'Conjoint(e) de ' + memberDisplayName() }}</h3>
        <p class="t-muted small" *ngIf="isSelf">
          Liez votre conjoint(e). Si c'est un membre déjà présent dans la famille, sélectionnez-le. Sinon créez-le ici (il/elle sera <strong>inactif/ve</strong> ; l'admin ou le chef de famille pourra l'activer ensuite).
        </p>
        <p class="t-muted small" *ngIf="!isSelf">
          En tant qu'admin / chef de famille vous pouvez renseigner le/la conjoint(e) de ce membre, y compris s'il/elle est décédé(e), pour enrichir l'arbre généalogique.
        </p>

        <div class="kid" *ngIf="currentSpouse() as sp">
          <span class="gender">{{ sp.gender === 'M' ? '♂' : sp.gender === 'F' ? '♀' : '⚪' }}</span>
          <span class="name">{{ sp.firstName }} {{ sp.lastName }}<span *ngIf="sp.nickname" class="t-muted"> ({{ sp.nickname }})</span></span>
          <span *ngIf="sp.isActive === false" class="badge badge-closed">💤 Inactif</span>
        </div>
        <p *ngIf="!currentSpouse()" class="t-muted small empty">Aucun(e) conjoint(e) déclaré(e).</p>

        <h4 class="h-sub">{{ currentSpouse() ? 'Changer de conjoint(e)' : '+ Déclarer mon/ma conjoint(e)' }}</h4>

        <label class="fld-label">Membre déjà existant</label>
        <ion-select class="fld" interface="alert" [(ngModel)]="pickedSpouseId" [ngModelOptions]="{standalone:true}" placeholder="— Choisir un membre —">
          <ion-select-option [value]="''">— Aucun (saisir un nouveau ci-dessous) —</ion-select-option>
          <ion-select-option *ngFor="let m of spouseCandidates()" [value]="m.id">{{ m.firstName }} {{ m.lastName }}</ion-select-option>
        </ion-select>

        <ng-container *ngIf="!pickedSpouseId">
          <form [formGroup]="spouseForm" (ngSubmit)="addSpouse()">
            <p class="form-legend"><span class="star">*</span> Champ obligatoire</p>
            <label class="fld-label req">Prénom</label>
            <ion-input class="fld" formControlName="firstName" placeholder="Sophie"></ion-input>
            <label class="fld-label req">Nom</label>
            <ion-input class="fld" formControlName="lastName" placeholder="DUPONT"></ion-input>
            <label class="fld-label">Surnom</label>
            <ion-input class="fld" formControlName="nickname" placeholder="ex : Maman des enfants"></ion-input>
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
            <ion-button type="submit" expand="block" [disabled]="spouseForm.invalid" class="ion-margin-top">
              Créer & lier
            </ion-button>
          </form>
        </ng-container>

        <ion-button *ngIf="pickedSpouseId" expand="block" (click)="addSpouse()" class="ion-margin-top">
          Lier ce membre comme conjoint(e)
        </ion-button>
      </div>

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
    nickname: [''],
    phone: [''],
    birthDate: [''],
    gender: ['', Validators.required],
    paypalEmail: [''],
    fatherId: [''],
    motherId: [''],
    mobileMoneyNumber: [''],
    mobileMoneyOperator: [''],
    preferredChannel: ['' as '' | 'paypal' | 'mobile_money'],
    isDeceased: [false],
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

  /** Sélection d'un membre existant comme conjoint (alternative au formulaire). */
  pickedSpouseId = '';

  readonly spouseForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    nickname: [''],
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

  /** Conjoint(e) actuel(le) — relation symétrique. */
  currentSpouse(): Member | null {
    const me = this.members.find((m) => m.id === this.targetId);
    if (!me?.spouseId) return null;
    return this.members.find((m) => m.id === me.spouseId) ?? null;
  }

  /**
   * Membres candidats pour le lien conjoint : exclu le membre cible lui-même,
   * ses parents directs, ses enfants. Les décédés sont exclus quand le membre
   * cible agit lui-même (= conjoint ACTUEL), mais inclus quand un admin/chef
   * édite la fiche d'un autre (= lien historique possible).
   */
  spouseCandidates(): Member[] {
    const me = this.members.find((m) => m.id === this.targetId);
    const myChildrenIds = new Set(
      this.members
        .filter((m) => m.fatherId === this.targetId || m.motherId === this.targetId)
        .map((m) => m.id),
    );
    return this.members
      .filter((m) =>
        m.id !== this.targetId &&
        (this.isSelf ? !m.isDeceased : true) &&
        m.id !== me?.fatherId &&
        m.id !== me?.motherId &&
        !myChildrenIds.has(m.id),
      )
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }

  /** Nom complet du membre cible (pour le titre quand l'admin agit pour quelqu'un d'autre). */
  memberDisplayName(): string {
    const m = this.members.find((x) => x.id === this.targetId);
    if (!m) return '';
    return `${m.firstName} ${m.lastName}`;
  }

  async addSpouse() {
    const v = this.spouseForm.getRawValue();
    const usingExisting = !!this.pickedSpouseId;
    if (!usingExisting && this.spouseForm.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Liaison…' });
    await loading.present();
    // Quand on agit pour quelqu'un d'autre (admin/chef), on transmet targetMemberId.
    const targetArg = this.isSelf ? {} : { targetMemberId: this.targetId };
    this.api
      .declareSpouse(
        usingExisting
          ? { ...targetArg, spouseId: this.pickedSpouseId }
          : {
              ...targetArg,
              firstName: v.firstName,
              lastName: v.lastName,
              nickname: v.nickname || undefined,
              gender: v.gender as 'M' | 'F' | 'O',
              birthDate: v.birthDate || undefined,
              phone: v.phone || undefined,
              email: v.email || undefined,
            },
      )
      .subscribe({
        next: async () => {
          await loading.dismiss();
          const t = await this.toastCtrl.create({
            message: usingExisting ? 'Conjoint(e) lié(e)' : 'Conjoint(e) créé(e) et lié(e) (inactif/ve)',
            color: 'success',
            duration: 2500,
          });
          await t.present();
          this.spouseForm.reset({
            firstName: '', lastName: '', nickname: '', gender: '', birthDate: '', phone: '', email: '',
          });
          this.pickedSpouseId = '';
          this.api.members().subscribe((list) => (this.members = list));
        },
        error: async (err: unknown) => {
          await loading.dismiss();
          const raw = (err as { error?: { message?: string | string[] } })?.error?.message;
          const msg = Array.isArray(raw) ? raw.join(' ') : raw || 'Erreur lors de la liaison du conjoint';
          const t = await this.toastCtrl.create({ message: String(msg), color: 'danger', duration: 3500 });
          await t.present();
        },
      });
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
          nickname: m.nickname ?? '',
          phone: m.phone ?? '',
          birthDate: m.birthDate ? m.birthDate.substring(0, 10) : '',
          gender: m.gender ?? '',
          paypalEmail: m.paypalEmail ?? '',
          fatherId: m.fatherId ?? '',
          motherId: m.motherId ?? '',
          mobileMoneyNumber: m.mobileMoneyNumber ?? '',
          mobileMoneyOperator: m.mobileMoneyOperator ?? '',
          preferredChannel: (m.preferredChannel ?? '') as '' | 'paypal' | 'mobile_money',
          isDeceased: !!m.isDeceased,
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

  targetHasPassword(): boolean {
    return this.memberHasPassword;
  }

  onActiveToggle(e: Event) {
    const checked = (e as CustomEvent).detail?.checked;
    this.form.controls.isActive.setValue(!!checked);
  }

  onDeceasedToggle(e: Event) {
    const checked = !!(e as CustomEvent).detail?.checked;
    this.form.controls.isDeceased.setValue(checked);
    if (!checked) {
      // Décocher → on vide aussi la date éventuelle.
      this.form.controls.deceasedAt.setValue('');
    }
    // Si on coche, on NE pré-remplit PAS la date (peut être inconnue, ex. ancêtre).
  }

  async submit() {
    if (this.form.invalid) return;
    const loading = await this.loadingCtrl.create({ message: 'Enregistrement…' });
    await loading.present();
    const v = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      firstName: v.firstName,
      lastName: v.lastName,
      nickname: v.nickname,
      phone: v.phone,
      birthDate: v.birthDate,
      gender: (v.gender as 'M' | 'F' | 'O') || undefined,
      paypalEmail: v.paypalEmail,
      fatherId: v.fatherId,
      motherId: v.motherId,
      mobileMoneyNumber: v.mobileMoneyNumber,
      mobileMoneyOperator: v.mobileMoneyOperator,
      preferredChannel: v.preferredChannel,
    };
    // Only include isDeceased + deceasedAt + isActive when the caller has the
    // right to set them, so the backend doesn't reject normal self-edits.
    if (this.canMarkDeceased()) {
      payload['isDeceased'] = v.isDeceased;
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
