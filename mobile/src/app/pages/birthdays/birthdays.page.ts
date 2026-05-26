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
import { Birthday } from '../../core/models/api.models';

@Component({
  selector: 'app-birthdays',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/members" /></ion-buttons>
        <ion-title>Anniversaires</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <p class="t-muted intro">🎂 Les anniversaires du mois en cours et du mois prochain.</p>

      <h2 class="g-h2">Ce mois-ci — {{ monthName(currentMonth) }}</h2>
      <p *ngIf="!thisMonth.length" class="t-muted empty">Aucun anniversaire ce mois-ci.</p>
      <div class="bday" *ngFor="let b of thisMonth" [class.today]="isToday(b)">
        <div class="avatar">
          <img *ngIf="b.photo" [src]="b.photo" alt="photo" />
          <span *ngIf="!b.photo">{{ initials(b) }}</span>
        </div>
        <div class="info">
          <div class="name">
            {{ b.firstName }} {{ b.lastName }}
            <span *ngIf="isToday(b)" class="badge badge-active">🎉 Aujourd'hui</span>
          </div>
          <div class="meta">{{ b.day }} {{ monthName(b.month) }} · fête ses {{ b.turningAge }} ans</div>
        </div>
        <div class="cake">🎂</div>
      </div>

      <h2 class="g-h2 next">Le mois prochain — {{ monthName(nextMonth) }}</h2>
      <p *ngIf="!nextMonthList.length" class="t-muted empty">Aucun anniversaire le mois prochain.</p>
      <div class="bday" *ngFor="let b of nextMonthList">
        <div class="avatar">
          <img *ngIf="b.photo" [src]="b.photo" alt="photo" />
          <span *ngIf="!b.photo">{{ initials(b) }}</span>
        </div>
        <div class="info">
          <div class="name">{{ b.firstName }} {{ b.lastName }}</div>
          <div class="meta">{{ b.day }} {{ monthName(b.month) }} · fêtera ses {{ b.turningAge }} ans</div>
        </div>
        <div class="cake">🎂</div>
      </div>

      <p class="t-muted foot">💡 La date de naissance se renseigne dans le profil de chaque membre.</p>
    </ion-content>
  `,
  styles: [
    `
      .intro { margin: 0 0 10px; }
      .g-h2 { color: #fff; font-size: 1.05rem; margin: 18px 0 10px; }
      .g-h2.next { margin-top: 26px; }
      .empty { padding: 6px 0 4px; }
      .bday { display: flex; gap: 14px; align-items: center; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 12px 14px; margin-bottom: 10px; }
      .bday.today { border-color: rgba(251,191,36,.5); background: rgba(251,191,36,.1); }
      .avatar { width: 46px; height: 46px; border-radius: 50%; background: var(--facam-gradient); color: #fff; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .info { flex: 1; }
      .name { color: #fff; font-weight: 700; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .meta { color: #fbbf24; font-size: .85rem; margin-top: 3px; font-weight: 600; }
      .cake { font-size: 1.5rem; }
      .foot { margin-top: 22px; font-size: .82rem; }
    `,
  ],
})
export class BirthdaysPage implements OnInit {
  private readonly api = inject(ApiService);

  thisMonth: Birthday[] = [];
  nextMonthList: Birthday[] = [];

  private readonly months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
  ];

  get currentMonth() {
    return new Date().getMonth() + 1;
  }
  get nextMonth() {
    return this.currentMonth === 12 ? 1 : this.currentMonth + 1;
  }

  ngOnInit() {
    this.api.birthdays().subscribe((list) => {
      this.thisMonth = list.filter((b) => b.isThisMonth);
      this.nextMonthList = list.filter((b) => !b.isThisMonth);
    });
  }

  monthName(m: number) {
    return this.months[m - 1] ?? '';
  }
  initials(b: Birthday) {
    return `${b.firstName.charAt(0)}${b.lastName.charAt(0)}`.toUpperCase();
  }
  isToday(b: Birthday) {
    const now = new Date();
    return b.isThisMonth && b.day === now.getDate() && b.month === now.getMonth() + 1;
  }
}
