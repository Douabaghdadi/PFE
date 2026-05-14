import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { 
  PiloteQualiteFicheProjetService, 
  FicheProjet,
  EstimationCharge,
  EstimationBudget,
  PlanningAction
} from '../../../services/pilote-qualite-fiche-projet.service';
import { HistoriqueComponent } from '../../../components/historique/historique.component';

interface MembreEquipe {
  nom: string;
  role: string;
  email?: string;
}

@Component({
  selector: 'app-pilote-fiche-projet-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, HistoriqueComponent],
  templateUrl: './fiche-projet-detail.component.html',
  styleUrls: ['./fiche-projet-detail.component.css']
})
export class PiloteFicheProjetDetailComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

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

  getStatutBadgeStyle(statut: string | undefined): string {
    // Formater le statut avant de le comparer
    const formattedStatut = this.formatStatut(statut);
    let bgGradient = '';
    switch (formattedStatut.toLowerCase()) {
      case 'en cours':
        bgGradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        break;
      case 'terminé':
      case 'termine':
        bgGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        break;
      case 'en attente':
        bgGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        break;
      case 'annulé':
      case 'annule':
        bgGradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        break;
      default:
        bgGradient = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
    return `background: ${bgGradient}; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-size: 1rem; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
  }

  formatStatut(statut: string | undefined): string {
    if (!statut) return '-';
    
    // Remplacer les underscores par des espaces et mettre en majuscule la première lettre
    return statut
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getTypeLabel(type: string | undefined): string {
    switch (type?.toLowerCase()) {
      case 'nouveau': return 'Nouveau';
      case 'evolution': return 'Evolution';
      case 'refonte': return 'Refonte';
      default: return type || '-';
    }
  }

  getCaractereLabel(caractere: string | undefined): string {
    switch (caractere?.toLowerCase()) {
      case 'national': return 'National';
      case 'commune_administration': return 'Commune à l\'Administration';
      case 'cni': return 'CNI';
      default: return caractere || '-';
    }
  }

  getModaliteLabel(modalite: string | undefined): string {
    switch (modalite) {
      case 'I': return 'I - Interne';
      case 'ST': return 'ST - Sous-traitance';
      case 'CO': return 'CO - Co-traitance';
      case 'I+ST': return 'I+ST - Interne + Sous-traitance';
      case 'I+CO': return 'I+CO - Interne + Co-traitance';
      default: return modalite || '-';
    }
  }

  isEquipeArray(equipe: any): boolean {
    return Array.isArray(equipe);
  }

  getEquipeArray(equipe: any): MembreEquipe[] {
    return Array.isArray(equipe) ? equipe : [];
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
    const url = `http://localhost:8081/api/pilote-qualite/rapports/projet/${this.ficheProjet.id}/kpi/download/${format}`;
    
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
}
