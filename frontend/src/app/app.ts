import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule, ViewportScroller } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  template: `
    @if (!isAdminRoute) {
      <app-navbar />
    }
    <router-outlet />
  `,
  styleUrl: './app.css'
})
export class App {
  router = inject(Router);
  isAdminRoute = false;

  constructor() {
    // Laisser la place du header fixe (70 px) quand on défile vers une section
    inject(ViewportScroller).setOffset([0, 80]);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isAdminRoute = event.url.startsWith('/admin');
    });
  }
}
