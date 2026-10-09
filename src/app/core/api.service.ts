import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Cliente,
  CrearPedidoRequest,
  EstadoPedido,
  Pedido,
  PedidoDetalle,
  PerfilRequest,
  Producto,
  ProductoRequest,
  Resumen,
} from './models';

/**
 * Todas las llamadas pasan por el AWS API Gateway.
 * El token JWT lo agrega automáticamente el MsalInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.api.baseUrl}/api`;

  // ---------- BFF ----------
  resumen(): Observable<Resumen> {
    return this.http.get<Resumen>(`${this.api}/bff/resumen`);
  }

  catalogo(): Observable<Record<string, Producto[]>> {
    return this.http.get<Record<string, Producto[]>>(`${this.api}/bff/catalogo`);
  }

  crearPedido(req: CrearPedidoRequest): Observable<PedidoDetalle> {
    return this.http.post<PedidoDetalle>(`${this.api}/bff/pedidos`, req);
  }

  detallePedido(id: number): Observable<PedidoDetalle> {
    return this.http.get<PedidoDetalle>(`${this.api}/bff/pedidos/${id}/detalle`);
  }

  // ---------- ms-productos ----------
  productos(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.api}/productos`);
  }

  crearProducto(req: ProductoRequest): Observable<Producto> {
    return this.http.post<Producto>(`${this.api}/productos`, req);
  }

  actualizarProducto(id: number, req: ProductoRequest): Observable<Producto> {
    return this.http.put<Producto>(`${this.api}/productos/${id}`, req);
  }

  eliminarProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/productos/${id}`);
  }

  // ---------- ms-clientes ----------
  miPerfil(): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.api}/clientes/me`);
  }

  guardarMiPerfil(req: PerfilRequest): Observable<Cliente> {
    return this.http.put<Cliente>(`${this.api}/clientes/me`, req);
  }

  clientes(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(`${this.api}/clientes`);
  }

  // ---------- ms-pedidos ----------
  pedidos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.api}/pedidos`);
  }

  cancelarPedido(id: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.api}/pedidos/${id}/cancelar`, {});
  }

  cambiarEstado(id: number, estado: EstadoPedido): Observable<Pedido> {
    return this.http.patch<Pedido>(`${this.api}/pedidos/${id}/estado`, { estado });
  }
}

/** Mensaje legible a partir de un error HTTP del backend o del API Gateway. */
export function mensajeError(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'No se pudo contactar al API Gateway (revise la URL, CORS o su conexión).';
    }
    const body = err.error as { message?: string } | null;
    if (body?.message) {
      return `${err.status}: ${body.message}`;
    }
    if (err.status === 401) {
      return '401: token ausente, inválido o expirado.';
    }
    if (err.status === 403) {
      return '403: no tiene permisos para esta operación.';
    }
    return `${err.status}: ${err.statusText || 'Error inesperado'}`;
  }
  return 'Error inesperado';
}
