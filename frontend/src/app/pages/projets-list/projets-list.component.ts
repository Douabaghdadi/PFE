import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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
}

@Component({
  selector: 'app-projets-list',
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
                <i class="fas fa-folder-open mr-3"></i>Mes Projets
              </h1>
              <p class="mt-2" style="color: rgba(255,255,255,0.9); font-size: 1.1rem;">
                <i class="fas fa-tasks mr-2"></i>Gérez et consultez vos fiches de projet
              </p>
            </div>
            <a routerLink="/fiche-projet/new" 
               style="background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border: 2px solid rgba(255,255,255,0.3); padding: 0.875rem 1.75rem; border-radius: 0.75rem; font-weight: 600; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
              <i class="fas fa-plus mr-2"></i>
              Créer un projet
            </a>
          </div>
        </div>

        <!-- Filters -->
        <div style="background: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-4">
              <input type="text" 
                     [(ngModel)]="searchTerm" 
                     (input)="filterProjets()"
                     placeholder="🔍 Rechercher un projet..." 
                     style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.95rem; transition: all 0.3s ease;"
                     onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)';"
                     onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
            </div>
            <div class="md:col-span-3">
              <select [(ngModel)]="filterStatut" 
                      (change)="filterProjets()"
                      style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.95rem; transition: all 0.3s ease; background: white;"
                      onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)';"
                      onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                <option value="">Tous les statuts</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINE">Terminé</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="ANNULE">Annulé</option>
              </select>
            </div>
            <div class="md:col-span-3">
              <select [(ngModel)]="filterType" 
                      (change)="filterProjets()"
                      style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.95rem; transition: all 0.3s ease; background: white;"
                      onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)';"
                      onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
                <option value="">Tous les types</option>
                <option value="nouveau">Nouveau</option>
                <option value="evolution">Evolution</option>
                <option value="refonte">Refonte</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <button (click)="resetFilters()"
                      style="width: 100%; padding: 0.75rem 1rem; background: #f3f4f6; color: #374151; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                      onmouseover="this.style.background='#e5e7eb';"
                      onmouseout="this.style.background='#f3f4f6';">
                <i class="fas fa-redo mr-2"></i>Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="text-center py-12">
            <div style="display: inline-block; width: 3rem; height: 3rem; border: 4px solid #d1fae5; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p class="mt-4" style="color: #065f46; font-weight: 600;">Chargement des projets...</p>
          </div>
        }

        <!-- Error State -->
        @if (errorMessage()) {
          <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">
            <div style="display: flex; align-items: center; color: #991b1b;">
              <i class="fas fa-exclamation-circle mr-3" style="font-size: 1.5rem;"></i>
              <span style="font-weight: 600;">{{ errorMessage() }}</span>
            </div>
          </div>
        }

        <!-- Empty State -->
        @if (!isLoading() && filteredProjets().length === 0 && !errorMessage()) {
          <div style="background: white; border-radius: 1.5rem; padding: 4rem 2rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
            <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
              <i class="fas fa-folder-open" style="font-size: 3rem; color: #10b981;"></i>
            </div>
            <h3 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">
              Aucun projet trouvé
            </h3>
            <p style="color: #6b7280; margin-bottom: 2rem; font-size: 1.1rem;">
              Vous n'avez pas encore créé de projet. Commencez par créer votre première fiche de projet!
            </p>
            <a routerLink="/fiche-projet/new" 
               style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.875rem 2rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
              <i class="fas fa-plus mr-2"></i>
              Créer mon premier projet
            </a>
          </div>
        }

        <!-- Projects Grid -->
        @if (!isLoading() && filteredProjets().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (projet of paginatedProjets(); track projet.id) {
              <div style="background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.3s ease; border: 2px solid transparent; cursor: pointer; display: flex; flex-direction: column; height: 100%;"
                   onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 24px rgba(16, 185, 129, 0.15)'; this.style.borderColor='#10b981';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.borderColor='transparent';">
                
                <!-- Header -->
                <div style="display: flex; align-items: start; justify-content: space-between; margin-bottom: 1rem;">
                  <div style="flex: 1;">
                    <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">
                      <i class="fas fa-project-diagram mr-2" style="color: #10b981;"></i>
                      {{ projet.nomProjet || projet.designationProjet }}
                    </h3>
                    <p style="color: #6b7280; font-size: 0.875rem; min-height: 20px;">
                      <i class="fas fa-user mr-1"></i>
                      {{ projet.designationClient || '-' }}
                    </p>
                  </div>
                  <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 0.5rem; border-radius: 0.5rem;">
                    <i class="fas fa-folder" style="color: #10b981; font-size: 1.25rem;"></i>
                  </div>
                </div>

                <!-- Status Badge -->
                <div style="margin-bottom: 1rem;">
                  <span [style]="getStatutBadgeStyle(projet.statut)">
                    {{ getStatutLabel(projet.statut) }}
                  </span>
                </div>

                <!-- Info -->
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 0.75rem; flex: 1;">
                  <div style="margin-bottom: 0.5rem;">
                    <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">Type:</span>
                    <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ getTypeLabel(projet.typeProjet) || '-' }}</span>
                  </div>
                  <div style="margin-bottom: 0.5rem;">
                    <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">Caractère:</span>
                    <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ getCaractereLabel(projet.caractereProjet) || '-' }}</span>
                  </div>
                  <div>
                    <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">
                      <i class="fas fa-calendar mr-1"></i>Créé le:
                    </span>
                    <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ projet.dateCreation ? formatDate(projet.dateCreation) : '-' }}</span>
                  </div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                  <button (click)="viewProjet(projet.id)" 
                          style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                    <i class="fas fa-eye mr-2"></i>Voir
                  </button>
                  <button (click)="editProjet(projet.id)" 
                          style="flex: 1; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                    <i class="fas fa-edit mr-2"></i>Modifier
                  </button>
                  <button (click)="deleteProjet(projet.id)" 
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
  `,
  styles: [`
    /* Styles are now inline in the template */
  `]
})
export class ProjetsListComponent implements OnInit {
  http = inject(HttpClient);
  router = inject(Router);

  projets = signal<FicheProjet[]>([]);
  filteredProjets = signal<FicheProjet[]>([]);
  paginatedProjets = signal<FicheProjet[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  
  searchTerm = '';
  filterStatut = '';
  filterType = '';
  
  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(6);
  totalPages = signal(1);

  ngOnInit() {
    this.loadProjets();
  }

  loadProjets() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.errorMessage.set('Vous devez être connecté pour voir les projets');
      this.isLoading.set(false);
      return;
    }

    this.http.get<FicheProjet[]>('http://localhost:8081/api/chef-projet/fiches-projet', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        this.projets.set(data);
        this.filteredProjets.set(data);
        this.updatePagination();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading projets:', error);
        this.errorMessage.set('Erreur lors du chargement des projets');
        this.isLoading.set(false);
      }
    });
  }

  filterProjets() {
    let filtered = this.projets();

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nomProjet?.toLowerCase().includes(term) ||
        p.designationProjet?.toLowerCase().includes(term) ||
        p.designationClient?.toLowerCase().includes(term)
      );
    }

    // Filter by statut
    if (this.filterStatut) {
      filtered = filtered.filter(p => p.statut === this.filterStatut);
    }

    // Filter by type
    if (this.filterType) {
      filtered = filtered.filter(p => p.typeProjet === this.filterType);
    }

    this.filteredProjets.set(filtered);
    this.currentPage.set(1);
    this.updatePagination();
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
    this.filteredProjets.set(this.projets());
    this.currentPage.set(1);
    this.updatePagination();
  }

  getStatutBadgeClass(statut: string): string {
    switch (statut) {
      case 'EN_COURS': return 'bg-primary';
      case 'TERMINE': return 'bg-success';
      case 'EN_ATTENTE': return 'bg-warning';
      case 'ANNULE': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getStatutBadgeStyle(statut: string): string {
    let bgGradient = '';
    switch (statut) {
      case 'EN_COURS':
        bgGradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
        break;
      case 'TERMINE':
        bgGradient = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        break;
      case 'EN_ATTENTE':
        bgGradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
        break;
      case 'ANNULE':
        bgGradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        break;
      default:
        bgGradient = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
    return `background: ${bgGradient}; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; display: inline-block; box-shadow: 0 2px 8px rgba(0,0,0,0.15);`;
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'EN_COURS': return 'En cours';
      case 'TERMINE': return 'Terminé';
      case 'EN_ATTENTE': return 'En attente';
      case 'ANNULE': return 'Annulé';
      default: return statut;
    }
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'nouveau': return 'Nouveau';
      case 'evolution': return 'Evolution';
      case 'refonte': return 'Refonte';
      default: return type;
    }
  }

  getCaractereLabel(caractere: string): string {
    switch (caractere) {
      case 'national': return 'National';
      case 'commune_administration': return 'Commune';
      case 'cni': return 'CNI';
      default: return caractere;
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  viewProjet(id: string) {
    this.router.navigate(['/projets', id]);
  }

  editProjet(id: string) {
    this.router.navigate(['/fiche-projet/edit', id]);
  }

  deleteProjet(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      const token = localStorage.getItem('token');
      this.http.delete(`http://localhost:8081/api/chef-projet/fiches-projet/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).subscribe({
        next: () => {
          this.loadProjets();
        },
        error: (error) => {
          console.error('Error deleting projet:', error);
          alert('Erreur lors de la suppression du projet');
        }
      });
    }
  }
}
