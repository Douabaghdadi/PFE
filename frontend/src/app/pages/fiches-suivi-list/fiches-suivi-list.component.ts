import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FicheSuiviService, FicheSuivi } from '../../services/fiche-suivi.service';

@Component({
  selector: 'app-fiches-suivi-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen py-8" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
      <div class="container mx-auto px-4" style="max-width: 1400px;">
        
        <!-- Header -->
        <div class="mb-8" style="background: linear-gradient(135deg, #09C82C 0%, #07a625 100%); border-radius: 1.25rem; padding: 1.5rem 2rem; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -60px; right: -60px; width: 220px; height: 220px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
          <div style="position: absolute; bottom: -40px; left: 30%; width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
          <div class="flex items-center justify-between" style="position: relative; z-index: 1;">
            <div>
              <div style="display: inline-flex; align-items: center; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 2rem; padding: 0.35rem 1rem; margin-bottom: 1rem;">
                <span style="width: 8px; height: 8px; background: white; border-radius: 50%; margin-right: 0.5rem;"></span>
                <span style="color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em;">FICHES DE SUIVI</span>
              </div>
              <h1 style="color: white; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 0.25rem;">Mes Fiches de Suivi</h1>
              <p style="color: rgba(255,255,255,0.85); font-size: 0.9rem; margin: 0;">Gérez et consultez vos rapports de suivi de projet</p>
            </div>
            <button (click)="createNewFiche()"
               style="background: white; color: #09C82C; border: none; padding: 0.875rem 1.75rem; border-radius: 0.875rem; font-weight: 700; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 20px rgba(0,0,0,0.15); font-size: 0.95rem; cursor: pointer;">
              <i class="fas fa-plus"></i>
              Créer une Fiche de Suivi
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div style="background: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div class="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div class="md:col-span-5">
              <input type="text" 
                     [value]="searchTerm()" 
                     (input)="searchTerm.set($any($event.target).value); applyFilters()"
                     placeholder="🔍 Rechercher par numéro de rapport, chef de projet, projet..." 
                     style="width: 100%; padding: 0.75rem 1rem; border: 2px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.95rem; transition: all 0.3s ease;"
                     onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)';"
                     onblur="this.style.borderColor='#e5e7eb'; this.style.boxShadow='none';">
            </div>
            <div class="md:col-span-3">
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
              <button (click)="toggleSortOrder()"
                      style="width: 100%; padding: 0.75rem 1rem; background: white; border: 2px solid #e5e7eb; color: #374151; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;"
                      onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4';"
                      onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
                <i [class]="sortOrder() === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up'" style="margin-right: 0.5rem;"></i>
                {{ sortOrder() === 'desc' ? 'Plus récent' : 'Plus ancien' }}
              </button>
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
          
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; align-items: stretch;">
            @for (fiche of paginatedFiches(); track fiche.id) {
              <div style="background: white; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); transition: all 0.25s cubic-bezier(0.4,0,0.2,1); border: 1px solid #eef1f4; cursor: pointer; display: flex; flex-direction: column;"
                   (click)="viewFiche(fiche.id!)"
                   onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 32px -12px rgba(15,23,42,0.16), 0 4px 10px rgba(15,23,42,0.06)'; this.style.borderColor='#e2e8f0';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)'; this.style.borderColor='#eef1f4';">

                <!-- Card Body -->
                <div style="padding: 1.25rem 1.25rem 1rem; flex: 1; display: flex; flex-direction: column;">

                  <!-- Header -->
                  <div style="display: flex; align-items: flex-start; gap: 0.65rem; margin-bottom: 0.9rem;">
                    <div style="width: 2.3rem; height: 2.3rem; border-radius: 0.8rem; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <svg style="width: 1.05rem; height: 1.05rem; color: #475569;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div style="min-width: 0;">
                      <h3 style="font-size: 0.98rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;" [title]="fiche.numeroRapport || 'Sans numéro'">
                        {{ fiche.numeroRapport || 'Sans numéro' }}
                      </h3>
                      <span style="font-size: 0.65rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.02em;">{{ fiche.dateRapport | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>

                  <!-- Projet -->
                  <div style="display: inline-flex; align-items: center; gap: 0.3rem; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 0.25rem 0.55rem; border-radius: 0.5rem; margin-bottom: 0.6rem; align-self: flex-start;">
                    <svg style="width: 0.68rem; height: 0.68rem; color: #059669; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                    </svg>
                    <span style="font-size: 0.72rem; font-weight: 700; color: #059669; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 12rem;">{{ getProjetName(fiche.ficheProjetId) }}</span>
                  </div>

                  <!-- Chef de projet -->
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.9rem;">
                    <div style="width: 1.6rem; height: 1.6rem; border-radius: 50%; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(37,99,235,0.25);">
                      <span style="color: white; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.02em;">{{ getInitials(fiche.ficheSignaletique?.chefProjet?.nom) }}</span>
                    </div>
                    <span style="font-size: 0.8rem; color: #334155; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ fiche.ficheSignaletique?.chefProjet?.nom || '—' }}</span>
                  </div>

                  <!-- Bento stat tiles: Tâches + Problèmes + Risques -->
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: auto;">
                    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 1rem; padding: 0.6rem 0.4rem; text-align: center;">
                      <div style="font-size: 1.2rem; font-weight: 800; color: #1d4ed8; line-height: 1;">{{ (fiche.tachesSuivi || []).length }}</div>
                      <div style="font-size: 0.55rem; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.25rem;">Tâches</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fde68a; border-radius: 1rem; padding: 0.6rem 0.4rem; text-align: center;">
                      <div style="font-size: 1.2rem; font-weight: 800; color: #b45309; line-height: 1;">{{ (fiche.constatGlobal?.problemesRencontres || []).length }}</div>
                      <div style="font-size: 0.55rem; font-weight: 700; color: #b45309; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.25rem;">Problèmes</div>
                    </div>
                    <div style="background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%); border: 1px solid #fca5a5; border-radius: 1rem; padding: 0.6rem 0.4rem; text-align: center;">
                      <div style="font-size: 1.2rem; font-weight: 800; color: #b91c1c; line-height: 1;">{{ (fiche.constatGlobal?.principauxRisques || []).length }}</div>
                      <div style="font-size: 0.55rem; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.25rem;">Risques</div>
                    </div>
                  </div>

                </div>

                <!-- Action Buttons Footer -->
                <div style="padding: 0 1.25rem 1.25rem;">
                  <div style="height: 1px; background: #f1f5f9; margin-bottom: 0.75rem;"></div>

                  <div style="display: grid; grid-template-columns: 2.4rem 2.4rem 1fr; gap: 0.45rem;">
                    <a [routerLink]="['/fiche-suivi/edit', fiche.id]" (click)="$event.stopPropagation()" title="Modifier"
                       style="height: 2.4rem; background: #f8fafc; border: 1px solid #eef1f4; color: #64748b; border-radius: 0.7rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; text-decoration: none;"
                       onmouseover="this.style.background='#eff6ff'; this.style.borderColor='#bfdbfe'; this.style.color='#2563eb';"
                       onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#eef1f4'; this.style.color='#64748b';">
                      <i class="fas fa-edit" style="font-size: 0.9rem;"></i>
                    </a>

                    <button (click)="deleteFiche(fiche.id!); $event.stopPropagation()" title="Supprimer"
                            style="height: 2.4rem; background: #f8fafc; border: 1px solid #eef1f4; color: #64748b; border-radius: 0.7rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;"
                            onmouseover="this.style.background='#fef2f2'; this.style.borderColor='#fecaca'; this.style.color='#dc2626';"
                            onmouseout="this.style.background='#f8fafc'; this.style.borderColor='#eef1f4'; this.style.color='#64748b';">
                      <i class="fas fa-trash" style="font-size: 0.9rem;"></i>
                    </button>

                    <a [routerLink]="['/fiche-suivi', fiche.id]" (click)="$event.stopPropagation()"
                       style="height: 2.4rem; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 0.7rem; font-weight: 700; cursor: pointer; transition: all 0.2s ease; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; box-shadow: 0 4px 10px rgba(16,185,129,0.3); text-decoration: none;"
                       onmouseover="this.style.boxShadow='0 6px 16px rgba(16,185,129,0.4)'; this.style.transform='translateY(-1px)';"
                       onmouseout="this.style.boxShadow='0 4px 10px rgba(16,185,129,0.3)'; this.style.transform='translateY(0)';">
                      Voir
                      <i class="fas fa-arrow-right" style="font-size: 0.75rem;"></i>
                    </a>
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  fichesSuivi = signal<FicheSuivi[]>([]);
  filteredFiches = signal<FicheSuivi[]>([]);
  paginatedFiches = signal<FicheSuivi[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  projetNames = signal<{ [key: string]: string }>({});
  
  searchTerm = signal('');
  selectedProjetId = signal('');
  sortOrder = signal<'asc' | 'desc'>('desc'); // desc = plus récent d'abord
  
  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(6);
  totalPages = signal(1);

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

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  viewFiche(id: string) {
    this.router.navigate(['/fiche-suivi', id]);
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
