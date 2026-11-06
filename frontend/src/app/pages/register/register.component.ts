import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout [wide]="true">
      <header class="auth-head">
        <h1 class="auth-title">Créer un compte</h1>
        <p class="auth-subtitle">Rejoignez Qualinet. Tous les champs sont obligatoires.</p>
      </header>

      @if (errorMessage()) {
        <div class="alert alert-error" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>{{ errorMessage() }}</span>
        </div>
      }

      @if (successMessage()) {
        <div class="alert alert-success" role="status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
          </svg>
          <span>{{ successMessage() }}</span>
        </div>
      }

      <form #registerForm="ngForm" (ngSubmit)="onSubmit(registerForm)" class="auth-form">

        <fieldset class="form-section">
          <legend class="visually-hidden">Profil</legend>
          <div class="form-grid">

            <div class="field">
              <label for="reg-username">Nom d'utilisateur</label>
              <div class="control" [class.is-invalid]="usernameField.invalid && usernameField.touched">
                <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>
                </svg>
                <input
                  type="text"
                  id="reg-username"
                  [(ngModel)]="username"
                  name="username"
                  #usernameField="ngModel"
                  autocomplete="username"
                  autocapitalize="off"
                  spellcheck="false"
                  placeholder="prenom_nom"
                  required
                  minlength="3"
                  maxlength="30"
                  pattern="^[a-zA-Z0-9_]+$"
                  [attr.aria-invalid]="usernameField.invalid && usernameField.touched"
                  [attr.aria-describedby]="usernameField.invalid && usernameField.touched ? 'reg-username-msg' : null" />
              </div>
              @if (usernameField.invalid && usernameField.touched) {
                <p class="field-message field-error" id="reg-username-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  @if (usernameField.errors?.['required']) { Saisissez un nom d'utilisateur. }
                  @else if (usernameField.errors?.['minlength']) { 3 caractères minimum. }
                  @else { Lettres, chiffres et tirets bas (_) uniquement. }
                </p>
              }
            </div>

            <div class="field">
              <label for="reg-phone">Téléphone</label>
              <div class="control" [class.is-invalid]="phoneField.invalid && phoneField.touched">
                <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <input
                  type="tel"
                  id="reg-phone"
                  [(ngModel)]="phoneNumber"
                  name="phoneNumber"
                  #phoneField="ngModel"
                  autocomplete="tel"
                  placeholder="+21612345678"
                  required
                  pattern="^\\+216[0-9]{8}$"
                  [attr.aria-invalid]="phoneField.invalid && phoneField.touched"
                  [attr.aria-describedby]="phoneField.invalid && phoneField.touched ? 'reg-phone-msg' : null" />
              </div>
              @if (phoneField.invalid && phoneField.touched) {
                <p class="field-message field-error" id="reg-phone-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  @if (phoneField.errors?.['required']) { Saisissez un numéro de téléphone. }
                  @else { Format attendu&nbsp;: +216 suivi de 8 chiffres. }
                </p>
              }
            </div>

            <div class="field span-2">
              <label for="reg-email">Email</label>
              <div class="control" [class.is-invalid]="emailField.invalid && emailField.touched">
                <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  type="email"
                  id="reg-email"
                  [(ngModel)]="email"
                  name="email"
                  #emailField="ngModel"
                  autocomplete="email"
                  autocapitalize="off"
                  spellcheck="false"
                  placeholder="nom@exemple.com"
                  required
                  email
                  [attr.aria-invalid]="emailField.invalid && emailField.touched"
                  [attr.aria-describedby]="emailField.invalid && emailField.touched ? 'reg-email-msg' : null" />
              </div>
              @if (emailField.invalid && emailField.touched) {
                <p class="field-message field-error" id="reg-email-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  @if (emailField.errors?.['required']) { Saisissez votre adresse email. }
                  @else { Adresse email invalide, exemple&nbsp;: nom&#64;exemple.com }
                </p>
              }
            </div>

          </div>
        </fieldset>

        <fieldset class="form-section">
          <legend class="visually-hidden">Sécurité</legend>
          <div class="form-grid">

            <div class="field">
              <label for="reg-password">Mot de passe</label>
              <div class="control has-toggle" [class.is-invalid]="passwordField.invalid && passwordField.touched">
                <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="reg-password"
                  [(ngModel)]="password"
                  name="password"
                  #passwordField="ngModel"
                  autocomplete="new-password"
                  required
                  minlength="8"
                  pattern="^(?=.*[A-Z])(?=.*[0-9]).+$"
                  [attr.aria-invalid]="passwordField.invalid && passwordField.touched"
                  [attr.aria-describedby]="passwordField.touched && !password() ? 'reg-password-error reg-password-rules' : 'reg-password-rules'" />
                <button type="button" class="toggle-visibility" aria-label="Afficher les mots de passe"
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
              @if (passwordField.touched && !password()) {
                <p class="field-message field-error" id="reg-password-error">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  Saisissez un mot de passe.
                </p>
              }
            </div>

            <div class="field">
              <label for="reg-confirm">Confirmation</label>
              <div class="control" [class.is-invalid]="confirmField.touched && !passwordsMatch()">
                <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                </svg>
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  id="reg-confirm"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  #confirmField="ngModel"
                  autocomplete="new-password"
                  required
                  [attr.aria-invalid]="confirmField.touched && !passwordsMatch()"
                  [attr.aria-describedby]="confirmField.touched || confirmPassword() ? 'reg-confirm-msg' : null" />
              </div>
              @if (confirmField.touched && !passwordsMatch()) {
                <p class="field-message field-error" id="reg-confirm-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                  </svg>
                  @if (!confirmPassword()) { Confirmez votre mot de passe. }
                  @else { Les deux mots de passe sont différents. }
                </p>
              } @else if (confirmPassword() && passwordsMatch()) {
                <p class="field-message field-ok" id="reg-confirm-msg">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                  Les mots de passe correspondent.
                </p>
              }
            </div>

            <!-- Règles du mot de passe, cochées au fur et à mesure de la saisie -->
            <ul class="pw-rules span-2" id="reg-password-rules"
              [class.show-errors]="passwordField.touched && !!password()">
              @for (rule of passwordRules(); track rule.label) {
                <li [class.met]="rule.met">
                  @if (rule.met) {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>
                    </svg>
                  } @else {
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  }
                  {{ rule.label }}
                  <span class="visually-hidden">{{ rule.met ? '(respecté)' : '(non respecté)' }}</span>
                </li>
              }
            </ul>

          </div>
        </fieldset>

        <button type="submit" class="submit-btn" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner" aria-hidden="true"></span>
            Création du compte…
          } @else {
            Créer mon compte
            <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          }
        </button>
      </form>

      <p class="auth-switch">Vous avez déjà un compte&nbsp;? <a routerLink="/login" class="text-link">Se connecter</a></p>
    </app-auth-layout>
  `,
  styleUrl: '../auth-form.css',
  styles: [`
    /* Formulaire compact : tout doit tenir à l'écran sans défiler */
    .form-section { margin: 0; padding: 0; border: 0; min-width: 0; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .span-2 { grid-column: 1 / -1; }

    .pw-rules {
      list-style: none;
      margin: -6px 0 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px 20px;
    }
    .pw-rules li {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--q-muted);
      transition: color 0.15s ease-out;
    }
    .pw-rules svg { width: 16px; height: 16px; flex-shrink: 0; }
    .pw-rules li.met { color: var(--q-green-text); }
    .pw-rules.show-errors li:not(.met) { color: var(--q-danger); }

    @media (max-width: 600px) {
      .form-grid { grid-template-columns: minmax(0, 1fr); }
    }
    @media (prefers-reduced-motion: reduce) {
      .pw-rules li { transition: none; }
    }
  `]
})
export class RegisterComponent {
  router = inject(Router);
  authService = inject(AuthService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  username = signal('');
  email = signal('');
  phoneNumber = signal('');
  password = signal('');
  confirmPassword = signal('');
  errorMessage = signal('');
  successMessage = signal('');
  loading = signal(false);
  showPassword = signal(false);

  // Mêmes règles que les validateurs minlength / pattern du champ
  passwordRules = computed(() => {
    const value = this.password();
    return [
      { label: '8 caractères minimum', met: value.length >= 8 },
      { label: '1 majuscule', met: /[A-Z]/.test(value) },
      { label: '1 chiffre', met: /[0-9]/.test(value) }
    ];
  });
  passwordsMatch = computed(() => this.confirmPassword() === this.password() && !!this.confirmPassword());

  onSubmit(form: NgForm) {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (form.invalid || !this.passwordsMatch()) {
      form.form.markAllAsTouched();
      // Amener l'utilisateur sur le premier champ à corriger
      const firstInvalid = this.host.nativeElement.querySelector<HTMLInputElement>('input.ng-invalid')
        ?? this.host.nativeElement.querySelector<HTMLInputElement>('#reg-confirm');
      firstInvalid?.focus();
      return;
    }

    this.loading.set(true);
    this.authService.register(this.username(), this.email(), this.phoneNumber(), this.password()).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Compte créé. Redirection vers la connexion…');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (error) => {
        this.loading.set(false);
        console.error('Erreur d\'inscription:', error);
        if (error.status === 0) {
          this.errorMessage.set('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.');
        } else if (error.error?.message) {
          this.errorMessage.set(this.translateBackendMessage(error.error.message));
        } else if (error.message) {
          this.errorMessage.set(error.message);
        } else {
          this.errorMessage.set('Erreur lors de l\'inscription. Réessayez dans quelques instants.');
        }
      }
    });
  }

  // Messages du backend (AuthController /signup) affichés en français
  private translateBackendMessage(message: string): string {
    if (message.includes('Username is already taken')) {
      return 'Ce nom d\'utilisateur est déjà pris. Choisissez-en un autre.';
    }
    if (message.includes('Email is already in use')) {
      return 'Un compte existe déjà avec cet email. Connectez-vous ou utilisez une autre adresse.';
    }
    return message;
  }
}
