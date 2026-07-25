import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FicheSuiviService, FicheSuivi, TacheSuivi, TacheGantt } from '../../services/fiche-suivi.service';
import { HttpClient } from '@angular/common/http';

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

  isEditMode = signal(false);
  ficheSuiviId = signal<string | null>(null);
  currentTab = signal('signaletique');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  
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
    // Charger la liste des projets
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
      // Générer automatiquement le numéro de rapport pour une nouvelle fiche
      this.generateNumeroRapport();
    }
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
    const tabs = ['signaletique', 'constat', 'taches', 'planning'];
    const currentIndex = tabs.indexOf(this.currentTab());
    if (currentIndex < tabs.length - 1) {
      this.currentTab.set(tabs[currentIndex + 1]);
    }
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
    
    // Validation côté client
    if (!this.ficheSuivi.ficheProjetId) {
      this.errorMessage.set('Veuillez sélectionner un projet');
      return;
    }
    
    if (!this.ficheSuivi.dateRapport) {
      this.errorMessage.set('Veuillez saisir la date du rapport');
      return;
    }
    
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
