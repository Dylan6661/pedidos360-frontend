import { CurrencyPipe, KeyValuePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, mensajeError } from '../../core/api.service';
import { Producto } from '../../core/models';

interface LineaCarrito {
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-catalogo',
  imports: [CurrencyPipe, KeyValuePipe, FormsModule],
  template: `
    <h1>Catálogo</h1>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }

    @for (grupo of catalogo() | keyvalue; track grupo.key) {
      <h2>{{ grupo.key }}</h2>
      <div class="grid">
        @for (p of grupo.value; track p.id) {
          <div class="card">
            <strong>{{ p.nombre }}</strong>
            <p class="muted">{{ p.descripcion }}</p>
            <div class="row">
              <span>{{ p.precio | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</span>
              <span class="spacer"></span>
              <span class="muted">Stock: {{ p.stock }}</span>
            </div>
            <button class="btn btn-sm" style="margin-top:.75rem" [disabled]="p.stock === 0" (click)="agregar(p)">
              Agregar
            </button>
          </div>
        }
      </div>
    } @empty {
      @if (!error()) {
        <p class="muted">Cargando productos…</p>
      }
    }

    <h2>Tu pedido</h2>
    <div class="card">
      @if (carrito().length === 0) {
        <p class="muted">Agrega productos desde el catálogo.</p>
      } @else {
        <table>
          <thead><tr><th>Producto</th><th>Cantidad</th><th class="num">Subtotal</th><th></th></tr></thead>
          <tbody>
            @for (l of carrito(); track l.producto.id) {
              <tr>
                <td>{{ l.producto.nombre }}</td>
                <td>
                  <input type="number" min="1" [max]="l.producto.stock" style="width:5rem"
                         [ngModel]="l.cantidad" (ngModelChange)="cambiarCantidad(l.producto.id, $event)" />
                </td>
                <td class="num">{{ l.producto.precio * l.cantidad | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</td>
                <td><button class="btn btn-ghost btn-sm" (click)="quitar(l.producto.id)">Quitar</button></td>
              </tr>
            }
          </tbody>
        </table>
        <div class="field" style="margin-top:1rem">
          <label for="dir">Dirección de entrega (opcional, por defecto la de tu perfil)</label>
          <input id="dir" [(ngModel)]="direccion" maxlength="250" />
        </div>
        <div class="row">
          <strong>Total estimado: {{ total() | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</strong>
          <span class="spacer"></span>
          <button class="btn" [disabled]="enviando()" (click)="confirmar()">Confirmar pedido</button>
        </div>
      }
    </div>
  `,
})
export class CatalogoPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly catalogo = signal<Record<string, Producto[]>>({});
  protected readonly carrito = signal<LineaCarrito[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal(false);
  protected direccion = '';

  protected readonly total = computed(() =>
    this.carrito().reduce((acc, l) => acc + l.producto.precio * l.cantidad, 0),
  );

  ngOnInit(): void {
    this.api.catalogo().subscribe({
      next: (c) => this.catalogo.set(c),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  agregar(p: Producto): void {
    this.carrito.update((items) => {
      const existe = items.find((l) => l.producto.id === p.id);
      if (existe) {
        return items.map((l) =>
          l.producto.id === p.id ? { ...l, cantidad: Math.min(l.cantidad + 1, p.stock) } : l,
        );
      }
      return [...items, { producto: p, cantidad: 1 }];
    });
  }

  cambiarCantidad(id: number, cantidad: number): void {
    const valor = Math.max(1, Math.floor(Number(cantidad) || 1));
    this.carrito.update((items) => items.map((l) => (l.producto.id === id ? { ...l, cantidad: valor } : l)));
  }

  quitar(id: number): void {
    this.carrito.update((items) => items.filter((l) => l.producto.id !== id));
  }

  confirmar(): void {
    this.enviando.set(true);
    this.error.set(null);
    this.api
      .crearPedido({
        direccionEntrega: this.direccion.trim() || null,
        items: this.carrito().map((l) => ({ productoId: l.producto.id, cantidad: l.cantidad })),
      })
      .subscribe({
        next: (detalle) => this.router.navigate(['/pedidos', detalle.pedido.id]),
        error: (e) => {
          this.error.set(mensajeError(e));
          this.enviando.set(false);
        },
      });
  }
}
