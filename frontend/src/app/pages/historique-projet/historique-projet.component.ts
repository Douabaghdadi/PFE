import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoriqueService, HistoriqueModification } from '../../services/historique.service';

@Component({
  selector: 'app-historique-projet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './historique-projet.component.html',
  styleUrls: ['./historique-projet.component.css']
})
export class HistoriqueProjetComponent implements OnInit {
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
        console.log('Historique chargé:', data);
        // Vérifier si entityName est présent
        data.forEach(item => {
          console.log(`Item ${item.id}: entityName = ${item.entityName}`);
        });
        
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

  getActionClass(action: string): string {
    const classes: { [key: string]: string } = {
      'CREATION': 'bg-green-100 text-green-800',
      'MODIFICATION': 'bg-blue-100 text-blue-800',
      'SUPPRESSION': 'bg-red-100 text-red-800'
    };
    return classes[action] || 'bg-gray-100 text-gray-800';
  }

  goBack() {
    this.router.navigate(['/projets', this.projetId]);
  }

  getChangedKeys(item: HistoriqueModification): string[] {
    const keys = new Set<string>();
    
    // Récupérer toutes les clés
    const allKeys = new Set<string>();
    if (item.anciennesValeurs) {
      Object.keys(item.anciennesValeurs).forEach(k => allKeys.add(k));
    }
    if (item.nouvellesValeurs) {
      Object.keys(item.nouvellesValeurs).forEach(k => allKeys.add(k));
    }
    
    // Ne garder que les clés dont les valeurs ont changé
    allKeys.forEach(key => {
      const oldValue = item.anciennesValeurs?.[key];
      const newValue = item.nouvellesValeurs?.[key];
      
      // Comparer les valeurs (conversion en JSON pour les objets/tableaux)
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
    if (value === '' || value === '[]' || value === '{}') return 'Vide';

    // Si c'est une string qui ressemble à du JSON, essayer de la parser
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) ||
          (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        try { value = JSON.parse(trimmed); } catch (e) {}
      }
    }

    // Tableau → liste à puces
    if (Array.isArray(value)) {
      if (value.length === 0) return 'Vide';
      return value.map((item: any) =>
        typeof item === 'object' ? JSON.stringify(item) : String(item)
      ).join(', ');
    }

    // Objet → clé: valeur
    if (typeof value === 'object') {
      return Object.entries(value)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');
    }

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

  // Méthodes de filtrage
  applyFilters(): void {
    let filtered = [...this.historique];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(term) ||
        item.username.toLowerCase().includes(term) ||
        (item.entityName && item.entityName.toLowerCase().includes(term))
      );
    }

    // Filtre par action
    if (this.selectedAction) {
      filtered = filtered.filter(item => item.action === this.selectedAction);
    }

    // Filtre par type d'entité
    if (this.selectedEntityType) {
      filtered = filtered.filter(item => item.entityType === this.selectedEntityType);
    }

    // Filtre par utilisateur
    if (this.selectedUser) {
      filtered = filtered.filter(item => item.username === this.selectedUser);
    }

    // Filtre par date de début
    if (this.dateFrom) {
      const fromDate = new Date(this.dateFrom);
      filtered = filtered.filter(item => new Date(item.dateModification) >= fromDate);
    }

    // Filtre par date de fin
    if (this.dateTo) {
      const toDate = new Date(this.dateTo);
      toDate.setHours(23, 59, 59, 999); // Fin de journée
      filtered = filtered.filter(item => new Date(item.dateModification) <= toDate);
    }

    this.historiqueFiltered = filtered;
    this.currentPage = 1; // Réinitialiser à la première page
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

  // Méthodes de pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.historiqueFiltered.length / this.itemsPerPage);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedHistorique = this.historiqueFiltered.slice(startIndex, endIndex);
    console.log('Pagination mise à jour:', {
      totalItems: this.historiqueFiltered.length,
      itemsPerPage: this.itemsPerPage,
      totalPages: this.totalPages,
      currentPage: this.currentPage,
      paginatedCount: this.paginatedHistorique.length
    });
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
      // Scroll vers le haut de la timeline
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
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages);
      }
    }
    
    return pages;
  }
}
