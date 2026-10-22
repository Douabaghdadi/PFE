import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChefProjet {
  id: string;
  username: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class PiloteQualiteNotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/pilote-qualite/notifications`;

  /**
   * Récupère les comptes chefs de projet (identifiant, nom, email)
   */
  getChefsProjet(): Observable<ChefProjet[]> {
    return this.http.get<ChefProjet[]>(`${this.apiUrl}/chefs`);
  }

  /**
   * Envoie au chef de projet l'email de relance d'un projet en retard
   */
  relancerProjet(projetId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/send/${projetId}`, {});
  }
}
