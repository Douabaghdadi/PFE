import { Component, ElementRef, ViewChild, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChatbotComponent } from '../../components/chatbot/chatbot.component';
import { environment } from '../../../environments/environment';
import { pl, statutDef, statutKey, statutStats } from '../shared/projet-stats';
import { NomenclatureService, Nomenclature } from '../../services/nomenclature.service';
import type { ValidationFiche } from '../../services/validation-fiche.service';
import { validationDef } from '../shared/validation-stats';

interface FicheProjet {
  id: string;
  nomProjet: string;
  designationProjet: string;
  designationClient: string;
  typeProjet: string;
  caractereProjet: string;
  statut: string;
  dateCreation?: string;
  chefProjetId: string;
  validation?: ValidationFiche;
}

@Component({
  selector: 'app-projets-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ChatbotComponent],
  templateUrl: './projets-list.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/projets-ui.css']
})
export class ProjetsListComponent implements OnInit {
  http = inject(HttpClient);
  router = inject(Router);
  nomenclatureService = inject(NomenclatureService);

  @ViewChild('suppressionDialog') suppressionDialog?: ElementRef<HTMLDialogElement>;

  readonly pl = pl;
  readonly statutKey = statutKey;
  readonly statutDef = statutDef;
  readonly validationDef = validationDef;

  projets = signal<FicheProjet[]>([]);
  filteredProjets = signal<FicheProjet[]>([]);
  paginatedProjets = signal<FicheProjet[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // Indicateurs : nombre de projets par statut
  stats = computed(() => statutStats(this.projets().map(p => p.statut)));
  kpiStatuts = computed(() => this.stats().slice(0, 4));

  searchTerm = '';
  filterStatut = '';
  filterType = '';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Types proposés dans le filtre : valeurs actives de la nomenclature
  typesProjet: Nomenclature[] = [];

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(6);
  totalPages = signal(1);

  // Suppression : confirmation dans une boîte de dialogue
  projetASupprimer = signal<FicheProjet | null>(null);
  suppressionEnCours = signal(false);
  erreurSuppression = signal('');

  ngOnInit() {
    this.loadProjets();
    this.nomenclatureService.charger().subscribe(() => {
      this.typesProjet = this.nomenclatureService.actives('TYPE_PROJET');
    });
  }

  loadProjets() {
    const token = localStorage.getItem('token');

    this.errorMessage.set('');
    if (!token) {
      this.errorMessage.set('Vous devez être connecté pour voir les projets');
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.http.get<FicheProjet[]>(`${environment.apiUrl}/api/chef-projet/fiches-projet`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        this.projets.set(data);
        this.filterProjets();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading projets:', error);
        this.errorMessage.set('Erreur lors du chargement des projets');
        this.isLoading.set(false);
      }
    });
  }

  /** Type de projet en minuscules et sans accents, comparé au code choisi dans le filtre. */
  private typeKey(projet: FicheProjet): string {
    return (projet.typeProjet || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  filterProjets() {
    let filtered = [...this.projets()];

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      filtered = filtered.filter(p =>
        p.nomProjet?.toLowerCase().includes(term) ||
        p.designationProjet?.toLowerCase().includes(term) ||
        p.designationClient?.toLowerCase().includes(term)
      );
    }

    // Filter by statut
    if (this.filterStatut) {
      filtered = filtered.filter(p => statutKey(p.statut) === this.filterStatut);
    }

    // Filter by type
    if (this.filterType) {
      filtered = filtered.filter(p => this.typeKey(p) === this.filterType.toLowerCase());
    }

    // Tri par date
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateCreation || 0).getTime();
      const dateB = new Date(b.dateCreation || 0).getTime();
      return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    this.filteredProjets.set(filtered);
    this.currentPage.set(1);
    this.updatePagination();
  }

  toggleSortOrder() {
    this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
    this.filterProjets();
  }

  updatePagination() {
    const total = Math.ceil(this.filteredProjets().length / this.itemsPerPage());
    this.totalPages.set(total || 1);

    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    this.paginatedProjets.set(this.filteredProjets().slice(start, end));
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages();
    const current = this.currentPage();

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
    this.filterStatut = '';
    this.filterType = '';
    this.sortOrder = 'desc';
    this.filterProjets();
  }

  get filtresActifs(): boolean {
    return !!this.searchTerm.trim() || !!this.filterStatut || !!this.filterType;
  }

  getTypeLabel(type: string): string {
    return this.nomenclatureService.libelle('TYPE_PROJET', type);
  }

  getCaractereLabel(caractere: string): string {
    return this.nomenclatureService.libelle('CARACTERE_PROJET', caractere);
  }

  /** « Nouveau · National » : les deux caractéristiques connues du projet, séparées par un point médian. */
  getTypeEtCaractere(projet: FicheProjet): string {
    return [this.getTypeLabel(projet.typeProjet), this.getCaractereLabel(projet.caractereProjet)]
      .filter(Boolean).join(' · ');
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  viewFichesSuivi(id: string) {
    this.router.navigate(['/fiches-suivi'], { queryParams: { projetId: id } });
  }

  viewProjet(id: string) {
    this.router.navigate(['/projets', id]);
  }

  editProjet(id: string) {
    this.router.navigate(['/fiche-projet/edit', id]);
  }

  /** Ouvre la confirmation ; la suppression n'a lieu qu'après validation (confirmerSuppression). */
  deleteProjet(projet: FicheProjet) {
    this.projetASupprimer.set(projet);
    this.erreurSuppression.set('');
    const dialog = this.suppressionDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Le contenu n'est affiché qu'au prochain cycle : le focus est posé (sur « Annuler ») une fois la fenêtre dessinée
      setTimeout(() => dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    }
  }

  annulerSuppression() {
    const dialog = this.suppressionDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.onSuppressionClosed();
  }

  /** Appelé aussi à la fermeture native (touche Échap). */
  onSuppressionClosed() {
    if (this.suppressionEnCours()) return;
    this.projetASupprimer.set(null);
  }

  /** Un clic sur le fond assombri ferme la fenêtre. */
  onDialogClick(event: MouseEvent) {
    if (event.target === this.suppressionDialog?.nativeElement) this.annulerSuppression();
  }

  confirmerSuppression() {
    const projet = this.projetASupprimer();
    if (!projet || this.suppressionEnCours()) return;

    const token = localStorage.getItem('token');
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set('');
    this.http.delete(`${environment.apiUrl}/api/chef-projet/fiches-projet/${projet.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.annulerSuppression();
        this.loadProjets();
      },
      error: (error) => {
        console.error('Error deleting projet:', error);
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set('Erreur lors de la suppression du projet');
      }
    });
  }
}
