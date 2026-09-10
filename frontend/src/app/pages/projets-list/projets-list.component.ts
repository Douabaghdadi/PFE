import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ChatbotComponent } from '../../components/chatbot/chatbot.component';
import { UserService } from '../../services/user.service';

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
  imports: [CommonModule, RouterLink, FormsModule, ChatbotComponent],
  template: `
    <div class="min-h-screen py-8" style="background: #f8fafc;">
      <div class="container mx-auto px-6" style="max-width: 1400px;">
        
        <!-- Header -->
        <div class="mb-8" style="background: linear-gradient(135deg, #09C82C 0%, #07a625 100%); border-radius: 1.25rem; padding: 1.5rem 2rem; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -60px; right: -60px; width: 220px; height: 220px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
          <div style="position: absolute; bottom: -40px; left: 30%; width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
          <div class="flex items-center justify-between" style="position: relative; z-index: 1;">
            <div>
              <h1 style="color: white; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 0.25rem;">
                Mes Projets
              </h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 1.1rem; margin: 0;">
                Gérez et consultez vos fiches de projet
              </p>
            </div>
            <a routerLink="/fiche-projet/new" 
               style="background: white; color: #09C82C; border: none; padding: 0.875rem 1.75rem; border-radius: 0.875rem; font-weight: 700; transition: all 0.3s ease; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); font-size: 0.95rem;">
              <i class="fas fa-plus"></i>
              Créer un projet
            </a>
          </div>
        </div>

        <!-- Filters -->
        <div style="background: white; border-radius: 1.25rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #f1f5f9;">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-3">
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
            <div class="md:col-span-2">
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
              <button (click)="toggleSortOrder()"
                      style="width: 100%; padding: 0.75rem 1rem; background: white; border: 2px solid #e5e7eb; color: #374151; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                      onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4';"
                      onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
                <i [class]="sortOrder === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up'" style="margin-right: 0.5rem;"></i>
                {{ sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien' }}
              </button>
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
          <div style="background: white; border-radius: 1.5rem; padding: 4rem 2rem; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #f1f5f9;">
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
              <div style="background: white; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); transition: all 0.25s cubic-bezier(0.4,0,0.2,1); border: 1px solid #eef1f4; cursor: pointer; display: flex; flex-direction: column;"
                   (click)="viewProjet(projet.id)"
                   onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 32px -12px rgba(15,23,42,0.16), 0 4px 10px rgba(15,23,42,0.06)'; this.style.borderColor='#e2e8f0';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)'; this.style.borderColor='#eef1f4';">

                <!-- Card Body -->
                <div style="padding: 1.25rem 1.25rem 1rem; flex: 1; display: flex; flex-direction: column;">

                  <!-- Header -->
                  <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.9rem;">
                    <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
                      <div style="width: 2.3rem; height: 2.3rem; border-radius: 0.8rem; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas fa-folder" style="color: #475569; font-size: 1rem;"></i>
                      </div>
                      <div style="min-width: 0;">
                        <h3 style="font-size: 0.98rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;" [title]="projet.nomProjet || projet.designationProjet">
                          {{ projet.nomProjet || projet.designationProjet }}
                        </h3>
                        <span style="font-size: 0.65rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.02em;">{{ getChefProjetName(projet.chefProjetId) }}</span>
                      </div>
                    </div>
                    <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.28rem 0.6rem; border-radius: 999px; font-size: 0.65rem; font-weight: 700; flex-shrink: 0; white-space: nowrap;"
                          [style.background]="getStatutColor(projet.statut) + '1A'"
                          [style.color]="getStatutColor(projet.statut)">
                      <span style="width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;" [style.background]="getStatutColor(projet.statut)"></span>
                      {{ getStatutLabel(projet.statut) }}
                    </span>
                  </div>

                  <!-- Bento stat tiles: Client + Créé le -->
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.55rem; margin-bottom: 0.9rem;">
                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 1rem; padding: 0.65rem 0.75rem; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.3rem;">
                        <i class="fas fa-building" style="color: #1d4ed8; font-size: 0.65rem;"></i>
                        <span style="font-size: 0.58rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.05em;">Client</span>
                      </div>
                      <div style="font-size: 0.85rem; font-weight: 800; color: #1e3a8a; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ projet.designationClient || '—' }}</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fde68a; border-radius: 1rem; padding: 0.65rem 0.75rem; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.3rem;">
                        <i class="fas fa-calendar" style="color: #b45309; font-size: 0.65rem;"></i>
                        <span style="font-size: 0.58rem; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.05em;">Créé le</span>
                      </div>
                      <div style="font-size: 0.85rem; font-weight: 800; color: #92400e; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ projet.dateCreation ? formatDate(projet.dateCreation) : '—' }}</div>
                    </div>
                  </div>

                  <!-- Chef de projet -->
                  <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                    <div style="width: 1.6rem; height: 1.6rem; border-radius: 50%; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(37,99,235,0.25);">
                      <span style="color: white; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.02em;">{{ getInitials(getChefProjetName(projet.chefProjetId)) }}</span>
                    </div>
                    <span style="font-size: 0.8rem; color: #334155; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ getChefProjetName(projet.chefProjetId) }}</span>
                  </div>

                </div>

                <!-- Action Buttons Footer -->
                <div style="padding: 0 1.25rem 1.25rem;">
                  <div style="height: 1px; background: #f1f5f9; margin-bottom: 0.75rem;"></div>

                  <div style="display: grid; grid-template-columns: 2.4rem 2.4rem 2.4rem 1fr; gap: 0.45rem;">
                    <button (click)="viewFichesSuivi(projet.id); $event.stopPropagation()" title="Fiches de suivi"
                            style="height: 2.4rem; background: #f8fafc; border: 1px solid #eef1f4; color: #64748b; border-radius: 0.7rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;"
                            onmouseover="this.style.background='#f5f3ff'; this.style.borderColor='#ddd6fe'; this.style.color='#7c3aed';"
                            onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#eef1f4'; this.style.color='#64748b';">
                      <i class="fas fa-clipboard-list" style="font-size: 0.9rem;"></i>
                    </button>

                    <button (click)="editProjet(projet.id); $event.stopPropagation()" title="Modifier"
                            style="height: 2.4rem; background: #f8fafc; border: 1px solid #eef1f4; color: #64748b; border-radius: 0.7rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;"
                            onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe'; this.style.color='#2563eb';"
                            onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#eef1f4'; this.style.color='#64748b';">
                      <i class="fas fa-edit" style="font-size: 0.9rem;"></i>
                    </button>

                    <button (click)="deleteProjet(projet.id); $event.stopPropagation()" title="Supprimer"
                            style="height: 2.4rem; background: #f8fafc; border: 1px solid #eef1f4; color: #64748b; border-radius: 0.7rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;"
                            onmouseover="this.style.background='#fef2f2'; this.style.borderColor='#fecaca'; this.style.color='#dc2626';"
                            onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#eef1f4'; this.style.color='#64748b';">
                      <i class="fas fa-trash" style="font-size: 0.9rem;"></i>
                    </button>

                    <button (click)="viewProjet(projet.id); $event.stopPropagation()"
                            style="height: 2.4rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 0.7rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; box-shadow: 0 4px 10px rgba(16,185,129,0.3);"
                            onmouseover="this.style.boxShadow='0 6px 16px rgba(16,185,129,0.4)'; this.style.transform='translateY(-1px)';"
                            onmouseout="this.style.boxShadow='0 4px 10px rgba(16,185,129,0.3)'; this.style.transform='translateY(0)';">
                      Voir
                      <i class="fas fa-arrow-right" style="font-size: 0.75rem;"></i>
                    </button>
                  </div>
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
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .project-card { animation: fadeInUp 0.4s ease both; }
    </style>

    <app-chatbot context="chef_projet"></app-chatbot>
  `,
  styles: [`
    /* Styles are now inline in the template */
  `]
})
export class ProjetsListComponent implements OnInit {
  http = inject(HttpClient);
  router = inject(Router);
  private userService = inject(UserService);

