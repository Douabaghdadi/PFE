import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      <header class="auth-head">
        <h1 class="auth-title">Connexion</h1>
        <p class="auth-subtitle">Accédez à votre espace de pilotage qualité.</p>
      </header>

      @if (errorMessage()) {
        <div class="alert alert-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      <form (ngSubmit)="onSubmit()" class="auth-form">
        <div class="field">
          <label for="login-email">Email</label>
          <div class="control">
            <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
            <input #emailInput id="login-email" type="email" [(ngModel)]="username" name="username"
              autocomplete="username" autocapitalize="off" spellcheck="false"
              placeholder="nom@exemple.com" required
              (input)="errorMessage.set('')" />
          </div>
        </div>

        <div class="field">
          <label for="login-password">Mot de passe</label>
          <div class="control has-toggle">
            <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input #passwordInput id="login-password" [type]="showPassword() ? 'text' : 'password'"
              [(ngModel)]="password" name="password" autocomplete="current-password" required
              (input)="errorMessage.set('')" />
            <button type="button" class="toggle-visibility" aria-label="Afficher le mot de passe"
              [attr.aria-pressed]="showPassword()" (click)="showPassword.set(!showPassword())">
              @if (showPassword()) {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M2 2l20 20"/>
                </svg>
              } @else {
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
                </svg>
              }
            </button>
          </div>
          <a routerLink="/forgot-password" class="text-link forgot-link">Mot de passe oublié&nbsp;?</a>
        </div>

        <button type="submit" class="submit-btn" [disabled]="isLoading()">
          @if (isLoading()) {
            <span class="spinner" aria-hidden="true"></span>
            Connexion en cours…
          } @else {
            Se connecter
            <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          }
        </button>
      </form>

      <p class="auth-switch">Pas encore de compte&nbsp;? <a routerLink="/register" class="text-link">Créer un compte</a></p>
    </app-auth-layout>
  `,
  styleUrl: '../auth-form.css',
  styles: [`
    .forgot-link { align-self: flex-end; font-size: 14px; }
  `]
})
export class LoginComponent {
  authService = inject(AuthService);
  router = inject(Router);

  emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  passwordInput = viewChild<ElementRef<HTMLInputElement>>('passwordInput');

  username = '';
  password = '';
  errorMessage = signal('');
  isLoading = signal(false);
  showPassword = signal(false);

  constructor() {
    // Focus direct sur l'email, sauf sur écran tactile (le clavier masquerait la page)
    afterNextRender(() => {
      if (window.matchMedia('(pointer: fine)').matches) {
        this.emailInput()?.nativeElement.focus();
      }
    });
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage.set('Saisissez votre email et votre mot de passe.');
      (this.username ? this.passwordInput() : this.emailInput())?.nativeElement.focus();
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
        } else if (this.authService.hasRole('ROLE_PILOTE_QUALITE')) {
          this.router.navigate(['/pilote-qualite/dashboard']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        if (error.status === 401) {
          this.errorMessage.set('Email ou mot de passe incorrect. Vérifiez vos identifiants ou réinitialisez votre mot de passe.');
        } else if (error.status === 0) {
          this.errorMessage.set('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.');
        } else {
          this.errorMessage.set('Une erreur est survenue. Réessayez dans quelques instants.');
        }
      }
    });
  }
}
