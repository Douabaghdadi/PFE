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
    <div class="container-fluid py-4 bg-light min-vh-100">
      <div class="row">
        <div class="col-12">
          <!-- Header -->
          <div class="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h2 class="fw-bold mb-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2 text-primary">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                </svg>
                Mes Projets
              </h2>
              <p class="text-muted mb-0">Gérez et consultez vos fiches de projet</p>
            </div>
            <a routerLink="/fiche-projet/new" class="btn btn-primary btn-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Créer un projet
            </a>
          </div>

          <!-- Filters -->
          <div class="card shadow-sm border-0 rounded-4 mb-4">
            <div class="card-body">
              <div class="row g-3">
                <div class="col-md-4">
                  <input type="text" class="form-control" placeholder="🔍 Rechercher un projet..." [(ngModel)]="searchTerm" (input)="filterProjets()">
                </div>
                <div class="col-md-3">
                  <select class="form-select" [(ngModel)]="filterStatut" (change)="filterProjets()">
                    <option value="">Tous les statuts</option>
                    <option value="EN_COURS">En cours</option>
                    <option value="TERMINE">Terminé</option>
                    <option value="EN_ATTENTE">En attente</option>
                    <option value="ANNULE">Annulé</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <select class="form-select" [(ngModel)]="filterType" (change)="filterProjets()">
                    <option value="">Tous les types</option>
                    <option value="nouveau">Nouveau</option>
                    <option value="evolution">Evolution</option>
                    <option value="refonte">Refonte</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-outline-secondary w-100" (click)="resetFilters()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                      <path d="M21 3v5h-5"/>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                      <path d="M3 21v-5h5"/>
                    </svg>
                    Réinitialiser
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Loading State -->
          @if (isLoading()) {
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
              <p class="mt-3 text-muted">Chargement des projets...</p>
            </div>
          }

          <!-- Error State -->
          @if (errorMessage()) {
            <div class="alert alert-danger rounded-4" role="alert">
              <div class="d-flex align-items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ errorMessage() }}
              </div>
            </div>
          }

          <!-- Empty State -->
          @if (!isLoading() && filteredProjets().length === 0 && !errorMessage()) {
            <div class="card shadow-sm border-0 rounded-4">
              <div class="card-body text-center py-5">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-muted mb-3">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                <h5 class="fw-bold mb-2">Aucun projet trouvé</h5>
                <p class="text-muted mb-4">Commencez par créer votre première fiche de projet</p>
                <a routerLink="/fiche-projet/new" class="btn btn-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Créer un projet
                </a>
              </div>
            </div>
          }

          <!-- Projects Grid -->
          @if (!isLoading() && filteredProjets().length > 0) {
            <div class="row g-4">
              @for (projet of filteredProjets(); track projet.id) {
                <div class="col-md-6 col-lg-4">
                  <div class="card project-card h-100 shadow-sm border-0 rounded-4">
                    <div class="card-body">
                      <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="project-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <span class="badge" [class]="getStatutBadgeClass(projet.statut)">
                          {{ getStatutLabel(projet.statut) }}
                        </span>
                      </div>

                      <h5 class="card-title fw-bold mb-2">{{ projet.nomProjet || projet.designationProjet }}</h5>
                      
                      @if (projet.designationClient) {
                        <p class="text-muted small mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                            <circle cx="9" cy="7" r="4"/>
                          </svg>
                          {{ projet.designationClient }}
                        </p>
                      }

                      <div class="d-flex gap-2 mb-3">
                        @if (projet.typeProjet) {
                          <span class="badge bg-light text-dark">
                            {{ getTypeLabel(projet.typeProjet) }}
                          </span>
                        }
                        @if (projet.caractereProjet) {
                          <span class="badge bg-light text-dark">
                            {{ getCaractereLabel(projet.caractereProjet) }}
                          </span>
                        }
                      </div>

                      @if (projet.dateCreation) {
                        <p class="text-muted small mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          Créé le {{ formatDate(projet.dateCreation) }}
                        </p>
                      }

                      <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary flex-fill" (click)="viewProjet(projet.id)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          Voir
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" (click)="editProjet(projet.id)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" (click)="deleteProjet(projet.id)">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .project-card {
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .project-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
    }

    .project-icon {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .badge {
      font-weight: 500;
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
    }

    .rounded-4 {
      border-radius: 1rem !important;
    }
  `]
})
export class ProjetsListComponent implements OnInit {
  http = inject(HttpClient);
  router = inject(Router);

  projets = signal<FicheProjet[]>([]);
  filteredProjets = signal<FicheProjet[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  
  searchTerm = '';
  filterStatut = '';
  filterType = '';

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
  }

  resetFilters() {
    this.searchTerm = '';
    this.filterStatut = '';
    this.filterType = '';
    this.filteredProjets.set(this.projets());
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
    console.log('Edit projet:', id);
    // TODO: Navigate to edit page
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
