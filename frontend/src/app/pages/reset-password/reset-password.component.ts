import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); display: flex; align-items: center; justify-content: center; padding: 2rem;">
      <div class="container" style="max-width: 500px;">
        <div class="card shadow-sm" style="border-radius: 1rem; border: none;">
          <div class="card-body p-4">
            <div class="text-center mb-4">
              <div class="d-inline-flex align-items-center justify-content-center mb-3" 
                   style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
                <svg style="width: 30px; height: 30px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h2 style="font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Nouveau mot de passe</h2>
              <p style="color: #6b7280;">Créez un nouveau mot de passe sécurisé</p>
            </div>

            @if (errorMessage) {
              <div class="alert alert-danger" style="border-radius: 0.75rem; border-left: 4px solid #dc2626;">
                {{ errorMessage }}
              </div>
            }

            @if (successMessage) {
              <div class="alert alert-success" style="border-radius: 0.75rem; border-left: 4px solid #10b981;">
                {{ successMessage }}
              </div>
            }

            @if (!tokenValid) {
              <div class="text-center">
                <div class="mb-4" style="padding: 2rem; background: #fef2f2; border-radius: 0.75rem;">
                  <svg style="width: 60px; height: 60px; color: #dc2626; margin-bottom: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                  <h5 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">Lien invalide ou expiré</h5>
                  <p style="color: #6b7280; margin-bottom: 0;">Ce lien de réinitialisation n'est plus valide. Veuillez demander un nouveau lien.</p>
                </div>
                <a routerLink="/forgot-password" class="btn w-100 mb-2" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white;">
                  Demander un nouveau lien
                </a>
                <a routerLink="/login" class="btn w-100" style="background: white; border: 2px solid #e5e7eb; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: #374151;">
                  Retour à la connexion
                </a>
              </div>
            } @else if (!passwordReset) {
              <form [formGroup]="resetPasswordForm" (ngSubmit)="onSubmit()">
                <div class="mb-3">
                  <label class="form-label" style="font-weight: 500; color: #374151;">Nouveau mot de passe</label>
                  <input 
                    type="password" 
                    class="form-control" 
                    formControlName="newPassword"
                    placeholder="Entrez votre nouveau mot de passe"
                    style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                  @if (resetPasswordForm.get('newPassword')?.invalid && resetPasswordForm.get('newPassword')?.touched) {
                    <small class="text-danger">Le mot de passe doit contenir au moins 6 caractères</small>
                  }
                </div>

                <div class="mb-4">
                  <label class="form-label" style="font-weight: 500; color: #374151;">Confirmer le mot de passe</label>
                  <input 
                    type="password" 
                    class="form-control" 
                    formControlName="confirmPassword"
                    placeholder="Confirmez votre nouveau mot de passe"
                    style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                  @if (resetPasswordForm.get('confirmPassword')?.invalid && resetPasswordForm.get('confirmPassword')?.touched) {
                    <small class="text-danger">Les mots de passe ne correspondent pas</small>
                  }
                </div>

                <button 
                  type="submit" 
                  class="btn w-100 mb-3" 
                  [disabled]="resetPasswordForm.invalid || isLoading"
                  style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white; transition: all 0.2s;">
                  @if (isLoading) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Réinitialisation...
                  } @else {
                    Réinitialiser le mot de passe
                  }
                </button>

                <div class="text-center">
                  <a routerLink="/login" style="color: #10b981; text-decoration: none; font-weight: 500;">
                    <svg style="width: 16px; height: 16px; display: inline-block; margin-right: 0.25rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
                    </svg>
                    Retour à la connexion
                  </a>
                </div>
              </form>
            } @else {
              <div class="text-center">
                <div class="mb-4" style="padding: 2rem; background: #f0fdf4; border-radius: 0.75rem;">
                  <svg style="width: 60px; height: 60px; color: #10b981; margin-bottom: 1rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <h5 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">Mot de passe réinitialisé !</h5>
                  <p style="color: #6b7280; margin-bottom: 0;">Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
                </div>
                <a routerLink="/login" class="btn w-100" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white;">
                  Se connecter
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  resetPasswordForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  passwordReset = false;
  tokenValid = true;
  token = '';

  constructor() {
    this.resetPasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit() {
    // Récupérer le token depuis l'URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (!this.token) {
        this.tokenValid = false;
        this.errorMessage = 'Token manquant';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit() {
    if (this.resetPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const payload = {
        token: this.token,
        newPassword: this.resetPasswordForm.value.newPassword
      };

      this.http.post('http://localhost:8081/api/auth/reset-password', payload)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.passwordReset = true;
            this.successMessage = 'Votre mot de passe a été réinitialisé avec succès !';
          },
          error: (error) => {
            this.isLoading = false;
            if (error.error?.message) {
              this.errorMessage = error.error.message;
              if (error.error.message.includes('expir') || error.error.message.includes('invalide')) {
                this.tokenValid = false;
              }
            } else {
              this.errorMessage = 'Erreur lors de la réinitialisation du mot de passe';
            }
          }
        });
    }
  }
}
