import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

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
                  class="form-control pwd-input"
                  [class.is-invalid]="currentPassword.invalid && currentPassword.touched"
                  formControlName="currentPassword"
                  placeholder="Entrez votre mot de passe actuel">
                @if (currentPassword.invalid && currentPassword.touched) {
                  <div class="field-error">Le mot de passe actuel est requis.</div>
                }
              </div>

              <div class="mb-3">
                <label class="form-label" style="font-weight: 500; color: #374151;">Nouveau mot de passe</label>
                <input
                  type="password"
                  class="form-control pwd-input"
                  [class.is-invalid]="newPassword.invalid && newPassword.touched"
                  [class.is-valid]="newPassword.valid && newPassword.touched"
                  formControlName="newPassword"
                  placeholder="Entrez votre nouveau mot de passe">
                @if (newPassword.invalid && newPassword.touched) {
                  <div class="field-error">
                    @if (newPassword.errors?.['required']) { Mot de passe requis. }
                    @else if (newPassword.errors?.['minlength']) { Minimum 8 caractères. }
                    @else { Doit contenir au moins 1 majuscule et 1 chiffre. }
                  </div>
                }
              </div>

              <div class="mb-4">
                <label class="form-label" style="font-weight: 500; color: #374151;">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  class="form-control pwd-input"
                  [class.is-invalid]="confirmPassword.touched && passwordMismatch"
                  [class.is-valid]="confirmPassword.touched && !passwordMismatch && !!confirmPassword.value"
                  formControlName="confirmPassword"
                  placeholder="Confirmez votre nouveau mot de passe">
                @if (confirmPassword.touched && passwordMismatch) {
                  <div class="field-error">Les mots de passe ne correspondent pas.</div>
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
  `,
  styles: [`
    .pwd-input {
      border-radius: 0.5rem;
      border: 1.5px solid #e5e7eb;
      padding: 0.75rem;
      background-image: none;
    }
    .pwd-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
    .pwd-input.is-valid { border-color: #10b981; }
    .pwd-input.is-invalid { border-color: #ef4444; background: #fef2f2; }
    .pwd-input.is-invalid:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
    .field-error { font-size: 12px; color: #ef4444; margin-top: 6px; }
  `]
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
      // Mêmes règles que le mot de passe de la page d'inscription
      newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Z])(?=.*[0-9]).+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  get currentPassword() { return this.changePasswordForm.get('currentPassword')!; }
  get newPassword() { return this.changePasswordForm.get('newPassword')!; }
  get confirmPassword() { return this.changePasswordForm.get('confirmPassword')!; }
  get passwordMismatch() { return this.changePasswordForm.hasError('passwordMismatch'); }

  passwordMatchValidator(form: AbstractControl) {
    return form.get('newPassword')?.value !== form.get('confirmPassword')?.value
      ? { passwordMismatch: true }
      : null;
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

      this.http.post(`${environment.apiUrl}/api/auth/change-password`, payload)
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
