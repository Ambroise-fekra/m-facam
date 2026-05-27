import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { Notification } from '../../core/models/api.models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Notifications</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding facam-bg">
      <ion-list lines="none">
        <ion-item *ngFor="let n of items" (click)="open(n)" button>
          <ion-label>
            <h3>{{ n.title }}</h3>
            <p>{{ n.body }}</p>
            <p class="time">{{ n.createdAt | date:'medium' }}</p>
          </ion-label>
          <ion-badge *ngIf="!n.readAt" slot="end" color="tertiary">Nouveau</ion-badge>
        </ion-item>
        <p *ngIf="!items.length" class="empty">Aucune notification.</p>
      </ion-list>
    </ion-content>
  `,
  styles: [
    `
      .facam-bg { --background: #0f172a; }
      ion-item { --background: rgba(255,255,255,.05); --color: white; border-radius: 14px; margin-bottom: 6px; }
      .time { color: rgba(255,255,255,.5); font-size: .8rem; }
      .empty { color: rgba(255,255,255,.6); text-align: center; padding: 30px; }
    `,
  ],
})
export class NotificationsPage implements OnInit {
  private readonly api = inject(ApiService);
  items: Notification[] = [];

  ngOnInit() {
    this.refresh();
  }

  ionViewWillEnter() {
    this.refresh();
  }

  refresh() {
    this.api.notifications().subscribe((n) => (this.items = n));
  }

  open(n: Notification) {
    if (n.readAt) return;
    this.api.markNotificationRead(n.id).subscribe(() => {
      n.readAt = new Date().toISOString();
    });
  }
}
