import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { ApiService, mensajeError } from '../../core/api.service';
import { ESTADOS_PEDIDO, EstadoPedido, PedidoDetalle } from '../../core/models';

@Component({
  selector: 'app-pedido-detalle',
  imports: [RouterLink, CurrencyPipe, DatePipe, FormsModule],
  template: `
    <a routerLink="/pedidos">← Volver</a>
    @if (error()) {
      <div class="alert alert-error" style="margin-top:1rem">{{ error() }}</div>
    }
    @if (mensaje()) {
      <div class="alert alert-ok" style="margin-top:1rem">{{ mensaje() }}</div>
    }

    @if (detalle(); as d) {
      <div class="row" style="margin-top:1rem">
        <h1 style="margin:0">Pedido #{{ d.pedido.id }}</h1>
        <span class="estado {{ d.pedido.estado }}">{{ d.pedido.estado }}</span>
      </div>
      <p class="muted">Creado el {{ d.pedido.creadoEn | date: 'medium' }}</p>

      <div class="card">
        @if (d.cliente; as c) {
          <p><strong>Cliente:</strong> {{ c.nombre }} · {{ c.email }}</p>
        }
        <p><strong>Dirección de entrega:</strong> {{ d.pedido.direccionEntrega || '—' }}</p>

        <table>
          <thead><tr><th>Producto</th><th class="num">Cantidad</th><th class="num">Precio</th><th class="num">Subtotal</th></tr></thead>
          <tbody>
            @for (i of d.pedido.items; track i.productoId) {
              <tr>
                <td>{{ i.nombreProducto }}</td>
                <td class="num">{{ i.cantidad }}</td>
                <td class="num">{{ i.precioUnitario | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</td>
                <td class="num">{{ i.subtotal | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="num"><strong>Total: {{ d.pedido.total | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong></p>

        <div class="row">
          @if (d.pedido.estado === 'PENDIENTE') {
            <button class="btn btn-danger" (click)="cancelar()">Cancelar pedido</button>
          }
          @if (auth.isAdmin()) {
            <span class="spacer"></span>
            <label for="estado">Cambiar estado</label>
            <select id="estado" [(ngModel)]="nuevoEstado">
              @for (e of estados; track e) {
                <option [value]="e">{{ e }}</option>
              }
            </select>
            <button class="btn" (click)="cambiarEstado()">Guardar</button>
          }
        </div>
      </div>
    } @else if (!error()) {
      <p class="muted">Cargando…</p>
    }
  `,
})
export class PedidoDetallePage implements OnInit {
  /** Parámetro :id de la ruta (withComponentInputBinding) */
  readonly id = input.required<string>();

  protected readonly auth = inject(AuthStateService);
  private readonly api = inject(ApiService);

  protected readonly detalle = signal<PedidoDetalle | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly estados = ESTADOS_PEDIDO;
  protected nuevoEstado: EstadoPedido = 'CONFIRMADO';

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.detallePedido(Number(this.id())).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.nuevoEstado = d.pedido.estado;
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  cancelar(): void {
    this.api.cancelarPedido(Number(this.id())).subscribe({
      next: () => {
        this.mensaje.set('Pedido cancelado');
        this.cargar();
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  cambiarEstado(): void {
    this.api.cambiarEstado(Number(this.id()), this.nuevoEstado).subscribe({
      next: () => {
        this.mensaje.set(`Estado actualizado a ${this.nuevoEstado}`);
        this.cargar();
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
