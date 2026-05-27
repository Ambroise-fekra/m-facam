import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { TreeNode, TreePerson } from '../../core/models/api.models';

@Component({
  selector: 'app-genealogy',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/members" /></ion-buttons>
        <ion-title>Arbre généalogique</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding facam-bg">
      <p class="legend">
        Couples affichés côte à côte (<span class="m-tag">♂</span> père ❤️ <span class="f-tag">♀</span> mère),
        descendance indentée en dessous.
      </p>

      <ng-container *ngFor="let root of roots">
        <ng-container *ngTemplateOutlet="nodeTpl; context: { $implicit: root, depth: 0 }" />
      </ng-container>

      <ng-template #nodeTpl let-n let-depth="depth">
        <div class="tree-node" [style.padding-left.px]="depth === 0 ? 0 : 18">
          <!-- Couple line: bubble + (optional partner) -->
          <ng-container *ngIf="singleUnion(n) as su; else multiCard">
            <div class="couple-line">
              <ng-container *ngTemplateOutlet="bubbleTpl; context: { $implicit: n.person }" />
              <ng-container *ngIf="su.partner">
                <span class="heart">❤️</span>
                <ng-container *ngTemplateOutlet="bubbleTpl; context: { $implicit: su.partner, partner: true }" />
              </ng-container>
            </div>
            <!-- Children of this single union -->
            <ng-container *ngFor="let c of su.children">
              <ng-container *ngTemplateOutlet="nodeTpl; context: { $implicit: c, depth: depth + 1 }" />
            </ng-container>
          </ng-container>

          <!-- Multi-union or no union: render person alone, then unions blocks -->
          <ng-template #multiCard>
            <div class="couple-line">
              <ng-container *ngTemplateOutlet="bubbleTpl; context: { $implicit: n.person }" />
            </div>
            <div class="union-block" *ngFor="let u of n.unions">
              <div class="union-header">
                ❤️
                <span *ngIf="u.partner">avec {{ u.partner.firstName }} {{ u.partner.lastName }}</span>
                <span *ngIf="!u.partner" class="muted">(autre parent inconnu)</span>
              </div>
              <ng-container *ngFor="let c of u.children">
                <ng-container *ngTemplateOutlet="nodeTpl; context: { $implicit: c, depth: depth + 1 }" />
              </ng-container>
            </div>
          </ng-template>
        </div>
      </ng-template>

      <!-- Bubble: avatar + name + gender icon + year -->
      <ng-template #bubbleTpl let-p let-partner="partner">
        <div class="bubble" [class.male]="p.gender === 'M'" [class.female]="p.gender === 'F'" [class.other]="p.gender === 'O' || !p.gender" [class.partner-bubble]="partner">
          <div class="avatar">
            <img *ngIf="p.photo" [src]="p.photo" alt="photo" />
            <span *ngIf="!p.photo">{{ initials(p) }}</span>
          </div>
          <div class="info">
            <div class="name">
              <span class="gender-ico">{{ genderIcon(p.gender) }}</span>
              {{ p.firstName }} {{ p.lastName }}
            </div>
            <div class="meta" *ngIf="p.birthDate">{{ p.birthDate | date: 'yyyy' }}</div>
          </div>
        </div>
      </ng-template>

      <p class="empty" *ngIf="!roots.length">
        Aucun membre référencé.<br>
        Ajoutez vos proches dans <strong>Famille</strong> et renseignez la filiation (père/mère) ainsi que le sexe pour voir apparaître l'arbre.
      </p>
    </ion-content>
  `,
  styles: [
    `
      .facam-bg { --background: #0f172a; }
      .legend { color: #94a3b8; font-size: .82rem; margin: 0 0 14px; line-height: 1.5; }
      .legend .m-tag { color: #60a5fa; font-weight: 700; }
      .legend .f-tag { color: #f9a8d4; font-weight: 700; }

      .tree-node {
        position: relative;
        margin: 8px 0;
        border-left: 2px solid rgba(255,255,255,.10);
      }
      .tree-node:first-child { border-left: none; }
      /* Hide the connector for top-level roots so we don't show a hanging line. */
      :host > ion-content > .tree-node { border-left: none; padding-left: 0 !important; }

      .couple-line {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .heart { font-size: 1.05rem; opacity: .9; }

      .bubble {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(255,255,255,.07);
        border: 1px solid rgba(255,255,255,.12);
        padding: 9px 12px;
        border-radius: 14px;
        color: #f1f5f9;
        min-width: 0;
      }
      .bubble.male   { border-left: 4px solid #60a5fa; } /* blue */
      .bubble.female { border-left: 4px solid #f472b6; } /* pink */
      .bubble.other  { border-left: 4px solid #94a3b8; } /* grey */
      .bubble.partner-bubble { background: rgba(255,255,255,.04); }

      .avatar {
        width: 36px; height: 36px; border-radius: 50%;
        background: var(--facam-gradient);
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: .85rem;
        overflow: hidden; flex-shrink: 0;
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .info { min-width: 0; }
      .name { color: #fff; font-weight: 600; font-size: .95rem; }
      .gender-ico { margin-right: 4px; opacity: .9; }
      .meta { color: rgba(255,255,255,.55); font-size: .78rem; }

      .union-block {
        margin: 6px 0 10px 14px;
        padding-left: 12px;
        border-left: 1px dashed rgba(255,255,255,.18);
      }
      .union-header {
        color: #cbd5e1; font-size: .85rem; margin: 6px 0 6px;
      }
      .union-header .muted { color: #94a3b8; font-style: italic; }

      .empty { color: #94a3b8; text-align: center; padding: 36px 12px; line-height: 1.6; }
    `,
  ],
})
export class GenealogyPage implements OnInit {
  private readonly api = inject(ApiService);
  roots: TreeNode[] = [];

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    this.api.tree().subscribe((r) => (this.roots = r));
  }

  /** Returns the single union when the person has exactly one union, else null. */
  singleUnion(n: TreeNode) {
    return n.unions.length === 1 ? n.unions[0] : null;
  }

  initials(p: TreePerson) {
    return `${p.firstName.charAt(0)}${p.lastName.charAt(0)}`.toUpperCase();
  }

  genderIcon(g: TreePerson['gender']): string {
    return g === 'M' ? '♂' : g === 'F' ? '♀' : '⚪';
  }
}
