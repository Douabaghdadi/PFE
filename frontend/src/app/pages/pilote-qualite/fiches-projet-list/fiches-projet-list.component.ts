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
  paginatedFiches: FicheProjet[] = [];
  loading = true;
  error: string | null = null;

  // Modal périodicité
  showPeriodiciteModal = false;
  selectedProjetForPeriodicite: FicheProjet | null = null;
  periodiciteValue = 1;
  savingPeriodicite = false;
  periodiciteSuccess: string | null = null;
  periodiciteError: string | null = null;

  // Filtres
  selectedStatut = '';
  searchTerm = '';
  sortOrder: 'asc' | 'desc' = 'desc'; // desc = plus récent d'abord

  // Listes pour les filtres
  statuts: string[] = [];
  
  // Cache pour les noms des chefs de projet
  chefProjetNames: { [key: string]: string } = {};
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

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
        this.updatePagination();
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
    
    // Tri par date
    this.filteredFiches.sort((a, b) => {
      const dateA = new Date(a.dateCreation || 0).getTime();
      const dateB = new Date(b.dateCreation || 0).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    this.currentPage = 1;
    this.updatePagination();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredFiches.length / this.itemsPerPage) || 1;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedFiches = this.filteredFiches.slice(start, end);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(total);
      }
    }
    return pages;
  }

  resetFilters() {
    this.selectedStatut = '';
    this.searchTerm = '';
    this.filteredFiches = this.fichesProjet;
    this.currentPage = 1;
    this.updatePagination();
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

  viewKPI(projetId: string | undefined) {
    if (projetId) {
      this.router.navigate(['/pilote-qualite/projet-kpi', projetId]);
    }
  }

  openPeriodiciteModal(fiche: FicheProjet, event: Event) {
    event.stopPropagation();
    this.selectedProjetForPeriodicite = fiche;
    this.periodiciteValue = fiche.periodiciteSuiviMois || 1;
    this.periodiciteSuccess = null;
    this.periodiciteError = null;
    this.showPeriodiciteModal = true;
  }

  closePeriodiciteModal() {
    this.showPeriodiciteModal = false;
    this.selectedProjetForPeriodicite = null;
  }

  savePeriodicite() {
    if (!this.selectedProjetForPeriodicite?.id || this.periodiciteValue < 1) return;
    this.savingPeriodicite = true;
    this.periodiciteSuccess = null;
    this.periodiciteError = null;

    this.ficheProjetService.configurerPeriodicite(this.selectedProjetForPeriodicite.id, this.periodiciteValue).subscribe({
      next: (updated) => {
        // Mettre à jour localement
        const idx = this.fichesProjet.findIndex(f => f.id === updated.id);
        if (idx !== -1) this.fichesProjet[idx] = updated;
        this.applyFilters();
        this.periodiciteSuccess = `Périodicité configurée : tous les ${this.periodiciteValue} mois`;
        this.savingPeriodicite = false;
        setTimeout(() => this.closePeriodiciteModal(), 1500);
      },
      error: () => {
        this.periodiciteError = 'Erreur lors de la sauvegarde';
        this.savingPeriodicite = false;
      }
    });
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

  getStatutColor(statut: string | undefined): string {
    switch (statut?.toLowerCase()) {
      case 'en cours':
        return '#2563eb';
      case 'terminé':
        return '#059669';
      case 'en attente':
        return '#d97706';
      case 'annulé':
        return '#dc2626';
      default:
        return '#64748b';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
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
