# Pedidos360 — Guía de configuración cloud

Esta guía es el paso a paso para dejar Pedidos360 funcionando en la nube. Cubre todo lo que piden la **EP1** (código) y la **EP2** (presentación).

| Componente | Servicio |
|---|---|
| IDaaS | **Microsoft Entra External ID** (tenant externo, sucesor de Azure AD B2C) |
| API Manager | **AWS API Gateway — HTTP API** con JWT authorizer |
| Backend | 4 servicios Spring Boot en **AWS EC2** (Amazon Linux 2023) |
| Base de datos | **AWS RDS MySQL** (una instancia, una base por microservicio) |
| Frontend | Angular publicado en **S3 + CloudFront** (HTTPS) |

```
                                 ┌────────────── Microsoft Entra External ID ──────────────┐
                                 │ tenant · user flow registro/login · app SPA · app API   │
                                 └───────▲───────────────────────────────────┬─────────────┘
                     Authorization Code  │                                   │ JWKS (llaves públicas)
                     + PKCE (MSAL)       │                                   ▼
 Usuario ──▶ CloudFront/S3 (Angular) ────┴──JWT──▶ API Gateway (JWT authorizer + CORS + rutas)
                                                        │ HTTP_PROXY (con el mismo header Authorization)
                                                        ▼
                                  EC2: bff :8080 · ms-productos :8081 · ms-clientes :8082 · ms-pedidos :8083
                                  (cada servicio vuelve a validar el JWT)          │
                                                                                   ▼
                                                                         RDS MySQL (3 bases)
```

> **Anota los valores** a medida que avanzas. Los vas a necesitar en varios pasos:
> `TENANT_ID`, `SUBDOMINIO`, `SPA_CLIENT_ID`, `API_CLIENT_ID`, `RDS_ENDPOINT`, `EC2_IP`, `API_ID`, `URL_FRONTEND`.

---

## 1. Microsoft Entra External ID

### 1.1 Crear el tenant (rúbrica EP2: "Crea un tenant", 10%)

1. Entra a <https://entra.microsoft.com> con tu cuenta Azure (sirve Azure for Students).
2. Ve a **Entra ID → Overview → Manage tenants → + Create**.
3. Elige **External** y luego **Continue**.
4. Completa el tenant:
   - **Tenant name:** `Pedidos360`
   - **Domain name:** por ejemplo `pedidos360dsy`. Ese será tu `SUBDOMINIO` (`pedidos360dsy.ciamlogin.com`).
   - **Location:** la que te sugiera.
5. Asocia tu suscripción y un resource group, por ejemplo `rg-pedidos360`.
6. Cuando termine, cámbiate al tenant nuevo (ícono de engranaje → **Directories + subscriptions**).
7. Copia el **Tenant ID** desde **Overview**. Ese es tu `TENANT_ID`.

### 1.2 Registrar la API: `pedidos360-api` (rúbrica: "aplicación dentro del tenant", 10%)

1. Ve a **App registrations → + New registration**.
   - **Name:** `pedidos360-api`
   - **Supported account types:** *Accounts in this organizational directory only*.
   - Deja la Redirect URI vacía y presiona **Register**.
2. Copia el **Application (client) ID**. Ese es tu `API_CLIENT_ID`.
3. En **Expose an API**:
   - Presiona **Add** junto a *Application ID URI* y acepta el valor `api://<API_CLIENT_ID>`.
   - Con **+ Add a scope**, crea dos scopes. En ambos usa *Who can consent: Admins only* y deja el estado *Enabled*:
     - `Pedidos.Read`, con descripción "Leer catálogo, perfil y pedidos".
     - `Pedidos.Write`, con descripción "Crear pedidos y modificar datos".
4. En **App roles → + Create app role**, crea dos roles. En ambos usa *Allowed member types: Users/Groups*:
   - Display name `Administrador`, **Value** `Admin`.
   - Display name `Cliente`, **Value** `Cliente`.
