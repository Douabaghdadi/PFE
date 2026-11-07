import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type StatutValidation = 'A_VALIDER' | 'VALIDEE' | 'A_CORRIGER';

/** Décision du pilote qualité, enregistrée dans la fiche. */
export interface ValidationFiche {
  statut: StatutValidation;
  motif?: string;
  piloteNom?: string;
  dateDecision?: string;
}

/** Les deux types de fiches contrôlés par le pilote qualité, tels qu'ils figurent dans les adresses de l'API. */
export type TypeFiche = 'fiches-projet' | 'fiches-suivi';

/** L'API renvoie la fiche entière ; seule sa validation change après une décision. */
export interface FicheDecidee {
  validation: ValidationFiche;
}

@Injectable({
  providedIn: 'root'
})
export class ValidationFicheService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/pilote-qualite`;

  valider(type: TypeFiche, id: string): Observable<FicheDecidee> {
    return this.http.put<FicheDecidee>(`${this.apiUrl}/${type}/${id}/valider`, {});
  }

  demanderCorrection(type: TypeFiche, id: string, motif: string): Observable<FicheDecidee> {
    return this.http.put<FicheDecidee>(`${this.apiUrl}/${type}/${id}/demander-correction`, { motif });
  }
}
