import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FicheSuivi {
  id?: string;
  ficheProjetId: string;
  numeroRapport?: string;
  dateRapport?: string;
  ficheSignaletique: FicheSignaletique;
  constatGlobal: ConstatGlobal;
  tachesSuivi: TacheSuivi[];
  planningActuel: PlanningActuel;
  chefProjetId?: string;
  dateCreation?: string;
  dateModification?: string;
}

export interface FicheSignaletique {
  maitreOuvrage?: string;
  maitreOeuvre?: string;
  chefProjet: ChefProjetInfo;
  suppleant?: string;
  equipe?: string;
  experts?: string[];
  delais: DelaisInfo;
  financier: FinancierInfo;
  descriptionProjet?: string;
  caracteristiquesTechniques: string[];
}

export interface ChefProjetInfo {
  nom?: string;
  suppleant?: string;
  equipe?: string;
}

export interface DelaisInfo {
  dateDebut?: string;
  dateFin?: string;
  dureeEnMois?: number;
  dateDebutPrevision?: string;
  dateFinPrevision?: string;
  dateDebutRealisation?: string;
  dateFinRealisation?: string;
  ecartConventionnel?: number;
}

export interface FinancierInfo {
  budgetPrevision?: number;
  budgetRealisation?: number;
  ecart?: number;
}

export interface ConstatGlobal {
  etatAvancement?: string;
  objectifPrincipal?: string;
  problemesRencontres: string[];
  principauxRisques: string[];
  recommandations: string[];
}

export interface TacheSuivi {
  code?: string;
  sujet?: string;
  livrable?: string;
  assigneA?: string;
  debut?: string;
  echeance?: string;
  tempsEstime?: number;
  dateDebutReelle?: string;
  dateFinReelle?: string;
  tempsPasse?: number;
  pourcentageRealise?: number;
  statut?: string;
  remarque?: string;
}

export interface PlanningActuel {
  taches: TacheGantt[];
}

export interface TacheGantt {
  nom?: string;
  dateDebut?: string;
  dateFin?: string;
  tauxAvancement?: number;
  statut?: string;
  sousTaches: TacheGantt[];
}

@Injectable({
  providedIn: 'root'
})
export class FicheSuiviService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/chef-projet/fiches-suivi';

  // L'intercepteur auth.interceptor ajoute automatiquement le token
  // Pas besoin de le faire manuellement ici
  getAllFichesSuivi(): Observable<FicheSuivi[]> {
    return this.http.get<FicheSuivi[]>(this.apiUrl);
  }

  getFicheSuiviById(id: string): Observable<FicheSuivi> {
    return this.http.get<FicheSuivi>(`${this.apiUrl}/${id}`);
  }

  getFichesSuiviByProjet(ficheProjetId: string): Observable<FicheSuivi[]> {
    return this.http.get<FicheSuivi[]>(`${this.apiUrl}/projet/${ficheProjetId}`);
  }

  getProjetName(ficheProjetId: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/projet/${ficheProjetId}/name`, { responseType: 'text' });
  }

  createFicheSuivi(ficheSuivi: FicheSuivi): Observable<FicheSuivi> {
    return this.http.post<FicheSuivi>(this.apiUrl, ficheSuivi);
  }

  updateFicheSuivi(id: string, ficheSuivi: FicheSuivi): Observable<FicheSuivi> {
    return this.http.put<FicheSuivi>(`${this.apiUrl}/${id}`, ficheSuivi);
  }

  deleteFicheSuivi(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
