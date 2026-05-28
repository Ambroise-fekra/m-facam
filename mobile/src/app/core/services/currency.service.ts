import { Injectable } from '@angular/core';

/**
 * Affichage double devise EUR / FCFA.
 *
 * La parité est FIXE : 1 EUR = 655,957 XAF (Franc CFA BEAC, Congo et zone
 * d'Afrique centrale). Tous les montants sont stockés en EUR côté backend ;
 * cette classe ne fait que l'affichage.
 */
@Injectable({ providedIn: 'root' })
export class CurrencyService {
  /** Taux fixe officiel BEAC, immuable. */
  static readonly EUR_TO_XAF = 655.957;

  /** Convertit un montant en EUR (string ou number) en FCFA (arrondi entier). */
  toXaf(amountEur: string | number | null | undefined): number {
    const n = typeof amountEur === 'string' ? parseFloat(amountEur) : amountEur ?? 0;
    if (!isFinite(n)) return 0;
    return Math.round(n * CurrencyService.EUR_TO_XAF);
  }

  /** "1 234,56" — séparateur d'espace insécable comme en français. */
  private fmt(n: number, decimals = 0): string {
    return n.toLocaleString('fr-FR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Format complet "X,XX € (~Y FCFA)".
   * - On garde 2 décimales pour l'euro et 0 pour le FCFA (les centimes
   *   FCFA n'ont pas de sens à l'usage).
   * - Si le montant est nul ou invalide, renvoie "0 € (~0 FCFA)".
   */
  eurXaf(amountEur: string | number | null | undefined): string {
    const n = typeof amountEur === 'string' ? parseFloat(amountEur) : amountEur ?? 0;
    const safe = isFinite(n) ? n : 0;
    return `${this.fmt(safe, 2)} € (~${this.fmt(this.toXaf(safe))} FCFA)`;
  }

  /** Court : juste FCFA arrondi, utile en sous-titre. */
  xaf(amountEur: string | number | null | undefined): string {
    return `${this.fmt(this.toXaf(amountEur))} FCFA`;
  }
}
