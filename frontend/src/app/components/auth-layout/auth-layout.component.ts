import { ChangeDetectionStrategy, Component, input } from '@angular/core';

// Cadre commun des pages Connexion / Inscription / Mot de passe oublié : écran partagé,
// panneau de marque au vert Qualinet (bannière #09C82C) à gauche, formulaire projeté à droite.
@Component({
  selector: 'app-auth-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-page">

      <aside class="auth-brand" aria-label="Présentation de Qualinet">
        <div class="brand-inner">
          <!-- Rosace guillochée : motif des documents de confiance (certificats, titres) -->
          <svg class="brand-rosette" viewBox="-300 -300 600 600" aria-hidden="true" focusable="false">
            <circle r="296" class="ring" />
            <circle r="288" class="ring" />
            @for (angle of outerAngles; track angle) {
              <ellipse rx="280" ry="108" [attr.transform]="'rotate(' + angle + ')'" class="outer" />
            }
            @for (angle of innerAngles; track angle) {
              <ellipse rx="168" ry="62" [attr.transform]="'rotate(' + angle + ')'" class="inner" />
            }
          </svg>

          <div class="brand-logo">
            <img src="assets/images/branding/qualinet-logo-horizontal.png" alt="Qualinet" width="110" height="30" />
          </div>

          <div class="brand-body">
            <p class="brand-headline">Pilotez vos projets, maîtrisez leur qualité.</p>
            <ul class="brand-modules">
              @for (module of modules; track module) {
                <li>
                  <span class="module-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M20 6.5 9 17.5l-5-5" /></svg>
                  </span>
                  <strong>{{ module }}</strong>
                </li>
              }
            </ul>
          </div>
        </div>
      </aside>

      <section class="auth-main">
        <div class="auth-form-wrap" [class.auth-form-wrap--wide]="wide()">
          <ng-content />
        </div>
      </section>

    </main>
  `,
  styles: [`
    /* Tokens au vert Qualinet réel de l'app : #09C82C/#07a625 (bannières de page),
       #10b981/#059669 (boutons et liens, utilisés dans tout le reste de l'app) */
    :host {
      --q-panel-start: #09c82c;
      --q-panel-end: #07a625;
      --q-primary: #10b981;
      --q-primary-hover: #059669;
      --q-primary-line: #059669;
      --q-primary-soft: #ecfdf5;
      --q-ring: rgba(16, 185, 129, 0.2);
      --q-green: #09c82c;
      --q-green-text: #047857;
      --q-ink: #14213d;
      --q-ink-2: #2b3650;
      --q-muted: #5b6573;
      --q-placeholder: #6b7482;
      --q-field-line: #8a94a6;
      --q-hairline: #e1e5ec;
      --q-surface: #f6f7f9;
      --q-danger: #b42318;
      --q-danger-line: #d92d20;
      --q-danger-soft: #fef3f2;
      --q-on-panel: rgba(255, 255, 255, 0.92);
      --q-on-panel-muted: rgba(255, 255, 255, 0.85);
      --q-header-h: 71px;
      display: block;
    }

    .auth-page {
      display: grid;
      grid-template-columns: clamp(360px, 38vw, 560px) minmax(0, 1fr);
      min-height: calc(100dvh - var(--q-header-h));
      background: var(--q-surface);
    }

    /* Panneau de marque : même vert et même diagonale que les bannières de page de l'app */
    .auth-brand {
      position: relative;
      background: linear-gradient(135deg, var(--q-panel-start) 0%, var(--q-panel-end) 100%);
      color: #fff;
    }
    .brand-inner {
      position: sticky;
      top: var(--q-header-h);
      display: flex;
      flex-direction: column;
      gap: 40px;
      height: calc(100dvh - var(--q-header-h));
      min-height: 560px;
      padding: 48px clamp(32px, 4vw, 56px);
      overflow: hidden;
    }
    .brand-rosette {
      position: absolute;
      right: -270px;
      top: 0;
      width: 600px;
      height: 600px;
      transform: translateY(-14%);
      fill: none;
      pointer-events: none;
    }
    .brand-rosette .ring { stroke: rgba(255, 255, 255, 0.22); stroke-width: 1; }
    .brand-rosette .outer { stroke: rgba(255, 255, 255, 0.14); stroke-width: 1; }
    .brand-rosette .inner { stroke: rgba(6, 95, 70, 0.22); stroke-width: 1; }

    /* Logo toujours sur fond blanc (charte) */
    .brand-logo {
      position: relative;
      align-self: flex-start;
      padding: 8px 12px;
      background: #fff;
      border-radius: 8px;
    }
    .brand-logo img { display: block; width: 110px; height: 30px; }

    .brand-body { position: relative; margin-top: auto; max-width: 400px; }
    .brand-headline {
      margin: 0 0 32px;
      font-size: 32px;
      font-weight: 500;
      line-height: 1.2;
      letter-spacing: -0.02em;
      color: #fff;
      text-wrap: balance;
    }
    .brand-modules { list-style: none; margin: 0; padding: 0; }
    .brand-modules li {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.14);
    }
    .module-icon {
      flex-shrink: 0;
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: #fff;
    }
    .module-icon svg {
      display: block;
      width: 14px;
      height: 14px;
      fill: none;
      stroke: #047857;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .brand-modules strong { font-size: 16px; font-weight: 600; line-height: 1.3; color: #fff; }

    /* Zone formulaire */
    .auth-main {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: clamp(24px, 4vh, 56px) clamp(24px, 5vw, 72px);
    }
    .auth-form-wrap { width: 100%; max-width: 400px; }
    .auth-form-wrap--wide { max-width: 540px; }

    @media (max-width: 959px) {
      .auth-page { grid-template-columns: minmax(0, 1fr); }
      .auth-brand { display: none; }
      .auth-main { padding: 48px 32px 56px; }
    }
    /* Sur téléphone, le formulaire commence en haut de l'écran */
    @media (max-width: 600px) {
      .auth-main { align-items: flex-start; }
    }
    @media (max-width: 480px) {
      .auth-main { padding: 32px 16px 48px; }
    }
  `]
})
export class AuthLayoutComponent {
  // Formulaire plus large pour l'inscription (deux colonnes de champs)
  wide = input(false);

  // Modules présentés dans le panneau (mêmes noms que la page Fonctionnalités)
  protected readonly modules = [
    'Fiches projet',
    'Fiches de suivi',
    'Rapports KPI',
    'Suggestion d\'équipe IA',
    'Assistant IA'
  ];

  protected readonly outerAngles = Array.from({ length: 36 }, (_, i) => i * 5);
  protected readonly innerAngles = Array.from({ length: 24 }, (_, i) => i * 7.5);
}
