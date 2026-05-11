import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FicheProjet } from './pilote-qualite-fiche-projet.service';

@Injectable({
  providedIn: 'root'
})
export class FicheProjetService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/chef-projet/fiches-projet';

  getMyFichesProjet(): Observable<FicheProjet[]> {
    return this.http.get<FicheProjet[]>(this.apiUrl);
  }

  getFicheProjetById(id: string): Observable<FicheProjet> {
    return this.http.get<FicheProjet>(`${this.apiUrl}/${id}`);
  }

  createFicheProjet(ficheProjet: any): Observable<FicheProjet> {
    return this.http.post<FicheProjet>(this.apiUrl, ficheProjet);
  }

  updateFicheProjet(id: string, ficheProjet: any): Observable<FicheProjet> {
    return this.http.put<FicheProjet>(`${this.apiUrl}/${id}`, ficheProjet);
  }

  deleteFicheProjet(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
