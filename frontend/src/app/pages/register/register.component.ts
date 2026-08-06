import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
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

                <form #registerForm="ngForm" (ngSubmit)="onSubmit(registerForm)">
                  <div class="mb-3">
                    <label for="username" class="form-label">Nom d'utilisateur</label>
                    <input 
                      type="text" 
                      class="form-control"
                      [class.is-invalid]="usernameField.invalid && usernameField.touched"
                      [class.is-valid]="usernameField.valid && usernameField.touched"
                      id="username" 
                      [(ngModel)]="username"
                      name="username"
                      #usernameField="ngModel"
                      required
                      minlength="3"
                      maxlength="30"
                      pattern="^[a-zA-Z0-9_]+$">
                    @if (usernameField.invalid && usernameField.touched) {
                      <div class="invalid-feedback">
                        @if (usernameField.errors?.['required']) { Nom d'utilisateur requis. }
                        @else if (usernameField.errors?.['minlength']) { Minimum 3 caractères. }
                        @else if (usernameField.errors?.['pattern']) { Lettres, chiffres et _ uniquement. }
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="email" class="form-label">Email</label>
                    <input 
                      type="email" 
                      class="form-control"
                      [class.is-invalid]="emailField.invalid && emailField.touched"
                      [class.is-valid]="emailField.valid && emailField.touched"
                      id="email" 
                      [(ngModel)]="email"
                      name="email"
                      #emailField="ngModel"
                      required
                      email>
                    @if (emailField.invalid && emailField.touched) {
                      <div class="invalid-feedback">
                        @if (emailField.errors?.['required']) { Email requis. }
                        @else { Adresse email invalide. }
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="phoneNumber" class="form-label">Numéro de téléphone</label>
                    <input 
                      type="tel" 
                      class="form-control"
                      [class.is-invalid]="phoneField.invalid && phoneField.touched"
                      [class.is-valid]="phoneField.valid && phoneField.touched"
                      id="phoneNumber" 
                      [(ngModel)]="phoneNumber"
                      name="phoneNumber"
                      #phoneField="ngModel"
                      placeholder="+216XXXXXXXX"
                      required
                      pattern="^\+216[0-9]{8}$">
                    @if (phoneField.invalid && phoneField.touched) {
                      <div class="invalid-feedback">
                        @if (phoneField.errors?.['required']) { Numéro de téléphone requis. }
                        @else { Format invalide. Exemple : +21612345678 }
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="password" class="form-label">Mot de passe</label>
                    <input 
                      type="password" 
                      class="form-control"
                      [class.is-invalid]="passwordField.invalid && passwordField.touched"
                      [class.is-valid]="passwordField.valid && passwordField.touched"
                      id="password" 
                      [(ngModel)]="password"
                      name="password"
                      #passwordField="ngModel"
                      required
                      minlength="8"
                      pattern="^(?=.*[A-Z])(?=.*[0-9]).+$">
                    @if (passwordField.invalid && passwordField.touched) {
                      <div class="invalid-feedback">
                        @if (passwordField.errors?.['required']) { Mot de passe requis. }
                        @else if (passwordField.errors?.['minlength']) { Minimum 8 caractères. }
                        @else { Doit contenir au moins 1 majuscule et 1 chiffre. }
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="confirmPassword" class="form-label">Confirmer le mot de passe</label>
                    <input 
                      type="password" 
                      class="form-control"
                      [class.is-invalid]="confirmField.touched && confirmPassword !== password"
                      [class.is-valid]="confirmField.touched && confirmPassword === password && !!confirmPassword"
                      id="confirmPassword" 
                      [(ngModel)]="confirmPassword"
                      name="confirmPassword"
                      #confirmField="ngModel"
                      required>
                    @if (confirmField.touched && confirmPassword !== password) {
                      <div class="invalid-feedback d-block">Les mots de passe ne correspondent pas.</div>
                    }
                  </div>

                  <button 
                    type="submit" 
                    class="btn btn-primary w-100"
                    [disabled]="registerForm.invalid || confirmPassword !== password || loading()">
                    {{ loading() ? 'Inscription...' : "S'inscrire" }}
                  </button>
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
  loading = signal(false);

  onSubmit(form: NgForm) {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (form.invalid || this.password !== this.confirmPassword) {
      form.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.register(this.username, this.email, this.phoneNumber, this.password).subscribe({
      next: (response: any) => {
        this.loading.set(false);
        this.successMessage.set('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Erreur d\'inscription:', error);
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
