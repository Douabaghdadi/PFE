import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { TypeFiche, ValidationFiche } from './validation-fiche.service';

/** Document joint à une fiche : le contenu reste sur le serveur et se télécharge à la demande. */
export interface PieceJointe {
  id: string;
  nomFichier: string;
  taille: number;
  deposeParNom: string;
  dateDepot: string;
  /** Rédigé par l'IA à la demande ; absent tant que personne ne l'a demandé. */
  resume?: string;
}

/** Réponse commune de la liste, de l'ajout et du retrait. */
export interface PiecesJointesFiche {
  pieces: PieceJointe[];
  /** Vrai pour le chef de projet de la fiche : le serveur décide, l'écran s'y conforme. */
  peutGerer: boolean;
  /** Vrai pour le pilote qualité seulement : le résumé par l'IA lui est réservé. */
  peutResumer: boolean;
  validation: ValidationFiche;
}

@Injectable({
  providedIn: 'root'
})
export class PieceJointeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  lister(type: TypeFiche, ficheId: string): Observable<PiecesJointesFiche> {
    return this.http.get<PiecesJointesFiche>(`${this.apiUrl}/fiches/${type}/${ficheId}/pieces-jointes`);
  }

  ajouter(type: TypeFiche, ficheId: string, fichier: File): Observable<PiecesJointesFiche> {
    const formulaire = new FormData();
    formulaire.append('fichier', fichier);
    return this.http.post<PiecesJointesFiche>(`${this.apiUrl}/fiches/${type}/${ficheId}/pieces-jointes`, formulaire);
  }

  /** Un lien direct n'enverrait pas le jeton : le fichier est récupéré puis proposé à l'enregistrement. */
  telecharger(id: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/pieces-jointes/${id}`, { responseType: 'blob' });
  }

  resumer(id: string): Observable<PieceJointe> {
    return this.http.post<PieceJointe>(`${this.apiUrl}/pieces-jointes/${id}/resume`, {});
  }

  retirer(id: string): Observable<PiecesJointesFiche> {
    return this.http.delete<PiecesJointesFiche>(`${this.apiUrl}/pieces-jointes/${id}`);
  }
}
