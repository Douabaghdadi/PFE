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
    <div class="register-page">
      <div class="register-card">

        <!-- LEFT: Form -->
        <div class="register-left">
          <h2 class="register-title">Inscription</h2>
          <p class="register-subtitle">Créer un nouveau compte</p>

          @if (errorMessage()) {
            <div class="error-box">{{ errorMessage() }}</div>
          }

          @if (successMessage()) {
            <div class="success-box">{{ successMessage() }}</div>
          }

          <form #registerForm="ngForm" (ngSubmit)="onSubmit(registerForm)" class="register-form">
            <div class="field-group">
              <label for="username">Nom d'utilisateur</label>
              <input
                type="text"
                id="username"
                [class.is-invalid]="usernameField.invalid && usernameField.touched"
                [class.is-valid]="usernameField.valid && usernameField.touched"
                [(ngModel)]="username"
                name="username"
                #usernameField="ngModel"
                placeholder="votre_nom"
                required
                minlength="3"
                maxlength="30"
                pattern="^[a-zA-Z0-9_]+$" />
              @if (usernameField.invalid && usernameField.touched) {
                <div class="field-error">
                  @if (usernameField.errors?.['required']) { Nom d'utilisateur requis. }
                  @else if (usernameField.errors?.['minlength']) { Minimum 3 caractères. }
                  @else if (usernameField.errors?.['pattern']) { Lettres, chiffres et _ uniquement. }
                </div>
              }
            </div>

            <div class="field-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                [class.is-invalid]="emailField.invalid && emailField.touched"
                [class.is-valid]="emailField.valid && emailField.touched"
                [(ngModel)]="email"
                name="email"
                #emailField="ngModel"
                placeholder="mail@gmail.com"
                required
                email />
              @if (emailField.invalid && emailField.touched) {
                <div class="field-error">
                  @if (emailField.errors?.['required']) { Email requis. }
                  @else { Adresse email invalide. }
                </div>
              }
            </div>

            <div class="field-group">
              <label for="phoneNumber">Numéro de téléphone</label>
              <input
                type="tel"
                id="phoneNumber"
                [class.is-invalid]="phoneField.invalid && phoneField.touched"
                [class.is-valid]="phoneField.valid && phoneField.touched"
                [(ngModel)]="phoneNumber"
                name="phoneNumber"
                #phoneField="ngModel"
                placeholder="+216XXXXXXXX"
                required
                pattern="^\\+216[0-9]{8}$" />
              @if (phoneField.invalid && phoneField.touched) {
                <div class="field-error">
                  @if (phoneField.errors?.['required']) { Numéro de téléphone requis. }
                  @else { Format invalide. Exemple : +21612345678 }
                </div>
              }
            </div>

            <div class="field-group">
              <label for="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                [class.is-invalid]="passwordField.invalid && passwordField.touched"
                [class.is-valid]="passwordField.valid && passwordField.touched"
                [(ngModel)]="password"
                name="password"
                #passwordField="ngModel"
                placeholder="••••••"
                required
                minlength="8"
                pattern="^(?=.*[A-Z])(?=.*[0-9]).+$" />
              @if (passwordField.invalid && passwordField.touched) {
                <div class="field-error">
                  @if (passwordField.errors?.['required']) { Mot de passe requis. }
                  @else if (passwordField.errors?.['minlength']) { Minimum 8 caractères. }
                  @else { Doit contenir au moins 1 majuscule et 1 chiffre. }
                </div>
              }
            </div>

            <div class="field-group">
              <label for="confirmPassword">Confirmer le mot de passe</label>
              <input
                type="password"
                id="confirmPassword"
                [class.is-invalid]="confirmField.touched && confirmPassword !== password"
                [class.is-valid]="confirmField.touched && confirmPassword === password && !!confirmPassword"
                [(ngModel)]="confirmPassword"
                name="confirmPassword"
                #confirmField="ngModel"
                placeholder="••••••"
                required />
              @if (confirmField.touched && confirmPassword !== password) {
                <div class="field-error">Les mots de passe ne correspondent pas.</div>
              }
            </div>

            <button
              type="submit"
              class="register-btn"
              [disabled]="registerForm.invalid || confirmPassword !== password || loading()">
              @if (loading()) { <span class="spinner"></span> }
              {{ loading() ? 'INSCRIPTION...' : "S'INSCRIRE" }}
            </button>
          </form>

          <p class="login-text">Vous avez déjà un compte ? <a routerLink="/login">Se connecter</a></p>
        </div>

        <!-- RIGHT: Illustration -->
        <div class="register-right">
          <div class="right-bg">
            <div class="deco-circle c1"></div>
            <div class="deco-circle c2"></div>
            <div class="brand-medal">
              <img src="assets/images/branding/qualinet-logo.png" alt="Qualinet - Suivi projets & qualité" />
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .register-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f6fa;
      padding: 32px 16px;
    }
    .register-card {
      display: flex;
      width: 880px;
      max-width: 100%;
      min-height: 490px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.13);
      overflow: hidden;
    }
    .register-left {
      flex: 1;
      padding: 42px 48px;
      display: flex;
      flex-direction: column;
    }
    .register-title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 6px 0;
      letter-spacing: -0.5px;
      text-align: center;
    }
    .register-subtitle {
      text-align: center;
      font-size: 13px;
      color: #9ca3af;
      margin: 0 0 26px 0;
    }
    .error-box {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #b91c1c;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .success-box {
      background: #ecfdf5;
      border-left: 4px solid #10b981;
      color: #047857;
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }
    .register-form { display: flex; flex-direction: column; gap: 16px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-group label { font-size: 12px; color: #9ca3af; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
    .field-group input {
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      outline: none;
      padding: 11px 14px;
      font-size: 14px;
      color: #111827;
      background: #f9fafb;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .field-group input:focus {
      border-color: #10b981;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
    }
    .field-group input.is-valid { border-color: #10b981; }
    .field-group input.is-invalid { border-color: #ef4444; background: #fef2f2; }
    .field-group input.is-invalid:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
    .field-error { font-size: 12px; color: #ef4444; }
    .register-btn {
      margin-top: 6px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 2px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s, transform 0.1s;
      box-shadow: 0 4px 14px rgba(16,185,129,0.35);
    }
    .register-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .register-btn:active:not(:disabled) { transform: translateY(0); }
    .register-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .login-text { text-align: center; font-size: 12px; color: #888; margin-top: 16px; }
    .login-text a { color: #10b981; text-decoration: none; }
    .login-text a:hover { text-decoration: underline; }
    .register-right { width: 360px; position: relative; overflow: hidden; }
    .right-bg {
      width: 100%; height: 100%;
      background: linear-gradient(135deg, #059669 0%, #10b981 55%, #34d399 100%);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .deco-circle { position: absolute; border-radius: 50%; }
    .c1 { width: 210px; height: 210px; background: rgba(255,255,255,0.12); top: -70px; right: -70px; }
    .c2 { width: 130px; height: 130px; background: rgba(255,255,255,0.1); bottom: 10px; left: -40px; }
    .brand-medal {
      position: relative;
      z-index: 1;
      width: 268px;
      height: 268px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 18px 40px rgba(4,90,60,0.25), 0 0 0 12px rgba(255,255,255,0.18);
    }
    .brand-medal img { width: 192px; height: auto; }

    @media (max-width: 820px) {
      .register-right { display: none; }
      .register-card { width: 460px; }
      .register-left { padding: 34px 28px; }
    }
  `]
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
