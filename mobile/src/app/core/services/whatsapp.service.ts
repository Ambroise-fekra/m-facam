import { Injectable } from '@angular/core';
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
    await Browser.open({ url });
  }

  /** Opens a group invite/join link (chat.whatsapp.com/...). */
  async openGroup(groupUrl: string): Promise<void> {
    await Browser.open({ url: groupUrl });
  }
}
