import { Injectable, computed, inject, signal } from '@angular/core';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { AccountInfo, EventMessage, EventType, InteractionStatus } from '@azure/msal-browser';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';
import { decodeJwt } from './jwt';
import { loginScopes } from './msal.config';

export const ROLE_ADMIN = 'Admin';

/** Estado de autenticación expuesto como signals para toda la aplicación. */
@Injectable({ providedIn: 'root' })
export class AuthStateService {
  private readonly msal = inject(MsalService);
  private readonly broadcast = inject(MsalBroadcastService);

  readonly account = signal<AccountInfo | null>(null);
  readonly accessToken = signal<string | null>(null);
  readonly accessClaims = signal<Record<string, unknown>>({});
  readonly ready = signal(false);

  readonly isLoggedIn = computed(() => this.account() !== null);
  readonly displayName = computed(() => this.account()?.name ?? this.account()?.username ?? '');
  readonly email = computed(() => {
    const claims = this.account()?.idTokenClaims as Record<string, unknown> | undefined;
    return (claims?.['email'] as string) ?? this.account()?.username ?? '';
  });
  /** Roles (app roles) leídos desde el claim "roles" del access token de la API. */
  readonly roles = computed(() => (this.accessClaims()['roles'] as string[] | undefined) ?? []);
  /** Scopes delegados leídos desde el claim "scp" del access token. */
  readonly scopes = computed(() => {
    const scp = this.accessClaims()['scp'];
    return typeof scp === 'string' && scp.length > 0 ? scp.split(' ') : [];
  });
  readonly isAdmin = computed(() => this.roles().includes(ROLE_ADMIN));

  /** Se llama una vez desde el componente raíz. */
  init(): void {

    // Procesa la respuesta del login (redirect con ?code=...) y canjea el code + code_verifier por tokens
    this.msal.handleRedirectObservable().subscribe({
      error: (err) => console.error('Error procesando la respuesta de login', err),
    });

    this.broadcast.msalSubject$
      .pipe(filter((msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS))
      .subscribe((msg) => {
        const payload = msg.payload as { account?: AccountInfo } | null;
        if (payload?.account) {
          this.msal.instance.setActiveAccount(payload.account);
        }
      });

    this.broadcast.inProgress$
      .pipe(filter((status) => status === InteractionStatus.None))
      .subscribe(() => this.syncAccount());
  }

  login(): void {
    this.msal.loginRedirect({ scopes: loginScopes }).subscribe();
  }

  logout(): void {
    this.msal.logoutRedirect({ account: this.account() ?? undefined }).subscribe();
  }

  /** Obtiene (o renueva en silencio) el access token de la API y actualiza los claims. */
  refreshToken(): void {
    const account = this.account();
    if (!account) {
      return;
    }
    this.msal.acquireTokenSilent({ account, scopes: environment.api.scopes }).subscribe({
      next: (result) => {
        this.accessToken.set(result.accessToken);
        this.accessClaims.set(decodeJwt(result.accessToken));
      },
      error: (err) => console.warn('No se pudo obtener el access token en silencio', err),
    });
  }

  private syncAccount(): void {
    let active = this.msal.instance.getActiveAccount();
    const all = this.msal.instance.getAllAccounts();
    if (!active && all.length > 0) {
      active = all[0];
      this.msal.instance.setActiveAccount(active);
    }
    this.account.set(active);
    if (active) {
      this.refreshToken();
    } else {
      this.accessToken.set(null);
      this.accessClaims.set({});
    }
    this.ready.set(true);
  }
}
