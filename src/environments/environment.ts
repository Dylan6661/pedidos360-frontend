// Configuración de PRODUCCIÓN (la que se usa con `ng build`).
// Reemplace los valores <...> por los de su tenant de Entra External ID y su API Gateway.
export const environment = {
  production: true,
  msal: {
    // Application (client) ID de la app SPA "pedidos360-spa"
    clientId: '455035c0-795b-4b3b-8849-493674aaef03',
    // Authority de Entra External ID: https://<subdominio>.ciamlogin.com/
    authority: 'https://pedidos360dylan.ciamlogin.com/',
    knownAuthorities: ['pedidos360dylan.ciamlogin.com'],
    // URL pública del frontend (CloudFront / Amplify)
    redirectUri: 'https://<URL_FRONTEND>/',
    postLogoutRedirectUri: 'https://<URL_FRONTEND>/',
  },
  api: {
    // URL de invocación del AWS API Gateway (sin "/" final)
    baseUrl: 'https://<API_ID>.execute-api.us-east-1.amazonaws.com',
    // Scopes expuestos por la app "pedidos360-api" (Expose an API)
    scopes: ['api://8616c030-db57-43e2-bfa3-e40efc164c5a/Pedidos.Read', 'api://8616c030-db57-43e2-bfa3-e40efc164c5a/Pedidos.Write'],
  },
};
