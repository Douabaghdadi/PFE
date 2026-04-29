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

interface MembreEquipe {
  nom: string;
  role: string;
  email?: string;
}

@Component({
  selector: 'app-fiche-projet-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fiche-projet-form.component.html',
  styles: [`
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #10b981 !important;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
    }

    button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.15) !important;
    }

    a:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.15) !important;
    }

    table tbody tr:hover {
      background-color: #f9fafb;
    }

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
  currentTab = signal('identification');

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
    equipeProjet: [] as MembreEquipe[],
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

  setTab(tab: string) {
    this.currentTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextTab() {
    const tabs = ['identification', 'estimations', 'risques'];
    const currentIndex = tabs.indexOf(this.currentTab());
    if (currentIndex < tabs.length - 1) {
      this.currentTab.set(tabs[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousTab() {
    const tabs = ['identification', 'estimations', 'risques'];
    const currentIndex = tabs.indexOf(this.currentTab());
    if (currentIndex > 0) {
      this.currentTab.set(tabs[currentIndex - 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  isFirstTab(): boolean {
    return this.currentTab() === 'identification';
  }

  isLastTab(): boolean {
    return this.currentTab() === 'risques';
  }

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

  addMembreEquipe() {
    this.formData.equipeProjet.push({
      nom: '',
      role: '',
      email: ''
    });
  }

  removeMembreEquipe(index: number) {
    this.formData.equipeProjet.splice(index, 1);
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

  /**
   * Calcule automatiquement le Total et le Budget
   * Total = CP + ID
   * Budget (MD/HT) = Total / 1 000 000
   */
  calculateBudget() {
    const cp = parseFloat(this.formData.estimationBudget.cp) || 0;
    const id = parseFloat(this.formData.estimationBudget.id) || 0;
    
    // Calcul du total
    const total = cp + id;
    this.formData.estimationBudget.total = total.toString();
    
    // Calcul du budget en MD/HT (diviser par 1 000 000)
    const budgetMDHT = total / 1000000;
    this.formData.estimationBudget.budgetMDHT = budgetMDHT.toFixed(2);
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
