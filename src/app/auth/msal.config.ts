import {
  BrowserCacheLocation,
  IPublicClientApplication,
  InteractionType,
  LogLevel,
  PublicClientApplication,
} from '@azure/msal-browser';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { environment } from '../../environments/environment';

/** Scopes OIDC + scopes de la API que se piden al iniciar sesión. */
export const loginScopes = ['openid', 'profile', 'offline_access', ...environment.api.scopes];

/**
 * Instancia de MSAL. MSAL Browser usa siempre el flujo
 * OAuth 2.0 Authorization Code + PKCE (genera code_verifier / code_challenge)
 * y valida los parámetros state y nonce de forma automática.
 */
export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.msal.clientId,
      authority: environment.msal.authority,
      knownAuthorities: environment.msal.knownAuthorities,
      redirectUri: environment.msal.redirectUri,
      postLogoutRedirectUri: environment.msal.postLogoutRedirectUri,
    },
    cache: {
      cacheLocation: BrowserCacheLocation.SessionStorage,
    },
    system: {
      loggerOptions: {
        logLevel: environment.production ? LogLevel.Error : LogLevel.Warning,
        piiLoggingEnabled: false,
        loggerCallback: (level, message) => {
          if (level === LogLevel.Error) {
            console.error(message);
          } else if (level === LogLevel.Warning) {
            console.warn(message);
          }
        },
      },
    },
  });
}

/** MsalGuard: si el usuario no tiene sesión, lo redirige al login del tenant. */
export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: { scopes: loginScopes },
    loginFailedRoute: '/',
  };
}

/**
 * MsalInterceptor: adjunta automáticamente el access token (Authorization: Bearer)
 * a toda llamada hacia el API Gateway, renovándolo en silencio cuando expira.
 */
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, Array<string>>();
  protectedResourceMap.set(`${environment.api.baseUrl}/api/*`, environment.api.scopes);
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}
