import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FicheSuiviService, FicheSuivi, TacheSuivi, TacheGantt } from '../../services/fiche-suivi.service';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface FicheProjet {
  id: string;
  nomProjet: string;
  designationProjet: string;
  maitreOuvrage?: string;
  maitreOeuvre?: string;
  presentation?: string;
  dateDebutPrevision?: string;
  dateFinPrevision?: string;
  dureeEnMois?: number;
  dateDebutRealisation?: string;
  dateFinRealisation?: string;
  ecartConventionnel?: number;
}

@Component({
  selector: 'app-fiche-suivi-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './fiche-suivi-form.component.html'
})
export class FicheSuiviFormComponent implements OnInit {
  ficheSuiviService = inject(FicheSuiviService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  http = inject(HttpClient);
  authService = inject(AuthService);

  isEditMode = signal(false);
  ficheSuiviId = signal<string | null>(null);
  currentTab = signal('signaletique');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  validationErrors = signal<Record<string, string>>({});
  
  projets = signal<FicheProjet[]>([]);
  isLoadingProjets = signal(false);

  ficheSuivi: FicheSuivi = {
    ficheProjetId: '',
    numeroRapport: '',
    dateRapport: new Date().toISOString().split('T')[0],
    ficheSignaletique: {
      chefProjet: {},
      delais: {},
      financier: {},
      caracteristiquesTechniques: [],
      experts: []
    },
    constatGlobal: {
      problemesRencontres: [],
      principauxRisques: [],
      recommandations: []
    },
    tachesSuivi: [],
    planningActuel: {
      taches: []
    }
  };

  ngOnInit() {
    this.loadProjets();
    
    const id = this.route.snapshot.paramMap.get('id');
    const projetId = this.route.snapshot.queryParamMap.get('projetId');
    
    if (projetId) {
      this.ficheSuivi.ficheProjetId = projetId;
    }

    if (id) {
      this.isEditMode.set(true);
      this.ficheSuiviId.set(id);
      this.loadFicheSuivi(id);
    } else {
      this.generateNumeroRapport();
      this.ficheSuivi.ficheSignaletique.chefProjet.nom = this.getCurrentUserName();
      if (projetId) {
        this.prefillFromLastFiche(projetId);
      }
    }
  }

  /**
   * Nom du chef de projet actuellement connecté (celui qui crée la fiche).
   */
  getCurrentUserName(): string {
    const currentUser = this.authService.currentUser();
    if (currentUser?.username) {
      return currentUser.username;
    }
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.username) {
          return user.username;
        }
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
    return '';
  }

  prefillFromLastFiche(projetId: string) {
    this.ficheSuiviService.getFichesSuiviByProjet(projetId).subscribe({
      next: (fiches) => {
        if (!fiches || fiches.length === 0) return;
        // Prendre la fiche la plus récente
        const last = fiches.sort((a, b) =>
          new Date(b.dateCreation || 0).getTime() - new Date(a.dateCreation || 0).getTime()
        )[0];

        // Pré-remplir depuis la dernière fiche (sans écraser id, numeroRapport, dateRapport)
        this.ficheSuivi.ficheSignaletique = {
          ...last.ficheSignaletique,
          chefProjet: { ...last.ficheSignaletique.chefProjet, nom: this.getCurrentUserName() },
          experts: last.ficheSignaletique.experts ? [...last.ficheSignaletique.experts] : []
        };
        this.ficheSuivi.constatGlobal = {
          ...last.constatGlobal,
          problemesRencontres: [...(last.constatGlobal.problemesRencontres || [])],
          principauxRisques: [...(last.constatGlobal.principauxRisques || [])],
          recommandations: [...(last.constatGlobal.recommandations || [])]
        };
        this.ficheSuivi.tachesSuivi = last.tachesSuivi.map(t => ({ ...t }));
        this.ficheSuivi.planningActuel = {
          taches: last.planningActuel.taches.map(t => ({ ...t, sousTaches: [...(t.sousTaches || [])] }))
        };
        // Réinitialiser les champs propres à la nouvelle fiche
        this.ficheSuivi.dateRapport = new Date().toISOString().split('T')[0];
        this.generateNumeroRapport();
      },
      error: () => {} // silencieux, le formulaire reste vide
    });
  }

