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
  cadreContractuelProjet?: string;
  caractereProjet?: string;
  typeProjet?: string;
  presentation?: string;
  historique?: string;
  perimetre?: string;
  maitreOuvrage?: string;
  maitreOeuvre?: string;
  equipeProjet?: any;
  estimationsCharges?: EstimationCharge[];
  modaliteDeveloppement?: string;
  estimationBudget?: EstimationBudget;
  delaisPrevisionnels?: string;
  risquesPotentiels?: string;
  preRequis?: string;
  planning?: PlanningAction[];
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
  dateDerniereFicheSuivi?: string;
  dateProchaineFicheSuivi?: string;
  periodiciteSuiviMois?: number;
}

export interface ProjetSuiviStatus {
  projetId: string;
  nomProjet: string;
  dateDerniereFicheSuivi?: string;
  dateProchaineFicheSuivi?: string;
  ficheSuiviEnRetard: boolean;
  joursRetard: number;
  periodiciteSuiviMois?: number;
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

  /**
   * Récupère le statut des fiches de suivi pour tous les projets
   */
  getProjetsSuiviStatus(): Observable<ProjetSuiviStatus[]> {
    return this.http.get<ProjetSuiviStatus[]>(`${this.apiUrl}/suivi-status`);
  }

  /**
   * Configure la périodicité de remplissage des fiches de suivi
   */
  configurerPeriodicite(projetId: string, periodiciteMois: number): Observable<FicheProjet> {
    return this.http.put<FicheProjet>(`${this.apiUrl}/${projetId}/periodicite`, { periodiciteMois });
  }
}
