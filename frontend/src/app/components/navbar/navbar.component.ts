import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="navbar navbar-expand-lg bg-white shadow-sm sticky-top">
      <div class="container">
        <a class="navbar-brand d-inline-flex gap-2 align-items-center lh-1" routerLink="/">
          <span class="text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
              <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
              <path d="M3 6l0 13" />
              <path d="M12 6l0 13" />
              <path d="M21 6l0 13" />
            </svg>
          </span>
          <span class="fw-bold">QualityHub</span>
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
            @if (!authService.isAuthenticated()) {
              <li class="nav-item"><a routerLink="/" class="nav-link">Accueil</a></li>
              <li class="nav-item"><a href="#features" class="nav-link">Fonctionnalités</a></li>
              <li class="nav-item"><a href="#about" class="nav-link">À propos</a></li>
            } @else {
              <li class="nav-item"><a routerLink="/dashboard" class="nav-link">Tableau de bord</a></li>
              
              @if (authService.hasRole('ROLE_CHEF_PROJET') || authService.hasRole('ROLE_ADMIN')) {
                <li class="nav-item dropdown">
                  <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                    Mes Projets
                  </a>
                  <ul class="dropdown-menu">
                    <li>
                      <a class="dropdown-item" routerLink="/fiche-projet/new">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                          <line x1="12" y1="5" x2="12" y2="19"/>
                          <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Créer une fiche de projet
                      </a>
                    </li>
                    <li><hr class="dropdown-divider"></li>
                    <li>
                      <a class="dropdown-item" routerLink="/projets">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                        Liste des projets
                      </a>
                    </li>
                  </ul>
                </li>
              }
              
              <li class="nav-item"><a routerLink="/suivi" class="nav-link">Suivi</a></li>
              @if (authService.hasRole('ROLE_ADMIN')) {
                <li class="nav-item"><a routerLink="/admin" class="nav-link">Administration</a></li>
              }
            }
          </ul>
          <div class="d-flex gap-3 align-items-center">
            @if (!authService.isAuthenticated()) {
              <a routerLink="/login" class="btn btn-primary">Connexion</a>
            } @else {
              <div class="dropdown">
                <button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                  {{ authService.currentUser()?.username }}
                </button>
                <ul class="dropdown-menu">
                  <li><a class="dropdown-item" routerLink="/profile">Mon Profil</a></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" (click)="logout()" style="cursor: pointer;">Déconnexion</a></li>
                </ul>
              </div>
            }
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  authService = inject(AuthService);

  logout() {
    this.authService.logout();
  }
}