5. En **Manifest**, busca `"requestedAccessTokenVersion"` y asegúrate de que valga **`2`**. Guarda.
   - Con el valor 2, el token trae `iss = https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0` y `aud = <API_CLIENT_ID>`, que es justo lo que validan el API Gateway y el backend.
6. *(Opcional)* En **Token configuration → + Add optional claim → Access → email**, agrega el email al access token.

### 1.3 Registrar el frontend: `pedidos360-spa`

1. Ve a **App registrations → + New registration**.
   - **Name:** `pedidos360-spa`
   - **Supported account types:** *Accounts in this organizational directory only*.
   - **Redirect URI:** plataforma **Single-page application (SPA)**, valor `http://localhost:4200/`.
2. Copia el **Application (client) ID**. Ese es tu `SPA_CLIENT_ID`.
3. En **Authentication**:
   - Agrega una segunda Redirect URI de tipo SPA: `https://<URL_FRONTEND>/`. Esto lo completas en el paso 5, cuando tengas el dominio de CloudFront.
   - En *Front-channel logout URL* no pongas nada.
   - Verifica que **Implicit grant** esté **desmarcado** (ni access tokens ni ID tokens). Con la plataforma SPA solo se usa *Authorization Code + PKCE*, que es lo que exige la rúbrica (15%).
4. En **API permissions**:
   - Ve a **+ Add a permission → APIs my organization uses → pedidos360-api → Delegated** y marca `Pedidos.Read` y `Pedidos.Write`.
   - Presiona **Grant admin consent for Pedidos360**. Es obligatorio, porque los clientes externos no pueden dar consentimiento por su cuenta.

### 1.4 User flow de registro e inicio de sesión (rúbrica: "flujo de usuario", 10%)

1. Ve a **External Identities → User flows → + New user flow**.
   - **Name:** `registro-login-pedidos360`
   - **Identity providers:** *Email with password*.
   - **User attributes:** *Display Name* (puedes agregar *City* u otros).
   - Presiona **Create**.
2. Abre el user flow y en **Applications → + Add application** elige `pedidos360-spa`.
   - Sin esta asociación, el botón de login no ofrece "Crear cuenta".

### 1.5 Usuarios de prueba y roles

1. Desde el frontend (cuando esté corriendo), crea **dos cuentas** con el flujo de registro:
   - `cliente.demo@...`, que será el usuario normal.
   - `admin.demo@...`, que será el administrador.
   - También puedes crear usuarios en **Users → + New user**.
2. Ve a **Enterprise applications → pedidos360-api → Users and groups → + Add user/group**.
   - Asigna a `admin.demo` el rol **Administrador (Admin)**.
   - Asigna a `cliente.demo` el rol **Cliente**.
3. Los roles aparecen en el claim `roles` del access token. Puedes verlo en la vista **Mi perfil** del frontend.

> Los valores para el backend quedan así:
> - `IDAAS_ISSUER = https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0`
> - `IDAAS_JWKS_URI = https://<SUBDOMINIO>.ciamlogin.com/<TENANT_ID>/discovery/v2.0/keys`
> - `IDAAS_AUDIENCE = <API_CLIENT_ID>`
>
> Para comprobarlos, abre `https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0/.well-known/openid-configuration` y revisa los campos `issuer` y `jwks_uri`.

---

## 2. Base de datos: AWS RDS MySQL

1. Ve a **RDS → Create database**.
   - **Engine:** MySQL 8.x, plantilla **Free tier** (o Sandbox).
   - **DB instance identifier:** `pedidos360-db`.
   - **Master username:** `admin`, con una contraseña segura. Esos son `DB_USER` y `DB_PASSWORD`.
   - **Instance:** `db.t3.micro`, con 20 GB gp2.
   - **Public access: No.**
   - **VPC security group:** crea uno nuevo, `sg-pedidos360-rds`.
