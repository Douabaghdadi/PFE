import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

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
  equipeProjet: string;
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
    <div class="container-fluid py-4 bg-light min-vh-100">
      <div class="row justify-content-center">
        <div class="col-12 col-xl-10">
          <!-- Back Button -->
          <div class="mb-4">
            <a routerLink="/projets" class="btn btn-outline-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Retour à la liste
            </a>
          </div>

          <!-- Loading State -->
          @if (isLoading()) {
            <div class="text-center py-5">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
              </div>
            </div>
          }

          <!-- Error State -->
          @if (errorMessage()) {
            <div class="alert alert-danger rounded-4">
              {{ errorMessage() }}
            </div>
          }

          <!-- Project Detail -->
          @if (projet() && !isLoading()) {
            <div class="card shadow-lg border-0 rounded-4">
              <!-- Header -->
              <div class="card-header bg-gradient-primary text-white py-4">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h3 class="fw-bold mb-2">{{ projet()!.nomProjet || projet()!.designationProjet }}</h3>
                    @if (projet()!.designationClient) {
                      <p class="mb-0 opacity-75">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                        </svg>
                        Client: {{ projet()!.designationClient }}
                      </p>
                    }
                  </div>
                  <span class="badge" [class]="getStatutBadgeClass(projet()!.statut)">
                    {{ getStatutLabel(projet()!.statut) }}
                  </span>
                </div>
              </div>

              <div class="card-body p-4 p-md-5">
                <!-- Section 1: Identification -->
                <div class="detail-section mb-4">
                  <h5 class="section-title">
                    <span class="section-number">1</span>
                    Identification
                  </h5>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="text-muted small">Nom du Projet</label>
                      <p class="fw-semibold">{{ projet()!.nomProjet || '-' }}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Cadre contractuel</label>
                      <p class="fw-semibold">{{ projet()!.cadreContractuelProjet || '-' }}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Caractère Projet</label>
                      <p class="fw-semibold">{{ getCaractereLabel(projet()!.caractereProjet) }}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Type Projet</label>
                      <p class="fw-semibold">{{ getTypeLabel(projet()!.typeProjet) }}</p>
                    </div>
                  </div>
                </div>

                <!-- Section 2: Présentation -->
                @if (projet()!.presentation) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">2</span>
                      Présentation
                    </h5>
                    <p class="text-justify">{{ projet()!.presentation }}</p>
                  </div>
                }

                <!-- Section 3: Historique -->
                @if (projet()!.historique) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">3</span>
                      Historique
                    </h5>
                    <p class="text-justify">{{ projet()!.historique }}</p>
                  </div>
                }

                <!-- Section 4: Périmètre -->
                @if (projet()!.perimetre) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">4</span>
                      Périmètre
                    </h5>
                    <p class="text-justify">{{ projet()!.perimetre }}</p>
                  </div>
                }

                <!-- Section 5: Organisation -->
                <div class="detail-section mb-4">
                  <h5 class="section-title">
                    <span class="section-number">5</span>
                    Organisation et conduite de projet
                  </h5>
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="text-muted small">Maître d'ouvrage</label>
                      <p class="fw-semibold">{{ projet()!.maitreOuvrage || '-' }}</p>
                    </div>
                    <div class="col-md-6">
                      <label class="text-muted small">Maître d'œuvre</label>
                      <p class="fw-semibold">{{ projet()!.maitreOeuvre || '-' }}</p>
                    </div>
                    @if (projet()!.equipeProjet) {
                      <div class="col-12">
                        <label class="text-muted small">Equipe du projet</label>
                        <p class="fw-semibold">{{ projet()!.equipeProjet }}</p>
                      </div>
                    }
                  </div>
                </div>

                <!-- Section 6: Estimation des charges -->
                @if (projet()!.estimationsCharges && projet()!.estimationsCharges.length > 0) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">6</span>
                      Estimation des charges
                    </h5>
                    <div class="table-responsive">
                      <table class="table table-bordered">
                        <thead class="table-light">
                          <tr>
                            <th>Prestations</th>
                            <th>Profil</th>
                            <th>Période</th>
                            <th>Charge/HM</th>
                            <th>Livrables</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (charge of projet()!.estimationsCharges; track $index) {
                            <tr>
                              <td>{{ charge.prestations }}</td>
                              <td>{{ charge.profil }}</td>
                              <td>{{ charge.periode }}</td>
                              <td>{{ charge.chargeHM }}</td>
                              <td>{{ charge.livrables }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    @if (projet()!.modaliteDeveloppement) {
                      <p class="mt-3"><strong>Modalité de développement:</strong> {{ projet()!.modaliteDeveloppement }}</p>
                    }
                  </div>
                }

                <!-- Section 7: Estimation du budget -->
                @if (projet()!.estimationBudget) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">7</span>
                      Estimation du budget
                    </h5>
                    <div class="row g-3">
                      <div class="col-md-4">
                        <label class="text-muted small">CP</label>
                        <p class="fw-semibold">{{ projet()!.estimationBudget.cp || '-' }}</p>
                      </div>
                      <div class="col-md-4">
                        <label class="text-muted small">ID</label>
                        <p class="fw-semibold">{{ projet()!.estimationBudget.id || '-' }}</p>
                      </div>
                      <div class="col-md-4">
                        <label class="text-muted small">Total</label>
                        <p class="fw-semibold">{{ projet()!.estimationBudget.total || '-' }}</p>
                      </div>
                      <div class="col-12">
                        <label class="text-muted small">Budget (en MD/HT)</label>
                        <p class="fw-semibold">{{ projet()!.estimationBudget.budgetMDHT || '-' }}</p>
                      </div>
                    </div>
                  </div>
                }

                <!-- Section 8: Délais prévisionnels -->
                @if (projet()!.delaisPrevisionnels) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">8</span>
                      Délais prévisionnels
                    </h5>
                    <p class="text-justify">{{ projet()!.delaisPrevisionnels }}</p>
                  </div>
                }

                <!-- Section 9: Risques potentiels -->
                @if (projet()!.risquesPotentiels) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">9</span>
                      Risques potentiels
                    </h5>
                    <p class="text-justify">{{ projet()!.risquesPotentiels }}</p>
                  </div>
                }

                <!-- Section 10: Pré-requis -->
                @if (projet()!.preRequis) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">10</span>
                      Pré-requis
                    </h5>
                    <p class="text-justify">{{ projet()!.preRequis }}</p>
                  </div>
                }

                <!-- Section 11: Planning -->
                @if (projet()!.planning && projet()!.planning.length > 0) {
                  <div class="detail-section mb-4">
                    <h5 class="section-title">
                      <span class="section-number">11</span>
                      Planning du projet
                    </h5>
                    <div class="table-responsive">
                      <table class="table table-bordered">
                        <thead class="table-light">
                          <tr>
                            <th>Actions</th>
                            <th>Profil des Intervenants</th>
                            <th>Charge H/M</th>
                            <th class="text-center">1</th>
                            <th class="text-center">2</th>
                            <th class="text-center">3</th>
                            <th class="text-center">4</th>
                            <th class="text-center">5</th>
                            <th class="text-center">6</th>
                            <th class="text-center">7</th>
                            <th class="text-center">8</th>
                            <th class="text-center">9</th>
                            <th class="text-center">10</th>
                            <th class="text-center">11</th>
                            <th class="text-center">12</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (plan of projet()!.planning; track $index) {
                            <tr>
                              <td>{{ plan.action }}</td>
                              <td>{{ plan.profilIntervenants }}</td>
                              <td>{{ plan.chargeHM }}</td>
                              <td class="text-center">{{ plan.mois['1'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['2'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['3'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['4'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['5'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['6'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['7'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['8'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['9'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['10'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['11'] ? '✓' : '' }}</td>
                              <td class="text-center">{{ plan.mois['12'] ? '✓' : '' }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }

                <!-- Actions -->
                <div class="d-flex gap-3 mt-5 pt-4 border-top">
                  <a routerLink="/projets" class="btn btn-secondary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <line x1="19" y1="12" x2="5" y2="12"/>
                      <polyline points="12 19 5 12 12 5"/>
                    </svg>
                    Retour
                  </a>
                  <button class="btn btn-primary" (click)="editProjet()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Modifier
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bg-gradient-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .detail-section {
      padding: 1.5rem;
      background: #f8f9fa;
      border-radius: 0.75rem;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #495057;
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }

    .section-number {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-radius: 50%;
      font-size: 0.9rem;
      margin-right: 0.75rem;
      font-weight: bold;
    }

    .text-justify {
      text-align: justify;
    }

    .badge {
      font-weight: 500;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }

    .rounded-4 {
      border-radius: 1rem !important;
    }
  `]
})
export class ProjetDetailComponent implements OnInit {
  http = inject(HttpClient);
  route = inject(ActivatedRoute);

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

  editProjet() {
    // TODO: Navigate to edit page
    console.log('Edit projet:', this.projet()?.id);
  }
}
