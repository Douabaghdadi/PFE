import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 2rem 0;">
      <div class="container" style="max-width: 600px;">
        <div class="mb-4">
          <a routerLink="/profile" style="color: #10b981; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500;">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
            </svg>
            Retour au profil
          </a>
        </div>

        <div class="card shadow-sm" style="border-radius: 1rem; border: none;">
          <div class="card-body p-4">
            <div class="text-center mb-4">
              <div class="d-inline-flex align-items-center justify-content-center mb-3" 
                   style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
                <svg style="width: 30px; height: 30px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h2 style="font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Changer le mot de passe</h2>
              <p style="color: #6b7280;">Sécurisez votre compte avec un nouveau mot de passe</p>
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

            <form [formGroup]="changePasswordForm" (ngSubmit)="onSubmit()">
              <div class="mb-3">
                <label class="form-label" style="font-weight: 500; color: #374151;">Mot de passe actuel</label>
                <input 
                  type="password" 
                  class="form-control" 
                  formControlName="currentPassword"
                  placeholder="Entrez votre mot de passe actuel"
                  style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                @if (changePasswordForm.get('currentPassword')?.invalid && changePasswordForm.get('currentPassword')?.touched) {
                  <small class="text-danger">Le mot de passe actuel est requis</small>
                }
              </div>

              <div class="mb-3">
                <label class="form-label" style="font-weight: 500; color: #374151;">Nouveau mot de passe</label>
                <input 
                  type="password" 
                  class="form-control" 
                  formControlName="newPassword"
                  placeholder="Entrez votre nouveau mot de passe"
                  style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                @if (changePasswordForm.get('newPassword')?.invalid && changePasswordForm.get('newPassword')?.touched) {
                  <small class="text-danger">Le mot de passe doit contenir au moins 6 caractères</small>
                }
              </div>

              <div class="mb-4">
                <label class="form-label" style="font-weight: 500; color: #374151;">Confirmer le nouveau mot de passe</label>
                <input 
                  type="password" 
                  class="form-control" 
                  formControlName="confirmPassword"
                  placeholder="Confirmez votre nouveau mot de passe"
                  style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                @if (changePasswordForm.get('confirmPassword')?.invalid && changePasswordForm.get('confirmPassword')?.touched) {
                  <small class="text-danger">Les mots de passe ne correspondent pas</small>
                }
              </div>

              <button 
                type="submit" 
                class="btn w-100" 
                [disabled]="changePasswordForm.invalid || isLoading"
                style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white; transition: all 0.2s;">
                @if (isLoading) {
                  <span class="spinner-border spinner-border-sm me-2"></span>
                  Changement en cours...
                } @else {
                  Changer le mot de passe
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  changePasswordForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor() {
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
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
    if (this.changePasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const user = this.authService.currentUser();
      const payload = {
        userId: user?.id,
        currentPassword: this.changePasswordForm.value.currentPassword,
        newPassword: this.changePasswordForm.value.newPassword
      };

      this.http.post('http://localhost:8081/api/auth/change-password', payload)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.successMessage = 'Mot de passe changé avec succès ! Redirection...';
            setTimeout(() => {
              this.router.navigate(['/profile']);
            }, 2000);
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Erreur lors du changement de mot de passe';
          }
        });
    }
  }
}
