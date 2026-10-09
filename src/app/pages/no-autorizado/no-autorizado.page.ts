import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-no-autorizado',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <h1>Acceso denegado (403)</h1>
      <p>Tu usuario no tiene el rol requerido para ver esta sección.</p>
      <a class="btn" routerLink="/">Volver al inicio</a>
    </section>
  `,
})
export class NoAutorizadoPage {}
