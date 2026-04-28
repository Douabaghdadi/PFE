import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FicheSuiviService, FicheSuivi, TacheSuivi, TacheGantt } from '../../services/fiche-suivi.service';

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

  isEditMode = signal(false);
  ficheSuiviId = signal<string | null>(null);
  currentTab = signal('signaletique');
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  ficheSuivi: FicheSuivi = {
    ficheProjetId: '',
    numeroRapport: '',
    dateRapport: new Date().toISOString().split('T')[0],
    ficheSignaletique: {
      chefProjet: {},
      delais: {},
      financier: {},
      caracteristiquesTechniques: []
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
    const id = this.route.snapshot.paramMap.get('id');
    const projetId = this.route.snapshot.queryParamMap.get('projetId');
    
    if (projetId) {
      this.ficheSuivi.ficheProjetId = projetId;
    }

    if (id) {
      this.isEditMode.set(true);
      this.ficheSuiviId.set(id);
      this.loadFicheSuivi(id);
    }
  }

  loadFicheSuivi(id: string) {
    this.isLoading.set(true);
    this.ficheSuiviService.getFicheSuiviById(id).subscribe({
      next: (data) => {
        this.ficheSuivi = data;
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
    this.isLoading.set(true);

    const operation = this.isEditMode() 
      ? this.ficheSuiviService.updateFicheSuivi(this.ficheSuiviId()!, this.ficheSuivi)
      : this.ficheSuiviService.createFicheSuivi(this.ficheSuivi);

    operation.subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set('Fiche de suivi enregistrée avec succès!');
        setTimeout(() => {
          this.router.navigate(['/projets', this.ficheSuivi.ficheProjetId]);
        }, 1500);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Une erreur est survenue');
      }
    });
  }
}
