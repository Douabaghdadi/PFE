import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule, ViewportScroller } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { AuthService } from './services/auth.service';
import { filter } from 'rxjs/operators';

/** Pages de connexion et de mot de passe : l'assistant n'y a pas sa place. */
const PAGES_SANS_ASSISTANT = ['/login', '/register', '/forgot-password', '/reset-password'];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ChatbotComponent, CommonModule],
  template: `
    @if (!isAdminRoute) {
      <app-navbar />
    }
    <router-outlet />
    <!-- Assistant IA : posé une seule fois ici, il suit le chef de projet et le pilote qualité sur toutes leurs pages -->
    @if (chatContext(); as context) {
      <app-chatbot [context]="context" />
    }
  `,
  styleUrl: './app.css'
})
export class App {
  router = inject(Router);
  private authService = inject(AuthService);
  isAdminRoute = false;

  /** Adresse de la page affichée, connue après la première navigation. */
  private currentPath = signal<string | null>(null);

  /** Rôle de l'assistant pour l'utilisateur connecté, ou null pour le masquer. */
  readonly chatContext = computed<'chef_projet' | 'pilote_qualite' | null>(() => {
    const user = this.authService.currentUser();
    const path = this.currentPath();
    if (!user || path === null) return null;
    if (path.startsWith('/admin') || PAGES_SANS_ASSISTANT.includes(path)) return null;
    if (user.roles?.includes('ROLE_PILOTE_QUALITE')) return 'pilote_qualite';
    if (user.roles?.includes('ROLE_CHEF_PROJET')) return 'chef_projet';
    return null;
  });

  constructor() {
    // Laisser la place du header fixe (70 px) quand on défile vers une section
    inject(ViewportScroller).setOffset([0, 80]);

    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.isAdminRoute = event.url.startsWith('/admin');
      this.currentPath.set(event.urlAfterRedirects.split(/[?#]/)[0]);
    });
  }
}
