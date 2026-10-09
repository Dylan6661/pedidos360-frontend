# Pedidos360 — Frontend (Angular + MSAL)

Frontend del sistema **Pedidos360**, hecho con **Angular 22**. El login se hace con **MSAL Angular 6** contra **Microsoft Entra External ID**, usando OAuth 2.0 / OpenID Connect con *Authorization Code + PKCE*. Todas las llamadas al backend pasan por **AWS API Gateway**.

## Autenticación

- **`src/app/auth/msal.config.ts`:** instancia de MSAL, configuración del `MsalGuard` y del `MsalInterceptor`.
  - MSAL Browser solo implementa *Authorization Code + PKCE*. Genera el `code_verifier` y el `code_challenge` (S256) y valida `state` y `nonce` automáticamente.
  - El `MsalInterceptor` agrega `Authorization: Bearer <access token>` a toda llamada hacia `${api.baseUrl}/api/*` y renueva el token en silencio cuando expira.
- **`auth-state.service.ts`:** procesa la respuesta del login (`handleRedirectObservable`) y expone la sesión como *signals*. Los **roles** se leen del claim `roles` y los **scopes** del claim `scp` del access token.
- **Guards:**
  - `MsalGuard` protege las rutas que requieren sesión.
  - `adminGuard` exige el app role `Admin`.
- **Registro:** el botón "Iniciar sesión / Crear cuenta" abre el *user flow* de registro e inicio de sesión del tenant.

## Vistas

| Ruta | Descripción | API usada |
|---|---|---|
| `/` | Inicio y resumen del usuario | `GET /api/bff/resumen` |
| `/catalogo` | Catálogo y carrito para crear pedidos | `GET /api/bff/catalogo`, `POST /api/bff/pedidos` |
| `/pedidos` | Mis pedidos (o todos, si el usuario es Admin) | `GET /api/pedidos` |
| `/pedidos/:id` | Detalle, cancelación y cambio de estado (Admin) | `GET /api/bff/pedidos/{id}/detalle`, `POST .../cancelar`, `PATCH .../estado` |
| `/perfil` | Perfil del cliente, claims del token y botón para copiar el access token | `GET` y `PUT /api/clientes/me` |
| `/admin/productos` | CRUD de productos (Admin) | `GET/POST/PUT/DELETE /api/productos` |
| `/admin/clientes` | Lista de clientes (Admin) | `GET /api/clientes` |

## Configuración

Edita los valores `<...>` en `src/environments/environment.ts` (producción) y en `environment.development.ts` (desarrollo):

| Valor | Dónde se obtiene |
|---|---|
| `<SPA_CLIENT_ID>` | Application (client) ID de la app `pedidos360-spa` |
| `<SUBDOMINIO>` | Subdominio del tenant External ID (`<subdominio>.ciamlogin.com`) |
| `<API_CLIENT_ID>` | Application (client) ID de la app `pedidos360-api` |
| `<API_ID>` | ID del HTTP API en AWS API Gateway |
| `<URL_FRONTEND>` | Dominio de CloudFront o Amplify donde se publica el frontend |

## Comandos

Requiere Node 22.22.3 o superior (o Node 24).

```bash
npm install
npm start          # http://localhost:4200 (usa environment.development.ts)
npm run build      # genera dist/pedidos360-frontend/browser (producción)
```

## Despliegue

Sube el contenido de `dist/pedidos360-frontend/browser` a S3 detrás de CloudFront (HTTPS) o a AWS Amplify Hosting. Como es una SPA, configura que los errores 403 y 404 respondan con `/index.html` y código 200.

El paso a paso completo está en `GUIA_CONFIGURACION_CLOUD.md`.
