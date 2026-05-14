import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HistoriqueModification {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  username: string;
  userRole: string;
  dateModification: string;
  anciennesValeurs?: { [key: string]: any };
  nouvellesValeurs?: { [key: string]: any };
  description: string;
  entityName?: string; // Nom du projet ou numéro de rapport
}

@Injectable({
  providedIn: 'root'
})
export class HistoriqueService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/historique';

  getHistoriqueByEntity(entityType: string, entityId: string): Observable<HistoriqueModification[]> {
    return this.http.get<HistoriqueModification[]>(`${this.apiUrl}/${entityType}/${entityId}`);
  }

  getHistoriqueCompletProjet(projetId: string): Observable<HistoriqueModification[]> {
    return this.http.get<HistoriqueModification[]>(`${this.apiUrl}/projet/${projetId}/complet`);
  }

  getHistoriqueByUser(userId: string): Observable<HistoriqueModification[]> {
    return this.http.get<HistoriqueModification[]>(`${this.apiUrl}/user/${userId}`);
  }
}
