import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoriqueService, HistoriqueModification } from '../../services/historique.service';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom: 2rem;">
      <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
        <i class="fas fa-history" style="color: #10b981;"></i>
        Historique des modifications
      </h3>

      @if (isLoading()) {
        <div class="text-center py-8">
          <div style="display: inline-block; width: 2rem; height: 2rem; border: 3px solid #d1fae5; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p class="mt-3" style="color: #6b7280; font-size: 0.875rem;">Chargement de l'historique...</p>
        </div>
      }



      @if (!isLoading() && historique().length > 0) {
        <div style="position: relative;">
          <div style="position: absolute; left: 1.5rem; top: 0; bottom: 0; width: 2px; background: #e5e7eb;"></div>

          @for (item of historique(); track item.id) {
            <div style="position: relative; padding-left: 4rem; padding-bottom: 1.5rem;">
              <div [style]="getTimelineDotStyle(item.action)" 
                   style="position: absolute; left: 0.75rem; width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 1;">
                <i [class]="getActionIcon(item.action)" style="font-size: 0.75rem; color: white;"></i>
              </div>

              <div style="background: #f9fafb; border-radius: 0.75rem; padding: 1rem; border-left: 3px solid" [style.border-left-color]="getActionColor(item.action)">
                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.5rem;">
                  <div style="flex: 1;">
                    <span [style]="getActionBadgeStyle(item.action)" style="padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600;">
                      {{ getActionLabel(item.action) }}
                    </span>
                    <p style="margin: 0.5rem 0 0 0; color: #111827; font-weight: 600; font-size: 0.95rem;">
                      {{ item.description }}
                    </p>
                  </div>
                </div>

                <div style="display: flex; gap: 1.5rem; margin-top: 0.75rem; font-size: 0.875rem; color: #6b7280;">
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-user" style="color: #10b981;"></i>
                    <span>{{ item.username }}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-clock" style="color: #10b981;"></i>
                    <span>{{ formatDate(item.dateModification) }}</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-shield-alt" style="color: #10b981;"></i>
                    <span>{{ formatRole(item.userRole) }}</span>
                  </div>
                </div>

                @if (item.action === 'MODIFICATION' && item.anciennesValeurs && item.nouvellesValeurs) {
                  <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
                    <button (click)="toggleDetails(item.id)" 
                            style="background: none; border: none; color: #10b981; font-weight: 600; cursor: pointer; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; padding: 0;">
                      <i [class]="showDetails[item.id] ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
                      {{ showDetails[item.id] ? 'Masquer' : 'Voir' }} les détails
                    </button>
                    
                    @if (showDetails[item.id]) {
                      <div style="margin-top: 0.75rem; background: white; border-radius: 0.5rem; padding: 0.75rem;">
                        @for (key of getChangedKeys(item); track key) {
                          <div style="margin-bottom: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid #f3f4f6;">
                            <div style="font-weight: 600; color: #374151; font-size: 0.875rem; margin-bottom: 0.25rem;">
                              {{ formatFieldName(key) }}
                            </div>
                            <div style="display: flex; gap: 1rem; font-size: 0.875rem;">
                              <div style="flex: 1;">
                                <span style="color: #6b7280; font-size: 0.75rem;">Avant:</span>
                                <div style="color: #ef4444; font-family: monospace; background: #fef2f2; padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-top: 0.25rem;">
                                  {{ formatValue(item.anciennesValeurs![key]) }}
                                </div>
                              </div>
                              <div style="flex: 1;">
                                <span style="color: #6b7280; font-size: 0.75rem;">Après:</span>
                                <div style="color: #10b981; font-family: monospace; background: #f0fdf4; padding: 0.25rem 0.5rem; border-radius: 0.25rem; margin-top: 0.25rem;">
                                  {{ formatValue(item.nouvellesValeurs![key]) }}
                                </div>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `
})
export class HistoriqueComponent implements OnInit {
  @Input() entityType!: string;
  @Input() entityId!: string;

  historiqueService = inject(HistoriqueService);
  historique = signal<HistoriqueModification[]>([]);
  isLoading = signal(true);
  showDetails: { [key: string]: boolean } = {};

  ngOnInit() {
    this.loadHistorique();
  }

  loadHistorique() {
    this.isLoading.set(true);
    console.log('🔍 Chargement historique pour:', this.entityType, this.entityId);
    this.historiqueService.getHistoriqueByEntity(this.entityType, this.entityId).subscribe({
      next: (data) => {
        console.log('✅ Historique reçu:', data);
        this.historique.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('❌ Erreur chargement historique:', err);
        this.isLoading.set(false);
      }
    });
  }

  toggleDetails(id: string) {
    this.showDetails[id] = !this.showDetails[id];
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'CREATION': return 'fas fa-plus';
      case 'MODIFICATION': return 'fas fa-edit';
      case 'SUPPRESSION': return 'fas fa-trash';
      default: return 'fas fa-circle';
    }
  }

  getActionColor(action: string): string {
    switch (action) {
      case 'CREATION': return '#10b981';
      case 'MODIFICATION': return '#3b82f6';
      case 'SUPPRESSION': return '#ef4444';
      default: return '#6b7280';
    }
  }

  getTimelineDotStyle(action: string): string {
    return `background: ${this.getActionColor(action)}; box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);`;
  }

  getActionBadgeStyle(action: string): string {
    const color = this.getActionColor(action);
    return `background: ${color}20; color: ${color};`;
  }

  getActionLabel(action: string): string {
    switch (action) {
      case 'CREATION': return 'Création';
      case 'MODIFICATION': return 'Modification';
      case 'SUPPRESSION': return 'Suppression';
      default: return action;
    }
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatRole(role: string): string {
    const roleMap: { [key: string]: string } = {
      'ROLE_ADMIN': 'Administrateur',
      'ROLE_CHEF_PROJET': 'Chef de Projet',
      'ROLE_PILOTE_QUALITE': 'Pilote Qualité'
    };
    return roleMap[role] || role;
  }

  formatFieldName(fieldName: string): string {
    const fieldMap: { [key: string]: string } = {
      // Fiche Projet
      'nomProjet': 'Nom du projet',
      'designationProjet': 'Désignation du projet',
      'designationClient': 'Désignation du client',
      'statut': 'Statut',
      'dateDebut': 'Date de début',
      'dateFinPrevue': 'Date de fin prévue',
      'cadreContractuelProjet': 'Cadre contractuel',
      'caractereProjet': 'Caractère du projet',
      'typeProjet': 'Type de projet',
      'maitreOuvrage': "Maître d'ouvrage",
      'maitreOeuvre': "Maître d'œuvre",
      'modaliteDeveloppement': 'Modalité de développement',
      
      // Fiche Suivi
      'numeroRapport': 'Numéro de rapport',
      'dateRapport': 'Date du rapport',
      'chefProjet': 'Chef de projet',
      'descriptionProjet': 'Description du projet',
      'experts': 'Experts',
      'caracteristiquesTechniques': 'Caractéristiques techniques',
      'etatAvancement': "État d'avancement",
      'objectifPrincipal': 'Objectif principal',
      'problemesRencontres': 'Problèmes rencontrés',
      'principauxRisques': 'Principaux risques',
      'recommandations': 'Recommandations',
      'nombreTaches': 'Nombre de tâches',
      'nombreTachesPlanning': 'Nombre de tâches au planning'
    };
    return fieldMap[fieldName] || fieldName;
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getChangedKeys(item: HistoriqueModification): string[] {
    console.log('🔍 getChangedKeys pour item:', item.id);
    console.log('anciennesValeurs:', item.anciennesValeurs);
    console.log('nouvellesValeurs:', item.nouvellesValeurs);
    
    if (!item.nouvellesValeurs || !item.anciennesValeurs) {
      console.log('⚠️ Valeurs manquantes');
      return [];
    }
    
    const changedKeys = Object.keys(item.nouvellesValeurs).filter(key => {
      const oldValue = JSON.stringify(item.anciennesValeurs![key]);
      const newValue = JSON.stringify(item.nouvellesValeurs![key]);
      const hasChanged = oldValue !== newValue;
      console.log(`  ${key}: ${oldValue} -> ${newValue} (changed: ${hasChanged})`);
      return hasChanged;
    });
    
    console.log('✅ Clés modifiées:', changedKeys);
    return changedKeys;
  }
}
