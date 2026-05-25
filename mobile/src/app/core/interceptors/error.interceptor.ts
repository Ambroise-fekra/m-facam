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
          message: err.error?.message ?? `Erreur ${err.status}`,
          duration: 3000,
          color: 'danger',
          position: 'top',
        });
        await t.present();
        throw err;
      }) as never,
    );
  }
}
