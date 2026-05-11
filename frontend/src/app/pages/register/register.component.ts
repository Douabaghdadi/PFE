import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-vh-100 d-flex align-items-center bg-light">
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-6">
            <div class="card shadow-sm rounded-4">
              <div class="card-body p-5">
                <div class="text-center mb-4">
                  <h2 class="fw-bold">Inscription</h2>
                  <p class="text-muted">Créer un nouveau compte</p>
                </div>
                
                @if (errorMessage()) {
                  <div class="alert alert-danger" role="alert">
                    {{ errorMessage() }}
                  </div>
                }

                @if (successMessage()) {
                  <div class="alert alert-success" role="alert">
                    {{ successMessage() }}
                  </div>
                }

                <form (ngSubmit)="onSubmit()">
                  <div class="mb-3">
                    <label for="username" class="form-label">Nom d'utilisateur</label>
                    <input 
                      type="text" 
                      class="form-control" 
                      id="username" 
                      [(ngModel)]="username"
                      name="username"
                      required>
                  </div>
                  <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input 
                      type="email" 
                      class="form-control" 
                      id="email" 
                      [(ngModel)]="email"
                      name="email"
                      required>
                  </div>
                  <div class="mb-3">
                    <label for="phoneNumber" class="form-label">Numéro de téléphone</label>
                    <input 
                      type="tel" 
                      class="form-control" 
                      id="phoneNumber" 
                      [(ngModel)]="phoneNumber"
                      name="phoneNumber"
                      placeholder="+216XXXXXXXX"
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
                  <div class="mb-3">
                    <label for="confirmPassword" class="form-label">Confirmer le mot de passe</label>
                    <input 
                      type="password" 
                      class="form-control" 
                      id="confirmPassword" 
                      [(ngModel)]="confirmPassword"
                      name="confirmPassword"
                      required>
                  </div>
                  <button type="submit" class="btn btn-primary w-100">S'inscrire</button>
                </form>

                <div class="text-center mt-4">
                  <p class="text-muted small">
                    Vous avez déjà un compte ? <a routerLink="/login" class="text-primary">Se connecter</a>
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
export class RegisterComponent {
  router = inject(Router);
  authService = inject(AuthService);
  
  username = '';
  email = '';
  phoneNumber = '';
  password = '';
  confirmPassword = '';
  errorMessage = signal('');
  successMessage = signal('');

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.username || !this.email || !this.phoneNumber || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Veuillez remplir tous les champs');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Les mots de passe ne correspondent pas');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Appel API pour l'inscription
    this.authService.register(this.username, this.email, this.phoneNumber, this.password).subscribe({
      next: (response: any) => {
        this.successMessage.set('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        
        // Redirection vers la page de connexion après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        console.error('Erreur d\'inscription:', error);
        
        // Afficher le message d'erreur du backend si disponible
        if (error.status === 0) {
          this.errorMessage.set('Impossible de se connecter au serveur. Vérifiez que le backend est démarré.');
        } else if (error.error?.message) {
          this.errorMessage.set(error.error.message);
        } else if (error.message) {
          this.errorMessage.set(error.message);
        } else {
          this.errorMessage.set('Erreur lors de l\'inscription. Veuillez réessayer.');
        }
      }
    });
  }
}
