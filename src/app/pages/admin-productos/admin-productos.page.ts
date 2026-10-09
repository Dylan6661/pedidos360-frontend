import { CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, mensajeError } from '../../core/api.service';
import { Producto } from '../../core/models';

@Component({
  selector: 'app-admin-productos',
  imports: [ReactiveFormsModule, CurrencyPipe],
  template: `
    <h1>Administrar productos</h1>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (mensaje()) {
      <div class="alert alert-ok">{{ mensaje() }}</div>
    }

    <div class="card">
      <h2 style="margin-top:0">{{ editandoId() ? 'Editar producto #' + editandoId() : 'Nuevo producto' }}</h2>
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div class="grid">
          <div class="field"><label for="nombre">Nombre</label><input id="nombre" formControlName="nombre" /></div>
          <div class="field"><label for="categoria">Categoría</label><input id="categoria" formControlName="categoria" /></div>
          <div class="field"><label for="precio">Precio (CLP)</label><input id="precio" type="number" formControlName="precio" /></div>
          <div class="field"><label for="stock">Stock</label><input id="stock" type="number" formControlName="stock" /></div>
        </div>
        <div class="field"><label for="descripcion">Descripción</label><input id="descripcion" formControlName="descripcion" /></div>
        <div class="row">
          <button class="btn" type="submit" [disabled]="form.invalid">{{ editandoId() ? 'Guardar cambios' : 'Crear producto' }}</button>
          @if (editandoId()) {
            <button class="btn btn-ghost" type="button" (click)="limpiar()">Cancelar edición</button>
          }
        </div>
      </form>
    </div>

    <h2>Catálogo actual</h2>
    <table>
      <thead><tr><th>#</th><th>Nombre</th><th>Categoría</th><th class="num">Precio</th><th class="num">Stock</th><th></th></tr></thead>
      <tbody>
        @for (p of productos(); track p.id) {
          <tr>
            <td>{{ p.id }}</td>
            <td>{{ p.nombre }}</td>
            <td>{{ p.categoria }}</td>
            <td class="num">{{ p.precio | currency: 'CLP' : 'symbol-narrow' : '1.0-0' }}</td>
            <td class="num">{{ p.stock }}</td>
            <td class="row">
              <button class="btn btn-ghost btn-sm" (click)="editar(p)">Editar</button>
              <button class="btn btn-danger btn-sm" (click)="eliminar(p)">Eliminar</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class AdminProductosPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly productos = signal<Producto[]>([]);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    descripcion: ['', [Validators.maxLength(500)]],
    categoria: ['', [Validators.required, Validators.maxLength(60)]],
    precio: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.api.productos().subscribe({
      next: (p) => this.productos.set(p),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  editar(p: Producto): void {
    this.editandoId.set(p.id);
    this.form.setValue({
      nombre: p.nombre,
      descripcion: p.descripcion ?? '',
      categoria: p.categoria,
      precio: p.precio,
      stock: p.stock,
    });
  }

  limpiar(): void {
    this.editandoId.set(null);
    this.form.reset();
  }

  guardar(): void {
    this.error.set(null);
    const datos = this.form.getRawValue();
    const id = this.editandoId();
    const op = id ? this.api.actualizarProducto(id, datos) : this.api.crearProducto(datos);
    op.subscribe({
      next: (p) => {
        this.mensaje.set(id ? `Producto "${p.nombre}" actualizado` : `Producto "${p.nombre}" creado`);
        this.limpiar();
        this.cargar();
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  eliminar(p: Producto): void {
    this.error.set(null);
    this.api.eliminarProducto(p.id).subscribe({
      next: () => {
        this.mensaje.set(`Producto "${p.nombre}" eliminado`);
        this.cargar();
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
