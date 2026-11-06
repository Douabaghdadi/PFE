import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  PiloteQualiteFicheProjetService,
  FicheProjet
} from '../../../services/pilote-qualite-fiche-projet.service';
import { ProjetFicheComponent } from '../../../components/projet-fiche/projet-fiche.component';
import { statutDef, statutKey } from '../../shared/projet-stats';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-pilote-fiche-projet-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ProjetFicheComponent],
  templateUrl: './fiche-projet-detail.component.html',
  styleUrls: ['../pilote-ui.css', '../../shared/detail-ui.css']
})
export class PiloteFicheProjetDetailComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  readonly statutKey = statutKey;
  readonly statutDef = statutDef;

  ficheProjet: FicheProjet | null = null;
  loading = true;
  error: string | null = null;

  downloadingKPI = false;
  kpiDownloadSuccess = false;
  kpiDownloadError: string | null = null;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFicheProjet(id);
    } else {
      this.error = 'ID de la fiche projet non fourni';
      this.loading = false;
    }
  }

  loadFicheProjet(id: string) {
    this.loading = true;
    this.error = null;

    this.ficheProjetService.getFicheProjetById(id).subscribe({
      next: (fiche) => {
        console.log('Fiche projet reçue:', JSON.stringify(fiche, null, 2));
        // Parser equipeProjet si c'est un JSON string
        if (fiche.equipeProjet && typeof fiche.equipeProjet === 'string') {
          try {
            fiche.equipeProjet = JSON.parse(fiche.equipeProjet);
          } catch (e) {
            // garder comme string si le parsing échoue
          }
        }
        // S'assurer que planning est toujours un tableau
        if (!fiche.planning) {
          fiche.planning = [];
        }
        // S'assurer que estimationsCharges est toujours un tableau
        if (!fiche.estimationsCharges) {
          fiche.estimationsCharges = [];
        }
        this.ficheProjet = fiche;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la fiche projet:', err);
        this.error = 'Erreur lors du chargement de la fiche projet';
        this.loading = false;
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return 'Date non définie';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  goBack() {
    this.router.navigate(['/pilote-qualite/fiches-projet']);
  }

  downloadProjetKPI(format: 'json' | 'csv') {
    if (!this.ficheProjet || !this.ficheProjet.id) return;

    this.downloadingKPI = true;
    this.kpiDownloadSuccess = false;
    this.kpiDownloadError = null;

    const token = localStorage.getItem('token');
    const url = `${environment.apiUrl}/api/pilote-qualite/rapports/projet/${this.ficheProjet.id}/kpi/download/${format}`;

    this.http.get(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `rapport_kpi_projet_${new Date().getTime()}.${format}`;

        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }

        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);

          this.kpiDownloadSuccess = true;
          setTimeout(() => this.kpiDownloadSuccess = false, 5000);
        }

        this.downloadingKPI = false;
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement du rapport KPI:', err);
        this.kpiDownloadError = 'Erreur lors du téléchargement. Veuillez réessayer.';
        setTimeout(() => this.kpiDownloadError = null, 5000);
        this.downloadingKPI = false;
      }
    });
  }

  viewHistorique() {
    if (this.ficheProjet && this.ficheProjet.id) {
      this.router.navigate(['/pilote-qualite/fiches-projet', this.ficheProjet.id, 'historique']);
    }
  }
}
