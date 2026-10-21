import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Délai avant de pouvoir redemander un email (évite les envois en rafale)
const RESEND_DELAY_SECONDS = 60;

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="fp-page">
      <div class="fp-card">

        <!-- LEFT: Formulaire / confirmation -->
        <div class="fp-left">
          @if (!emailSent()) {
            <div class="fp-step">
              <div class="fp-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
              </div>
              <h2 class="fp-title">Mot de passe oublié ?</h2>
              <p class="fp-subtitle">
                Pas d'inquiétude : saisissez l'email de votre compte, nous vous enverrons un lien pour le réinitialiser.
              </p>

              @if (errorMessage()) {
                <div class="error-box">{{ errorMessage() }}</div>
              }

              <form [formGroup]="forgotPasswordForm" (ngSubmit)="onSubmit()" class="fp-form" novalidate>
                <div class="field-group">
                  <label for="fp-email">Email</label>
                  <div class="input-wrap" [class.is-invalid]="emailInvalid">
                    <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="5" width="18" height="14" rx="2"/>
                      <path d="M3 7l9 6 9-6"/>
                    </svg>
                    <input
                      #emailInput
                      id="fp-email"
                      type="email"
                      formControlName="email"
                      autocomplete="email"
                      placeholder="mail@gmail.com"
                      (input)="errorMessage.set('')" />
                  </div>
                  @if (emailInvalid) {
                    <div class="field-error">
                      @if (forgotPasswordForm.get('email')?.errors?.['required']) { Email requis. }
                      @else { Adresse email invalide. }
                    </div>
                  }
                </div>

                <button type="submit" class="fp-btn" [disabled]="isLoading()">
                  @if (isLoading()) {
                    <span class="spinner"></span>
                    ENVOI EN COURS...
                  } @else {
                    ENVOYER LE LIEN
                    <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6"/>
                    </svg>
                  }
                </button>
              </form>

              <a routerLink="/login" class="back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
                Retour à la connexion
              </a>
            </div>
          } @else {
            <div class="fp-step">
              <div class="fp-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.5V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h8"/>
                  <path d="M3 7l9 6 9-6"/>
                  <path d="M16 19l2 2 4-4"/>
                </svg>
              </div>
              <h2 class="fp-title">Vérifiez votre boîte mail</h2>
              <p class="fp-subtitle">
                Nous avons envoyé un lien de réinitialisation à
                <span class="sent-email">{{ sentEmail() }}</span>
              </p>

              @if (errorMessage()) {
                <div class="error-box">{{ errorMessage() }}</div>
              }
              @if (resendSuccess()) {
                <div class="success-box">Un nouvel email vient de vous être envoyé.</div>
              }

              <ul class="tips">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 2"/>
                  </svg>
                  <span>Le lien est valable pendant <strong>1 heure</strong>.</span>
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 12h-6l-2 3h-4l-2-3H2"/>
                    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
                  </svg>
                  <span>Pensez à vérifier vos <strong>courriers indésirables</strong>.</span>
                </li>
              </ul>

              <a routerLink="/login" class="fp-btn">RETOUR À LA CONNEXION</a>

              <p class="resend-text">
                Vous n'avez pas reçu l'email ?
                @if (isLoading()) {
                  <span class="resend-muted">Envoi en cours...</span>
                } @else if (resendCountdown() > 0) {
                  <span class="resend-muted">Renvoyer dans {{ resendCountdown() }} s</span>
                } @else {
                  <button type="button" class="link-btn" (click)="resend()">Renvoyer</button>
                }
              </p>
              <button type="button" class="link-btn change-email" (click)="changeEmail()">Modifier l'adresse email</button>
            </div>
          }
        </div>

        <!-- RIGHT: Illustration -->
        <div class="fp-right">
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
    .fp-page {
      min-height: calc(100vh - 71px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f6fa;
      padding: 32px 16px;
    }
    .fp-card {
      display: flex;
      width: 820px;
      max-width: 100%;
      min-height: 490px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 40px rgba(0,0,0,0.13);
      overflow: hidden;
    }
    .fp-left {
      flex: 1;
      padding: 42px 48px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .fp-step { display: flex; flex-direction: column; animation: fade-up 0.35s ease-out; }
    @keyframes fade-up {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: none; }
    }
    .fp-icon {
      width: 56px; height: 56px;
      margin: 0 auto 18px;
      border-radius: 16px;
      background: #ecfdf5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 8px rgba(16,185,129,0.07);
    }
    .fp-icon svg { width: 26px; height: 26px; }
    .fp-title {
      font-size: 26px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
      text-align: center;
    }
    .fp-subtitle {
      text-align: center;
      font-size: 14px;
      line-height: 1.6;
      color: #6b7280;
      margin: 0 auto 26px;
      max-width: 340px;
      text-wrap: balance;
    }
    .sent-email { display: block; margin-top: 4px; font-weight: 700; color: #111827; word-break: break-all; }
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
    .fp-form { display: flex; flex-direction: column; gap: 22px; }
    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-group label { font-size: 12px; color: #9ca3af; font-weight: 600; letter-spacing: 0.4px; text-transform: uppercase; }
    .input-wrap { position: relative; }
    .input-icon {
      position: absolute;
      left: 14px; top: 50%;
      width: 18px; height: 18px;
      transform: translateY(-50%);
      color: #9ca3af;
      pointer-events: none;
      transition: color 0.2s;
    }
    .input-wrap input {
      width: 100%;
      border: 1.5px solid #e5e7eb;
      border-radius: 8px;
      outline: none;
      padding: 11px 14px 11px 42px;
      font-size: 14px;
      color: #111827;
      background: #f9fafb;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .input-wrap input:focus {
      border-color: #10b981;
      background: #fff;
      box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
    }
    .input-wrap:focus-within .input-icon { color: #10b981; }
    .input-wrap.is-invalid input { border-color: #ef4444; background: #fef2f2; }
    .input-wrap.is-invalid input:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
    .input-wrap.is-invalid .input-icon { color: #ef4444; }
    .field-error { font-size: 12px; color: #ef4444; }
    .fp-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 14px;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 1.5px;
      text-decoration: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s, transform 0.1s;
      box-shadow: 0 4px 14px rgba(16,185,129,0.35);
    }
    .fp-btn:hover:not(:disabled) { color: #fff; opacity: 0.92; transform: translateY(-1px); }
    .fp-btn:active:not(:disabled) { transform: translateY(0); }
    .fp-btn:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
    .btn-icon { width: 16px; height: 16px; transition: transform 0.2s; }
    .fp-btn:hover:not(:disabled) .btn-icon { transform: translateX(3px); }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .back-link {
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 22px;
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      text-decoration: none;
      transition: color 0.2s;
    }
    .back-link svg { width: 16px; height: 16px; transition: transform 0.2s; }
    .back-link:hover { color: #10b981; }
    .back-link:hover svg { transform: translateX(-3px); }
    .tips {
      list-style: none;
      margin: 0 0 22px;
      padding: 14px 16px;
      background: #f9fafb;
      border: 1px solid #eef0f3;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .tips li { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; line-height: 1.5; color: #4b5563; }
    .tips svg { flex-shrink: 0; width: 18px; height: 18px; margin-top: 1px; color: #10b981; }
    .tips strong { color: #111827; font-weight: 600; }
    .resend-text { text-align: center; font-size: 13px; color: #6b7280; margin: 18px 0 4px; }
    .resend-muted { color: #9ca3af; }
    .link-btn {
      background: none;
      border: none;
      padding: 0;
      font: inherit;
      font-weight: 600;
      color: #10b981;
      cursor: pointer;
    }
    .link-btn:hover { text-decoration: underline; }
    .change-email { align-self: center; font-size: 13px; font-weight: 500; color: #6b7280; }
    .change-email:hover { color: #10b981; }
    .fp-right { width: 360px; position: relative; overflow: hidden; }
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
      .fp-right { display: none; }
      .fp-card { width: 460px; min-height: 0; }
      .fp-left { padding: 34px 28px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fp-step { animation: none; }
    }
  `]
})
export class ForgotPasswordComponent implements AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  forgotPasswordForm: FormGroup;
  errorMessage = signal('');
  isLoading = signal(false);
  emailSent = signal(false);
  sentEmail = signal('');
  resendSuccess = signal(false);
  resendCountdown = signal(0);
  private countdownTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  get emailInvalid(): boolean {
    const control = this.forgotPasswordForm.get('email');
    return !!control && control.invalid && control.touched;
  }

  ngAfterViewInit() {
    this.emailInput?.nativeElement.focus();
  }

  ngOnDestroy() {
    this.stopCountdown();
  }

  onSubmit() {
    if (this.forgotPasswordForm.invalid) {
      this.forgotPasswordForm.markAllAsTouched();
      return;
    }
    this.sendResetLink(this.forgotPasswordForm.value.email.trim());
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
    setTimeout(() => this.emailInput?.nativeElement.focus());
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
        },
        error: (error) => {
          this.isLoading.set(false);
          if (error.status === 0) {
            this.errorMessage.set('Impossible de se connecter au serveur.');
          } else {
            this.errorMessage.set(error.error?.message || 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
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
