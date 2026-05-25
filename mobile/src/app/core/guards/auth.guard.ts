import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated) await auth.restore();
  if (!auth.isAuthenticated) return router.parseUrl('/auth/login');

  // Deactivated (expired) families are routed to the subscription screen so the
  // admin can renew; everything else is locked until they pay.
  if (auth.snapshot?.family.status === 'expired' && !state.url.startsWith('/subscription')) {
    return router.parseUrl('/subscription');
  }
  return true;
};
