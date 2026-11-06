import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';

// Délai avant de pouvoir redemander un email (évite les envois en rafale)
const RESEND_DELAY_SECONDS = 60;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout>
      @if (!emailSent()) {
        <header class="auth-head">
          <h1 class="auth-title">Mot de passe oublié&nbsp;?</h1>
          <p class="auth-subtitle">Saisissez l'email de votre compte. Nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
        </header>

        @if (errorMessage()) {
          <div class="alert alert-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
          <div class="field">
            <label for="fp-email">Email</label>
            <div class="control" [class.is-invalid]="emailError()">
              <svg class="control-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <input #emailInput id="fp-email" type="email" formControlName="email"
                autocomplete="email" autocapitalize="off" spellcheck="false"
                placeholder="nom@exemple.com"
                [attr.aria-invalid]="!!emailError()"
                [attr.aria-describedby]="emailError() ? 'fp-email-msg' : null"
                (input)="errorMessage.set('')" />
            </div>
            @if (emailError(); as message) {
              <p class="field-message field-error" id="fp-email-msg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                {{ message }}
              </p>
            }
          </div>

          <button type="submit" class="submit-btn" [disabled]="isLoading()">
            @if (isLoading()) {
              <span class="spinner" aria-hidden="true"></span>
              Envoi en cours…
            } @else {
              Envoyer le lien
              <svg class="btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            }
          </button>
        </form>

        <p class="auth-switch"><a routerLink="/login" class="text-link">Retour à la connexion</a></p>
      } @else {
        <header class="auth-head">
          <h1 class="auth-title" #sentTitle tabindex="-1">Vérifiez votre boîte mail</h1>
          <p class="auth-subtitle">
            Nous avons envoyé un lien de réinitialisation à <strong class="sent-email">{{ sentEmail() }}</strong>.
          </p>
        </header>

        @if (errorMessage()) {
          <div class="alert alert-error" role="alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <span>{{ errorMessage() }}</span>
          </div>
        }
        @if (resendSuccess()) {
          <div class="alert alert-success" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>
            </svg>
            <span>Un nouvel email vient de vous être envoyé.</span>
          </div>
        }

        <ul class="tips">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
            </svg>
            <span>Le lien est valable pendant <strong>1 heure</strong>.</span>
          </li>
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
              <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
            </svg>
            <span>Pensez à vérifier vos <strong>courriers indésirables</strong>.</span>
          </li>
        </ul>

        <a routerLink="/login" class="submit-btn">Retour à la connexion</a>

        <p class="auth-switch">
          Vous n'avez pas reçu l'email&nbsp;?
          @if (isLoading()) {
            <span class="muted">Envoi en cours…</span>
          } @else if (resendCountdown() > 0) {
            <span class="muted">Renvoi possible dans {{ resendCountdown() }}&nbsp;s</span>
          } @else {
            <button type="button" class="text-link link-btn" (click)="resend()">Renvoyer</button>
          }
        </p>
        <p class="change-email">
          <button type="button" class="text-link link-btn" (click)="changeEmail()">Modifier l'adresse email</button>
        </p>
      }
    </app-auth-layout>
  `,
  styleUrl: '../auth-form.css',
  styles: [`
    /* L'adresse passe à la ligne en entier ; elle n'est coupée que si elle dépasse la largeur */
    .sent-email { color: var(--q-ink); font-weight: 600; overflow-wrap: anywhere; }
    .auth-title:focus { outline: none; }

    .tips {
      list-style: none;
      margin: 0 0 24px;
      padding: 0;
      border-top: 1px solid var(--q-hairline);
    }
    .tips li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid var(--q-hairline);
      font-size: 15px;
      line-height: 1.45;
      color: var(--q-ink-2);
    }
    .tips svg { flex-shrink: 0; width: 20px; height: 20px; color: var(--q-primary-line); }
    .tips strong { color: var(--q-ink); font-weight: 600; }

    a.submit-btn { text-decoration: none; }
    a.submit-btn:hover { color: #fff; }

    .muted { color: var(--q-placeholder); white-space: nowrap; }
    .link-btn { padding: 0; border: 0; background: none; font: inherit; font-weight: 600; cursor: pointer; }
    .change-email { margin: 8px 0 0; font-size: 15px; }
  `]
})
export class ForgotPasswordComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  emailInput = viewChild<ElementRef<HTMLInputElement>>('emailInput');
  sentTitle = viewChild<ElementRef<HTMLElement>>('sentTitle');

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  errorMessage = signal('');
  isLoading = signal(false);
  emailSent = signal(false);
  sentEmail = signal('');
  resendSuccess = signal(false);
  resendCountdown = signal(0);
  // Les erreurs du champ n'apparaissent qu'après un premier envoi : pas de rouge en arrivant sur la page
  submitted = signal(false);
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor() {
    // Focus direct sur l'email, sauf sur écran tactile (le clavier masquerait la page)
    afterNextRender(() => this.focusEmail());
  }

  emailError(): string | null {
    const control = this.form.controls.email;
    if (!this.submitted() || control.valid) return null;
    return control.hasError('required') ? 'Saisissez votre email.' : 'Adresse email invalide.';
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  onSubmit() {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.emailInput()?.nativeElement.focus();
      return;
    }
    this.sendResetLink(this.form.controls.email.value.trim());
  }

  resend() {
    this.sendResetLink(this.sentEmail());
  }

  changeEmail() {
    this.stopCountdown();
    this.emailSent.set(false);
    this.resendSuccess.set(false);
    this.errorMessage.set('');
    // Le champ est recréé par le @if : on attend le rendu avant de lui donner le focus
    setTimeout(() => this.emailInput()?.nativeElement.focus());
  }

  private focusEmail() {
    if (window.matchMedia('(pointer: fine)').matches) {
      this.emailInput()?.nativeElement.focus();
    }
  }

  private sendResetLink(email: string) {
    const isResend = this.emailSent();
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.resendSuccess.set(false);

    this.http.post(`${environment.apiUrl}/api/auth/forgot-password`, { email })
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.sentEmail.set(email);
          this.emailSent.set(true);
          this.resendSuccess.set(isResend);
          this.startCountdown();
          // Annonce le changement d'étape aux lecteurs d'écran en plaçant le focus sur le nouveau titre
          if (!isResend) {
            setTimeout(() => this.sentTitle()?.nativeElement.focus());
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          if (error.status === 0) {
            this.errorMessage.set('Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.');
          } else {
            this.errorMessage.set(error.error?.message || 'Erreur lors de l\'envoi de l\'email. Réessayez dans quelques instants.');
          }
        }
      });
  }

  private startCountdown() {
    this.stopCountdown();
    this.resendCountdown.set(RESEND_DELAY_SECONDS);
    this.countdownTimer = setInterval(() => {
      const remaining = this.resendCountdown() - 1;
      this.resendCountdown.set(remaining);
      if (remaining <= 0) {
        this.stopCountdown();
      }
    }, 1000);
  }

  private stopCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = undefined;
    }
  }
}
