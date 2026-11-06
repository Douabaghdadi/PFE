import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService, UserResponse } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { NomenclatureService, Nomenclature } from '../../services/nomenclature.service';
import { environment } from '../../../environments/environment';

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
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/form-ui.css', './fiche-projet-form.component.css']
})
export class FicheProjetFormComponent implements OnInit {
  http = inject(HttpClient);
  router = inject(Router);
  route = inject(ActivatedRoute);
  userService = inject(UserService);
  authService = inject(AuthService);
  nomenclatureService = inject(NomenclatureService);

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  currentStep = signal(1);
  currentTab = signal('identification');

  errors: { [key: string]: string } = {};

  /** Nombre de champs signalés en erreur par la dernière validation (affiché dans le message en haut de page). */
  get nbErreurs(): number {
    return Object.keys(this.errors).length;
  }

  readonly moisPlanning = Array.from({ length: 12 }, (_, i) => String(i + 1));

  isEditMode = signal(false);
  projetId: string | null = null;
  
  // Informations du chef de projet connecté
  chefProjetName = signal('');
  chefProjetId = signal('');

  // Choix proposés : valeurs actives de la page Nomenclature (gérée par l'administrateur)
  statuts: Nomenclature[] = [];
  categories: Nomenclature[] = [];
  caracteres: Nomenclature[] = [];
  types: Nomenclature[] = [];
  modalites: Nomenclature[] = [];
  nomenclaturesChargees = signal(false);

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
    
    this.http.get<any>(`${environment.apiUrl}/api/chef-projet/fiches-projet/${id}`, {
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

  /**
   * Après une validation en échec, les erreurs se mettent à jour à mesure que l'on corrige les champs :
   * un champ rempli cesse d'être signalé et le compteur du message en haut de page baisse.
   */
  revalider() {
    if (this.nbErreurs > 0) this.validateTab();
  }

  setTab(tab: string) {
    this.errors = {};
    this.currentTab.set(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  validateTab(): boolean {
    this.errors = {};
    const tab = this.currentTab();

    if (tab === 'identification') {
      if (!this.formData.designationProjet?.trim())
        this.errors['designationProjet'] = 'La désignation projet est obligatoire.';
      if (!this.formData.designationClient?.trim())
        this.errors['designationClient'] = 'La désignation client est obligatoire.';
      if (!this.formData.nomProjet?.trim())
        this.errors['nomProjet'] = 'Le nom du projet est obligatoire.';
      if (!this.formData.cadreContractuelProjet?.trim())
        this.errors['cadreContractuelProjet'] = 'Le cadre contractuel est obligatoire.';
      if (!this.formData.caractereProjet)
        this.errors['caractereProjet'] = 'Le caractère du projet est obligatoire.';
      if (!this.formData.typeProjet)
        this.errors['typeProjet'] = 'Le type de projet est obligatoire.';
      if (!this.formData.statut)
        this.errors['statut'] = 'Le statut du projet est obligatoire.';
      if (!this.formData.presentation?.trim())
        this.errors['presentation'] = 'La présentation est obligatoire.';
      if (!this.formData.perimetre?.trim())
        this.errors['perimetre'] = 'Le périmètre est obligatoire.';
      if (!this.formData.maitreOuvrage?.trim())
        this.errors['maitreOuvrage'] = "Le maître d'ouvrage est obligatoire.";
      if (!this.formData.maitreOeuvre?.trim())
        this.errors['maitreOeuvre'] = "Le maître d'œuvre est obligatoire.";
    }

    if (tab === 'estimations') {
      if (!this.formData.modaliteDeveloppement)
        this.errors['modaliteDeveloppement'] = 'La modalité de développement est obligatoire.';
      if (!this.formData.estimationBudget.cp)
        this.errors['budget_cp'] = 'Le budget CP est obligatoire.';
      if (!this.formData.estimationBudget.id)
        this.errors['budget_id'] = 'Le budget ID est obligatoire.';
      if (!this.formData.dateDebutPrevision)
        this.errors['dateDebutPrevision'] = 'La date de début (prévision) est obligatoire.';
      if (!this.formData.dateFinPrevision)
        this.errors['dateFinPrevision'] = 'La date de fin (prévision) est obligatoire.';
      if (this.formData.dateDebutPrevision && this.formData.dateFinPrevision &&
          this.formData.dateFinPrevision < this.formData.dateDebutPrevision)
        this.errors['dateFinPrevision'] = 'La date de fin doit être après la date de début.';
      if (!this.formData.dureeEnMois)
        this.errors['dureeEnMois'] = 'La durée en mois est obligatoire.';
      else if (this.formData.dureeEnMois < 0)
        this.errors['dureeEnMois'] = 'La durée ne peut pas être négative.';
      if (!this.formData.delaisPrevisionnels?.trim())
        this.errors['delaisPrevisionnels'] = 'Les délais prévisionnels sont obligatoires.';
      if (this.formData.dateDebutRealisation && this.formData.dateFinRealisation &&
          this.formData.dateFinRealisation < this.formData.dateDebutRealisation)
        this.errors['dateFinRealisation'] = 'La date de fin réalisation doit être après la date de début.';
    }

    if (tab === 'risques') {
      if (!this.formData.risquesPotentiels?.trim())
        this.errors['risquesPotentiels'] = 'Les risques potentiels sont obligatoires.';
      if (!this.formData.preRequis?.trim())
        this.errors['preRequis'] = 'Les pré-requis sont obligatoires.';
      if (this.formData.planning.length === 0)
        this.errors['planning'] = 'Le planning est obligatoire. Veuillez ajouter au moins une action.';
      else {
        const hasInvalid = this.formData.planning.some(p => !p.action?.trim());
        if (hasInvalid)
          this.errors['planning'] = 'Chaque ligne du planning doit avoir une action renseignée.';
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  nextTab() {
    if (!this.validateTab()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
      this.errors = {};
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
   * Charge les listes de choix (statut, catégorie, caractère, type, modalité) depuis la nomenclature
   */
  loadNomenclatures() {
    this.nomenclatureService.charger().subscribe(() => {
      this.statuts = this.nomenclatureService.actives('STATUT');
      this.categories = this.nomenclatureService.actives('CATEGORIE_PROJET');
      this.caracteres = this.nomenclatureService.actives('CARACTERE_PROJET');
      this.types = this.nomenclatureService.actives('TYPE_PROJET');
      this.modalites = this.nomenclatureService.actives('MODALITE_DEVELOPPEMENT');
      this.nomenclaturesChargees.set(true);

      // Définir un statut par défaut si aucun n'est sélectionné
      if (!this.formData.statut && this.statuts.length > 0) {
        this.formData.statut = this.statuts[0].code;
      }
    });
  }

  onSubmit() {
    if (!this.validateTab()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
      ? this.http.put(`${environment.apiUrl}/api/chef-projet/fiches-projet/${this.projetId}`, dataToSend)
      : this.http.post(`${environment.apiUrl}/api/chef-projet/fiches-projet`, dataToSend);
    
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
