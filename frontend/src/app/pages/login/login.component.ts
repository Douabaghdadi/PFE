import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);">
      <div class="w-full" style="max-width: 600px;">
        <!-- Logo et titre -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 mb-4 shadow-lg" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 1rem;">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-gray-900">Connexion</h2>
          <p class="mt-2 text-sm text-gray-600">Application de Suivi des Processus Qualité</p>
        </div>

        <!-- Carte de connexion -->
        <div class="bg-white shadow-xl p-8" style="border-radius: 1rem;">
          @if (errorMessage()) {
            <div class="mb-6 p-4 border-l-4" style="background-color: #fef2f2; border-color: #ef4444; border-radius: 0.5rem;">
              <div class="flex items-center">
                <i class="fas fa-exclamation-circle text-red-500 mr-3"></i>
                <p class="text-sm text-red-700">{{ errorMessage() }}</p>
              </div>
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Email -->
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-envelope text-gray-400"></i>
                </div>
                <input 
                  type="email" 
                  id="username" 
                  [(ngModel)]="username"
                  name="username"
                  placeholder="exemple@email.com"
                  required
                  class="block w-full py-3 border border-gray-300 transition-colors"
                  style="padding-left: 2.5rem; padding-right: 0.75rem; border-radius: 0.5rem;"
                  (focus)="onFocus($event)"
                  (blur)="onBlur($event)">
              </div>
            </div>

            <!-- Mot de passe -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="fas fa-lock text-gray-400"></i>
                </div>
                <input 
                  type="password" 
                  id="password" 
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  class="block w-full py-3 border border-gray-300 transition-colors"
                  style="padding-left: 2.5rem; padding-right: 0.75rem; border-radius: 0.5rem;"
                  (focus)="onFocus($event)"
                  (blur)="onBlur($event)">
              </div>
            </div>

            <!-- Se souvenir de moi -->
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="remember"
                  class="h-4 w-4 border-gray-300"
                  style="border-radius: 0.25rem; color: #10b981;">
                <label for="remember" class="ml-2 block text-sm text-gray-700">
                  Se souvenir de moi
                </label>
              </div>
              <a routerLink="/forgot-password" class="text-sm font-medium" style="color: #10b981;">
                Mot de passe oublié ?
              </a>
            </div>

            <!-- Bouton de connexion -->
            <button 
              type="submit" 
              [disabled]="isLoading()"
              class="w-full flex justify-center items-center py-3 px-4 border-0 shadow-sm text-sm font-semibold text-white transition-all"
              style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 0.5rem;"
              [style.opacity]="isLoading() ? '0.5' : '1'"
              [style.cursor]="isLoading() ? 'not-allowed' : 'pointer'">
              @if (isLoading()) {
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connexion en cours...
              } @else {
                Se connecter
              }
            </button>
          </form>

          <!-- Lien d'inscription -->
          <div class="mt-6 text-center">
            <p class="text-sm text-gray-600">
              Pas encore de compte ? 
              <a routerLink="/register" class="font-medium" style="color: #10b981;">
                S'inscrire ici
              </a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <p class="mt-8 text-center text-xs text-gray-500">
          © 2024 QualityHub. Tous droits réservés.
        </p>
      </div>
    </div>
  `,
  styles: [`
    input:focus {
      outline: none;
      border-color: #10b981 !important;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    }
    
    button:hover:not(:disabled) {
      background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
    }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);
  
  username = '';
  password = '';
  errorMessage = signal('');
  isLoading = signal(false);

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage.set('Veuillez remplir tous les champs');
      return;
    }

    this.errorMessage.set('');
    this.isLoading.set(true);
    
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        
        // Rediriger selon le rôle de l'utilisateur
        if (this.authService.hasRole('ROLE_ADMIN')) {
          this.router.navigate(['/admin/dashboard']);
        } else if (this.authService.hasRole('ROLE_CHEF_PROJET')) {
          this.router.navigate(['/projets']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        if (error.status === 401) {
          this.errorMessage.set('Email ou mot de passe incorrect');
        } else if (error.status === 0) {
          this.errorMessage.set('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.');
        } else {
          this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
        }
      }
    });
  }

  onFocus(event: Event) {
    const input = event.target as HTMLInputElement;
    input.style.borderColor = '#10b981';
    input.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
  }

  onBlur(event: Event) {
    const input = event.target as HTMLInputElement;
    input.style.borderColor = '#d1d5db';
    input.style.boxShadow = 'none';
  }
}
