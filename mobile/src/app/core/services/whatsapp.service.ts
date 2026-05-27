import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

/**
 * Compliant WhatsApp sharing via wa.me deep links. The user (typically the
 * family admin) confirms the send from their own WhatsApp — no API, no cost,
 * no ToS risk. With a phone number it opens that contact; without, WhatsApp
 * lets the user pick the recipient or the family group.
 */
@Injectable({ providedIn: 'root' })
export class WhatsappService {
  async share(text: string, phone?: string): Promise<void> {
    const digits = (phone ?? '').replace(/[^0-9]/g, '');
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    await this.openExternal(url);
  }

  /** Opens a group invite/join link (chat.whatsapp.com/...). */
  async openGroup(groupUrl: string): Promise<void> {
    await this.openExternal(groupUrl);
  }

  /**
   * Ouvre une URL externe de la maniere la plus fiable selon la plateforme :
   *  - mobile natif (iOS / Android) : Capacitor Browser (in-app webview ou
   *    redirection vers WhatsApp via le scheme deep-link du systeme),
   *  - web (PWA, Netlify) : window.open en nouvel onglet — plus fiable que
   *    Browser.open dont l'implementation web est parfois bloquee par les
   *    bloqueurs de popup ou ignoree sans erreur visible.
   */
  private async openExternal(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await Browser.open({ url });
        return;
      } catch {
        // Fallback ci-dessous.
      }
    }
    // Web : tentative en nouvel onglet (clic utilisateur = gesture autorise).
    // Si la popup est bloquee, on bascule sur la navigation directe.
    const win = typeof window !== 'undefined' ? window.open(url, '_blank', 'noopener,noreferrer') : null;
    if (!win && typeof window !== 'undefined') {
      window.location.href = url;
    }
  }
}
