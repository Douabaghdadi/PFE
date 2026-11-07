import { Component, ElementRef, ViewChild, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheSuiviService, FicheSuivi } from '../../services/fiche-suivi.service';
import { pl } from '../shared/projet-stats';
import { dateDerniereFiche, resumeFiche, totauxSuivi } from '../shared/suivi-stats';
import { validationDef } from '../shared/validation-stats';

@Component({
  selector: 'app-fiches-suivi-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './fiches-suivi-list.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/projets-ui.css']
})
export class FichesSuiviListComponent implements OnInit {
  ficheSuiviService = inject(FicheSuiviService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('suppressionDialog') suppressionDialog?: ElementRef<HTMLDialogElement>;

  readonly pl = pl;
  readonly resume = resumeFiche;
  readonly validationDef = validationDef;

  fichesSuivi = signal<FicheSuivi[]>([]);
  filteredFiches = signal<FicheSuivi[]>([]);
  paginatedFiches = signal<FicheSuivi[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  projetNames = signal<{ [key: string]: string }>({});

  searchTerm = signal('');
  selectedProjetId = signal('');
  sortOrder = signal<'asc' | 'desc'>('desc'); // desc = plus récent d'abord

  /** Fiches du projet choisi (toutes si aucun projet) : c'est le périmètre des indicateurs. */
  portee = computed(() => {
    const projetId = this.selectedProjetId();
    return this.fichesSuivi().filter(fiche => !projetId || fiche.ficheProjetId === projetId);
  });
  totaux = computed(() => totauxSuivi(this.portee()));
  derniereFiche = computed(() => dateDerniereFiche(this.portee()));

  /** Projets proposés dans la liste déroulante : ceux qui ont des fiches, et celui de l'adresse même sans fiche. */
  projetOptions = computed(() => {
    const ids = new Set(this.fichesSuivi().map(f => f.ficheProjetId).filter(id => !!id));
    if (this.selectedProjetId()) ids.add(this.selectedProjetId());
    return [...ids]
      .map(id => ({ id, name: this.getProjetName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  });

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(6);
  totalPages = signal(1);

  // Suppression : confirmation dans une boîte de dialogue
  ficheASupprimer = signal<FicheSuivi | null>(null);
  suppressionEnCours = signal(false);
  erreurSuppression = signal('');

  ngOnInit() {
    const projetId = this.route.snapshot.queryParamMap.get('projetId');
    if (projetId) {
      this.selectedProjetId.set(projetId);
    }
    this.loadFichesSuivi();
  }

  createNewFiche() {
    const projetId = this.selectedProjetId();
    if (projetId) {
      this.router.navigate(['/fiche-suivi/new'], { queryParams: { projetId } });
    } else {
      this.router.navigate(['/fiche-suivi/new']);
    }
  }

  loadFichesSuivi() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.ficheSuiviService.getAllFichesSuivi().subscribe({
      next: (data) => {
        this.fichesSuivi.set(data);
        this.loadProjetNames();
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        if (error.status === 404 || error.status === 0) {
          this.fichesSuivi.set([]);
          this.applyFilters();
        } else if (error.status === 401 || error.status === 403) {
          this.errorMessage.set('Vous devez être connecté en tant que Chef de Projet pour voir les fiches de suivi');
        } else {
          this.errorMessage.set('Erreur lors du chargement des fiches de suivi');
        }
        this.isLoading.set(false);
        console.error('Error loading fiches suivi:', error);
      }
    });
  }

  loadProjetNames() {
    const uniqueProjetIds = new Set(this.fichesSuivi().map(f => f.ficheProjetId).filter(id => !!id));
    // Le projet choisi dans l'adresse doit avoir son nom dans la liste même s'il n'a encore aucune fiche
    if (this.selectedProjetId()) uniqueProjetIds.add(this.selectedProjetId());

    uniqueProjetIds.forEach(projetId => {
      this.ficheSuiviService.getProjetName(projetId).subscribe({
        next: (projetName: string) => {
          this.projetNames.update(names => ({
            ...names,
            [projetId]: projetName || 'Projet sans nom'
          }));
        },
        error: (err) => {
          console.error('Error fetching projet name for ID:', projetId, err);
          this.projetNames.update(names => ({
            ...names,
            [projetId]: 'Projet inconnu'
          }));
        }
      });
    });
  }

  getProjetName(projetId: string | undefined): string {
    if (!projetId) return 'Non assigné';
    return this.projetNames()[projetId] || 'Chargement…';
  }

  viewFiche(id: string) {
    this.router.navigate(['/fiche-suivi', id]);
  }

  applyFilters() {
    let filtered = [...this.portee()];

    if (this.searchTerm().trim()) {
      const term = this.searchTerm().trim().toLowerCase();
      filtered = filtered.filter(fiche =>
        fiche.numeroRapport?.toLowerCase().includes(term) ||
        fiche.ficheSignaletique?.chefProjet?.nom?.toLowerCase().includes(term) ||
        this.getProjetName(fiche.ficheProjetId).toLowerCase().includes(term)
      );
    }

    // Tri par date
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateRapport || a.dateCreation || 0).getTime();
      const dateB = new Date(b.dateRapport || b.dateCreation || 0).getTime();
      return this.sortOrder() === 'desc' ? dateB - dateA : dateA - dateB;
    });

    this.filteredFiches.set(filtered);
    this.currentPage.set(1);
    this.updatePagination();
  }

  /** Le projet choisi est aussi écrit dans l'adresse, pour qu'un rechargement de la page garde le même filtre. */
  onProjetChange(projetId: string) {
    this.selectedProjetId.set(projetId);
    this.applyFilters();
    this.router.navigate([], {
      queryParams: { projetId: projetId || null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  toggleSortOrder() {
    this.sortOrder.set(this.sortOrder() === 'desc' ? 'asc' : 'desc');
    this.applyFilters();
  }

  updatePagination() {
    const total = Math.ceil(this.filteredFiches().length / this.itemsPerPage());
    this.totalPages.set(total || 1);

    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    this.paginatedFiches.set(this.filteredFiches().slice(start, end));
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

  get filtresActifs(): boolean {
    return !!this.searchTerm().trim() || !!this.selectedProjetId();
  }

  resetFilters() {
    this.searchTerm.set('');
    this.selectedProjetId.set('');
    this.sortOrder.set('desc');
    this.applyFilters();
    this.router.navigate([], { queryParams: { projetId: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Ouvre la confirmation ; la suppression n'a lieu qu'après validation (confirmerSuppression). */
  deleteFiche(fiche: FicheSuivi) {
    this.ficheASupprimer.set(fiche);
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
    this.ficheASupprimer.set(null);
  }

  /** Un clic sur le fond assombri ferme la fenêtre. */
  onDialogClick(event: MouseEvent) {
    if (event.target === this.suppressionDialog?.nativeElement) this.annulerSuppression();
  }

  confirmerSuppression() {
    const fiche = this.ficheASupprimer();
    if (!fiche?.id || this.suppressionEnCours()) return;

    this.suppressionEnCours.set(true);
    this.erreurSuppression.set('');
    this.ficheSuiviService.deleteFicheSuivi(fiche.id).subscribe({
      next: () => {
        const updatedList = this.fichesSuivi().filter(f => f.id !== fiche.id);
        this.fichesSuivi.set(updatedList);
        this.suppressionEnCours.set(false);
        this.annulerSuppression();
        this.applyFilters();
      },
      error: (error) => {
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set('Erreur lors de la suppression de la fiche de suivi');
        console.error('Error deleting fiche suivi:', error);
      }
    });
  }
}
