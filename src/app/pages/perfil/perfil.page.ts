import { DatePipe, JsonPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthStateService } from '../../auth/auth-state.service';
import { ApiService, mensajeError } from '../../core/api.service';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, JsonPipe, DatePipe],
  template: `
    <h1>Mi perfil</h1>
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (mensaje()) {
      <div class="alert alert-ok">{{ mensaje() }}</div>
    }

    <div class="card">
      <h2 style="margin-top:0">Datos de cliente</h2>
      @if (nuevo()) {
        <p class="muted">Aún no tienes perfil de cliente. Complétalo para poder hacer pedidos.</p>
      }
      <form [formGroup]="form" (ngSubmit)="guardar()">
        <div class="field">
          <label for="nombre">Nombre</label>
          <input id="nombre" formControlName="nombre" maxlength="120" />
          @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
            <span class="error-text">El nombre es obligatorio</span>
          }
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" maxlength="160" />
        </div>
        <div class="field">
          <label for="telefono">Teléfono</label>
          <input id="telefono" formControlName="telefono" maxlength="30" />
        </div>
        <div class="field">
          <label for="direccion">Dirección</label>
          <input id="direccion" formControlName="direccion" maxlength="250" />
          @if (form.controls.direccion.touched && form.controls.direccion.invalid) {
            <span class="error-text">La dirección es obligatoria</span>
          }
        </div>
        <button class="btn" type="submit" [disabled]="form.invalid || guardando()">Guardar perfil</button>
      </form>
    </div>

    <h2>Mi sesión y token (OIDC)</h2>
    <div class="card">
      <p><strong>Usuario:</strong> {{ auth.displayName() }} ({{ auth.email() }})</p>
      <p><strong>Roles (claim roles):</strong> {{ auth.roles().join(', ') || 'sin roles asignados' }}</p>
      <p><strong>Scopes (claim scp):</strong> {{ auth.scopes().join(', ') || '—' }}</p>
      <p><strong>Audience (aud):</strong> {{ claims()['aud'] }}</p>
      <p><strong>Issuer (iss):</strong> {{ claims()['iss'] }}</p>
      <p><strong>Expira:</strong> {{ expira() | date: 'medium' }}</p>
      <div class="row">
        <button class="btn btn-ghost" (click)="mostrar.set(!mostrar())">{{ mostrar() ? 'Ocultar' : 'Ver' }} claims del access token</button>
        <button class="btn btn-ghost" (click)="copiarToken()">Copiar access token</button>
        <button class="btn btn-ghost" (click)="auth.refreshToken()">Renovar token</button>
      </div>
      @if (mostrar()) {
        <pre class="token">{{ claims() | json }}</pre>
      }
    </div>
  `,
})
export class PerfilPage implements OnInit {
  protected readonly auth = inject(AuthStateService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly nuevo = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly mostrar = signal(false);
  protected readonly claims = this.auth.accessClaims;
  protected readonly expira = computed(() => {
    const exp = this.claims()['exp'];
    return typeof exp === 'number' ? new Date(exp * 1000) : null;
  });

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.email]],
    telefono: [''],
    direccion: ['', [Validators.required, Validators.maxLength(250)]],
  });

  ngOnInit(): void {
    this.api.miPerfil().subscribe({
      next: (c) =>
        this.form.setValue({
          nombre: c.nombre,
          email: c.email,
          telefono: c.telefono ?? '',
          direccion: c.direccion ?? '',
        }),
      error: (e) => {
        if (e instanceof HttpErrorResponse && e.status === 404) {
          this.nuevo.set(true);
          this.form.patchValue({ nombre: this.auth.displayName(), email: this.auth.email() });
        } else {
          this.error.set(mensajeError(e));
        }
      },
    });
  }

  guardar(): void {
    this.guardando.set(true);
    this.error.set(null);
    const v = this.form.getRawValue();
    this.api
      .guardarMiPerfil({ nombre: v.nombre, email: v.email || null, telefono: v.telefono || null, direccion: v.direccion })
      .subscribe({
        next: () => {
          this.mensaje.set('Perfil guardado');
          this.nuevo.set(false);
          this.guardando.set(false);
        },
        error: (e) => {
          this.error.set(mensajeError(e));
          this.guardando.set(false);
        },
      });
  }

  /** Útil para la demo: probar los endpoints del API Gateway desde Postman/curl con el mismo token. */
  copiarToken(): void {
    const token = this.auth.accessToken();
    if (token) {
      navigator.clipboard.writeText(token).then(() => this.mensaje.set('Access token copiado al portapapeles'));
    }
  }
}
