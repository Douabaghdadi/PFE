import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { PiloteQualiteFicheProjetService } from '../../../services/pilote-qualite-fiche-projet.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';
import { initiales, pl } from '../../shared/projet-stats';
import { SuiviTotaux, dateDerniereFiche, resumeFiche, totauxSuivi } from '../../shared/suivi-stats';
import { VALIDATION_DEFS, statutValidation, validationDef } from '../../shared/validation-stats';

@Component({
  selector: 'app-pilote-fiches-suivi-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fiches-suivi-list.component.html',
  styleUrls: ['../pilote-ui.css', '../../shared/projets-ui.css']
})
export class PiloteFichesSuiviListComponent implements OnInit {
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly pl = pl;
  readonly initiales = initiales;
  readonly resume = resumeFiche;
  readonly validationDef = validationDef;
  readonly validationOptions = VALIDATION_DEFS;

  fichesSuivi: FicheSuivi[] = [];
  /** Fiches du projet choisi (toutes si aucun projet) : c'est le périmètre des indicateurs. */
  portee: FicheSuivi[] = [];
  filteredFiches: FicheSuivi[] = [];
  paginatedFiches: FicheSuivi[] = [];
  loading = true;
  error: string | null = null;

  // Indicateurs
  totaux: SuiviTotaux = totauxSuivi([]);
  derniereFiche: string | undefined;

  // Filtres
  searchTerm = '';
  selectedProjetId = '';
  selectedValidation = '';
  sortOrder: 'asc' | 'desc' = 'desc'; // desc = plus récent d'abord

  // Cache pour les noms des projets et liste déroulante des projets
  projetNames: { [key: string]: string } = {};
  projetOptions: { id: string; name: string }[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

  private chargees = false;

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      this.selectedProjetId = params.get('projetId') || '';
      // Un simple changement de projet dans l'adresse ne demande pas de recharger les fiches
      if (this.chargees) {
        this.applyFilters();
      } else {
        this.loadFichesSuivi();
      }
    });
  }

  loadFichesSuivi() {
    this.loading = true;
    this.error = null;

    this.ficheSuiviService.getAllFichesSuivi().subscribe({
      next: (fiches) => {
        this.fichesSuivi = fiches;
        this.chargees = true;
        this.applyFilters();
        this.loadProjetNames();
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des fiches de suivi:', err);
        this.error = 'Erreur lors du chargement des fiches de suivi';
        this.loading = false;
      }
    });
  }

  /**
   * Charge les noms des projets liés aux fiches de suivi
   */
  loadProjetNames(): void {
    const ids = new Set(this.fichesSuivi.map(f => f.ficheProjetId).filter(id => !!id));
    // Le projet choisi dans l'adresse doit apparaître dans la liste même s'il n'a encore aucune fiche
    if (this.selectedProjetId) ids.add(this.selectedProjetId);
    this.updateProjetOptions();

    ids.forEach(projetId => {
      this.ficheProjetService.getFicheProjetById(projetId).subscribe({
        next: (projet) => {
          this.projetNames[projetId] = projet.nomProjet || 'Projet sans nom';
          this.updateProjetOptions();
        },
        error: () => {
          this.projetNames[projetId] = 'Projet inconnu';
          this.updateProjetOptions();
        }
      });
    });
  }

  private updateProjetOptions() {
    const ids = new Set(this.fichesSuivi.map(f => f.ficheProjetId).filter(id => !!id));
    if (this.selectedProjetId) ids.add(this.selectedProjetId);
    this.projetOptions = [...ids]
      .map(id => ({ id, name: this.getProjetName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }

  /**
   * Récupère le nom du projet à partir de l'ID
   */
  getProjetName(projetId: string | undefined): string {
    if (!projetId) {
      return 'Non assigné';
    }
    return this.projetNames[projetId] || 'Chargement…';
  }

  applyFilters() {
    const terme = this.searchTerm.trim().toLowerCase();

    this.portee = this.fichesSuivi.filter(fiche => !this.selectedProjetId || fiche.ficheProjetId === this.selectedProjetId);
    this.totaux = totauxSuivi(this.portee);
    this.derniereFiche = dateDerniereFiche(this.portee);
    this.updateProjetOptions();

    this.filteredFiches = this.portee.filter(fiche => {
      const matchesValidation = !this.selectedValidation || statutValidation(fiche.validation) === this.selectedValidation;
      const matchesSearch = !terme ||
        fiche.numeroRapport?.toLowerCase().includes(terme) ||
        fiche.ficheSignaletique?.chefProjet?.nom?.toLowerCase().includes(terme) ||
        fiche.constatGlobal?.etatAvancement?.toLowerCase().includes(terme) ||
        this.getProjetName(fiche.ficheProjetId).toLowerCase().includes(terme);

      return matchesValidation && matchesSearch;
    });

    // Tri par date
    this.filteredFiches.sort((a, b) => {
      const dateA = new Date(a.dateRapport || a.dateCreation || 0).getTime();
      const dateB = new Date(b.dateRapport || b.dateCreation || 0).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    this.currentPage = 1;
    this.updatePagination();
  }

  /** Le projet choisi est aussi écrit dans l'adresse, pour qu'un rechargement de la page garde le même filtre. */
  onProjetChange() {
    this.applyFilters();
    this.router.navigate([], {
      queryParams: { projetId: this.selectedProjetId || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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

  get filtresActifs(): boolean {
    return !!this.searchTerm.trim() || !!this.selectedProjetId || !!this.selectedValidation;
  }

  resetFilters() {
    this.searchTerm = '';
    this.selectedProjetId = '';
    this.selectedValidation = '';
    this.sortOrder = 'desc';
    this.applyFilters();
    this.router.navigate([], { queryParams: { projetId: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  viewDetails(id: string | undefined) {
    if (id) {
      this.router.navigate(['/pilote-qualite/fiches-suivi', id]);
    }
  }
}
