import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { ApiService, mensajeError } from '../../core/api.service';
import { Resumen } from '../../core/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    @if (!auth.isLoggedIn()) {
      <section class="hero">
        <h1>Pedidos360</h1>
        <p>Haz tus pedidos en línea y revisa su estado en tiempo real. Crea tu cuenta o inicia sesión para comenzar.</p>
        <button class="btn" (click)="auth.login()">Iniciar sesión / Crear cuenta</button>
      </section>
    } @else {
      <h1>Hola, {{ auth.displayName() }}</h1>

      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }

      @if (resumen(); as r) {
        @if (!r.perfilCompleto) {
          <div class="alert alert-info">
            Antes de tu primer pedido, <a routerLink="/perfil">completa tu perfil de cliente</a>.
          </div>
        }
        <div class="stats">
          <div class="card"><div class="stat-value">{{ r.totalPedidos }}</div><div class="stat-label">{{ auth.isAdmin() ? 'Pedidos del sistema' : 'Mis pedidos' }}</div></div>
          <div class="card"><div class="stat-value">{{ r.pedidosPendientes }}</div><div class="stat-label">Pendientes</div></div>
          <div class="card"><div class="stat-value">{{ r.totalGastado | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</div><div class="stat-label">Total en pedidos</div></div>
          <div class="card"><div class="stat-value">{{ r.productosDisponibles }}</div><div class="stat-label">Productos disponibles</div></div>
        </div>

        <div class="row">
          <h2>Últimos pedidos</h2>
          <span class="spacer"></span>
          <a class="btn" routerLink="/catalogo">Nuevo pedido</a>
        </div>
        @if (r.ultimosPedidos.length === 0) {
          <p class="muted">Aún no hay pedidos.</p>
        } @else {
          <table>
            <thead><tr><th>#</th><th>Fecha</th><th>Estado</th><th class="num">Total</th></tr></thead>
            <tbody>
              @for (p of r.ultimosPedidos; track p.id) {
                <tr>
                  <td><a [routerLink]="['/pedidos', p.id]">{{ p.id }}</a></td>
                  <td>{{ p.creadoEn | date: 'short' }}</td>
                  <td><span class="estado {{ p.estado }}">{{ p.estado }}</span></td>
                  <td class="num">{{ p.total | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      } @else if (!error()) {
        <p class="muted">Cargando resumen…</p>
      }
    }
  `,
})
export class HomePage {
  protected readonly auth = inject(AuthStateService);
  private readonly api = inject(ApiService);

  protected readonly resumen = signal<Resumen | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    // Carga el resumen apenas existe una sesión activa
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.api.resumen().subscribe({
          next: (r) => this.resumen.set(r),
          error: (e) => this.error.set(mensajeError(e)),
        });
      }
    });
  }
}
