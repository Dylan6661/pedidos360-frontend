import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStateService } from './auth/auth-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly auth = inject(AuthStateService);

  ngOnInit(): void {
    this.auth.init();
  }
}
