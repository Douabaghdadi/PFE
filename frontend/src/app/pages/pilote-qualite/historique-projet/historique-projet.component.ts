import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoriqueService, HistoriqueModification } from '../../../services/historique.service';

@Component({
  selector: 'app-pilote-historique-projet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historique-projet.component.html',
  styleUrls: ['./historique-projet.component.css']
})
export class PiloteHistoriqueProjetComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private historiqueService = inject(HistoriqueService);

  projetId: string = '';
  historique: HistoriqueModification[] = [];
  historiqueFiltered: HistoriqueModification[] = [];
  loading = true;
  error = '';
  expandedItems: Set<string> = new Set();
  
  // Filtres
  searchTerm: string = '';
  selectedAction: string = '';
  selectedEntityType: string = '';
  selectedUser: string = '';
  dateFrom: string = '';
  dateTo: string = '';
  
  // Listes pour les filtres
  uniqueUsers: string[] = [];
  showFilters: boolean = false;
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 1;
  paginatedHistorique: HistoriqueModification[] = [];
  Math = Math;

  ngOnInit() {
    this.projetId = this.route.snapshot.paramMap.get('id') || '';
    if (this.projetId) {
      this.loadHistorique();
    }
  }

  loadHistorique() {
    this.loading = true;
    this.historiqueService.getHistoriqueCompletProjet(this.projetId).subscribe({
      next: (data) => {
        this.historique = data;
        this.historiqueFiltered = data;
        
        // Extraire les utilisateurs uniques
        this.uniqueUsers = [...new Set(data.map(item => item.username))].sort();
        
        // Initialiser la pagination
        this.updatePagination();
        
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement de l\'historique';
        this.loading = false;
        console.error(err);
      }
    });
  }

  getActionLabel(action: string): string {
    const labels: { [key: string]: string } = {
      'CREATION': 'Création',
      'MODIFICATION': 'Modification',
      'SUPPRESSION': 'Suppression'
    };
    return labels[action] || action;
  }

  goBack() {
    this.router.navigate(['/pilote-qualite/fiches-projet', this.projetId]);
  }

  getChangedKeys(item: HistoriqueModification): string[] {
    const keys = new Set<string>();
    
    const allKeys = new Set<string>();
    if (item.anciennesValeurs) {
      Object.keys(item.anciennesValeurs).forEach(k => allKeys.add(k));
    }
    if (item.nouvellesValeurs) {
      Object.keys(item.nouvellesValeurs).forEach(k => allKeys.add(k));
    }
    
    allKeys.forEach(key => {
      const oldValue = item.anciennesValeurs?.[key];
      const newValue = item.nouvellesValeurs?.[key];
      
      const oldValueStr = JSON.stringify(oldValue);
      const newValueStr = JSON.stringify(newValue);
      
      if (oldValueStr !== newValueStr) {
        keys.add(key);
      }
    });
    
    return Array.from(keys);
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getCountByAction(action: string): number {
    return this.historique.filter(item => item.action === action).length;
  }

  toggleDetails(itemId: string): void {
    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
    } else {
      this.expandedItems.add(itemId);
    }
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems.has(itemId);
  }

  hasChanges(item: HistoriqueModification): boolean {
    return !!((item.anciennesValeurs && Object.keys(item.anciennesValeurs).length > 0) ||
           (item.nouvellesValeurs && Object.keys(item.nouvellesValeurs).length > 0));
  }

  applyFilters(): void {
    let filtered = [...this.historique];

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(term) ||
        item.username.toLowerCase().includes(term) ||
        (item.entityName && item.entityName.toLowerCase().includes(term))
      );
    }

    if (this.selectedAction) {
      filtered = filtered.filter(item => item.action === this.selectedAction);
    }

    if (this.selectedEntityType) {
      filtered = filtered.filter(item => item.entityType === this.selectedEntityType);
    }

    if (this.selectedUser) {
      filtered = filtered.filter(item => item.username === this.selectedUser);
    }

    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      filtered = filtered.filter(item => new Date(item.dateModification) >= fromDate);
    }

    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(item => new Date(item.dateModification) <= toDate);
    }

    this.historiqueFiltered = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedAction = '';
    this.selectedEntityType = '';
    this.selectedUser = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.historiqueFiltered = [...this.historique];
    this.currentPage = 1;
    this.updatePagination();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.historiqueFiltered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedHistorique = this.historiqueFiltered.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  changeItemsPerPage(items: number): void {
    this.itemsPerPage = items;
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1);
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }
}