2. Cuando esté *Available*, copia el **Endpoint**. Ese es tu `RDS_ENDPOINT`.
3. En `sg-pedidos360-rds`, agrega una regla de entrada **MySQL/Aurora 3306** cuyo origen sea el security group de la EC2 (`sg-pedidos360-ec2`, paso 3). No abras el puerto a `0.0.0.0/0`.
4. No necesitas crear las bases a mano. Cada microservicio se conecta con `createDatabaseIfNotExist=true` y crea la suya (`pedidos360_productos`, `pedidos360_clientes`, `pedidos360_pedidos`). Hibernate crea las tablas a partir de las entidades JPA.

---

## 3. Backend en AWS EC2

### 3.1 Crear la instancia

1. Ve a **EC2 → Launch instance**.
   - **Name:** `pedidos360-backend`.
   - **AMI:** Amazon Linux 2023.
   - **Type:** **t3.medium**. Corren 4 JVMs; con t3.small (2 GB) puede quedarse sin memoria.
   - **Key pair:** crea `pedidos360-key.pem` y guárdalo.
   - **Security group** `sg-pedidos360-ec2`, con estas reglas de entrada:
     - SSH 22 desde *My IP*.
     - TCP **8080-8083** desde `0.0.0.0/0`. El API Gateway HTTP no tiene IPs fijas; igual todos los servicios rechazan con 401 cualquier request sin un JWT válido.
2. En **Elastic IPs → Allocate**, asocia una IP elástica a la instancia. Esa es tu `EC2_IP`.
   - Esto es importante en AWS Academy: sin IP elástica, la IP pública cambia cada vez que se reinicia el laboratorio y las rutas del API Gateway quedan apuntando a la IP vieja.

### 3.2 Instalar y configurar

En tu PC, desde la raíz del repo backend:

```bash
scp -i pedidos360-key.pem deploy/setup-ec2.sh deploy/pedidos360.env.example deploy/pedidos360@.service ec2-user@<EC2_IP>:~
ssh -i pedidos360-key.pem ec2-user@<EC2_IP>
```

En la EC2:

```bash
bash setup-ec2.sh                              # instala Java 21 y crea /etc/pedidos360/pedidos360.env
sudo nano /etc/pedidos360/pedidos360.env       # completa IDAAS_*, DB_HOST, DB_USER, DB_PASSWORD
bash setup-ec2.sh                              # 2ª vez: genera la DB_URL de cada microservicio
```

### 3.3 Compilar y desplegar

En tu PC (requiere JDK 21 y Maven):

```bash
mvn clean verify                                        # compila y ejecuta las pruebas
./deploy/deploy.sh pedidos360-key.pem ec2-user@<EC2_IP>
```

Si no tienes Bash en Windows, usa Git Bash. Otra opción es copiar a mano los cuatro `*/target/*.jar` a `/opt/pedidos360/`.

Primera vez, en la EC2:

```bash
for s in ms-productos ms-clientes ms-pedidos bff; do sudo systemctl enable --now pedidos360@$s; done
sudo journalctl -u pedidos360@ms-productos -f       # ver logs
curl localhost:8081/actuator/health                 # {"status":"UP"}
curl -i localhost:8081/api/productos                # 401 → el servicio valida JWT
```

---

## 4. API Manager: AWS API Gateway (HTTP API)

Puedes hacerlo **por consola**, que conviene para mostrarlo en la presentación, o con el script `deploy/api-gateway.sh` desde **CloudShell**. El script crea exactamente lo mismo.

### 4.1 Crear el API (rúbrica: rutas, 13%)

1. Ve a **API Gateway → Create API → HTTP API → Build**.
   - **API name:** `pedidos360-api`. No agregues integraciones todavía. Presiona **Next**.
   - **Stage:** `$default` con *Auto-deploy* activo. Presiona **Create**.
2. En **Routes → Create**, crea las rutas de la tabla.
3. Luego, en **Integrations**, a cada ruta asígnale una integración **HTTP URI** con el método indicado y la URL `http://<EC2_IP>:<puerto><path>`.
   - Por ejemplo, la ruta `GET /api/productos/{id}` va a `http://<EC2_IP>:8081/api/productos/{id}`.

