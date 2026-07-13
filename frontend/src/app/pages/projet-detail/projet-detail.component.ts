import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface MembreEquipe {
  nom: string;
  role: string;
  email?: string;
}

interface FicheProjet {
  id: string;
  nomProjet: string;
  designationProjet: string;
  designationClient: string;
  cadreContractuelProjet: string;
  caractereProjet: string;
  typeProjet: string;
  presentation: string;
  historique: string;
  perimetre: string;
  maitreOuvrage: string;
  maitreOeuvre: string;
  equipeProjet: MembreEquipe[] | string;
  estimationsCharges: any[];
  modaliteDeveloppement: string;
  estimationBudget: any;
  delaisPrevisionnels: string;
  risquesPotentiels: string;
  preRequis: string;
  planning: any[];
  statut: string;
  dateCreation?: string;
}

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen py-8" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
      <div class="container mx-auto px-4" style="max-width: 1200px;">
        
        <!-- Back Button -->
        <div class="mb-6">
          <a routerLink="/projets" 
             style="background: white; color: #374151; border: 2px solid #e5e7eb; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"
             onmouseover="this.style.borderColor='#10b981'; this.style.color='#10b981'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.2)';"
             onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#374151'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)';">
            <i class="fas fa-arrow-left mr-2"></i>
            Retour à la liste
          </a>
        </div>

        <!-- Loading State -->
        @if (isLoading()) {
          <div class="text-center py-12">
            <div style="display: inline-block; width: 3rem; height: 3rem; border: 4px solid #d1fae5; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <p class="mt-4" style="color: #065f46; font-weight: 600;">Chargement du projet...</p>
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

        <!-- Project Detail -->
        @if (projet() && !isLoading()) {
          <div style="background: white; border-radius: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); overflow: hidden;">
            
            <!-- Header with Green Gradient -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 2.5rem 2rem; position: relative; overflow: hidden;">
              <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
              <div style="position: absolute; bottom: -30px; left: -30px; width: 150px; height: 150px; background: rgba(255,255,255,0.1); border-radius: 50%;"></div>
              
              <div style="position: relative; z-index: 1;">
                <div style="display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 1rem;">
                  <div style="flex: 1; min-width: 250px;">
                    <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                      <span style="color: white; font-size: 0.875rem; font-weight: 600;">
                        <i class="fas fa-folder-open mr-2"></i>FICHE DE PROJET
                      </span>
                    </div>
                    <h1 style="color: white; font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      {{ projet()!.nomProjet || projet()!.designationProjet }}
                    </h1>
                    @if (projet()!.designationClient) {
                      <p style="color: rgba(255,255,255,0.9); font-size: 1.1rem; margin: 0;">
                        <i class="fas fa-building mr-2"></i>
                        {{ projet()!.designationClient }}
                      </p>
                    }
                  </div>
                  <div>
                    <span [style]="getStatutBadgeStyle(projet()!.statut)">
                      <i class="fas fa-circle mr-2" style="font-size: 0.5rem;"></i>
                      {{ getStatutLabel(projet()!.statut) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Content Body -->
            <div style="padding: 2.5rem 2rem;">
              
              <!-- Section 1: Identification -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #d1fae5;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">1</span>
                  <i class="fas fa-id-card mr-2"></i>
                  Identification
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #d1fae5;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-project-diagram mr-1" style="color: #10b981;"></i>Nom du Projet
                    </label>
                    <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">{{ projet()!.nomProjet || '-' }}</p>
                  </div>
                  <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #d1fae5;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-file-contract mr-1" style="color: #10b981;"></i>Cadre contractuel
                    </label>
                    <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">{{ projet()!.cadreContractuelProjet || '-' }}</p>
                  </div>
                  <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #d1fae5;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-flag mr-1" style="color: #10b981;"></i>Caractère Projet
                    </label>
                    <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">{{ getCaractereLabel(projet()!.caractereProjet) }}</p>
                  </div>
                  <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #d1fae5;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-tag mr-1" style="color: #10b981;"></i>Type Projet
                    </label>
                    <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">{{ getTypeLabel(projet()!.typeProjet) }}</p>
                  </div>
                </div>
              </div>

              <!-- Section 2: Présentation -->
              @if (projet()!.presentation) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">2</span>
                    <i class="fas fa-presentation mr-2"></i>
                    Présentation
                  </h2>
                  <p style="color: #374151; line-height: 1.8; text-align: justify; margin: 0;">{{ projet()!.presentation }}</p>
                </div>
              }

              <!-- Section 3: Historique -->
              @if (projet()!.historique) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">3</span>
                    <i class="fas fa-history mr-2"></i>
                    Historique
                  </h2>
                  <p style="color: #374151; line-height: 1.8; text-align: justify; margin: 0;">{{ projet()!.historique }}</p>
                </div>
              }

              <!-- Section 4: Périmètre -->
              @if (projet()!.perimetre) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">4</span>
                    <i class="fas fa-border-all mr-2"></i>
                    Périmètre
                  </h2>
                  <p style="color: #374151; line-height: 1.8; text-align: justify; margin: 0;">{{ projet()!.perimetre }}</p>
                </div>
              }

              <!-- Section 5: Organisation -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #bfdbfe;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e40af; margin-bottom: 1.5rem; display: flex; align-items: center;">
                  <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">5</span>
                  <i class="fas fa-sitemap mr-2"></i>
                  Organisation et conduite de projet
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #bfdbfe;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-user-tie mr-1" style="color: #3b82f6;"></i>Maître d'ouvrage
                    </label>
                    <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">{{ projet()!.maitreOuvrage || '-' }}</p>
                  </div>
                  <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #bfdbfe;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-hard-hat mr-1" style="color: #3b82f6;"></i>Maître d'œuvre
                    </label>
                    <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0;">{{ projet()!.maitreOeuvre || '-' }}</p>
                  </div>
                </div>
                
                <!-- Equipe du projet -->
                @if (projet()!.equipeProjet) {
                  <div style="background: white; padding: 1.5rem; border-radius: 0.75rem; border: 2px solid #bfdbfe;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 1rem;">
                      <i class="fas fa-users mr-1" style="color: #3b82f6;"></i>Équipe du projet
                    </label>
                    
                    @if (isEquipeArray(projet()!.equipeProjet)) {
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        @for (membre of getEquipeArray(projet()!.equipeProjet); track $index) {
                          <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 1rem; border-radius: 0.5rem; border: 1px solid #bae6fd;">
                            <div style="display: flex; align-items: start; gap: 0.75rem;">
                              <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                <i class="fas fa-user" style="color: white; font-size: 1rem;"></i>
                              </div>
                              <div style="flex: 1; min-width: 0;">
                                <p style="font-weight: 700; color: #111827; margin: 0 0 0.25rem 0; font-size: 0.95rem;">{{ membre.nom }}</p>
                                <p style="color: #3b82f6; margin: 0 0 0.25rem 0; font-size: 0.875rem; font-weight: 600;">
                                  <i class="fas fa-briefcase mr-1" style="font-size: 0.75rem;"></i>{{ membre.role }}
                                </p>
                                @if (membre.email) {
                                  <p style="color: #6b7280; margin: 0; font-size: 0.8rem;">
                                    <i class="fas fa-envelope mr-1" style="font-size: 0.7rem;"></i>{{ membre.email }}
                                  </p>
                                }
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    } @else {
                      <p style="font-size: 1rem; font-weight: 600; color: #111827; margin: 0; line-height: 1.6;">{{ projet()!.equipeProjet }}</p>
                    }
                  </div>
                }
              </div>

              <!-- Section 6: Estimation des charges -->
              @if (projet()!.estimationsCharges && projet()!.estimationsCharges.length > 0) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">6</span>
                    <i class="fas fa-tasks mr-2"></i>
                    Estimation des charges
                  </h2>
                  <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 2px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden;">
                      <thead style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
                        <tr>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5;">Prestations</th>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5;">Profil</th>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5;">Période</th>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5;">Charge/HM</th>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5;">Livrables</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (charge of projet()!.estimationsCharges; track $index) {
                          <tr style="background: white; transition: all 0.2s ease;" onmouseover="this.style.background='#f9fafb';" onmouseout="this.style.background='white';">
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151;">{{ charge.prestations }}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151;">{{ charge.profil }}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151;">{{ charge.periode }}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">{{ charge.chargeHM }}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151;">{{ charge.livrables }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  @if (projet()!.modaliteDeveloppement) {
                    <div style="margin-top: 1.5rem; padding: 1rem; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 0.5rem; border: 2px solid #d1fae5;">
                      <p style="margin: 0; color: #065f46; font-weight: 600;">
                        <i class="fas fa-cogs mr-2"></i>
                        <strong>Modalité de développement:</strong> {{ getModaliteLabel(projet()!.modaliteDeveloppement) }}
                      </p>
                    </div>
                  }
                </div>
              }

              <!-- Section 7: Estimation du budget -->
              @if (projet()!.estimationBudget) {
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #fcd34d;">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #78350f; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);">7</span>
                    <i class="fas fa-coins mr-2"></i>
                    Estimation du budget
                  </h2>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #fcd34d;">
                      <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                        <i class="fas fa-user-tie mr-1" style="color: #f59e0b;"></i>CP (Chef de Projet)
                      </label>
                      <p style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0;">{{ projet()!.estimationBudget.cp || '-' }}</p>
                    </div>
                    <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #fcd34d;">
                      <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                        <i class="fas fa-code mr-1" style="color: #f59e0b;"></i>ID (Ingénieur Développeur)
                      </label>
                      <p style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0;">{{ projet()!.estimationBudget.id || '-' }}</p>
                    </div>
                    <div style="background: white; padding: 1.25rem; border-radius: 0.75rem; border: 2px solid #fcd34d;">
                      <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                        <i class="fas fa-calculator mr-1" style="color: #f59e0b;"></i>Total
                      </label>
                      <p style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0;">{{ projet()!.estimationBudget.total || '-' }}</p>
                    </div>
                  </div>
                  <div style="background: white; padding: 1.5rem; border-radius: 0.75rem; border: 2px solid #fcd34d;">
                    <label style="display: block; font-size: 0.875rem; font-weight: 600; color: #6b7280; margin-bottom: 0.5rem;">
                      <i class="fas fa-money-bill-wave mr-1" style="color: #f59e0b;"></i>Budget (en MD/HT)
                    </label>
                    <p style="font-size: 1.5rem; font-weight: 700; color: #f59e0b; margin: 0;">{{ projet()!.estimationBudget.budgetMDHT || '-' }} MD</p>
                  </div>
                </div>
              }

              <!-- Section 8: Délais prévisionnels -->
              @if (projet()!.delaisPrevisionnels) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">8</span>
                    <i class="fas fa-clock mr-2"></i>
                    Délais prévisionnels
                  </h2>
                  <p style="color: #374151; line-height: 1.8; text-align: justify; margin: 0;">{{ projet()!.delaisPrevisionnels }}</p>
                </div>
              }

              <!-- Section 9: Risques potentiels -->
              @if (projet()!.risquesPotentiels) {
                <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #fca5a5;">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #991b1b; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">9</span>
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Risques potentiels
                  </h2>
                  <p style="color: #7f1d1d; line-height: 1.8; text-align: justify; margin: 0; font-weight: 500;">{{ projet()!.risquesPotentiels }}</p>
                </div>
              }

              <!-- Section 10: Pré-requis -->
              @if (projet()!.preRequis) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">10</span>
                    <i class="fas fa-check-circle mr-2"></i>
                    Pré-requis
                  </h2>
                  <p style="color: #374151; line-height: 1.8; text-align: justify; margin: 0;">{{ projet()!.preRequis }}</p>
                </div>
              }

              <!-- Section 11: Planning -->
              @if (projet()!.planning && projet()!.planning.length > 0) {
                <div style="background: white; padding: 2rem; border-radius: 1rem; margin-bottom: 2rem; border: 2px solid #e5e7eb; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                  <h2 style="font-size: 1.5rem; font-weight: 700; color: #065f46; margin-bottom: 1.5rem; display: flex; align-items: center;">
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 50%; font-size: 1.1rem; margin-right: 1rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">11</span>
                    <i class="fas fa-calendar-alt mr-2"></i>
                    Planning du projet
                  </h2>
                  <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 0; border: 2px solid #e5e7eb; border-radius: 0.75rem; overflow: hidden; min-width: 900px;">
                      <thead style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
                        <tr>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; min-width: 150px;">Actions</th>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; min-width: 150px;">Profil des Intervenants</th>
                          <th style="padding: 1rem; text-align: left; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5;">Charge H/M</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">1</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">2</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">3</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">4</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">5</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">6</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">7</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">8</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">9</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">10</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">11</th>
                          <th style="padding: 0.75rem; text-align: center; font-weight: 700; color: #065f46; border-bottom: 2px solid #d1fae5; width: 50px;">12</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (plan of projet()!.planning; track $index) {
                          <tr style="background: white; transition: all 0.2s ease;" onmouseover="this.style.background='#f9fafb';" onmouseout="this.style.background='white';">
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 500;">{{ plan.action }}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151;">{{ plan.profilIntervenants }}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e5e7eb; color: #374151; font-weight: 600;">{{ plan.chargeHM }}</td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['1']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['2']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['3']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['4']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['5']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['6']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['7']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['8']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['9']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['10']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['11']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                            <td style="padding: 0.75rem; text-align: center; border-bottom: 1px solid #e5e7eb;">
                              @if (plan.mois['12']) {
                                <i class="fas fa-check-circle" style="color: #10b981; font-size: 1.1rem;"></i>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }


              <!-- Actions -->
              <div style="display: flex; gap: 1rem; padding-top: 2rem; border-top: 2px solid #e5e7eb; flex-wrap: wrap;">
                <a routerLink="/projets" 
                   style="background: white; color: #374151; border: 2px solid #e5e7eb; padding: 0.875rem 1.75rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05);"
                   onmouseover="this.style.borderColor='#10b981'; this.style.color='#10b981'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.2)';"
                   onmouseout="this.style.borderColor='#e5e7eb'; this.style.color='#374151'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.05)';">
                  <i class="fas fa-arrow-left mr-2"></i>
                  Retour à la liste
                </a>
                <a [routerLink]="['/projets', projet()!.id, 'historique']" 
                   style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; padding: 0.875rem 1.75rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);"
                   onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(139, 92, 246, 0.4)';"
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)';">
                  <i class="fas fa-history mr-2"></i>
                  Historique complet
                </a>
                <button (click)="editProjet()" 
                        style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.875rem 1.75rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center;"
                        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(16, 185, 129, 0.4)';"
                        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.3)';">
                  <i class="fas fa-edit mr-2"></i>
                  Modifier le projet
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>

    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `,
  styles: [`
    /* Styles are now inline in the template */
  `]
})
export class ProjetDetailComponent implements OnInit {
  http = inject(HttpClient);
  route = inject(ActivatedRoute);
  router = inject(Router);

  projet = signal<FicheProjet | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  


  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProjet(id);
    }
  }

  loadProjet(id: string) {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.errorMessage.set('Vous devez être connecté');
      this.isLoading.set(false);
      return;
    }

    this.http.get<FicheProjet>(`http://localhost:8081/api/chef-projet/fiches-projet/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        this.projet.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading projet:', error);
        this.errorMessage.set('Erreur lors du chargement du projet');
        this.isLoading.set(false);
      }
    });
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
    return `background: ${bgGradient}; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-size: 1rem; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.2);`;
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
      default: return type || '-';
    }
  }

  getCaractereLabel(caractere: string): string {
    switch (caractere) {
      case 'national': return 'National';
      case 'commune_administration': return 'Commune à l\'Administration';
      case 'cni': return 'CNI';
      default: return caractere || '-';
    }
  }

  getModaliteLabel(modalite: string): string {
    switch (modalite) {
      case 'I': return 'I - Interne';
      case 'ST': return 'ST - Sous-traitance';
      case 'CO': return 'CO - Co-traitance';
      case 'I+ST': return 'I+ST - Interne + Sous-traitance';
      case 'I+CO': return 'I+CO - Interne + Co-traitance';
      default: return modalite || '-';
    }
  }

  isEquipeArray(equipe: MembreEquipe[] | string): boolean {
    return Array.isArray(equipe);
  }

  getEquipeArray(equipe: MembreEquipe[] | string): MembreEquipe[] {
    return Array.isArray(equipe) ? equipe : [];
  }

  editProjet() {
    // TODO: Navigate to edit page
    console.log('Edit projet:', this.projet()?.id);
  }
}
