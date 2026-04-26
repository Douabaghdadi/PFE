import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface EstimationCharge {
  prestations: string;
  profil: string;
  periode: string;
  chargeHM: string;
  livrables: string;
}

interface EstimationBudget {
  profils: string;
  chargeParProfilHM: string;
  budgetMDHT: string;
  cp: string;
  id: string;
  total: string;
}

interface PlanningAction {
  action: string;
  profilIntervenants: string;
  chargeHM: string;
  mois: { [key: string]: boolean };
}

@Component({
  selector: 'app-fiche-projet-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container-fluid py-4 bg-light min-vh-100">
      <div class="row justify-content-center">
        <div class="col-12 col-xl-10">
          <div class="card shadow-lg border-0 rounded-4">
            <!-- Header -->
            <div class="card-header bg-gradient-primary text-white py-4 rounded-top-4">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center">
                  <div class="icon-circle bg-white bg-opacity-20 me-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div>
                    <h4 class="mb-0 fw-bold">Fiche de Projet</h4>
                    <small class="opacity-75">Système de Management de la Qualité</small>
                  </div>
                </div>
                <button type="button" class="btn btn-light btn-sm rounded-pill" routerLink="/dashboard">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="card-body p-4 p-md-5">
              <!-- Alerts -->
              @if (errorMessage()) {
                <div class="alert alert-danger alert-dismissible fade show rounded-3" role="alert">
                  <div class="d-flex align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <span>{{ errorMessage() }}</span>
                  </div>
                </div>
              }

              @if (successMessage()) {
                <div class="alert alert-success alert-dismissible fade show rounded-3" role="alert">
                  <div class="d-flex align-items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>{{ successMessage() }}</span>
                  </div>
                </div>
              }

              <!-- Stepper -->
              <div class="stepper-wrapper mb-5">
                <div class="stepper-container">
                  <div class="stepper-item" [class.active]="currentStep() >= 1" [class.completed]="currentStep() > 1">
                    <div class="stepper-circle">
                      @if (currentStep() > 1) {
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      } @else {
                        <span>1</span>
                      }
                    </div>
                    <div class="stepper-label">Informations Générales</div>
                    <div class="stepper-sublabel">Identification & Organisation</div>
                  </div>
                  
                  <div class="stepper-line" [class.active]="currentStep() > 1"></div>
                  
                  <div class="stepper-item" [class.active]="currentStep() >= 2" [class.completed]="currentStep() > 2">
                    <div class="stepper-circle">
                      @if (currentStep() > 2) {
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      } @else {
                        <span>2</span>
                      }
                    </div>
                    <div class="stepper-label">Estimations & Planning</div>
                    <div class="stepper-sublabel">Charges, Budget & Délais</div>
                  </div>
                  
                  <div class="stepper-line" [class.active]="currentStep() > 2"></div>
                  
                  <div class="stepper-item" [class.active]="currentStep() >= 3">
                    <div class="stepper-circle">
                      <span>3</span>
                    </div>
                    <div class="stepper-label">Risques & Validation</div>
                    <div class="stepper-sublabel">Pré-requis & Planning</div>
                  </div>
                </div>
              </div>

              <form (ngSubmit)="onSubmit()">
                <!-- En-tête Projet/Client -->
                <div class="row g-3 mb-4">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      </svg>
                      Désignation Projet
                    </label>
                    <input type="text" class="form-control form-control-lg" [(ngModel)]="formData.designationProjet" name="designationProjet" placeholder="Nom du projet">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      Désignation Client
                    </label>
                    <input type="text" class="form-control form-control-lg" [(ngModel)]="formData.designationClient" name="designationClient" placeholder="Nom du client">
                  </div>
                </div>

                <!-- STEP 1: Informations Générales -->
                @if (currentStep() === 1) {
                  <div class="step-content animate-fade-in">
                    <!-- Section 1: Identification -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">1</span>
                          Identification
                        </h5>
                      </div>
                      <div class="section-body">
                        <div class="mb-3">
                          <label class="form-label fw-semibold">Nom du Projet <span class="text-danger">*</span></label>
                          <input type="text" class="form-control" [(ngModel)]="formData.nomProjet" name="nomProjet" required placeholder="Entrez le nom du projet">
                        </div>

                        <div class="mb-3">
                          <label class="form-label fw-semibold">Cadre contractuel Projet</label>
                          <input type="text" class="form-control" [(ngModel)]="formData.cadreContractuelProjet" name="cadreContractuelProjet" placeholder="Ex: convention en cours">
                        </div>

                        <div class="mb-3">
                          <label class="form-label fw-semibold d-block mb-2">Caractère Projet</label>
                          <div class="btn-group-custom">
                            <input class="btn-check" type="radio" [(ngModel)]="formData.caractereProjet" name="caractereProjet" value="national" id="national">
                            <label class="btn btn-outline-primary" for="national">National</label>
                            
                            <input class="btn-check" type="radio" [(ngModel)]="formData.caractereProjet" name="caractereProjet" value="commune_administration" id="commune">
                            <label class="btn btn-outline-primary" for="commune">Commune à l'Administration</label>
                            
                            <input class="btn-check" type="radio" [(ngModel)]="formData.caractereProjet" name="caractereProjet" value="cni" id="cni">
                            <label class="btn btn-outline-primary" for="cni">CNI</label>
                          </div>
                        </div>

                        <div class="mb-3">
                          <label class="form-label fw-semibold d-block mb-2">Type Projet</label>
                          <div class="btn-group-custom">
                            <input class="btn-check" type="radio" [(ngModel)]="formData.typeProjet" name="typeProjet" value="nouveau" id="nouveau">
                            <label class="btn btn-outline-success" for="nouveau">Nouveau</label>
                            
                            <input class="btn-check" type="radio" [(ngModel)]="formData.typeProjet" name="typeProjet" value="evolution" id="evolution">
                            <label class="btn btn-outline-success" for="evolution">Evolution</label>
                            
                            <input class="btn-check" type="radio" [(ngModel)]="formData.typeProjet" name="typeProjet" value="refonte" id="refonte">
                            <label class="btn btn-outline-success" for="refonte">Refonte</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Section 2: Présentation -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">2</span>
                          Présentation
                        </h5>
                      </div>
                      <div class="section-body">
                        <textarea class="form-control" rows="5" [(ngModel)]="formData.presentation" name="presentation" placeholder="Décrivez la présentation du projet..."></textarea>
                      </div>
                    </div>

                    <!-- Section 3: Historique -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">3</span>
                          Historique
                        </h5>
                        <small class="text-muted">(En cas de refonte ou amélioration)</small>
                      </div>
                      <div class="section-body">
                        <textarea class="form-control" rows="4" [(ngModel)]="formData.historique" name="historique" placeholder="Historique du projet..."></textarea>
                      </div>
                    </div>

                    <!-- Section 4: Périmètre -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">4</span>
                          Périmètre
                        </h5>
                      </div>
                      <div class="section-body">
                        <textarea class="form-control" rows="4" [(ngModel)]="formData.perimetre" name="perimetre" placeholder="Définissez le périmètre du projet..."></textarea>
                      </div>
                    </div>

                    <!-- Section 5: Organisation -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">5</span>
                          Organisation et conduite de projet
                        </h5>
                      </div>
                      <div class="section-body">
                        <div class="mb-3">
                          <label class="form-label fw-semibold">Maître d'ouvrage</label>
                          <input type="text" class="form-control" [(ngModel)]="formData.maitreOuvrage" name="maitreOuvrage" placeholder="Nom du maître d'ouvrage">
                        </div>
                        <div class="mb-3">
                          <label class="form-label fw-semibold">Maître d'œuvre</label>
                          <input type="text" class="form-control" [(ngModel)]="formData.maitreOeuvre" name="maitreOeuvre" placeholder="Nom du maître d'œuvre">
                        </div>
                        <div class="mb-3">
                          <label class="form-label fw-semibold">Equipe du projet</label>
                          <textarea class="form-control" rows="3" [(ngModel)]="formData.equipeProjet" name="equipeProjet" placeholder="Décrivez l'équipe du projet..."></textarea>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <!-- STEP 2: Estimations & Planning -->
                @if (currentStep() === 2) {
                  <div class="step-content animate-fade-in">
                    <!-- Section 6: Estimation des charges -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">6</span>
                          Estimation des charges
                        </h5>
                      </div>
                      <div class="section-body">
                        <div class="table-responsive">
                          <table class="table table-hover">
                            <thead class="table-light">
                              <tr>
                                <th>Prestations</th>
                                <th>Profil</th>
                                <th>Période</th>
                                <th>Charge/HM</th>
                                <th>Livrables</th>
                                <th style="width: 80px;">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (charge of formData.estimationsCharges; track $index) {
                                <tr>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="charge.prestations" [name]="'prestations_' + $index"></td>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="charge.profil" [name]="'profil_' + $index"></td>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="charge.periode" [name]="'periode_' + $index"></td>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="charge.chargeHM" [name]="'chargeHM_' + $index"></td>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="charge.livrables" [name]="'livrables_' + $index"></td>
                                  <td>
                                    <button type="button" class="btn btn-sm btn-danger" (click)="removeCharge($index)">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              }
                              @if (formData.estimationsCharges.length === 0) {
                                <tr>
                                  <td colspan="6" class="text-center text-muted py-4">
                                    Aucune charge ajoutée. Cliquez sur "Ajouter une ligne" pour commencer.
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                        <button type="button" class="btn btn-outline-primary btn-sm" (click)="addCharge()">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Ajouter une ligne
                        </button>

                        <div class="mt-4">
                          <label class="form-label fw-semibold">Modalité de développement</label>
                          <input type="text" class="form-control" [(ngModel)]="formData.modaliteDeveloppement" name="modaliteDeveloppement" placeholder="I: interne ; ST: Sous-traitance ; CO: Co-traitance">
                        </div>
                      </div>
                    </div>

                    <!-- Section 7: Estimation du budget -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">7</span>
                          Estimation du budget
                        </h5>
                      </div>
                      <div class="section-body">
                        <div class="table-responsive">
                          <table class="table table-bordered">
                            <thead class="table-light">
                              <tr>
                                <th>Profils</th>
                                <th>CP</th>
                                <th>ID</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td class="fw-semibold">Charge par Profil (en H/M)</td>
                                <td><input type="text" class="form-control form-control-sm" [(ngModel)]="formData.estimationBudget.cp" name="budget_cp"></td>
                                <td><input type="text" class="form-control form-control-sm" [(ngModel)]="formData.estimationBudget.id" name="budget_id"></td>
                                <td><input type="text" class="form-control form-control-sm" [(ngModel)]="formData.estimationBudget.total" name="budget_total"></td>
                              </tr>
                              <tr>
                                <td class="fw-semibold">Budget (en MD/HT)</td>
                                <td colspan="3"><input type="text" class="form-control form-control-sm" [(ngModel)]="formData.estimationBudget.budgetMDHT" name="budgetMDHT"></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <!-- Section 8: Délais prévisionnels -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">8</span>
                          Délais prévisionnels
                        </h5>
                      </div>
                      <div class="section-body">
                        <textarea class="form-control" rows="3" [(ngModel)]="formData.delaisPrevisionnels" name="delaisPrevisionnels" placeholder="Ex: Le délai prévisionnel du projet est de 6 mois (hors délais de validation)"></textarea>
                      </div>
                    </div>
                  </div>
                }

                <!-- STEP 3: Risques & Validation -->
                @if (currentStep() === 3) {
                  <div class="step-content animate-fade-in">
                    <!-- Section 9: Risques potentiels -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">9</span>
                          Risques potentiels
                        </h5>
                      </div>
                      <div class="section-body">
                        <textarea class="form-control" rows="4" [(ngModel)]="formData.risquesPotentiels" name="risquesPotentiels" placeholder="Ex: Convention en cours de discussion avec MTIC"></textarea>
                      </div>
                    </div>

                    <!-- Section 10: Pré-requis -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">10</span>
                          Pré-requis
                        </h5>
                      </div>
                      <div class="section-body">
                        <textarea class="form-control" rows="4" [(ngModel)]="formData.preRequis" name="preRequis" placeholder="Listez les pré-requis du projet..."></textarea>
                      </div>
                    </div>

                    <!-- Section 11: Planning -->
                    <div class="section-card mb-4">
                      <div class="section-header">
                        <h5 class="section-title">
                          <span class="section-number">11</span>
                          Planning du projet
                        </h5>
                      </div>
                      <div class="section-body">
                        <div class="table-responsive">
                          <table class="table table-bordered table-hover">
                            <thead class="table-light">
                              <tr>
                                <th style="min-width: 200px;">Actions</th>
                                <th style="min-width: 150px;">Profil des Intervenants</th>
                                <th style="min-width: 100px;">Charge H/M</th>
                                <th style="width: 50px;" class="text-center">1</th>
                                <th style="width: 50px;" class="text-center">2</th>
                                <th style="width: 50px;" class="text-center">3</th>
                                <th style="width: 50px;" class="text-center">4</th>
                                <th style="width: 50px;" class="text-center">5</th>
                                <th style="width: 50px;" class="text-center">6</th>
                                <th style="width: 50px;" class="text-center">7</th>
                                <th style="width: 50px;" class="text-center">8</th>
                                <th style="width: 50px;" class="text-center">9</th>
                                <th style="width: 50px;" class="text-center">10</th>
                                <th style="width: 50px;" class="text-center">11</th>
                                <th style="width: 50px;" class="text-center">12</th>
                                <th style="width: 80px;">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (planning of formData.planning; track $index) {
                                <tr>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="planning.action" [name]="'planning_action_' + $index"></td>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="planning.profilIntervenants" [name]="'planning_profil_' + $index" placeholder="CP, ID, CMIP, CMU"></td>
                                  <td><input type="text" class="form-control form-control-sm" [(ngModel)]="planning.chargeHM" [name]="'planning_charge_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['1']" [name]="'planning_mois1_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['2']" [name]="'planning_mois2_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['3']" [name]="'planning_mois3_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['4']" [name]="'planning_mois4_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['5']" [name]="'planning_mois5_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['6']" [name]="'planning_mois6_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['7']" [name]="'planning_mois7_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['8']" [name]="'planning_mois8_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['9']" [name]="'planning_mois9_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['10']" [name]="'planning_mois10_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['11']" [name]="'planning_mois11_' + $index"></td>
                                  <td class="text-center"><input type="checkbox" class="form-check-input" [(ngModel)]="planning.mois['12']" [name]="'planning_mois12_' + $index"></td>
                                  <td>
                                    <button type="button" class="btn btn-sm btn-danger" (click)="removePlanning($index)">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              }
                              @if (formData.planning.length === 0) {
                                <tr>
                                  <td colspan="16" class="text-center text-muted py-4">
                                    Aucune action planifiée. Cliquez sur "Ajouter une action" pour commencer.
                                  </td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                        <button type="button" class="btn btn-outline-primary btn-sm" (click)="addPlanning()">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Ajouter une action
                        </button>
                        <p class="text-muted small mt-3 mb-0">
                          <strong>(*)</strong> CP : Chef de Projet / ID : Ingénieur Développeur / CMIP : Comité de Pilotage / CMU : Comité utilisateurs
                        </p>
                      </div>
                    </div>
                  </div>
                }

                <!-- Navigation Buttons -->
                <div class="d-flex justify-content-between align-items-center mt-5 pt-4 border-top">
                  @if (currentStep() === 1) {
                    <button type="button" class="btn btn-secondary px-4" routerLink="/dashboard">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Annuler
                    </button>
                    <button type="button" class="btn btn-primary px-5" (click)="nextStep()">
                      Suivant
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ms-2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  }
                  
                  @if (currentStep() === 2) {
                    <button type="button" class="btn btn-secondary px-4" (click)="previousStep()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12 19 5 12 12 5"/>
                      </svg>
                      Précédent
                    </button>
                    <button type="button" class="btn btn-primary px-5" (click)="nextStep()">
                      Suivant
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ms-2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                        <polyline points="12 5 19 12 12 19"/>
                      </svg>
                    </button>
                  }
                  
                  @if (currentStep() === 3) {
                    <button type="button" class="btn btn-secondary px-4" (click)="previousStep()">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                        <line x1="19" y1="12" x2="5" y2="12"/>
                        <polyline points="12 19 5 12 12 5"/>
                      </svg>
                      Précédent
                    </button>
                    <button type="submit" class="btn btn-success px-5" [disabled]="isLoading()">
                      @if (isLoading()) {
                        <span class="spinner-border spinner-border-sm me-2"></span>
                        Enregistrement...
                      } @else {
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-2">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Enregistrer
                      }
                    </button>
                  }
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* General Styles */
    .bg-gradient-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }

    .icon-circle {
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .rounded-top-4 {
      border-top-left-radius: 1rem !important;
      border-top-right-radius: 1rem !important;
    }

    .rounded-4 {
      border-radius: 1rem !important;
    }

    /* Stepper Styles */
    .stepper-wrapper {
      padding: 2rem 0;
    }

    .stepper-container {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      position: relative;
    }

    .stepper-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex: 0 0 auto;
    }

    .stepper-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #e9ecef;
      color: #6c757d;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 1.5rem;
      transition: all 0.3s ease;
      border: 3px solid #e9ecef;
      z-index: 2;
      position: relative;
    }

    .stepper-item.active .stepper-circle {
      background: #0d6efd;
      color: white;
      border-color: #0d6efd;
      box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1);
    }

    .stepper-item.completed .stepper-circle {
      background: #198754;
      color: white;
      border-color: #198754;
    }

    .stepper-label {
      margin-top: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      color: #6c757d;
      text-align: center;
      max-width: 150px;
    }

    .stepper-sublabel {
      font-size: 0.75rem;
      color: #adb5bd;
      text-align: center;
      margin-top: 0.25rem;
    }

    .stepper-item.active .stepper-label {
      color: #0d6efd;
    }

    .stepper-item.completed .stepper-label {
      color: #198754;
    }

    .stepper-line {
      width: 120px;
      height: 3px;
      background: #e9ecef;
      margin: 0 1rem;
      margin-top: 30px;
      transition: all 0.3s ease;
      position: relative;
      z-index: 1;
    }

    .stepper-line.active {
      background: #198754;
    }

    /* Section Card Styles */
    .section-card {
      border: 1px solid #e9ecef;
      border-radius: 0.75rem;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .section-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }

    .section-header {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 1rem 1.5rem;
      border-bottom: 2px solid #dee2e6;
    }

    .section-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
      color: #495057;
      display: flex;
      align-items: center;
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

    .section-body {
      padding: 1.5rem;
    }

    /* Form Controls */
    .form-control, .form-select {
      border-radius: 0.5rem;
      border: 1px solid #dee2e6;
      padding: 0.625rem 0.875rem;
      transition: all 0.2s ease;
    }

    .form-control:focus, .form-select:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 0.2rem rgba(16, 185, 129, 0.15);
    }

    .form-control-lg {
      padding: 0.75rem 1rem;
      font-size: 1.05rem;
    }

    .form-label {
      font-weight: 500;
      color: #495057;
      margin-bottom: 0.5rem;
    }

    /* Button Group Custom */
    .btn-group-custom {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .btn-check:checked + .btn-outline-primary {
      background-color: #0d6efd;
      border-color: #0d6efd;
      color: white;
    }

    .btn-check:checked + .btn-outline-success {
      background-color: #198754;
      border-color: #198754;
      color: white;
    }

    /* Table Styles */
    .table {
      margin-bottom: 0;
    }

    .table thead th {
      background-color: #f8f9fa;
      font-weight: 600;
      font-size: 0.875rem;
      color: #495057;
      border-bottom: 2px solid #dee2e6;
      padding: 0.75rem;
      vertical-align: middle;
    }

    .table tbody td {
      vertical-align: middle;
      padding: 0.75rem;
    }

    .table-hover tbody tr:hover {
      background-color: #f8f9fa;
    }

    .table td.text-center input[type="checkbox"] {
      cursor: pointer;
      width: 20px;
      height: 20px;
    }

    /* Animations */
    .animate-fade-in {
      animation: fadeIn 0.4s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Buttons */
    .btn {
      border-radius: 0.5rem;
      font-weight: 500;
      padding: 0.625rem 1.25rem;
      transition: all 0.2s ease;
    }

    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .btn-primary {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border: none;
    }

    .btn-primary:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .btn-success {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      border: none;
    }

    .btn-success:hover {
      background: linear-gradient(135deg, #218838 0%, #1aa179 100%);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stepper-container {
        flex-direction: column;
        align-items: center;
      }

      .stepper-line {
        width: 3px;
        height: 40px;
        margin: 0.5rem 0;
      }

      .stepper-circle {
        width: 50px;
        height: 50px;
        font-size: 1.25rem;
      }

      .stepper-label {
        font-size: 0.85rem;
        max-width: 120px;
      }

      .stepper-sublabel {
        font-size: 0.7rem;
      }

      .section-body {
        padding: 1rem;
      }

      .btn-group-custom {
        flex-direction: column;
      }

      .btn-group-custom .btn {
        width: 100%;
      }
    }

    @media (max-width: 576px) {
      .card-body {
        padding: 1.5rem !important;
      }

      .stepper-wrapper {
        padding: 1rem 0;
      }
    }
  `]
})
export class FicheProjetFormComponent {
  http = inject(HttpClient);
  router = inject(Router);

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  currentStep = signal(1);

  formData = {
    nomProjet: '',
    designationProjet: '',
    designationClient: '',
    cadreContractuelProjet: '',
    caractereProjet: '',
    typeProjet: '',
    presentation: '',
    historique: '',
    perimetre: '',
    maitreOuvrage: '',
    maitreOeuvre: '',
    equipeProjet: '',
    estimationsCharges: [] as EstimationCharge[],
    modaliteDeveloppement: '',
    estimationBudget: {
      profils: '',
      chargeParProfilHM: '',
      budgetMDHT: '',
      cp: '',
      id: '',
      total: ''
    } as EstimationBudget,
    delaisPrevisionnels: '',
    risquesPotentiels: '',
    preRequis: '',
    planning: [] as PlanningAction[],
    description: '',
    objectifs: '',
    responsable: '',
    dateDebut: null,
    dateFinPrevue: null,
    statut: 'EN_COURS',
    categorie: '',
    reference: '',
    dateDocument: null
  };

  nextStep() {
    if (this.currentStep() < 3) {
      this.currentStep.set(this.currentStep() + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  addCharge() {
    this.formData.estimationsCharges.push({
      prestations: '',
      profil: '',
      periode: '',
      chargeHM: '',
      livrables: ''
    });
  }

  removeCharge(index: number) {
    this.formData.estimationsCharges.splice(index, 1);
  }

  addPlanning() {
    this.formData.planning.push({
      action: '',
      profilIntervenants: '',
      chargeHM: '',
      mois: {
        '1': false, '2': false, '3': false, '4': false,
        '5': false, '6': false, '7': false, '8': false,
        '9': false, '10': false, '11': false, '12': false
      }
    });
  }

  removePlanning(index: number) {
    this.formData.planning.splice(index, 1);
  }

  onSubmit() {
    if (!this.formData.nomProjet) {
      this.errorMessage.set('Le nom du projet est obligatoire');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const token = localStorage.getItem('token');
    
    if (!token) {
      this.errorMessage.set('Vous devez être connecté pour créer une fiche de projet');
      this.isLoading.set(false);
      this.router.navigate(['/login']);
      return;
    }
    
    this.http.post('http://localhost:8081/api/chef-projet/fiches-projet', this.formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('Fiche de projet créée avec succès !');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading.set(false);
        
        let errorMsg = 'Erreur lors de la création de la fiche de projet';
        
        if (error.status === 401 || error.status === 403) {
          errorMsg = 'Vous n\'êtes pas autorisé. Veuillez vous reconnecter.';
          setTimeout(() => this.router.navigate(['/login']), 2000);
        } else if (error.status === 400) {
          errorMsg = 'Données invalides. Vérifiez le formulaire.';
        } else if (error.status === 0) {
          errorMsg = 'Impossible de se connecter au serveur. Vérifiez que le backend est démarré.';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        this.errorMessage.set(errorMsg);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }
}
