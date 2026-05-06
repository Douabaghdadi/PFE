import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';

@Component({
  selector: 'app-pilote-fiche-suivi-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fiche-suivi-detail.component.html',
  styleUrls: ['./fiche-suivi-detail.component.css']
})
export class PiloteFicheSuiviDetailComponent implements OnInit {
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ficheSuivi: FicheSuivi | null = null;
  loading = true;
  error: string | null = null;
  currentTab = 'signaletique';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFicheSuivi(id);
    } else {
      this.error = 'ID de la fiche de suivi non fourni';
      this.loading = false;
    }
  }

  loadFicheSuivi(id: string) {
    this.loading = true;
    this.error = null;

    this.ficheSuiviService.getFicheSuiviById(id).subscribe({
      next: (fiche) => {
        this.ficheSuivi = fiche;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la fiche de suivi:', err);
        this.error = 'Erreur lors du chargement de la fiche de suivi';
        this.loading = false;
      }
    });
  }

  setTab(tab: string) {
    this.currentTab = tab;
  }

  formatDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatShortDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getStatutStyle(statut: string | undefined): string {
    let bg = '';
    switch (statut?.toLowerCase()) {
      case 'terminé':
        bg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; break;
      case 'en cours':
        bg = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; break;
      case 'en retard':
        bg = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; break;
      case 'bloqué':
        bg = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; break;
      default:
        bg = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
    return `background: ${bg}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; display: inline-block;`;
  }

  goBack() {
    this.router.navigate(['/pilote-qualite/fiches-suivi']);
  }
}
