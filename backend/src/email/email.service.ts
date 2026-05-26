import { Injectable, Logger } from '@nestjs/common';

/**
 * Email sender abstraction. Default mode "mock" just logs the message (and the
 * content is also surfaced in-app where relevant), so the product works without
 * any SMTP account. Switch EMAIL_PROVIDER=smtp and wire nodemailer to send for
 * real — no caller changes needed.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private get mode(): 'mock' | 'smtp' {
    return (process.env.EMAIL_PROVIDER as 'mock' | 'smtp') ?? 'mock';
  }

  private appUrl(): string {
    return process.env.APP_PUBLIC_URL ?? 'http://localhost:4200';
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    if (this.mode === 'smtp') {
      // TODO: nodemailer transport from SMTP_* env vars.
      this.logger.warn('EMAIL_PROVIDER=smtp not yet wired — falling back to log');
    }
    this.logger.log(`\n──────── EMAIL (mock) ────────\nTo: ${to}\nSubject: ${subject}\n${body}\n──────────────────────────────`);
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
