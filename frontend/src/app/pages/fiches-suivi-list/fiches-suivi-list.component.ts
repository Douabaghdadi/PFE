import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FicheSuiviService, FicheSuivi } from '../../services/fiche-suivi.service';

@Component({
  selector: 'app-fiches-suivi-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
        @if (!isLoading() && fichesSuivi().length === 0) {
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
        @if (!isLoading() && fichesSuivi().length > 0) {
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (fiche of fichesSuivi(); track fiche.id) {
              <div style="background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.3s ease; border: 2px solid transparent; cursor: pointer;"
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
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f9fafb; border-radius: 0.75rem;">
                  @if (fiche.ficheSignaletique?.maitreOuvrage) {
                    <div style="margin-bottom: 0.5rem;">
                      <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">Maître d'ouvrage:</span>
                      <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ fiche.ficheSignaletique.maitreOuvrage }}</span>
                    </div>
                  }
                  @if (fiche.ficheSignaletique?.chefProjet?.nom) {
                    <div>
                      <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">Chef de projet:</span>
                      <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ fiche.ficheSignaletique.chefProjet.nom }}</span>
                    </div>
                  }
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
                <div style="display: flex; gap: 0.75rem;">
                  <a [routerLink]="['/fiche-suivi/edit', fiche.id]" 
                     style="flex: 1; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; text-align: center; text-decoration: none; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                    <i class="fas fa-edit mr-2"></i>Modifier
                  </a>
                  <button (click)="deleteFiche(fiche.id!)" 
                          style="flex: 1; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);">
                    <i class="fas fa-trash mr-2"></i>Supprimer
                  </button>
                </div>
              </div>
            }
          </div>
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
  isLoading = signal(true);
  errorMessage = signal('');

  ngOnInit() {
    this.loadFichesSuivi();
  }

  loadFichesSuivi() {
    this.isLoading.set(true);
    this.errorMessage.set(''); // Clear any previous errors
    this.ficheSuiviService.getAllFichesSuivi().subscribe({
      next: (data) => {
        this.fichesSuivi.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        // Only show error if it's not a 404 (empty list) or authentication issue
        if (error.status === 404 || error.status === 0) {
          // 404 or network error - just show empty state, no error message
          this.fichesSuivi.set([]);
        } else if (error.status === 401 || error.status === 403) {
          // Authentication/Authorization error
          this.errorMessage.set('Vous devez être connecté en tant que Chef de Projet pour voir les fiches de suivi');
        } else {
          // Other errors
          this.errorMessage.set('Erreur lors du chargement des fiches de suivi');
        }
        this.isLoading.set(false);
        console.error('Error loading fiches suivi:', error);
      }
    });
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
          this.fichesSuivi.set(this.fichesSuivi().filter(f => f.id !== id));
        },
        error: (error) => {
          this.errorMessage.set('Erreur lors de la suppression de la fiche de suivi');
          console.error('Error deleting fiche suivi:', error);
        }
      });
    }
  }
}
