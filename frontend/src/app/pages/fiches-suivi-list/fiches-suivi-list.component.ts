import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheSuiviService, FicheSuivi } from '../../services/fiche-suivi.service';

@Component({
  selector: 'app-fiches-suivi-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen py-8" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
      <div class="container mx-auto px-4" style="max-width: 1400px;">
        
        <!-- Header with Green Gradient -->
        <div class="mb-8" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 1rem; padding: 2rem; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-4xl font-bold" style="color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <i class="fas fa-clipboard-list mr-3"></i>Mes Fiches de Suivi
              </h1>
              <p class="mt-2" style="color: rgba(255,255,255,0.9); font-size: 1.1rem;">
                <i class="fas fa-chart-line mr-2"></i>Gérez et consultez vos rapports de suivi de projet
              </p>
            </div>
            <a routerLink="/fiche-suivi/new" 
               style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border: 2px solid rgba(255,255,255,0.3); padding: 0.875rem 1.75rem; border-radius: 0.75rem; font-weight: 600; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <i class="fas fa-plus mr-2"></i>
              Nouvelle Fiche de Suivi
            </a>
          </div>
        </div>

        <!-- Filters -->
        <div style="background: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-6">
              <input type="text" 
                     [value]="searchTerm()" 
                     (input)="searchTerm.set($any($event.target).value); applyFilters()"
                     placeholder="🔍 Rechercher par numéro de rapport, chef de projet, projet..." 
                     style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.95rem; transition: all 0.3s ease;"
                     onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)';"
                     onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
            </div>
            <div class="md:col-span-4">
              <select [value]="selectedProjetId()" 
                      (change)="selectedProjetId.set($any($event.target).value); applyFilters()"
                      style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.95rem; transition: all 0.3s ease; cursor: pointer;"
                      onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)';"
                      onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                <option value="">📁 Tous les projets</option>
                @for (projet of getUniqueProjets(); track projet.id) {
                  <option [value]="projet.id">{{ projet.name }}</option>
                }
              </select>
            </div>
            <div class="md:col-span-2">
              <button (click)="resetFilters()"
                      style="width: 100%; padding: 0.75rem 1rem; background: #f3f4f6; color: #374151; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                      onmouseover="this.style.background='#e5e7eb';"
                      onmouseout="this.style.background='#f3f4f6';">
                <i class="fas fa-redo mr-2"></i>
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="text-center py-12">
            <div style="display: inline-block; width: 3rem; height: 3rem; border: 4px solid #d1fae5; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p class="mt-4" style="color: #065f46; font-weight: 600;">Chargement des fiches de suivi...</p>
          </div>
        }

        <!-- Error Message -->
        @if (errorMessage()) {
          <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">
            <div style="display: flex; align-items: center; color: #991b1b;">
              <i class="fas fa-exclamation-circle mr-3" style="font-size: 1.5rem;"></i>
              <span style="font-weight: 600;">{{ errorMessage() }}</span>
            </div>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && filteredFiches().length === 0) {
          <div style="background: white; border-radius: 1.5rem; padding: 4rem 2rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
            <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
              <i class="fas fa-clipboard-list" style="font-size: 3rem; color: #10b981;"></i>
            </div>
            <h3 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">
              Aucune fiche de suivi
            </h3>
            <p style="color: #6b7280; margin-bottom: 2rem; font-size: 1.1rem;">
              Vous n'avez pas encore créé de fiche de suivi. Commencez par créer votre première fiche!
            </p>
            <a routerLink="/fiche-suivi/new" 
               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.875rem 2rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
              <i class="fas fa-plus mr-2"></i>
              Créer ma première fiche de suivi
            </a>
          </div>
        }

        <!-- Fiches List -->
        @if (!isLoading() && filteredFiches().length > 0) {
          <div style="margin-bottom: 1rem; color: #6b7280; font-weight: 600;">
            {{ filteredFiches().length }} fiche(s) de suivi trouvée(s)
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (fiche of paginatedFiches(); track fiche.id) {
              <div style="background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.3s ease; border: 2px solid transparent; cursor: pointer; display: flex; flex-direction: column; height: 100%;"
                   onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 24px rgba(16, 185, 129, 0.15)'; this.style.borderColor='#10b981';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.borderColor='transparent';">
                
                <!-- Header -->
                <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 1rem;">
                  <div style="flex: 1;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">
                      <i class="fas fa-file-alt mr-2" style="color: #10b981;"></i>
                      {{ fiche.numeroRapport || 'Sans numéro' }}
                    </h3>
                    <p style="color: #6b7280; font-size: 0.875rem;">
                      <i class="fas fa-calendar mr-1"></i>
                      {{ formatDate(fiche.dateRapport) }}
                    </p>
                  </div>
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 0.5rem; border-radius: 0.5rem;">
                    <i class="fas fa-clipboard-check" style="color: #10b981; font-size: 1.25rem;"></i>
                  </div>
                </div>

                <!-- Info -->
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 0.75rem; min-height: 80px;">
                  <div style="margin-bottom: 0.5rem;">
                    <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">Projet:</span>
                    <span style="color: #10b981; font-size: 0.875rem; margin-left: 0.5rem; font-weight: 600;">{{ getProjetName(fiche.ficheProjetId) }}</span>
                  </div>
                  <div style="margin-bottom: 0.5rem;">
                    <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">Chef de projet:</span>
                    <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ fiche.ficheSignaletique?.chefProjet?.nom || '-' }}</span>
                  </div>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-2 gap-3 mb-4">
                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 0.75rem; border-radius: 0.5rem; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #1e40af;">
                      {{ fiche.tachesSuivi?.length || 0 }}
                    </div>
                    <div style="font-size: 0.75rem; color: #1e40af; font-weight: 600;">Tâches</div>
                  </div>
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 0.75rem; border-radius: 0.5rem; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: #065f46;">
                      {{ fiche.planningActuel?.taches?.length || 0 }}
                    </div>
                    <div style="font-size: 0.75rem; color: #065f46; font-weight: 600;">Planning</div>
                  </div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 0.75rem; margin-top: auto;">
                  <a [routerLink]="['/fiche-suivi', fiche.id]" 
                     style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; text-align: center; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-eye mr-2"></i>Voir
                  </a>
                  <a [routerLink]="['/fiche-suivi/edit', fiche.id]" 
                     style="flex: 1; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; text-align: center; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-edit mr-2"></i>Modifier
                  </a>
                  <button (click)="deleteFiche(fiche.id!)" 
                          title="Supprimer"
                          style="min-width: 50px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 0.75rem 1rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3); display: flex; align-items: center; justify-content: center;">
                    <i class="fas fa-trash" style="font-size: 1.1rem;"></i>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div style="margin-top: 2rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem;">
              <button (click)="goToPage(currentPage() - 1)" 
                      [disabled]="currentPage() === 1"
                      style="padding: 0.5rem 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                      [style.opacity]="currentPage() === 1 ? '0.5' : '1'"
                      [style.cursor]="currentPage() === 1 ? 'not-allowed' : 'pointer'"
                      onmouseover="if(this.disabled === false) { this.style.borderColor='#10b981'; this.style.background='#f0fdf4'; }"
                      onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
                <i class="fas fa-chevron-left"></i>
              </button>

              @for (page of getPageNumbers(); track page) {
                @if (page === -1) {
                  <span style="padding: 0.5rem 1rem; color: #6b7280;">...</span>
                } @else {
                  <button (click)="goToPage(page)"
                          [style.background]="currentPage() === page ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'white'"
                          [style.color]="currentPage() === page ? 'white' : '#374151'"
                          [style.border]="currentPage() === page ? '2px solid #10b981' : '2px solid #e5e7eb'"
                          style="padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; min-width: 40px;"
                          onmouseover="if(this.style.background === 'white') { this.style.borderColor='#10b981'; this.style.background='#f0fdf4'; }"
                          onmouseout="if(this.style.color !== 'white') { this.style.borderColor='#e5e7eb'; this.style.background='white'; }">
                    {{ page }}
                  </button>
                }
              }

              <button (click)="goToPage(currentPage() + 1)" 
                      [disabled]="currentPage() === totalPages()"
                      style="padding: 0.5rem 1rem; background: white; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                      [style.opacity]="currentPage() === totalPages() ? '0.5' : '1'"
                      [style.cursor]="currentPage() === totalPages() ? 'not-allowed' : 'pointer'"
                      onmouseover="if(this.disabled === false) { this.style.borderColor='#10b981'; this.style.background='#f0fdf4'; }"
                      onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          }
        }
      </div>
    </div>

    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      button:hover, a:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important;
      }
    </style>
  `
})
export class FichesSuiviListComponent implements OnInit {
  ficheSuiviService = inject(FicheSuiviService);
  
  fichesSuivi = signal<FicheSuivi[]>([]);
  filteredFiches = signal<FicheSuivi[]>([]);
  paginatedFiches = signal<FicheSuivi[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  projetNames = signal<{ [key: string]: string }>({});
  
  searchTerm = signal('');
  selectedProjetId = signal('');
  
  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(6);
  totalPages = signal(1);

  ngOnInit() {
    this.loadFichesSuivi();
  }

  loadFichesSuivi() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.ficheSuiviService.getAllFichesSuivi().subscribe({
      next: (data) => {
        this.fichesSuivi.set(data);
        this.filteredFiches.set(data);
        this.loadProjetNames();
        this.updatePagination();
        this.isLoading.set(false);
      },
      error: (error) => {
        if (error.status === 404 || error.status === 0) {
          this.fichesSuivi.set([]);
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
    const uniqueProjetIds = [...new Set(
      this.fichesSuivi()
        .map(f => f.ficheProjetId)
        .filter(id => id) as string[]
    )];

    console.log('Loading projet names for IDs:', uniqueProjetIds);

    uniqueProjetIds.forEach(projetId => {
      console.log('Fetching name for projet:', projetId);
      this.ficheSuiviService.getProjetName(projetId).subscribe({
        next: (projetName: string) => {
          console.log('Received projet name:', projetName, 'for ID:', projetId);
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
    return this.projetNames()[projetId] || 'Chargement...';
  }

  applyFilters() {
    let filtered = this.fichesSuivi();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(fiche =>
        fiche.numeroRapport?.toLowerCase().includes(term) ||
        fiche.ficheSignaletique?.chefProjet?.nom?.toLowerCase().includes(term) ||
        this.getProjetName(fiche.ficheProjetId).toLowerCase().includes(term)
      );
    }

    if (this.selectedProjetId()) {
      filtered = filtered.filter(fiche => fiche.ficheProjetId === this.selectedProjetId());
    }

    this.filteredFiches.set(filtered);
    this.currentPage.set(1);
    this.updatePagination();
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

  resetFilters() {
    this.searchTerm.set('');
    this.selectedProjetId.set('');
    this.filteredFiches.set(this.fichesSuivi());
    this.currentPage.set(1);
    this.updatePagination();
  }

  getUniqueProjets() {
    const uniqueIds = [...new Set(this.fichesSuivi().map(f => f.ficheProjetId).filter(id => id))];
    return uniqueIds.map(id => ({
      id,
      name: this.getProjetName(id)
    }));
  }

  formatDate(date: any): string {
    if (!date) return 'Date non définie';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  deleteFiche(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette fiche de suivi ?')) {
      this.ficheSuiviService.deleteFicheSuivi(id).subscribe({
        next: () => {
          const updatedList = this.fichesSuivi().filter(f => f.id !== id);
          this.fichesSuivi.set(updatedList);
          this.applyFilters();
        },
        error: (error) => {
          this.errorMessage.set('Erreur lors de la suppression de la fiche de suivi');
          console.error('Error deleting fiche suivi:', error);
        }
      });
    }
  }
}
