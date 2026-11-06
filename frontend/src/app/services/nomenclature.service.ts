import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Nomenclature {
  id?: string;
  type: string;
  code: string;
  libelle: string;
  description?: string;
  actif?: boolean;
}

/**
 * Listes de valeurs gérées par l'administrateur (page Nomenclature).
 *
 * Les formulaires proposent les valeurs actives d'un type ; les pages de lecture traduisent
 * un code enregistré en libellé, y compris pour une valeur désactivée depuis.
 */
@Injectable({
  providedIn: 'root'
})
export class NomenclatureService {
  private http = inject(HttpClient);
  private readonly toutes = signal<Nomenclature[]>([]);

  /** Recharge le référentiel à chaque page : une valeur ajoutée par l'administrateur apparaît sans reconnexion. */
  charger(): Observable<Nomenclature[]> {
    return this.http.get<Nomenclature[]>(`${environment.apiUrl}/api/nomenclatures`).pipe(
      tap(liste => this.toutes.set(liste)),
      catchError(error => {
        console.error('Error loading nomenclatures:', error);
        return of([]);
      })
    );
  }

  /** Valeurs proposées dans les listes de choix. */
  actives(type: string): Nomenclature[] {
    return this.toutes().filter(n => n.type === type && n.actif !== false);
  }

  /** Libellé d'un code enregistré ; le code lui-même s'il n'est pas (ou plus) dans la nomenclature. */
  libelle(type: string, code: string | undefined | null): string {
    if (!code) return '';
    const cle = code.toLowerCase();
    return this.toutes().find(n => n.type === type && n.code.toLowerCase() === cle)?.libelle ?? code;
  }
}
