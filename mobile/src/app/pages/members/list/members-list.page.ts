import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ActionSheetController,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { Browser } from '@capacitor/browser';
import { ApiService, FamilyInfo } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WhatsappService } from '../../../core/services/whatsapp.service';
import { ImageService } from '../../../core/services/image.service';
import { Member } from '../../../core/models/api.models';

@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Famille</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <!-- Carte famille : logo + identifiant + WhatsApp -->
      <div class="facam-card fam" *ngIf="info">
        <div class="fam-head">
          <div class="fam-logo" [class.editable]="auth.isAdmin" (click)="auth.isAdmin && changeLogo()">
            <img *ngIf="info.photo" [src]="info.photo" alt="logo" />
            <span *ngIf="!info.photo">🏠</span>
          </div>
          <div>
            <div class="fam-name">{{ info.name }}</div>
            <div class="ident" (click)="copyId()">{{ info.identifier }} 📋</div>
            <div class="fam-count" *ngIf="info.membersCount != null">
              👥 {{ info.membersCount }} membre(s)<span *ngIf="info.activeMembersCount != null"> dont <strong>{{ info.activeMembersCount }} actif(s)</strong></span>
            </div>
          </div>
        </div>
        <p *ngIf="auth.isAdmin" class="logo-hint" (click)="changeLogo()">📷 {{ info.photo ? 'Changer' : 'Ajouter' }} le logo de la famille</p>

        <div class="chief-row">
          <span class="chief-label">⭐ Chef de famille :</span>
          <strong *ngIf="info.chief">{{ info.chief.firstName }} {{ info.chief.lastName }}</strong>
          <span *ngIf="!info.chief" class="t-muted">non désigné</span>
          <ion-button *ngIf="auth.isAdmin" size="small" fill="clear" (click)="pickChief()">
            {{ info.chief ? 'Changer' : 'Désigner' }}
          </ion-button>
        </div>

        <ion-button *ngIf="info.whatsappUrl" expand="block" class="wa" (click)="openWhatsapp()">
          💬 Rejoindre le groupe WhatsApp
        </ion-button>
      </div>

      <ion-button *ngIf="auth.isAdmin" routerLink="/members/add" expand="block" class="ion-margin-bottom">
        + Ajouter un membre
      </ion-button>
      <ion-button [routerLink]="['/members', 'edit', auth.snapshot?.member?.id]" fill="outline" expand="block" class="ion-margin-bottom">
        ✏️ Mon profil
      </ion-button>
      <div class="sub-actions">
        <ion-button routerLink="/members/birthdays" fill="outline" size="small">🎂 Anniversaires</ion-button>
        <ion-button routerLink="/genealogy" fill="outline" size="small">🌳 Arbre généalogique</ion-button>
      </div>

      <div class="member" *ngFor="let m of members">
        <div class="avatar" [class.editable]="canEdit(m)" (click)="canEdit(m) && changePhoto(m); $event.stopPropagation()">
          <img *ngIf="m.photo" [src]="m.photo" alt="photo" />
          <span *ngIf="!m.photo">{{ initials(m) }}</span>
          <span *ngIf="canEdit(m)" class="cam">📷</span>
        </div>
        <div class="info clickable" (click)="openView(m)" role="button" [attr.aria-label]="'Voir la fiche de ' + m.firstName + ' ' + m.lastName">
          <div class="name">
            {{ m.firstName }} {{ m.lastName }}
            <span *ngIf="m.role === 'admin'" class="badge badge-proposed">👑 Admin</span>
            <span *ngIf="m.id === auth.snapshot?.member?.id" class="badge badge-active">Vous</span>
            <span *ngIf="m.isBlocked" class="badge badge-rejected">🚫 Bloqué</span>
            <span *ngIf="m.isDeceased" class="badge badge-closed">
              🕯️ Décédé(e)<span *ngIf="m.deceasedAt"> le {{ m.deceasedAt | date: 'dd/MM/yyyy' }}</span>
            </span>
            <span *ngIf="m.isActive === false && !m.isDeceased" class="badge badge-closed">💤 Inactif</span>
          </div>
          <div class="rel blocked-note" *ngIf="m.isBlocked && auth.isAdmin">
            Prêt impayé à l'échéance. <a (click)="unblock(m); $event.stopPropagation()">Débloquer →</a>
          </div>
          <div class="rel nologin" *ngIf="!m.canLogin && !m.isDeceased && canManageLogin() && m.id !== auth.snapshot?.member?.id">
            🔒 Ne peut pas se connecter.
            <a (click)="enableLogin(m); $event.stopPropagation()">Activer la connexion →</a>
          </div>
          <div class="rel pending-invite" *ngIf="m.hasPendingInvite && !m.isDeceased && canManageLogin()">
            ⏳ Invitation envoyée, en attente.
            <a (click)="enableLogin(m); $event.stopPropagation()">Renvoyer l'invitation →</a>
          </div>
          <div class="rel email" *ngIf="auth.isAdmin && m.email">✉️ {{ m.email }}</div>
          <div class="rel" *ngIf="m.fatherName || m.motherName">⬆️ Parents : {{ parents(m) }}</div>
          <div class="rel children" *ngIf="m.children?.length">⬇️ Enfants : {{ childrenNames(m) }}</div>
        </div>
        <div class="row-actions">
          <a *ngIf="canEdit(m)" class="edit-mini" [routerLink]="['/members', 'edit', m.id]" title="Modifier le profil" (click)="$event.stopPropagation()">✏️</a>
          <button *ngIf="m.phone" class="wa-mini" (click)="notify(m); $event.stopPropagation()" title="Prévenir par WhatsApp">💬</button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .fam { margin-bottom: 16px; }
      .fam-head { display: flex; align-items: center; gap: 14px; }
      .fam-logo { width: 60px; height: 60px; border-radius: 16px; background: rgba(255,255,255,.08); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; overflow: hidden; flex-shrink: 0; }
      .fam-logo img { width: 100%; height: 100%; object-fit: cover; }
      .fam-logo.editable { cursor: pointer; border: 1px dashed rgba(255,255,255,.3); }
      .fam-name { color: #fff; font-weight: 800; font-size: 1.2rem; }
      .ident { color: #cbd5e1; font-family: 'Space Grotesk', monospace; cursor: pointer; font-size: .9rem; margin-top: 2px; }
      .fam-count { color: #94a3b8; font-size: .85rem; margin-top: 3px; }
      .fam-count strong { color: #fff; }
      .logo-hint { color: #a5b4fc; font-size: .82rem; cursor: pointer; margin: 10px 0; }
      .chief-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; color: #cbd5e1; margin: 6px 0 4px; font-size: .92rem; }
      .chief-row .chief-label { color: #94a3b8; }
      .chief-row strong { color: #fff; }
      .chief-row ion-button { --color: #a5b4fc; margin-left: auto; }
      .wa { --background: #25D366; --background-activated: #1da851; --color: #062e16; font-weight: 700; }
      .member { display: flex; gap: 14px; align-items: flex-start; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 14px; margin-bottom: 10px; }
      .avatar { position: relative; width: 48px; height: 48px; border-radius: 50%; background: var(--facam-gradient); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .avatar.editable { cursor: pointer; }
      .avatar .cam { position: absolute; right: -2px; bottom: -2px; font-size: .7rem; background: #0f172a; border-radius: 50%; padding: 1px 2px; }
      .info { flex: 1; }
      .info.clickable { cursor: pointer; }
      .info.clickable:hover .name { color: #a5b4fc; }
      .name { color: #fff; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; transition: color .15s ease; }
      .rel { color: #94a3b8; font-size: .85rem; margin-top: 4px; }
      .rel.email { color: #cbd5e1; }
      .rel.children { color: #cbd5e1; }
      .rel.blocked-note { color: #fca5a5; }
      .rel.blocked-note a { color: #a5b4fc; cursor: pointer; text-decoration: underline; }
      .rel.nologin { color: #cbd5e1; }
      .rel.nologin a { color: #a5b4fc; cursor: pointer; text-decoration: underline; }
      .rel.pending-invite { color: #fbbf24; }
      .rel.pending-invite a { color: #a5b4fc; cursor: pointer; text-decoration: underline; }
      .sub-actions { display: flex; gap: 10px; margin-bottom: 16px; }
      .sub-actions ion-button { flex: 1; --border-radius: 12px; }
      .row-actions { display: flex; flex-direction: column; gap: 8px; align-self: center; flex-shrink: 0; }
      .edit-mini { display: flex; align-items: center; justify-content: center; background: rgba(99,102,241,.18); border: 1px solid rgba(99,102,241,.4); border-radius: 10px; width: 38px; height: 38px; font-size: 1.05rem; cursor: pointer; text-decoration: none; }
      .wa-mini { background: rgba(37,211,102,.18); border: 1px solid rgba(37,211,102,.4); color: #25D366; border-radius: 10px; width: 38px; height: 38px; font-size: 1.1rem; cursor: pointer; flex-shrink: 0; }
    `,
  ],
})
export class MembersListPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toastCtrl = inject(ToastController);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly alertCtrl = inject(AlertController);
  private readonly whatsapp = inject(WhatsappService);
  private readonly images = inject(ImageService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  members: Member[] = [];
  info: FamilyInfo | null = null;

  ngOnInit() {
    this.reload();
  }

  ionViewWillEnter() {
    this.reload();
  }

  private reload() {
    this.api.members().subscribe((m) => (this.members = m));
    this.api.familyInfo().subscribe((i) => (this.info = i));
  }

  initials(m: Member) {
    return `${m.firstName.charAt(0)}${m.lastName.charAt(0)}`.toUpperCase();
  }
  openView(m: Member) {
    this.router.navigate(['/members', 'view', m.id]);
  }
  parents(m: Member) {
    return [m.fatherName, m.motherName].filter(Boolean).join(' · ') || '—';
  }
  childrenNames(m: Member) {
    return (m.children ?? []).map((c) => c.name).join(', ');
  }
  canEdit(m: Member) {
    return this.auth.isAdmin || m.id === this.auth.snapshot?.member?.id;
  }

  /** Offers "recrop existing" vs "pick new" when a photo already exists. */
  private async chooseImage(existing: string | null | undefined, header: string): Promise<string | null> {
    if (!existing) return this.images.pickCropped();
    const sheet = await this.actionSheetCtrl.create({
      header,
      buttons: [
        { text: '📐 Recadrer la photo actuelle', data: 'crop' },
        { text: '🖼️ Choisir une nouvelle photo', data: 'pick' },
        { text: 'Annuler', role: 'cancel' },
      ],
    });
    await sheet.present();
    const { data, role } = await sheet.onWillDismiss<string>();
    if (role === 'cancel' || !data) return null;
    return data === 'crop' ? this.images.cropExisting(existing) : this.images.pickCropped();
  }

  async changePhoto(m: Member) {
    const dataUrl = await this.chooseImage(m.photo, `Photo de ${m.firstName}`);
    if (!dataUrl) return;
    this.api.setMemberPhoto(m.id, dataUrl).subscribe(async () => {
      const t = await this.toastCtrl.create({ message: 'Photo mise à jour', color: 'success', duration: 1500 });
      await t.present();
      this.reload();
    });
  }

  async changeLogo() {
    const dataUrl = await this.chooseImage(this.info?.photo, 'Logo de la famille');
    if (!dataUrl) return;
    this.api.updateFamily({ photo: dataUrl }).subscribe(async () => {
      const t = await this.toastCtrl.create({ message: 'Logo mis à jour', color: 'success', duration: 1500 });
      await t.present();
      this.api.familyInfo().subscribe((i) => (this.info = i));
    });
  }

  async openWhatsapp() {
    if (this.info?.whatsappUrl) await Browser.open({ url: this.info.whatsappUrl });
  }

  notify(m: Member) {
    const fam = this.info?.name ?? 'la famille';
    this.whatsapp.share(`Bonjour ${m.firstName}, message de ${fam} (Family Cash Management).`, m.phone);
  }

  unblock(m: Member) {
    this.api.unblockMember(m.id).subscribe(async () => {
      const t = await this.toastCtrl.create({
        message: `${m.firstName} ${m.lastName} débloqué(e)`,
        color: 'success',
        duration: 1800,
      });
      await t.present();
      this.reload();
    });
  }

  /** Admin OR chef de famille can enable login for a member. */
  canManageLogin(): boolean {
    const meId = this.auth.snapshot?.member?.id;
    return this.auth.isAdmin || (!!meId && meId === this.info?.chief?.id);
  }

  async enableLogin(m: Member) {
    // Guard rails: even if the visibility check elsewhere is bypassed, the
    // server-side checks should never go through silently.
    if (m.isDeceased) {
      const t = await this.toastCtrl.create({
        message: `${m.firstName} ${m.lastName} est marqué(e) comme décédé(e) : la connexion ne peut pas être activée.`,
        color: 'warning',
        duration: 3500,
      });
      await t.present();
      return;
    }
    if (!m.email && !m.phone) {
      const alert = await this.alertCtrl.create({
        header: '📞 Coordonnées manquantes',
        message:
          `<strong>${m.firstName} ${m.lastName}</strong> n'a ni email ni téléphone enregistré. ` +
          `Ajoutez au moins un numéro de téléphone (ou un email) via « ✏️ Modifier le profil » avant d'activer la connexion.`,
        buttons: [{ text: 'OK', role: 'cancel' }],
      });
      await alert.present();
      return;
    }
    this.api.enableMemberLogin(m.id).subscribe({
      next: async (res) => {
        const identifier = this.auth.snapshot?.family.identifier ?? '';
        const link = `${window.location.origin}/auth/accept-invite?identifier=${encodeURIComponent(identifier)}&token=${res.inviteToken}`;
        const famName = this.info?.name ?? 'notre famille';
        const hasPhone = !!(m.phone && m.phone.trim());
        const channel = hasPhone
          ? `<strong>WhatsApp</strong> (${m.phone}) ou copier le lien`
          : `<strong>email</strong> ou en copiant le lien (pas de téléphone enregistré pour WhatsApp)`;
        const setsEmailNote = !m.email
          ? `<br><br>ℹ️ Ce membre n'a pas encore d'email : il en renseignera un à l'ouverture du lien (nécessaire pour se connecter ensuite).`
          : '';
        const buttons: Array<{ text: string; role?: string; handler?: () => void }> = [
          {
            text: '📋 Copier le lien',
            handler: () => {
              navigator.clipboard.writeText(link).then(async () => {
                const t = await this.toastCtrl.create({ message: 'Lien copié', color: 'success', duration: 1500 });
                await t.present();
              });
            },
          },
        ];
        if (hasPhone) {
          buttons.push({
            text: '💬 Inviter par WhatsApp',
            handler: () => {
              const msg =
                `Bonjour ${m.firstName} 👋\n\n` +
                `Tu es invité(e) à rejoindre *${famName}* sur Family Cash Management — la caisse familiale de solidarité.\n\n` +
                `Ouvre ce lien pour définir ton mot de passe${!m.email ? ' et renseigner ton email' : ''} :\n${link}\n\n` +
                `Tu te connecteras ensuite avec :\n• Identifiant famille : *${identifier}*\n• Ton email\n• Ton mot de passe\n\n` +
                `Une fois connecté(e), tu pourras aussi déclarer tes enfants depuis ton profil — l'admin les activera plus tard.\n\n` +
                `À très vite ! 💛`;
              this.whatsapp.share(msg, m.phone);
            },
          });
        }
        buttons.push({ text: 'Fermer', role: 'cancel' });
        const alert = await this.alertCtrl.create({
          header: '🔓 Connexion activée',
          message:
            `Un lien d'invitation a été créé pour <strong>${m.firstName} ${m.lastName}</strong>. ` +
            `Partagez-le via ${channel}.${setsEmailNote}`,
          buttons,
        });
        await alert.present();
        this.reload();
      },
      error: async (err: unknown) => {
        const raw = (err as { error?: { message?: string | string[] } })?.error?.message;
        const msg = Array.isArray(raw) ? raw.join(' ') : raw || 'Impossible d\'activer la connexion pour ce membre.';
        const t = await this.toastCtrl.create({
          message: String(msg),
          color: 'danger',
          duration: 4500,
        });
        await t.present();
      },
    });
  }

  async pickChief() {
    const currentId = this.info?.chief?.id ?? '';
    const inputs = [
      { type: 'radio' as const, label: '— Aucun chef de famille —', value: '', checked: !currentId },
      ...this.members
        .filter((m) => m.role !== 'admin' ? true : true) // include admin too — admin can be chief
        .map((m) => ({
          type: 'radio' as const,
          label: `${m.firstName} ${m.lastName}`,
          value: m.id,
          checked: m.id === currentId,
        })),
    ];
    const alert = await this.alertCtrl.create({
      header: 'Chef de famille',
      message: 'Choisissez un membre actif. Le chef de famille apparaît sur le tableau de bord.',
      inputs,
      buttons: [
        { text: 'Annuler', role: 'cancel' },
        { text: 'Enregistrer', role: 'confirm' },
      ],
    });
    await alert.present();
    const { role, data } = await alert.onDidDismiss<{ values?: string }>();
    if (role !== 'confirm') return;
    const chiefMemberId = data?.values || null;
    this.api.updateFamily({ chiefMemberId }).subscribe(async () => {
      const t = await this.toastCtrl.create({
        message: chiefMemberId ? 'Chef de famille désigné' : 'Chef de famille retiré',
        color: 'success',
        duration: 1700,
      });
      await t.present();
      this.reload();
    });
  }

  async copyId() {
    if (!this.info) return;
    try {
      await navigator.clipboard.writeText(this.info.identifier);
      const t = await this.toastCtrl.create({ message: 'Identifiant copié', color: 'success', duration: 1500 });
      await t.present();
    } catch {
      /* clipboard may be unavailable */
    }
  }
}