| Ruta | Destino (puerto) | Scope requerido |
|---|---|---|
| `GET /api/productos` | ms-productos (8081) | `Pedidos.Read` |
| `GET /api/productos/{id}` | ms-productos (8081) | `Pedidos.Read` |
| `POST /api/productos` | ms-productos (8081) | `Pedidos.Write` |
| `PUT /api/productos/{id}` | ms-productos (8081) | `Pedidos.Write` |
| `DELETE /api/productos/{id}` | ms-productos (8081) | `Pedidos.Write` |
| `GET /api/clientes/me` | ms-clientes (8082) | `Pedidos.Read` |
| `PUT /api/clientes/me` | ms-clientes (8082) | `Pedidos.Write` |
| `GET /api/clientes` | ms-clientes (8082) | `Pedidos.Read` |
| `GET /api/clientes/{id}` | ms-clientes (8082) | `Pedidos.Read` |
| `GET /api/pedidos` | ms-pedidos (8083) | `Pedidos.Read` |
| `GET /api/pedidos/{id}` | ms-pedidos (8083) | `Pedidos.Read` |
| `POST /api/pedidos/{id}/cancelar` | ms-pedidos (8083) | `Pedidos.Write` |
| `PATCH /api/pedidos/{id}/estado` | ms-pedidos (8083) | `Pedidos.Write` |
| `GET /api/bff/resumen` | bff (8080) | `Pedidos.Read` |
| `GET /api/bff/catalogo` | bff (8080) | `Pedidos.Read` |
| `POST /api/bff/pedidos` | bff (8080) | `Pedidos.Write` |
| `GET /api/bff/pedidos/{id}/detalle` | bff (8080) | `Pedidos.Read` |

> **Decisión de diseño que conviene explicar:** `POST /api/pedidos` **no** se publica. Los pedidos solo se crean a través del BFF (`POST /api/bff/pedidos`), que toma los precios y el stock reales desde ms-productos. Así el frontend nunca envía precios.

### 4.2 JWT authorizer (rúbrica: validación JWT en todas las rutas, 20%)

1. Ve a **Authorization → Manage authorizers → Create**.
   - **Type:** JWT.
   - **Name:** `entra-external-id-jwt`.
   - **Identity source:** `$request.header.Authorization`.
   - **Issuer URL:** `https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0`.
   - **Audience:** `<API_CLIENT_ID>`.
2. En **Attach authorizers to routes**, asocia el authorizer a **todas** las rutas. En cada una, agrega en *Authorization scopes* el scope de la tabla (`Pedidos.Read` o `Pedidos.Write`).
3. Qué responde el API Gateway:
   - **401** si no hay token, la firma no es válida, el token expiró o el issuer o la audience no corresponden.
   - **403** si falta el scope.
   - El backend vuelve a validar el token y aplica los roles: un usuario sin `Admin` que intenta crear un producto recibe **403**.

### 4.3 CORS (rúbrica: CORS, 7%)

En **CORS → Configure**:

| Campo | Valor |
|---|---|
| Access-Control-Allow-Origin | `https://<URL_FRONTEND>` y `http://localhost:4200` (nunca `*`) |
| Access-Control-Allow-Methods | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| Access-Control-Allow-Headers | `authorization, content-type` |
| Access-Control-Max-Age | `3600` |
| Allow credentials | No (el token va en un header, no en cookies) |

El API Gateway responde solo los preflight `OPTIONS`. No crees rutas `OPTIONS` ni `ANY /{proxy+}`.

4. Copia el **Invoke URL** (`https://<API_ID>.execute-api.us-east-1.amazonaws.com`) y ponlo en `api.baseUrl` del frontend.

---

## 5. Frontend: S3 + CloudFront (HTTPS)

MSAL exige HTTPS en la Redirect URI (salvo `localhost`), por eso se usa CloudFront y no el sitio web plano de S3.