  /**
   * Génère automatiquement un numéro de rapport au format: Rapport_YYYYMMDD_HHMMSS
   * Exemple: Rapport_20240429_153045
   */
  generateNumeroRapport() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    this.ficheSuivi.numeroRapport = `Rapport_${year}${month}${day}_${hours}${minutes}${seconds}`;
  }

  loadProjets() {
    this.isLoadingProjets.set(true);
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.isLoadingProjets.set(false);
      return;
    }

    this.http.get<FicheProjet[]>('http://localhost:8081/api/chef-projet/fiches-projet', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        this.projets.set(data);
        this.isLoadingProjets.set(false);
        // Remplir auto si projetId déjà sélectionné
        if (this.ficheSuivi.ficheProjetId) {
          this.onProjetChange();
        }
      },
      error: (error) => {
        console.error('Error loading projets:', error);
        this.projets.set([]);
        this.isLoadingProjets.set(false);
      }
    });
  }

  onProjetChange() {
    const selected = this.projets().find(p => p.id === this.ficheSuivi.ficheProjetId);
    if (selected) {
      if (selected.presentation) {
        this.ficheSuivi.ficheSignaletique.descriptionProjet = selected.presentation;
      }
      if (selected.dateDebutPrevision) this.ficheSuivi.ficheSignaletique.delais.dateDebutPrevision = selected.dateDebutPrevision;
      if (selected.dateFinPrevision) this.ficheSuivi.ficheSignaletique.delais.dateFinPrevision = selected.dateFinPrevision;
      if (selected.dureeEnMois) this.ficheSuivi.ficheSignaletique.delais.dureeEnMois = selected.dureeEnMois;
      if (selected.dateDebutRealisation) this.ficheSuivi.ficheSignaletique.delais.dateDebutRealisation = selected.dateDebutRealisation;
      if (selected.dateFinRealisation) this.ficheSuivi.ficheSignaletique.delais.dateFinRealisation = selected.dateFinRealisation;
      if (selected.ecartConventionnel) this.ficheSuivi.ficheSignaletique.delais.ecartConventionnel = selected.ecartConventionnel;
    }
  }

  loadFicheSuivi(id: string) {
    this.isLoading.set(true);
    this.ficheSuiviService.getFicheSuiviById(id).subscribe({
      next: (data) => {
        this.ficheSuivi = data;
        
        // S'assurer que experts est un tableau
        if (!this.ficheSuivi.ficheSignaletique.experts) {
          this.ficheSuivi.ficheSignaletique.experts = [];
        } else if (typeof this.ficheSuivi.ficheSignaletique.experts === 'string') {
          // Si c'est une chaîne, la convertir en tableau
          const expertsStr = this.ficheSuivi.ficheSignaletique.experts as any;
          this.ficheSuivi.ficheSignaletique.experts = 
            expertsStr.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        }
        
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Erreur lors du chargement de la fiche de suivi');
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: string) {
    this.currentTab.set(tab);
  }

  nextTab() {
    if (!this.validateCurrentTab()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const tabs = ['signaletique', 'constat', 'taches', 'planning'];
    const currentIndex = tabs.indexOf(this.currentTab());
    if (currentIndex < tabs.length - 1) {
      this.currentTab.set(tabs[currentIndex + 1]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  validateCurrentTab(): boolean {
    const errors: Record<string, string> = {};
    const tab = this.currentTab();

    if (tab === 'signaletique') {
      if (!this.ficheSuivi.ficheProjetId) errors['ficheProjetId'] = 'Veuillez sélectionner un projet.';
      if (!this.ficheSuivi.dateRapport) errors['dateRapport'] = 'La date du rapport est obligatoire.';
    }

    if (tab === 'constat') {
      if (!this.ficheSuivi.constatGlobal.etatAvancement?.trim())
        errors['etatAvancement'] = "L'état d'avancement est obligatoire.";
    }

    if (tab === 'taches') {
      this.ficheSuivi.tachesSuivi.forEach((t, i) => {
        if (!t.sujet?.trim()) errors[`tacheSujet_${i}`] = 'Le sujet est obligatoire.';
        if ((t.pourcentageRealise ?? 0) < 0 || (t.pourcentageRealise ?? 0) > 100)
          errors[`tachePourcent_${i}`] = 'Le pourcentage doit être entre 0 et 100.';
        if (t.debut && t.echeance && t.echeance < t.debut)
          errors[`tacheEcheance_${i}`] = "L'échéance doit être après la date de début.";
      });
    }

    if (tab === 'planning') {
      this.ficheSuivi.planningActuel.taches.forEach((t, i) => {
        if (!t.nom?.trim()) errors[`ganttNom_${i}`] = 'Le nom de la tâche est obligatoire.';
        if (t.dateDebut && t.dateFin && t.dateFin < t.dateDebut)
          errors[`ganttFin_${i}`] = 'La date de fin doit être après la date de début.';
        if ((t.tauxAvancement ?? 0) < 0 || (t.tauxAvancement ?? 0) > 100)
          errors[`ganttTaux_${i}`] = 'Le taux doit être entre 0 et 100.';
      });
    }

    this.validationErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  hasError(field: string): boolean {
    return !!this.validationErrors()[field];
  }

  getError(field: string): string {
    return this.validationErrors()[field] || '';
  }

  previousTab() {
    const tabs = ['signaletique', 'constat', 'taches', 'planning'];
    const currentIndex = tabs.indexOf(this.currentTab());
    if (currentIndex > 0) {
      this.currentTab.set(tabs[currentIndex - 1]);
    }
  }

  isFirstTab(): boolean {
    return this.currentTab() === 'signaletique';
  }

  isLastTab(): boolean {
    return this.currentTab() === 'planning';
  }

  addCaracteristique() {
    this.ficheSuivi.ficheSignaletique.caracteristiquesTechniques.push('');
  }

  removeCaracteristique(index: number) {
    this.ficheSuivi.ficheSignaletique.caracteristiquesTechniques.splice(index, 1);
  }

  // Gestion des experts
  addExpert() {
    if (!this.ficheSuivi.ficheSignaletique.experts) {
      this.ficheSuivi.ficheSignaletique.experts = [];
    }
    this.ficheSuivi.ficheSignaletique.experts.push('');
  }

  removeExpert(index: number) {
    if (this.ficheSuivi.ficheSignaletique.experts) {
      this.ficheSuivi.ficheSignaletique.experts.splice(index, 1);
    }
  }

  addProbleme() {
    this.ficheSuivi.constatGlobal.problemesRencontres.push('');
  }

  removeProbleme(index: number) {
    this.ficheSuivi.constatGlobal.problemesRencontres.splice(index, 1);
  }

  addRisque() {
    this.ficheSuivi.constatGlobal.principauxRisques.push('');
  }

  removeRisque(index: number) {
    this.ficheSuivi.constatGlobal.principauxRisques.splice(index, 1);
  }

  addRecommandation() {
    this.ficheSuivi.constatGlobal.recommandations.push('');
  }

  removeRecommandation(index: number) {
    this.ficheSuivi.constatGlobal.recommandations.splice(index, 1);
  }

  addTache() {
    const newTache: TacheSuivi = {
      code: '',
      sujet: '',
      livrable: '',
      assigneA: '',
      statut: 'En cours',
      pourcentageRealise: 0
    };
    this.ficheSuivi.tachesSuivi.push(newTache);
  }

  removeTache(index: number) {
    this.ficheSuivi.tachesSuivi.splice(index, 1);
  }

  addTacheGantt() {
    const newTache: TacheGantt = {
      nom: '',
      tauxAvancement: 0,
      statut: 'En cours',
      sousTaches: []
    };
    this.ficheSuivi.planningActuel.taches.push(newTache);
  }

  removeTacheGantt(index: number) {
    this.ficheSuivi.planningActuel.taches.splice(index, 1);
  }

  onSubmit() {
    this.errorMessage.set('');
    this.successMessage.set('');

    const allTabs = ['signaletique', 'constat', 'taches', 'planning'];
    for (const tab of allTabs) {
      this.currentTab.set(tab);
      if (!this.validateCurrentTab()) {
        this.errorMessage.set('Veuillez corriger les erreurs avant de soumettre.');
        return;
      }
    }
    this.currentTab.set('planning');
    
    this.isLoading.set(true);
    
    // Log pour déboguer
    console.log('Submitting fiche suivi:', JSON.stringify(this.ficheSuivi, null, 2));

    const operation = this.isEditMode() 
      ? this.ficheSuiviService.updateFicheSuivi(this.ficheSuiviId()!, this.ficheSuivi)
      : this.ficheSuiviService.createFicheSuivi(this.ficheSuivi);

    operation.subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('Fiche de suivi enregistrée avec succès!');
        setTimeout(() => {
          this.router.navigate(['/fiches-suivi']);
        }, 1500);
      },
      error: (error) => {
        this.isLoading.set(false);
        console.error('Error saving fiche suivi:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          error: error.error
        });
        
        // Afficher un message d'erreur plus détaillé
        let errorMsg = 'Une erreur est survenue';
        
        if (error.status === 400) {
          errorMsg = error.error?.message || 'Données invalides. Veuillez vérifier les champs obligatoires.';
        } else if (error.status === 401) {
          errorMsg = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          errorMsg = 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.';
        } else if (error.status === 500) {
          errorMsg = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        this.errorMessage.set(errorMsg);
      }
    });
  }
}
