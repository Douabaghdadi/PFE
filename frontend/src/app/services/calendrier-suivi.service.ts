import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** « PREVUE » : date projetée après la prochaine échéance, recalculée à chaque dépôt. */
export type StatutEcheance = 'DEPOSEE' | 'EN_RETARD' | 'A_DEPOSER' | 'PREVUE';

export interface EcheanceSuivi {
  projetId: string;
  nomProjet: string;
  /** « 2026-11-12 », sans fuseau. */
  date: string;
  statut: StatutEcheance;
  /** Pour la fiche attendue seulement : négatif si elle est en retard. */
  joursRestants: number | null;
  periodiciteMois: number | null;
  /** Pour une fiche déposée seulement. */
  ficheSuiviId: string | null;
  numeroRapport: string | null;
}

export interface CalendrierSuivi {
  echeances: EcheanceSuivi[];
  /** Projets en cours dont le pilote qualité n'a pas encore fixé la périodicité. */
  projetsSansEcheance: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CalendrierSuiviService {
  private http = inject(HttpClient);

  charger(): Observable<CalendrierSuivi> {
    return this.http.get<CalendrierSuivi>(`${environment.apiUrl}/api/chef-projet/calendrier-suivi`);
  }
}
