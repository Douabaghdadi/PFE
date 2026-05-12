import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { PiloteQualiteFicheProjetService } from '../../../services/pilote-qualite-fiche-projet.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';
import { FicheProjet } from '../../../services/pilote-qualite-fiche-projet.service';

@Component({
  selector: 'app-pilote-fiches-suivi-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fiches-suivi-list.component.html',
  styleUrls: ['./fiches-suivi-list.component.css']
})
export class PiloteFichesSuiviListComponent implements OnInit {
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fichesSuivi: FicheSuivi[] = [];
  filteredFiches: FicheSuivi[] = [];
  paginatedFiches: FicheSuivi[] = [];
  loading = true;
  error: string | null = null;

  // Filtres
  searchTerm = '';
  selectedProjetId = '';
  sortOrder: 'asc' | 'desc' = 'desc'; // desc = plus récent d'abord

  // Cache pour les noms des projets
  projetNames: { [key: string]: string } = {};
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 6;
  totalPages = 1;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.selectedProjetId = params['projetId'] || '';
      this.loadFichesSuivi();
    });
  }

  loadFichesSuivi() {
    this.loading = true;
    this.error = null;

    this.ficheSuiviService.getAllFichesSuivi().subscribe({
      next: (fiches) => {
        this.fichesSuivi = fiches;
        this.applyFilters();
        this.loadProjetNames();
        this.updatePagination();
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
    const uniqueProjetIds = [...new Set(
      this.fichesSuivi
        .map(f => f.ficheProjetId)
        .filter(id => id) as string[]
    )];

    uniqueProjetIds.forEach(projetId => {
      this.ficheProjetService.getFicheProjetById(projetId).subscribe({
        next: (projet) => {
          this.projetNames[projetId] = projet.nomProjet || 'Projet sans nom';
        },
        error: () => {
          this.projetNames[projetId] = 'Projet inconnu';
        }
      });
    });
  }

  /**
   * Récupère le nom du projet à partir de l'ID
   */
  getProjetName(projetId: string | undefined): string {
    if (!projetId) {
      return 'Non assigné';
    }
    return this.projetNames[projetId] || 'Chargement...';
  }

  applyFilters() {
    this.filteredFiches = this.fichesSuivi.filter(fiche => {
      const matchesProjet = !this.selectedProjetId || fiche.ficheProjetId === this.selectedProjetId;
      const matchesSearch = !this.searchTerm || 
        fiche.numeroRapport?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fiche.ficheSignaletique?.chefProjet?.nom?.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        fiche.constatGlobal?.etatAvancement?.toLowerCase().includes(this.searchTerm.toLowerCase());

      return matchesProjet && matchesSearch;
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
    this.searchTerm = '';
    this.selectedProjetId = '';
    this.router.navigate([], { queryParams: {} });
    this.filteredFiches = this.fichesSuivi;
    this.currentPage = 1;
    this.updatePagination();
  }

  viewDetails(id: string | undefined) {
    if (id) {
      this.router.navigate(['/pilote-qualite/fiches-suivi', id]);
    }
  }

  getAvancementClass(avancement: string | undefined): string {
    if (!avancement) return 'badge-secondary';
    
    const lower = avancement.toLowerCase();
    if (lower.includes('terminé') || lower.includes('100%')) {
      return 'badge-success';
    } else if (lower.includes('en cours') || lower.includes('avancé')) {
      return 'badge-warning';
    } else if (lower.includes('retard') || lower.includes('bloqué')) {
      return 'badge-danger';
    } else {
      return 'badge-info';
    }
  }
}
