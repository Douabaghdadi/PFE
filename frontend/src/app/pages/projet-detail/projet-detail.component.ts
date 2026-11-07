import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MembreEquipe, ProjetFicheComponent } from '../../components/projet-fiche/projet-fiche.component';
import { FicheValidationComponent } from '../../components/fiche-validation/fiche-validation.component';
import { PiecesJointesComponent } from '../../components/pieces-jointes/pieces-jointes.component';
import type { ValidationFiche } from '../../services/validation-fiche.service';
import { statutDef, statutKey } from '../shared/projet-stats';

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
  chefProjetNom?: string;
  maitreOuvrage: string;
  maitreOeuvre: string;
  equipeProjet: MembreEquipe[] | string;
  estimationsCharges: any[];
  modaliteDeveloppement: string;
  estimationBudget: any;
  dateDebutPrevision?: string;
  dateFinPrevision?: string;
  dureeEnMois?: number;
  dateDebutRealisation?: string;
  dateFinRealisation?: string;
  ecartConventionnel?: number;
  delaisPrevisionnels: string;
  risquesPotentiels: string;
  preRequis: string;
  planning: any[];
  statut: string;
  reference?: string;
  dateCreation?: string;
  validation?: ValidationFiche;
}

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ProjetFicheComponent, FicheValidationComponent, PiecesJointesComponent],
  templateUrl: './projet-detail.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/detail-ui.css']
})
export class ProjetDetailComponent implements OnInit {
  http = inject(HttpClient);
  route = inject(ActivatedRoute);
  router = inject(Router);

  readonly statutKey = statutKey;
  readonly statutDef = statutDef;

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

    this.http.get<FicheProjet>(`${environment.apiUrl}/api/chef-projet/fiches-projet/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }).subscribe({
      next: (data) => {
        // Parser equipeProjet si c'est un JSON string
        if (data.equipeProjet && typeof data.equipeProjet === 'string') {
          try { data.equipeProjet = JSON.parse(data.equipeProjet); } catch (e) {}
        }
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

  onValidationChangee(validation: ValidationFiche) {
    this.projet.update(projet => projet ? { ...projet, validation } : projet);
  }

  editProjet() {
    const id = this.projet()?.id;
    if (id) {
      this.router.navigate(['/fiche-projet/edit', id]);
    }
  }
}
