import { Injectable } from '@angular/core';

export type SupportedCurrency = 'EUR' | 'XAF';

/**
 * Affichage double devise EUR / FCFA.
 *
 * La parité est FIXE : 1 EUR = 655,957 XAF (Franc CFA BEAC, Congo et zone
 * d'Afrique centrale). Côté backend les montants canoniques sont stockés en
 * EUR, mais chaque ligne (cotisation, remboursement, etc.) conserve aussi le
 * couple (originalAmount, originalCurrency) tel que saisi par l'utilisateur.
 *
 * Règle d'affichage :
 *  - L'historique affiche d'abord la devise d'origine (« 10 000 FCFA » si
 *    le membre a payé en FCFA, « 15,00 € » s'il a payé en EUR), avec
 *    l'équivalent dans l'autre devise en sous-titre.
 *  - Les agrégats (caisse, solde) restent en EUR canonique avec FCFA en
 *    sous-titre, car ils combinent des contributions des deux devises.
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

  /** Convertit un montant en FCFA vers EUR (2 décimales). */
  toEur(amountXaf: string | number | null | undefined): number {
    const n = typeof amountXaf === 'string' ? parseFloat(amountXaf) : amountXaf ?? 0;
    if (!isFinite(n)) return 0;
    return Math.round((n / CurrencyService.EUR_TO_XAF) * 100) / 100;
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

  /** Court : juste EUR formaté. */
  eur(amountEur: string | number | null | undefined): string {
    const n = typeof amountEur === 'string' ? parseFloat(amountEur) : amountEur ?? 0;
    return `${this.fmt(isFinite(n) ? n : 0, 2)} €`;
  }

  /**
   * Affichage fidèle d'une ligne d'historique en respectant la devise
   * d'origine : "10 000 FCFA (≈ 15,25 €)" ou "15,00 € (~9 839 FCFA)".
   * - originalAmount = ce que le membre a réellement saisi/payé
   * - originalCurrency = sa devise (EUR ou XAF)
   * - amountEur = montant canonique en EUR (utilisé en fallback si
   *   originalAmount est manquant — ex. anciennes lignes pré-migration)
   */
  asOriginal(
    originalAmount: string | number | null | undefined,
    originalCurrency: SupportedCurrency | null | undefined,
    amountEur: string | number | null | undefined,
  ): string {
    if (originalCurrency === 'XAF' && originalAmount != null) {
      const orig = typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount;
      const eur = this.toEur(orig);
      return `${this.fmt(orig)} FCFA (≈ ${this.fmt(eur, 2)} €)`;
    }
    // EUR par défaut (ou fallback)
    const eur =
      originalCurrency === 'EUR' && originalAmount != null
        ? (typeof originalAmount === 'string' ? parseFloat(originalAmount) : originalAmount)
        : typeof amountEur === 'string'
        ? parseFloat(amountEur)
        : amountEur ?? 0;
    return `${this.fmt(eur, 2)} € (~${this.fmt(this.toXaf(eur))} FCFA)`;
  }
}
