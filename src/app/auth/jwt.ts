/** Decodifica el payload de un JWT (solo para mostrar claims; la validación la hacen el API Gateway y el backend). */
export function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1];
  if (!payload) {
    return {};
  }
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
}
