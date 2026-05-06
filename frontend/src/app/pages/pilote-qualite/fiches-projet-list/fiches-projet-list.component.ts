import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PiloteQualiteFicheProjetService, FicheProjet } from '../../../services/pilote-qualite-fiche-projet.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-pilote-fiches-projet-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fiches-projet-list.component.html',
  styleUrls: ['./fiches-projet-list.component.css']
})
export class PiloteFichesProjetListComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  fichesProjet: FicheProjet[] = [];
  filteredFiches: FicheProjet[] = [];
  loading = true;
  error: string | null = null;

  // Filtres
  selectedStatut = '';
  searchTerm = '';

  // Listes pour les filtres
  statuts: string[] = [];
  
  // Cache pour les noms des chefs de projet
  chefProjetNames: { [key: string]: string } = {};

  ngOnInit() {
    this.loadFichesProjet();
  }

  loadFichesProjet() {
    this.loading = true;
    this.error = null;

    this.ficheProjetService.getAllFichesProjet().subscribe({
      next: (fiches) => {
        this.fichesProjet = fiches;
        this.filteredFiches = fiches;
        this.extractFilters();
        this.loadChefProjetNames();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des fiches projet:', err);
        this.error = 'Erreur lors du chargement des fiches projet';
        this.loading = false;
      }
    });
  }

  extractFilters() {
    // Extraire les statuts uniques
    this.statuts = [...new Set(this.fichesProjet
      .map(f => f.statut)
      .filter(s => s) as string[])];
  }

  applyFilters() {
    this.filteredFiches = this.fichesProjet.filter(fiche => {
      const matchesStatut = !this.selectedStatut || fiche.statut === this.selectedStatut;
      const matchesSearch = !this.searchTerm || 
        fiche.nomProjet?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fiche.reference?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fiche.chefProjetId?.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesStatut && matchesSearch;
    });
  }

  resetFilters() {
    this.selectedStatut = '';
    this.searchTerm = '';
    this.filteredFiches = this.fichesProjet;
  }

  viewDetails(id: string | undefined) {
    if (id) {
      this.router.navigate(['/pilote-qualite/fiches-projet', id]);
    }
  }

  viewFichesSuivi(projetId: string | undefined) {
    if (projetId) {
      this.router.navigate(['/pilote-qualite/fiches-suivi'], { queryParams: { projetId } });
    }
  }

  getStatutClass(statut: string | undefined): string {
    switch (statut?.toLowerCase()) {
      case 'en cours':
        return 'badge-warning';
      case 'terminé':
        return 'badge-success';
      case 'en attente':
        return 'badge-secondary';
      case 'annulé':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  }

  getStatutBadgeStyle(statut: string | undefined): string {
    let bgGradient = '';
    switch (statut?.toLowerCase()) {
      case 'en cours':
        bgGradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        break;
      case 'terminé':
        bgGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        break;
      case 'en attente':
        bgGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        break;
      case 'annulé':
        bgGradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        break;
      default:
        bgGradient = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
    return `background: ${bgGradient}; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.15);`;
  }

  /**
   * Charge les noms des chefs de projet pour toutes les fiches
   */
  loadChefProjetNames(): void {
    const uniqueChefIds = [...new Set(
      this.fichesProjet
        .map(f => f.chefProjetId)
        .filter(id => id) as string[]
    )];

    uniqueChefIds.forEach(chefId => {
      this.userService.getUserNameById(chefId).subscribe({
        next: (name) => {
          this.chefProjetNames[chefId] = name;
        },
        error: () => {
          // Le service gère déjà le fallback, utiliser une valeur par défaut simple
          this.chefProjetNames[chefId] = 'Chef Projet';
        }
      });
    });
  }

  /**
   * Récupère le nom du chef de projet à partir de l'ID
   */
  getChefProjetName(chefProjetId: string | undefined): string {
    if (!chefProjetId) {
      return 'Non assigné';
    }
    return this.chefProjetNames[chefProjetId] || 'Chargement...';
  }

  /**
   * Formate le statut pour l'affichage
   */
  formatStatut(statut: string | undefined): string {
    if (!statut) return '-';
    
    // Remplacer les underscores par des espaces et mettre en majuscule la première lettre
    return statut
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
