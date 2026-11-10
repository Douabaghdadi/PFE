import { Component, OnInit, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HistoriqueService, HistoriqueModification } from '../../services/historique.service';
import { formaterValeur, libelleChamp } from '../../pages/shared/historique-champs';

/**
 * Historique complet d'un projet : filtres, journal des modifications et détail avant / après.
 * Commun à la page du chef de projet (/projets/:id/historique) et à celle du pilote qualité
 * (/pilote-qualite/fiches-projet/:id/historique), qui ne fournissent que l'identifiant et le retour.
 */
@Component({
  selector: 'app-historique-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './historique-journal.component.html',
  styleUrls: ['../../pages/pilote-qualite/pilote-ui.css', '../../pages/shared/projets-ui.css', './historique-journal.component.css']
})
export class HistoriqueJournalComponent implements OnInit {
  private historiqueService = inject(HistoriqueService);

  readonly projetId = input.required<string>();
  /** Destination du bouton de retour : elle diffère entre l'espace du chef de projet et celui du pilote. */
  readonly retourLink = input.required<any[]>();

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

  // Liste des utilisateurs pour le filtre
  uniqueUsers: string[] = [];

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 1;
  paginatedHistorique: HistoriqueModification[] = [];

  ngOnInit() {
    if (this.projetId()) {
      this.loadHistorique();
    }
  }

  loadHistorique() {
    this.loading = true;
    this.error = '';
    this.historiqueService.getHistoriqueCompletProjet(this.projetId()).subscribe({
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
      'SUPPRESSION': 'Suppression',
      'VALIDATION': 'Validation',
      'DEMANDE_CORRECTION': 'Demande de correction',
      'AJOUT_DOCUMENT': 'Ajout de document',
      'RETRAIT_DOCUMENT': 'Retrait de document',
      'PLANIFICATION_REUNION': 'Réunion planifiée',
      'ANNULATION_REUNION': 'Réunion annulée'
    };
    return labels[action] || action;
  }

  /** Pastille d'action : vert pour une création ou une validation, bleu pour une modification, un document ou une réunion, ambre pour une demande de correction, rouge pour une suppression. */
  actionPill(action: string): string {
    const classes: { [key: string]: string } = {
      'CREATION': 'pill-termine',
      'MODIFICATION': 'pill-en_cours',
      'SUPPRESSION': 'pill-annule',
      'VALIDATION': 'pill-termine',
      'DEMANDE_CORRECTION': 'pill-en_attente',
      'AJOUT_DOCUMENT': 'pill-en_cours',
      'RETRAIT_DOCUMENT': 'pill-en_cours',
      'PLANIFICATION_REUNION': 'pill-en_cours',
      'ANNULATION_REUNION': 'pill-en_cours'
    };
    return classes[action] || 'pill-autre';
  }

  typeLabel(entityType: string): string {
    return entityType === 'FICHE_PROJET' ? 'Fiche projet' : 'Fiche de suivi';
  }

  getRoleLabel(role: string): string {
    const labels: { [key: string]: string } = {
      'ROLE_ADMIN': 'Administrateur',
      'ROLE_CHEF_PROJET': 'Chef de projet',
      'ROLE_PILOTE_QUALITE': 'Pilote qualité'
    };
    return labels[role] || role;
  }

  /** Initiales d'un nom de compte (« sami.trabelsi » → ST). */
  initiales(nom: string): string {
    const parts = (nom || '').split(/[\s._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0] || '?').slice(0, 2).toUpperCase();
  }

  pl(n: number, singulier: string, pluriel: string = singulier + 's'): string {
    return `${n} ${n > 1 ? pluriel : singulier}`;
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

  libelleChamp(cle: string): string {
    return libelleChamp(cle);
  }

  formatValue(value: any): string {
    return formaterValeur(value);
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

  get filtresActifs(): boolean {
    return !!(this.searchTerm || this.selectedAction || this.selectedEntityType || this.selectedUser || this.dateFrom || this.dateTo);
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
      // Revenir en haut du journal pour lire la page suivante depuis le début
      document.getElementById('journal')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
