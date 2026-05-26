import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private readonly toast = inject(ToastController);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError(async (err: HttpErrorResponse) => {
        if (err.status === 401) {
          await this.auth.logout();
          this.router.navigateByUrl('/auth/login');
        }
        const t = await this.toast.create({
          message: this.friendlyMessage(err),
          duration: err.status === 0 ? 6000 : 3500,
          color: 'danger',
          position: 'top',
        });
        await t.present();
        throw err;
      }) as never,
    );
  }

  /** Turns raw HTTP errors into clear, user-friendly French messages. */
  private friendlyMessage(err: HttpErrorResponse): string {
    if (err.error?.message) {
      return Array.isArray(err.error.message) ? err.error.message.join(' · ') : err.error.message;
    }
    switch (err.status) {
      case 0:
        return "Impossible de joindre le serveur. Vérifiez votre connexion et réessayez dans ~1 minute (le serveur peut être en veille).";
      case 401:
        return 'Identifiants incorrects ou session expirée.';
      case 403:
        return "Action non autorisée.";
      case 404:
        return 'Ressource introuvable.';
      case 409:
        return err.error?.message ?? 'Conflit (donnée déjà existante ou solde insuffisant).';
      case 500:
        return 'Erreur du serveur. Réessayez plus tard.';
      default:
        return `Erreur ${err.status}. Réessayez.`;
    }
  }
}
