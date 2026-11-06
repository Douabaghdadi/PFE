import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './change-password.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/form-ui.css']
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);

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
    if (!this.changePasswordForm.valid) {
      // Les champs invalides sont signalés plutôt que de laisser le bouton sans effet
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
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
