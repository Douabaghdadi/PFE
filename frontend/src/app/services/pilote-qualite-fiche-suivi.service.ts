import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FicheSuivi } from './fiche-suivi.service';

@Injectable({
  providedIn: 'root'
})
export class PiloteQualiteFicheSuiviService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/pilote-qualite/fiches-suivi';

  /**
   * Récupère toutes les fiches de suivi (lecture seule)
   */
  getAllFichesSuivi(): Observable<FicheSuivi[]> {
    return this.http.get<FicheSuivi[]>(this.apiUrl);
  }

  /**
   * Récupère une fiche de suivi par son ID (lecture seule)
   */
  getFicheSuiviById(id: string): Observable<FicheSuivi> {
    return this.http.get<FicheSuivi>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les fiches de suivi d'un projet spécifique (lecture seule)
   */
  getFichesSuiviByProjet(ficheProjetId: string): Observable<FicheSuivi[]> {
    return this.http.get<FicheSuivi[]>(`${this.apiUrl}/projet/${ficheProjetId}`);
  }

  /**
   * Récupère les fiches de suivi d'un chef de projet spécifique (lecture seule)
   */
  getFichesSuiviByChefProjet(chefProjetId: string): Observable<FicheSuivi[]> {
    return this.http.get<FicheSuivi[]>(`${this.apiUrl}/chef-projet/${chefProjetId}`);
  }
}
