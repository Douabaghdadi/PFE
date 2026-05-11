import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="bg-white shadow-sm sticky-top" style="border-bottom: 1px solid #e5e7eb;">
      <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 1rem;">
        <div class="d-flex justify-content-between align-items-center" style="height: 70px;">
          <!-- Logo -->
          <a class="d-flex align-items-center gap-2 text-decoration-none" routerLink="/" style="font-weight: 600; font-size: 1.25rem; color: #111827;">
            <div class="d-flex align-items-center justify-content-center" style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 0.5rem;">
              <svg style="width: 24px; height: 24px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <span>QualityHub</span>
          </a>

          <!-- Menu Desktop -->
          <div class="d-none d-lg-flex align-items-center gap-1">
            @if (!authService.isAuthenticated()) {
              <a routerLink="/" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;" 
                 onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                 onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                Accueil
              </a>
              <a href="#features" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                 onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                 onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                Fonctionnalités
              </a>
              <a href="#about" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                 onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                 onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                À propos
              </a>
            } @else {
              @if (authService.hasRole('ROLE_PILOTE_QUALITE')) {
                <a routerLink="/pilote-qualite/dashboard" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                   onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                  Dashboard
                </a>
                <a routerLink="/pilote-qualite/fiches-projet" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                   onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                  Fiches Projet
                </a>
                <a routerLink="/pilote-qualite/fiches-suivi" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                   onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                  Fiches de Suivi
                </a>
                <a routerLink="/pilote-qualite/notifications" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                   onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                  <i class="fas fa-bell mr-1"></i>Notifications
                </a>
              } @else {
                <a routerLink="/dashboard" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                   onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                  Tableau de bord
                </a>
              }
              
              @if (authService.hasRole('ROLE_CHEF_PROJET') || authService.hasRole('ROLE_ADMIN')) {
                <div class="dropdown">
                  <a class="nav-link px-3 py-2 dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" 
                     style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;">
                    Mes Projets
                  </a>
                  <ul class="dropdown-menu" style="border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <li>
                      <a class="dropdown-item d-flex align-items-center" routerLink="/fiche-projet/new" style="padding: 0.5rem 1rem; border-radius: 0.375rem;">
                        <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <line x1="12" y1="5" x2="12" y2="19" stroke-width="2"/>
                          <line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>
                        </svg>
                        Créer une fiche
                      </a>
                    </li>
                    <li><hr class="dropdown-divider" style="margin: 0.5rem 0;"></li>
                    <li>
                      <a class="dropdown-item d-flex align-items-center" routerLink="/projets" style="padding: 0.5rem 1rem; border-radius: 0.375rem;">
                        <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        </svg>
                        Liste des projets
                      </a>
                    </li>
                  </ul>
                </div>
              }
              
              @if (authService.hasRole('ROLE_CHEF_PROJET') || authService.hasRole('ROLE_ADMIN')) {
                <div class="dropdown">
                  <a class="nav-link px-3 py-2 dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" 
                     style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;">
                    Suivi
                  </a>
                  <ul class="dropdown-menu" style="border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <li>
                      <a class="dropdown-item d-flex align-items-center" routerLink="/fiche-suivi/new" style="padding: 0.5rem 1rem; border-radius: 0.375rem;">
                        <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <line x1="12" y1="5" x2="12" y2="19" stroke-width="2"/>
                          <line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>
                        </svg>
                        Créer une fiche de suivi
                      </a>
                    </li>
                    <li><hr class="dropdown-divider" style="margin: 0.5rem 0;"></li>
                    <li>
                      <a class="dropdown-item d-flex align-items-center" routerLink="/fiches-suivi" style="padding: 0.5rem 1rem; border-radius: 0.375rem;">
                        <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        Mes fiches de suivi
                      </a>
                    </li>
                  </ul>
                </div>
              }

              @if (authService.hasRole('ROLE_ADMIN')) {
                <a routerLink="/admin" class="nav-link px-3 py-2" style="color: #6b7280; font-weight: 500; border-radius: 0.375rem; transition: all 0.2s;"
                   onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#111827';" 
                   onmouseout="this.style.backgroundColor='transparent'; this.style.color='#6b7280';">
                  Administration
                </a>
              }
            }
          </div>

          <!-- Actions -->
          <div class="d-flex align-items-center gap-3">
            @if (!authService.isAuthenticated()) {
              <a routerLink="/login" class="btn text-white" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.5rem 1.5rem; border-radius: 0.5rem; font-weight: 500; transition: all 0.2s;"
                 onmouseover="this.style.background='linear-gradient(135deg, #059669 0%, #047857 100%)';" 
                 onmouseout="this.style.background='linear-gradient(135deg, #10b981 0%, #059669 100%)';">
                Connexion
              </a>
            } @else {
              <div class="dropdown">
                <button class="btn d-flex align-items-center gap-2 dropdown-toggle" type="button" data-bs-toggle="dropdown" 
                        style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 500; color: #374151;">
                  <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  {{ authService.currentUser()?.username }}
                </button>
                <ul class="dropdown-menu dropdown-menu-end" style="border-radius: 0.5rem; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); min-width: 200px;">
                  <li>
                    <a class="dropdown-item d-flex align-items-center" routerLink="/profile" style="padding: 0.5rem 1rem; border-radius: 0.375rem;">
                      <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                      </svg>
                      Mon Profil
                    </a>
                  </li>
                  <li><hr class="dropdown-divider" style="margin: 0.5rem 0;"></li>
                  <li>
                    <a class="dropdown-item d-flex align-items-center" (click)="logout()" style="cursor: pointer; padding: 0.5rem 1rem; border-radius: 0.375rem; color: #dc2626;">
                      <svg style="width: 16px; height: 16px; margin-right: 0.5rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                      </svg>
                      Déconnexion
                    </a>
                  </li>
                </ul>
              </div>
            }
            
            <!-- Mobile Menu Toggle -->
            <button class="btn d-lg-none" type="button" data-bs-toggle="collapse" data-bs-target="#mobileMenu" 
                    style="border: 1px solid #e5e7eb; padding: 0.5rem; border-radius: 0.375rem;">
              <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        <div class="collapse d-lg-none" id="mobileMenu" style="padding-bottom: 1rem;">
          @if (!authService.isAuthenticated()) {
            <a routerLink="/" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">Accueil</a>
            <a href="#features" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">Fonctionnalités</a>
            <a href="#about" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">À propos</a>
          } @else {
            @if (authService.hasRole('ROLE_PILOTE_QUALITE')) {
              <a routerLink="/pilote-qualite/dashboard" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">
                Dashboard
              </a>
              <a routerLink="/pilote-qualite/fiches-projet" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">
                Fiches Projet
              </a>
              <a routerLink="/pilote-qualite/fiches-suivi" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">
                Fiches de Suivi
              </a>
              <a routerLink="/pilote-qualite/notifications" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">
                <i class="fas fa-bell mr-1"></i>Notifications
              </a>
            } @else {
              <a routerLink="/dashboard" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">Tableau de bord</a>
            }
            
            @if (authService.hasRole('ROLE_CHEF_PROJET') || authService.hasRole('ROLE_ADMIN')) {
              <div style="padding-left: 0.75rem; padding-top: 0.5rem; padding-bottom: 0.25rem;">
                <span style="color: #9ca3af; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Projets</span>
              </div>
              <a routerLink="/fiche-projet/new" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500; padding-left: 1.5rem !important;">
                <svg style="width: 14px; height: 14px; margin-right: 0.5rem; display: inline-block;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" stroke-width="2"/>
                  <line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>
                </svg>
                Créer une fiche projet
              </a>
              <a routerLink="/projets" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500; padding-left: 1.5rem !important;">
                <svg style="width: 14px; height: 14px; margin-right: 0.5rem; display: inline-block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
                Liste des projets
              </a>
              
              <div style="padding-left: 0.75rem; padding-top: 0.75rem; padding-bottom: 0.25rem;">
                <span style="color: #9ca3af; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Suivi</span>
              </div>
              <a routerLink="/fiche-suivi/new" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500; padding-left: 1.5rem !important;">
                <svg style="width: 14px; height: 14px; margin-right: 0.5rem; display: inline-block;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" stroke-width="2"/>
                  <line x1="5" y1="12" x2="19" y2="12" stroke-width="2"/>
                </svg>
                Créer une fiche de suivi
              </a>
              <a routerLink="/fiches-suivi" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500; padding-left: 1.5rem !important;">
                <svg style="width: 14px; height: 14px; margin-right: 0.5rem; display: inline-block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Mes fiches de suivi
              </a>
            }

            @if (authService.hasRole('ROLE_ADMIN')) {
              <a routerLink="/admin" class="d-block py-2 px-3 text-decoration-none" style="color: #6b7280; font-weight: 500;">Administration</a>
            }
          }
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
