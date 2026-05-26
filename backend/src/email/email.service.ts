import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

/**
 * Email sender abstraction. Default mode "mock" just logs the message (and the
 * content is also surfaced in-app where relevant), so the product works without
 * any SMTP account. Set EMAIL_PROVIDER=smtp + the SMTP_* env vars to send for
 * real via nodemailer — no caller changes needed.
 *
 * SMTP env vars (e.g. Infomaniak): SMTP_HOST=mail.infomaniak.com, SMTP_PORT=587,
 * SMTP_USER=<adresse complète>, SMTP_PASS=<mot de passe>, SMTP_FROM=<expéditeur>,
 * SMTP_SECURE=false (true seulement pour le port 465).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  private get mode(): 'mock' | 'smtp' {
    return (process.env.EMAIL_PROVIDER as 'mock' | 'smtp') ?? 'mock';
  }

  private appUrl(): string {
    return process.env.APP_PUBLIC_URL ?? 'http://localhost:4200';
  }

  /** Lazily builds (and caches) the nodemailer transport from SMTP_* env vars. */
  private getTransporter(): Transporter {
    if (!this.transporter) {
      const port = Number(process.env.SMTP_PORT ?? '587');
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        // 465 = SSL implicite ; 587 = STARTTLS.
        secure: process.env.SMTP_SECURE === 'true' || port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    }
    return this.transporter;
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (this.mode === 'smtp') {
      try {
        const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? 'no-reply@familycash.app';
        await this.getTransporter().sendMail({ from, to, subject, text: body });
        this.logger.log(`Email envoyé à ${to} — "${subject}"`);
        return;
      } catch (e) {
        // Best-effort : on n'interrompt jamais le flux métier (la création de
        // famille affiche aussi l'identifiant à l'écran). On journalise le contenu.
        this.logger.error(`Échec envoi SMTP à ${to}: ${(e as Error).message}`);
      }
    }
    this.logger.log(`\n──────── EMAIL (${this.mode}) ────────\nTo: ${to}\nSubject: ${subject}\n${body}\n──────────────────────────────`);
  }

  async sendFamilyCreated(to: string, familyName: string, identifier: string, verifyToken: string): Promise<void> {
    const verifyUrl = `${this.appUrl()}/auth/verify-email?token=${verifyToken}`;
    await this.send(
      to,
      `Votre identifiant de famille — ${familyName}`,
      [
        `Bienvenue dans Family Cash Management !`,
        ``,
        `Votre famille "${familyName}" a été créée.`,
        `IDENTIFIANT DE FAMILLE : ${identifier}`,
        ``,
        `Conservez cet identifiant : il est nécessaire (avec votre email et mot de passe) pour vous connecter, ainsi qu'à tous les membres de la famille.`,
        ``,
        `Vérifiez votre adresse email en ouvrant ce lien :`,
        verifyUrl,
        ``,
        `Rappel : l'essai gratuit dure 30 jours. Sans abonnement (20 €/an), la famille est désactivée 1 mois puis supprimée.`,
      ].join('\n'),
    );
  }

  async sendTrialReminder(to: string, identifier: string, daysLeft: number): Promise<void> {
    await this.send(
      to,
      `Votre essai se termine dans ${daysLeft} jour(s)`,
      `Famille ${identifier} : il reste ${daysLeft} jour(s) d'essai. Activez l'abonnement (20 €/an) pour conserver vos données.`,
    );
  }

  async sendDeactivated(to: string, identifier: string, graceEndsAt: Date): Promise<void> {
    await this.send(
      to,
      `Famille désactivée — action requise`,
      [
        `La famille ${identifier} est désactivée faute de paiement.`,
        `Vous avez jusqu'au ${graceEndsAt.toLocaleDateString('fr-FR')} pour régler l'abonnement (20 €/an) et tout réactiver.`,
        `Passé ce délai, la base de la famille sera définitivement supprimée.`,
        ``,
        `Important : votre compte PayPal familial vous appartient. Vous ne perdez pas l'argent de la caisse — vous pouvez continuer à gérer ce compte PayPal directement.`,
      ].join('\n'),
    );
  }
}
