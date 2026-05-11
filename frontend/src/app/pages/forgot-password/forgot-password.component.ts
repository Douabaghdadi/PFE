import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
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
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
                </svg>
              </div>
              <h2 style="font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Mot de passe oublié ?</h2>
              <p style="color: #6b7280;">Entrez votre adresse email pour recevoir un lien de réinitialisation</p>
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

            @if (!emailSent) {
              <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()">
                <div class="mb-4">
                  <label class="form-label" style="font-weight: 500; color: #374151;">Adresse email</label>
                  <input 
                    type="email" 
                    class="form-control" 
                    formControlName="email"
                    placeholder="votre.email@exemple.com"
                    style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                  @if (forgotPasswordForm.get('email')?.invalid && forgotPasswordForm.get('email')?.touched) {
                    <small class="text-danger">L'email est requis et doit être valide</small>
                  }
                </div>

                <button 
                  type="submit" 
                  class="btn w-100 mb-3" 
                  [disabled]="forgotPasswordForm.invalid || isLoading"
                  style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white; transition: all 0.2s;">
                  @if (isLoading) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Envoi en cours...
                  } @else {
                    Envoyer le lien de réinitialisation
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
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                  </svg>
                  <h5 style="font-weight: 600; color: #111827; margin-bottom: 0.5rem;">Email envoyé !</h5>
                  <p style="color: #6b7280; margin-bottom: 0;">Vérifiez votre boîte de réception et suivez les instructions pour réinitialiser votre mot de passe.</p>
                </div>
                <a routerLink="/login" class="btn w-100" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white;">
                  Retour à la connexion
                </a>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  forgotPasswordForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  emailSent = false;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const payload = {
        email: this.forgotPasswordForm.value.email
      };

      this.http.post('http://localhost:8081/api/auth/forgot-password', payload)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.emailSent = true;
            this.successMessage = 'Un email de réinitialisation a été envoyé à votre adresse.';
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Erreur lors de l\'envoi de l\'email';
          }
        });
    }
  }
}
