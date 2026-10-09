import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { catchError, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import { decodeJwt } from './jwt';
import { ROLE_ADMIN } from './auth-state.service';

/**
 * Permite el acceso solo si el access token trae el app role "Admin".
 * Se usa después del MsalGuard (que asegura que exista una sesión).
 */
export const adminGuard: CanActivateFn = () => {
  const msal = inject(MsalService);
  const router = inject(Router);
  const account = msal.instance.getActiveAccount() ?? msal.instance.getAllAccounts()[0];
  if (!account) {
    return router.parseUrl('/');
  }
  return msal.acquireTokenSilent({ account, scopes: environment.api.scopes }).pipe(
    map((result) => {
      const roles = (decodeJwt(result.accessToken)['roles'] as string[] | undefined) ?? [];
      return roles.includes(ROLE_ADMIN) ? true : router.parseUrl('/no-autorizado');
    }),
    catchError(() => of(router.parseUrl('/no-autorizado'))),
  );
};