1. Completa los valores `<...>` en `src/environments/environment.ts`. Por ahora deja `<URL_FRONTEND>`.
2. Ve a **S3 → Create bucket**, nombre `pedidos360-frontend-<tu-nombre>`, con *Block all public access* **activado**.
3. Ve a **CloudFront → Create distribution**:
   - **Origin:** el bucket S3, con **Origin access control (OAC)**. Acepta que actualice la bucket policy.
   - **Default root object:** `index.html`.
   - **Viewer protocol policy:** *Redirect HTTP to HTTPS*.
4. En la distribución, ve a **Error pages → Create custom error response**. Hazlo dos veces, para **403** y para **404**: *Response page path* `/index.html` y *HTTP response code* **200**. Así funcionan las rutas de Angular como `/pedidos/5`.
5. Copia el dominio `dxxxx.cloudfront.net`. Ese es tu `URL_FRONTEND`. Con él:
   - Actualiza `redirectUri` y `postLogoutRedirectUri` en `environment.ts`.
   - Agrega `https://dxxxx.cloudfront.net/` como Redirect URI SPA en `pedidos360-spa` (paso 1.3).
   - Agrega `https://dxxxx.cloudfront.net` como origen en el CORS del API Gateway (paso 4.3).
6. Compila y sube:

```bash
npm install
npm run build
aws s3 sync dist/pedidos360-frontend/browser s3://pedidos360-frontend-<tu-nombre> --delete
```

En vez de `aws s3 sync`, también puedes subir el contenido de `dist/pedidos360-frontend/browser` desde la consola de S3.

7. Después de cada nuevo despliegue, haz **CloudFront → Invalidations → `/*`**.

> **Alternativa:** si tu laboratorio no permite CloudFront, usa **AWS Amplify Hosting → Deploy without Git** y sube un `.zip` del contenido de `browser/`. Amplify entrega HTTPS de inmediato. Agrega la regla de rewrite `</^[^.]+$/>` → `/index.html` (200).

---

## 6. Verificación final (lista para la EP2)

- [ ] `https://<URL_FRONTEND>` carga y "Iniciar sesión / Crear cuenta" lleva a `<SUBDOMINIO>.ciamlogin.com`.
- [ ] Puedo crear una cuenta nueva y vuelvo logueado a la app.
- [ ] En **Mi perfil** veo `roles`, `scp`, `aud` e `iss` del token, y puedo guardar mi perfil de cliente.
- [ ] El catálogo carga y puedo crear un pedido, que se ve en **Mis pedidos**.
- [ ] Con `admin.demo` veo los menús **Productos** y **Clientes**, y puedo cambiar el estado de un pedido.
- [ ] `deploy/probar-api.sh` muestra **401** sin token y con token falso, **200** con token válido y **403** para un usuario sin rol Admin.
- [ ] En la pestaña Network del navegador, cada request lleva `Authorization: Bearer ...` y el preflight `OPTIONS` responde 204 con los headers CORS.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| `AADSTS50011 redirect URI mismatch` | La URL exacta (con `/` final) no está registrada como **SPA** en `pedidos360-spa` |
| `AADSTS65001 consent` | Falta **Grant admin consent** en *API permissions* |
| 401 en todas las rutas con un token válido | El issuer o la audience del authorizer no coinciden. Decodifica el token en <https://jwt.ms> y compara `iss` y `aud` (`requestedAccessTokenVersion` debe ser 2) |
| Error CORS en el navegador | Falta el origen exacto (sin `/` final) en el CORS del API Gateway |
| 503 "no está disponible" desde el BFF | Uno de los microservicios está caído: `systemctl status pedidos360@ms-...` |
| No aparece `roles` en el token | El usuario no tiene un rol asignado en *Enterprise applications → pedidos360-api* |
| 503 o timeout del API Gateway | La IP de la EC2 cambió (falta la Elastic IP) o el security group no permite 8080-8083 |
