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
    <div class="login-page">
      <div class="login-card">

        <!-- LEFT: Form -->
        <div class="login-left">
          <h2 class="login-title">Connexion</h2>

          @if (errorMessage()) {
            <div class="error-box">{{ errorMessage() }}</div>
          }

          <form (ngSubmit)="onSubmit()" class="login-form">
            <div class="field-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="username" name="username"
                placeholder="mail@gmail.com" required />
            </div>

            <div class="field-group">
              <div class="field-row">
                <label>Mot de passe</label>
                <a routerLink="/forgot-password" class="forgot-link">Mot de passe oublié ?</a>
              </div>
              <input type="password" [(ngModel)]="password" name="password"
                placeholder="••••••" required />
            </div>

            <button type="submit" [disabled]="isLoading()" class="login-btn">
              @if (isLoading()) { <span class="spinner"></span> }
              LOGIN
            </button>
          </form>

          <p class="register-text">Pas encore de compte ? <a routerLink="/register">S'inscrire</a></p>
        </div>

        <!-- RIGHT: Illustration -->
        <div class="login-right">
          <div class="right-bg">
            <div class="deco-circle c1"></div>
            <div class="deco-circle c2"></div>
<img src="assets/images/login.png" class="illustration-img" alt="login illustration" />
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f6fa;
    }
    .login-card {
      display: flex;
      width: 820px;
      min-height: 490px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.13);
      overflow: hidden;
    }
    .login-left {
      flex: 1;
      padding: 42px 48px;
      display: flex;
      flex-direction: column;
    }
    .logo-badge {
      display: inline-flex;
      margin-bottom: 24px;
    }
    .logo-eba {
      background: #fff;
      border: 2px solid #10b981;
      color: #10b981;
      font-weight: 700;
      font-size: 13px;
      padding: 2px 8px;
      border-radius: 4px 0 0 4px;
    }
    .logo-dms {
      background: #10b981;
      color: #fff;
      font-weight: 700;
      font-size: 13px;
      padding: 2px 8px;
      border-radius: 0 4px 4px 0;
    }
    .login-title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 32px 0;
      letter-spacing: -0.5px;
      text-align: center;
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
    .login-form { display: flex; flex-direction: column; gap: 22px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-group label { font-size: 12px; color: #9ca3af; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
    .field-row { display: flex; justify-content: space-between; align-items: center; }
    .forgot-link { font-size: 12px; color: #10b981; text-decoration: none; font-weight: 500; }
    .forgot-link:hover { text-decoration: underline; }
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
    .login-btn {
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
    .login-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); }
    .login-btn:active:not(:disabled) { transform: translateY(0); }
    .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .switch-account { text-align: center; font-size: 12px; color: #888; margin: 14px 0 4px; }
    .switch-account a { color: #10b981; text-decoration: none; }
    .switch-account a:hover { text-decoration: underline; }
    .or-text { text-align: center; font-size: 12px; color: #bbb; margin: 4px 0; }
    .social-icons { display: flex; justify-content: center; gap: 14px; margin: 8px 0; }
    .social-btn {
      width: 40px; height: 40px;
      border-radius: 50%;
      border: 1.5px solid #e5e7eb;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: box-shadow 0.2s;
    }
    .social-btn:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .register-text { text-align: center; font-size: 12px; color: #888; margin-top: 16px; }
    .register-text a { color: #10b981; text-decoration: none; }
    .register-text a:hover { text-decoration: underline; }
    .terms-text { text-align: center; font-size: 11px; color: #bbb; margin: 0; }
    .terms-text a { color: #10b981; text-decoration: none; }
    .terms-text a:hover { text-decoration: underline; }
    .login-right { width: 360px; position: relative; overflow: hidden; }
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
    .illustration-img { width: 92%; height: auto; position: relative; z-index: 1; object-fit: contain; }
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
          this.errorMessage.set('Impossible de se connecter au serveur.');
        } else {
          this.errorMessage.set('Une erreur est survenue. Veuillez réessayer.');
        }
      }
    });
  }
}
