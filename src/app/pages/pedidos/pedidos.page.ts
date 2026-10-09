import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { ApiService, mensajeError } from '../../core/api.service';
import { Pedido } from '../../core/models';

@Component({
  selector: 'app-pedidos',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  template: `
    <h1>{{ auth.isAdmin() ? 'Todos los pedidos' : 'Mis pedidos' }}</h1>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (pedidos(); as lista) {
      @if (lista.length === 0) {
        <p class="muted">No hay pedidos registrados.</p>
      } @else {
        <table>
          <thead>
            <tr><th>#</th><th>Fecha</th><th>Productos</th><th>Estado</th><th class="num">Total</th></tr>
          </thead>
          <tbody>
            @for (p of lista; track p.id) {
              <tr>
                <td><a [routerLink]="['/pedidos', p.id]">{{ p.id }}</a></td>
                <td>{{ p.creadoEn | date: 'short' }}</td>
                <td>{{ p.items.length }}</td>
                <td><span class="estado {{ p.estado }}">{{ p.estado }}</span></td>
                <td class="num">{{ p.total | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    } @else if (!error()) {
      <p class="muted">Cargando…</p>
    }
  `,
})
export class PedidosPage implements OnInit {
  protected readonly auth = inject(AuthStateService);
  private readonly api = inject(ApiService);
  protected readonly pedidos = signal<Pedido[] | null>(null);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.pedidos().subscribe({
      next: (p) => this.pedidos.set(p),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
