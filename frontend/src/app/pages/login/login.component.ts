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
    <div class="min-vh-100 d-flex align-items-center bg-light">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-5">
            <div class="card shadow-sm rounded-4">
              <div class="card-body p-5">
                <div class="text-center mb-4">
                  <h2 class="fw-bold">Connexion</h2>
                  <p class="text-muted">Application de Suivi des Processus Qualité</p>
                </div>
                
                @if (errorMessage()) {
                  <div class="alert alert-danger" role="alert">
                    {{ errorMessage() }}
                  </div>
                }

                <form (ngSubmit)="onSubmit()">
                  <div class="mb-3">
                    <label for="username" class="form-label">Adresse email</label>
                    <input 
                      type="email" 
                      class="form-control" 
                      id="username" 
                      [(ngModel)]="username"
                      name="username"
                      placeholder="exemple@email.com"
                      required>
                  </div>
                  <div class="mb-3">
                    <label for="password" class="form-label">Mot de passe</label>
                    <input 
                      type="password" 
                      class="form-control" 
                      id="password" 
                      [(ngModel)]="password"
                      name="password"
                      required>
                  </div>
                  <div class="mb-3 form-check">
                    <input type="checkbox" class="form-check-input" id="remember">
                    <label class="form-check-label" for="remember">
                      Se souvenir de moi
                    </label>
                  </div>
                  <button type="submit" class="btn btn-primary w-100" [disabled]="isLoading()">
                    @if (isLoading()) {
                      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Connexion en cours...
                    } @else {
                      Se connecter
                    }
                  </button>
                </form>

                <div class="text-center mt-4">
                  <p class="text-muted small">
                    Mot de passe oublié ? <a href="#" class="text-primary">Réinitialiser</a>
                  </p>
                  <p class="text-muted small">
                    Pas encore de compte ? <a routerLink="/register" class="text-primary">S'inscrire ici</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
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
        this.router.navigate(['/dashboard']);
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
}
