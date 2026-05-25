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
import { TreeNode } from '../../core/models/api.models';

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
      <ng-container *ngFor="let root of roots">
        <ng-container *ngTemplateOutlet="node; context: { $implicit: root, depth: 0 }" />
      </ng-container>

      <ng-template #node let-n let-depth="depth">
        <div class="tree-node" [style.margin-left.px]="depth * 24">
          <div class="bubble">
            <div class="avatar">
              <img *ngIf="n.photo" [src]="n.photo" alt="photo" />
              <span *ngIf="!n.photo">{{ initials(n) }}</span>
            </div>
            <div class="name">{{ n.firstName }} {{ n.lastName }}</div>
            <div class="meta" *ngIf="n.birthDate">{{ n.birthDate | date:'yyyy' }}</div>
          </div>
          <ng-container *ngFor="let child of n.children">
            <ng-container *ngTemplateOutlet="node; context: { $implicit: child, depth: depth + 1 }" />
          </ng-container>
        </div>
      </ng-template>

      <p class="empty" *ngIf="!roots.length">Aucun membre référencé pour le moment.</p>
    </ion-content>
  `,
  styles: [
    `
      .facam-bg { --background: #0f172a; }
      .tree-node { position: relative; padding-left: 12px; border-left: 2px solid rgba(255,255,255,.15); margin: 6px 0; }
      .bubble { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); padding: 12px; border-radius: 14px; color: white; }
      .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--facam-gradient); display: flex; align-items: center; justify-content: center; font-weight: 700; overflow: hidden; flex-shrink: 0; }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .meta { color: rgba(255,255,255,.6); font-size: .85rem; }
      .empty { color: rgba(255,255,255,.6); text-align: center; padding: 30px; }
    `,
  ],
})
export class GenealogyPage implements OnInit {
  private readonly api = inject(ApiService);
  roots: TreeNode[] = [];

  ngOnInit() {
    this.api.tree().subscribe((r) => (this.roots = r));
  }

  initials(n: TreeNode) {
    return `${n.firstName.charAt(0)}${n.lastName.charAt(0)}`.toUpperCase();
  }
}
