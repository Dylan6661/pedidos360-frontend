import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService, mensajeError } from '../../core/api.service';
import { Cliente } from '../../core/models';

@Component({
  selector: 'app-admin-clientes',
  imports: [DatePipe],
  template: `
    <h1>Clientes registrados</h1>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    <table>
      <thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Teléfono</th><th>Dirección</th><th>Registrado</th></tr></thead>
      <tbody>
        @for (c of clientes(); track c.id) {
          <tr>
            <td>{{ c.id }}</td>
            <td>{{ c.nombre }}</td>
            <td>{{ c.email }}</td>
            <td>{{ c.telefono || '—' }}</td>
            <td>{{ c.direccion || '—' }}</td>
            <td>{{ c.creadoEn | date: 'short' }}</td>
          </tr>
        } @empty {
          <tr><td colspan="6" class="muted">Sin clientes registrados.</td></tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminClientesPage implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.api.clientes().subscribe({
      next: (c) => this.clientes.set(c),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
