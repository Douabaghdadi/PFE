import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EstimationCharge {
  prestations?: string;
  profil?: string;
  periode?: string;
  chargeHM?: string;
  livrables?: string;
}

export interface EstimationBudget {
  cp?: string;
  id?: string;
  total?: string;
  budgetMDHT?: string;
}

export interface PlanningAction {
  action?: string;
  profilIntervenants?: string;
  chargeHM?: string;
  mois?: { [key: string]: boolean };
}

export interface FicheProjet {
  id?: string;
  nomProjet?: string;
  designationProjet?: string;
  designationClient?: string;
  
  // Section 1: Identification
  cadreContractuelProjet?: string;
  caractereProjet?: string;
  typeProjet?: string;
  
  // Section 2: Présentation
  presentation?: string;
  
  // Section 3: Historique
  historique?: string;
  
  // Section 4: Périmètre
  perimetre?: string;
  
  // Section 5: Organisation
  maitreOuvrage?: string;
  maitreOeuvre?: string;
  equipeProjet?: any;
  
  // Section 6: Estimation des charges
  estimationsCharges?: EstimationCharge[];
  modaliteDeveloppement?: string;
  
  // Section 7: Estimation du budget
  estimationBudget?: EstimationBudget;
  
  // Section 8: Délais prévisionnels
  delaisPrevisionnels?: string;
  
  // Section 9: Risques potentiels
  risquesPotentiels?: string;
  
  // Section 10: Pré-requis
  preRequis?: string;
  
  // Planning
  planning?: PlanningAction[];
  
  // Autres champs
  description?: string;
  objectifs?: string;
  responsable?: string;
  chefProjetId?: string;
  dateDebut?: string;
  dateFinPrevue?: string;
  statut?: string;
  categorie?: string;
  dateCreation?: string;
  dateModification?: string;
  reference?: string;
  dateDocument?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PiloteQualiteFicheProjetService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/pilote-qualite/fiches-projet';

  /**
   * Récupère toutes les fiches projet (lecture seule)
   */
  getAllFichesProjet(): Observable<FicheProjet[]> {
    return this.http.get<FicheProjet[]>(this.apiUrl);
  }

  /**
   * Récupère une fiche projet par son ID (lecture seule)
   */
  getFicheProjetById(id: string): Observable<FicheProjet> {
    return this.http.get<FicheProjet>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les fiches projet par statut (lecture seule)
   */
  getFichesProjetByStatut(statut: string): Observable<FicheProjet[]> {
    return this.http.get<FicheProjet[]>(`${this.apiUrl}/statut/${statut}`);
  }

  /**
   * Récupère les fiches projet par catégorie (lecture seule)
   */
  getFichesProjetByCategorie(categorie: string): Observable<FicheProjet[]> {
    return this.http.get<FicheProjet[]>(`${this.apiUrl}/categorie/${categorie}`);
  }

  /**
   * Récupère les fiches projet d'un chef de projet spécifique (lecture seule)
   */
  getFichesProjetByChefProjet(chefProjetId: string): Observable<FicheProjet[]> {
    return this.http.get<FicheProjet[]>(`${this.apiUrl}/chef-projet/${chefProjetId}`);
  }
}
