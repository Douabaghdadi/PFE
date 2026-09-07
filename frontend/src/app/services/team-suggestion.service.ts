import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TeamSuggestionRequest {
  typeProjet: string;
  budgetMDH: string;
  dureeEnMois: number | null;
  complexite: string;
  description: string;
  modaliteDeveloppement: string;
}

export interface ProfilRecommande {
  role: string;
  nombrePersonnes: number;
  competencesRequises: string;
}

export interface TeamSuggestionResponse {
  success: boolean;
  errorMessage?: string;
  tailleEquipeRecommandee: number;
  profils: ProfilRecommande[];
  membresRecommandes: string[];
  justification: string;
  facteursCles: string;
  risquesEquipe: string;
  projetsSimilairesAnalyses: string;
}

@Injectable({ providedIn: 'root' })
export class TeamSuggestionService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/ai/suggest-team';

  suggestTeam(request: TeamSuggestionRequest): Observable<TeamSuggestionResponse> {
    const token = localStorage.getItem('token');
    return this.http.post<TeamSuggestionResponse>(this.apiUrl, request, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}