  projets = signal<FicheProjet[]>([]);
  filteredProjets = signal<FicheProjet[]>([]);
  paginatedProjets = signal<FicheProjet[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  chefProjetNames: { [key: string]: string } = {};
  
  searchTerm = '';
  filterStatut = '';
  filterType = '';
  sortOrder: 'asc' | 'desc' = 'desc';
  
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
        this.loadChefProjetNames(data);
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

  loadChefProjetNames(projets: FicheProjet[]) {
    const uniqueIds = [...new Set(projets.map(p => p.chefProjetId).filter(id => id))];
    uniqueIds.forEach(id => {
      this.userService.getUserNameById(id).subscribe({
        next: (name) => { this.chefProjetNames[id] = name; },
        error: () => { this.chefProjetNames[id] = '-'; }
      });
    });
  }

  getChefProjetName(chefProjetId: string): string {
    if (!chefProjetId) return '-';
    return this.chefProjetNames[chefProjetId] || 'Chargement...';
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

  getStatutColor(statut: string): string {
    switch (statut) {
      case 'EN_COURS':
        return '#2563eb';
      case 'TERMINE':
        return '#059669';
      case 'EN_ATTENTE':
        return '#d97706';
      case 'ANNULE':
        return '#dc2626';
      default:
        return '#64748b';
    }
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
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

  viewFichesSuivi(id: string) {
    this.router.navigate(['/fiches-suivi'], { queryParams: { projetId: id } });
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
