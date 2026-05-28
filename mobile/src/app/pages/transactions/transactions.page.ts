import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ApiService } from '../../core/services/api.service';
import { CurrencyService } from '../../core/services/currency.service';
import { MyBalance, Transaction } from '../../core/models/api.models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-back-button defaultHref="/dashboard" /></ion-buttons>
        <ion-title>Mes transactions</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="facam-bg ion-padding">
      <!-- Solde personnel mis en avant -->
      <div class="balance-hero" *ngIf="balance">
        <span class="lbl">Ma part dans la caisse</span>
        <span class="facam-balance-amount">{{ currency.eurXaf(balance.balance) }}</span>
      </div>

      <div class="totals">
        <div class="tot credit">
          <span>Cotisations (crédit)</span>
          <strong>+{{ currency.eurXaf(totalCredit) }}</strong>
        </div>
        <div class="tot debit">
          <span>Allocations (débit)</span>
          <strong>-{{ currency.eurXaf(totalDebit) }}</strong>
        </div>
      </div>

      <div class="tx" *ngFor="let t of transactions">
        <div class="ic" [class.credit]="t.type === 'credit'" [class.debit]="t.type === 'debit'">
          {{ t.type === 'credit' ? '💰' : '🎉' }}
        </div>
        <div class="info">
          <div class="label">{{ t.label }}</div>
          <div class="date">{{ t.createdAt | date: 'medium' }}</div>
        </div>
        <div class="amt" [class.credit]="t.type === 'credit'" [class.debit]="t.type === 'debit'">
          {{ t.type === 'credit' ? '+' : '-' }}{{ currency.asOriginal(t.originalAmount, t.originalCurrency, t.amount) }}
        </div>
      </div>

      <p *ngIf="!transactions.length" class="t-muted empty">Aucune transaction pour le moment.</p>
    </ion-content>
  `,
  styles: [
    `
      .balance-hero { background: var(--facam-gradient-soft); border: 1px solid rgba(99,102,241,.3); border-radius: 20px; padding: 18px; text-align: center; margin-bottom: 14px; }
      .balance-hero .lbl { display: block; color: #cbd5e1; font-size: .85rem; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
      .totals { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
      .tot { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 14px; text-align: center; }
      .tot span { display: block; color: #94a3b8; font-size: .82rem; }
      .tot strong { font-size: 1.4rem; }
      .tot.credit strong { color: #34d399; }
      .tot.debit strong { color: #f472b6; }
      .tx { display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 12px; margin-bottom: 8px; }
      .ic { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
      .ic.credit { background: rgba(16,185,129,.15); }
      .ic.debit { background: rgba(236,72,153,.15); }
      .info { flex: 1; }
      .label { color: #fff; font-weight: 600; }
      .date { color: #94a3b8; font-size: .8rem; }
      .amt { font-weight: 800; font-size: 1.05rem; }
      .amt.credit { color: #34d399; }
      .amt.debit { color: #f472b6; }
      .empty { text-align: center; padding: 24px; }
    `,
  ],
})
export class TransactionsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly currency = inject(CurrencyService);
  transactions: Transaction[] = [];
  balance: MyBalance | null = null;
  totalCredit = '0.00';
  totalDebit = '0.00';

  ngOnInit() {
    this.load();
  }

  ionViewWillEnter() {
    this.load();
  }

  private load() {
    forkJoin({ tx: this.api.transactions(), bal: this.api.myBalance() }).subscribe(({ tx, bal }) => {
      this.transactions = tx;
      this.balance = bal;
      this.totalCredit = tx.filter((x) => x.type === 'credit').reduce((s, x) => s + Number(x.amount), 0).toFixed(2);
      this.totalDebit = tx.filter((x) => x.type === 'debit').reduce((s, x) => s + Number(x.amount), 0).toFixed(2);
    });
  }
}
