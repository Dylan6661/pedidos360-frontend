// Configuración de DESARROLLO (la que se usa con `ng serve`).
export const environment = {
  production: false,
  msal: {
    clientId: '455035c0-795b-4b3b-8849-493674aaef03',
    // Authority con el ID del tenant: asi coincide con el issuer del token (MSAL valida issuer)
    authority: 'https://pedidos360dylan.ciamlogin.com/57c9047d-aff2-4c1a-bc9e-04d8b605b23f/',
    knownAuthorities: ['pedidos360dylan.ciamlogin.com', '57c9047d-aff2-4c1a-bc9e-04d8b605b23f.ciamlogin.com'],
    redirectUri: 'http://localhost:4200/',
    postLogoutRedirectUri: 'http://localhost:4200/',
  },
  api: {
    // Puede apuntar al API Gateway real o al BFF local (http://localhost:8080)
    baseUrl: 'https://<API_ID>.execute-api.us-east-1.amazonaws.com',
    scopes: ['api://8616c030-db57-43e2-bfa3-e40efc164c5a/Pedidos.Read', 'api://8616c030-db57-43e2-bfa3-e40efc164c5a/Pedidos.Write'],
  },
};
