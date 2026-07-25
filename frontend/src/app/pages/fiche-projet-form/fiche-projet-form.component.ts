import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService, UserResponse } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

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
export class FicheProjetFormComponent implements OnInit {
  http = inject(HttpClient);
  router = inject(Router);
  route = inject(ActivatedRoute);
  userService = inject(UserService);
  authService = inject(AuthService);

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  currentStep = signal(1);
  currentTab = signal('identification');
  
  isEditMode = signal(false);
  projetId: string | null = null;
  
  // Informations du chef de projet connecté
  chefProjetName = signal('');
  chefProjetId = signal('');

  // Nomenclatures
  statuts: any[] = [];
  categories: any[] = [];

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
    dateDebutPrevision: null as string | null,
    dateFinPrevision: null as string | null,
    dureeEnMois: null as number | null,
    dateDebutRealisation: null as string | null,
    dateFinRealisation: null as string | null,
    ecartConventionnel: null as number | null,
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

  ngOnInit() {
    this.projetId = this.route.snapshot.paramMap.get('id');
    if (this.projetId) {
      this.isEditMode.set(true);
      this.loadProjet(this.projetId);
    }
    
    // Charger les informations du chef de projet connecté
    this.loadChefProjetInfo();
    
    // Charger les nomenclatures
    this.loadNomenclatures();
  }

  loadProjet(id: string) {
    this.isLoading.set(true);
    const token = localStorage.getItem('token');
    
    this.http.get<any>(`http://localhost:8081/api/chef-projet/fiches-projet/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        // Charger les données dans le formulaire
        this.formData = {
          ...this.formData,
          ...data,
          // Convertir equipeProjet de string à tableau si nécessaire
          equipeProjet: typeof data.equipeProjet === 'string' 
            ? JSON.parse(data.equipeProjet) 
            : (data.equipeProjet || []),
          estimationsCharges: data.estimationsCharges || [],
          planning: data.planning || [],
          estimationBudget: data.estimationBudget || this.formData.estimationBudget
        };
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading projet:', error);
        this.errorMessage.set('Erreur lors du chargement du projet');
        this.isLoading.set(false);
      }
    });
  }

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

  /**
   * Charge les informations du chef de projet connecté
   */
  loadChefProjetInfo() {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      this.chefProjetId.set(currentUser.id);
      this.chefProjetName.set(currentUser.username);
    } else {
      // Si l'utilisateur n'est pas dans le signal, essayer de le charger depuis le localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id && user.username) {
            this.chefProjetId.set(user.id);
            this.chefProjetName.set(user.username);
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }
    }
  }

  /**
   * Charge les nomenclatures (statuts et catégories) depuis l'API
   */
  loadNomenclatures() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Charger les statuts depuis l'endpoint public
    this.http.get<any[]>('http://localhost:8081/api/nomenclatures', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.statuts = data.filter(n => n.type === 'STATUT' && n.actif);
        this.categories = data.filter(n => n.type === 'CATEGORIE_PROJET' && n.actif);
        
        console.log('Statuts chargés:', this.statuts);
        
        // Définir un statut par défaut si aucun n'est sélectionné
        if (!this.formData.statut && this.statuts.length > 0) {
          this.formData.statut = this.statuts[0].code;
        }
      },
      error: (error) => {
        console.error('Error loading nomenclatures:', error);
        // En cas d'erreur, utiliser des valeurs par défaut
        this.statuts = [
          { code: 'EN_COURS', libelle: 'En cours' },
          { code: 'TERMINE', libelle: 'Terminé' },
          { code: 'EN_ATTENTE', libelle: 'En attente' }
        ];
      }
    });
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
    
    // S'assurer que le chef de projet est l'utilisateur connecté
    if (!this.chefProjetId()) {
      this.errorMessage.set('Erreur: Impossible de déterminer le chef de projet');
      this.isLoading.set(false);
      return;
    }
    
    // Convertir equipeProjet en string (le backend attend un string, pas un tableau)
    const dataToSend = {
      ...this.formData,
      equipeProjet: JSON.stringify(this.formData.equipeProjet),
      // Ajouter explicitement l'ID du chef de projet connecté
      chefProjetId: this.chefProjetId()
    };
    
    // Log pour déboguer
    console.log('Submitting fiche projet:', JSON.stringify(dataToSend, null, 2));
    
    // Choisir entre POST (création) et PUT (mise à jour)
    const request = this.isEditMode() && this.projetId
      ? this.http.put(`http://localhost:8081/api/chef-projet/fiches-projet/${this.projetId}`, dataToSend)
      : this.http.post('http://localhost:8081/api/chef-projet/fiches-projet', dataToSend);
    
    request.subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(this.isEditMode() 
          ? 'Fiche de projet modifiée avec succès !' 
          : 'Fiche de projet créée avec succès !');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          this.router.navigate(['/projets']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading.set(false);
        
        // Logs détaillés pour déboguer
        console.error('Error saving fiche projet:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          error: error.error
        });
        
        let errorMsg = this.isEditMode() 
          ? 'Erreur lors de la modification de la fiche de projet'
          : 'Erreur lors de la création de la fiche de projet';
        
        if (error.status === 401) {
          errorMsg = 'Session expirée. Veuillez vous reconnecter.';
          // Ne rediriger que si c'est vraiment une erreur d'authentification
          const errorMessage = error.error?.message || error.message || '';
          if (errorMessage.includes('Full authentication') || 
              errorMessage.includes('Unauthorized') ||
              errorMessage.includes('JWT') ||
              errorMessage.includes('Token')) {
            setTimeout(() => this.router.navigate(['/login']), 2000);
          }
        } else if (error.status === 403) {
          errorMsg = 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.';
          // Afficher plus de détails
          if (error.error?.message) {
            errorMsg += ' Détails: ' + error.error.message;
          }
        } else if (error.status === 400) {
          errorMsg = 'Données invalides. Vérifiez le formulaire.';
          if (error.error?.message) {
            errorMsg += ' Détails: ' + error.error.message;
          }
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
