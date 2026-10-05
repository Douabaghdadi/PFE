import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-rapport-bi',
  standalone: true,
  template: `
    <div class="container-fluid py-3">
      <h1 class="h4 mb-3" style="color: #1a4394; font-weight: 700;">Tableau de bord Power BI</h1>

      @if (reportUrl) {
        <div class="bi-wrapper shadow-sm">
          <iframe [src]="reportUrl" title="Tableau de bord Qualinet" allowfullscreen></iframe>
        </div>
      } @else {
        <div class="alert alert-warning">
          Le rapport Power BI n'est pas encore configuré : renseignez <code>powerBiReportUrl</code>
          dans <code>environments/environment.ts</code>.
        </div>
      }
    </div>
  `,
  styles: [`
    /* 16:9 comme les pages du rapport, mais jamais plus haut que l'espace visible
       sous la barre de navigation et le titre (environ 190 px). */
    .bi-wrapper {
      position: relative;
      width: min(100%, calc((100vh - 190px) * 16 / 9));
      aspect-ratio: 16 / 9;
      margin: 0 auto;
      border-radius: 0.5rem;
      overflow: hidden;
      background: #fff;
    }
    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
    }
  `]
})
export class RapportBiComponent {
  private sanitizer = inject(DomSanitizer);

  // Angular bloque les URL externes dans un iframe : on déclare explicitement celle du rapport comme fiable
  reportUrl: SafeResourceUrl | null = environment.powerBiReportUrl
    ? this.sanitizer.bypassSecurityTrustResourceUrl(environment.powerBiReportUrl)
    : null;
}
