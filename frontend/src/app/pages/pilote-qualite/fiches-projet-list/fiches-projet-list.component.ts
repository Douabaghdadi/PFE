import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PiloteQualiteFicheProjetService, FicheProjet } from '../../../services/pilote-qualite-fiche-projet.service';
import { UserService } from '../../../services/user.service';
import {
  STATUT_DEFS, StatutDef, StatutStat,
  initiales, pl, statutDef, statutKey, statutStats
} from '../../shared/projet-stats';

@Component({
  selector: 'app-pilote-fiches-projet-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fiches-projet-list.component.html',
  styleUrls: ['../pilote-ui.css', '../../shared/projets-ui.css']
})
export class PiloteFichesProjetListComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private userService = inject(UserService);
  private router = inject(Router);

  @ViewChild('periodiciteDialog') periodiciteDialog?: ElementRef<HTMLDialogElement>;

  readonly pl = pl;
  readonly statutKey = statutKey;
  readonly statutDef = statutDef;

  fichesProjet: FicheProjet[] = [];
  filteredFiches: FicheProjet[] = [];
  paginatedFiches: FicheProjet[] = [];
  loading = true;
  error: string | null = null;

  // Indicateurs
  stats: StatutStat[] = [];
  nbSansPeriodicite = 0;

  // Modal périodicité
  showPeriodiciteModal = false;
  selectedProjetForPeriodicite: FicheProjet | null = null;
  periodiciteValue = 1;
  savingPeriodicite = false;
  periodiciteSuccess: string | null = null;
  periodiciteError: string | null = null;
  private closeTimer?: ReturnType<typeof setTimeout>;

  // Filtres
  selectedStatut = '';
  searchTerm = '';
  sortOrder: 'asc' | 'desc' = 'desc'; // desc = plus récent d'abord

  // Statuts réellement présents dans les données, pour la liste déroulante
  statutOptions: StatutDef[] = [];

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
        this.extractFilters();
        this.computeStats();
        this.loadChefProjetNames();
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des fiches projet:', err);
        this.error = 'Erreur lors du chargement des fiches projet';
        this.loading = false;
      }
    });
  }

  /** Liste des statuts présents, dans l'ordre des graphiques (« En cours » d'abord). */
  extractFilters() {
    const presents = new Set(this.fichesProjet.map(f => statutKey(f.statut)));
    this.statutOptions = STATUT_DEFS.filter(d => presents.has(d.key));
  }

  /** Nombre de projets par statut, et nombre de projets sans périodicité de suivi. */
  private computeStats() {
    this.stats = statutStats(this.fichesProjet.map(f => f.statut));
    this.nbSansPeriodicite = this.fichesProjet.filter(f => !f.periodiciteSuiviMois).length;
  }

  stat(key: string): StatutStat | undefined {
    return this.stats.find(s => s.key === key);
  }

  applyFilters() {
    const terme = this.searchTerm.trim().toLowerCase();
    this.filteredFiches = this.fichesProjet.filter(fiche => {
      const matchesStatut = !this.selectedStatut || statutKey(fiche.statut) === this.selectedStatut;
      const matchesSearch = !terme ||
        fiche.nomProjet?.toLowerCase().includes(terme) ||
        fiche.reference?.toLowerCase().includes(terme) ||
        fiche.designationClient?.toLowerCase().includes(terme) ||
        (fiche.chefProjetId && this.chefProjetNames[fiche.chefProjetId]?.toLowerCase().includes(terme));

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
    this.sortOrder = 'desc';
    this.applyFilters();
  }

  get filtresActifs(): boolean {
    return !!this.selectedStatut || !!this.searchTerm.trim();
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
    clearTimeout(this.closeTimer);
    this.selectedProjetForPeriodicite = fiche;
    this.periodiciteValue = fiche.periodiciteSuiviMois || 1;
    this.periodiciteSuccess = null;
    this.periodiciteError = null;
    this.showPeriodiciteModal = true;
    const dialog = this.periodiciteDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Le contenu n'est affiché qu'au prochain cycle : le focus est posé une fois la fenêtre dessinée
      setTimeout(() => dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    }
  }

  closePeriodiciteModal() {
    clearTimeout(this.closeTimer);
    const dialog = this.periodiciteDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.onPeriodiciteClosed();
  }

  /** Appelé aussi à la fermeture native (touche Échap). */
  onPeriodiciteClosed() {
    this.showPeriodiciteModal = false;
    this.selectedProjetForPeriodicite = null;
  }

  /** Un clic sur le fond assombri (donc sur la boîte elle-même, pas sur son contenu) ferme la fenêtre. */
  onDialogClick(event: MouseEvent) {
    if (event.target === this.periodiciteDialog?.nativeElement) this.closePeriodiciteModal();
  }

  ajusterPeriodicite(delta: number) {
    const valeur = Math.round(Number(this.periodiciteValue) || 1) + delta;
    this.periodiciteValue = Math.min(24, Math.max(1, valeur));
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
        this.computeStats();
        this.applyFilters();
        this.periodiciteSuccess = `Périodicité configurée : tous les ${this.periodiciteValue} mois`;
        this.savingPeriodicite = false;
        this.closeTimer = setTimeout(() => this.closePeriodiciteModal(), 1500);
      },
      error: () => {
        this.periodiciteError = 'Erreur lors de la sauvegarde';
        this.savingPeriodicite = false;
      }
    });
  }

  /** Initiales du chef de projet ; points de suspension tant que son nom n'est pas arrivé. */
  getInitials(chefProjetId: string | undefined): string {
    if (!chefProjetId) return '?';
    const nom = this.chefProjetNames[chefProjetId];
    return nom ? initiales(nom) : '…';
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
    return this.chefProjetNames[chefProjetId] || 'Chargement…';
  }
}
