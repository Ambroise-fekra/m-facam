/**
 * Parité fixe EUR/XAF (Franc CFA BEAC — Congo, Cameroun, etc.).
 * 1 EUR = 655,957 XAF. Fixée et irrévocable par traité.
 */
export const EUR_TO_XAF = 655.957;

export type SupportedCurrency = 'EUR' | 'XAF';

/**
 * Convertit le montant tel que saisi par le membre (dans sa devise locale)
 * vers le montant canonique en EUR utilisé pour les totaux caisse, soldes,
 * etc. Pour EUR, c'est identité. Pour XAF, on divise par la parité fixe.
 *
 * Le résultat est arrondi à 2 décimales (granularité EUR).
 */
export function toCanonicalEur(originalAmount: number, originalCurrency: SupportedCurrency): number {
  if (originalCurrency === 'EUR') return Math.round(originalAmount * 100) / 100;
  // XAF -> EUR : 1 EUR = 655,957 XAF
  return Math.round((originalAmount / EUR_TO_XAF) * 100) / 100;
}

/** Mise en forme du couple (amount, currency) pour insertion en base : strings à 2 décimales. */
export function originalToCols(amount: number, currency: SupportedCurrency = 'EUR') {
  return {
    amount: toCanonicalEur(amount, currency).toFixed(2),
    originalAmount: amount.toFixed(2),
    originalCurrency: currency,
  };
}
