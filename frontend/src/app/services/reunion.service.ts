import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/** Réunion Google Meet : l'événement vit dans Google Agenda, Qualinet garde ce qu'il affiche. */
export interface Reunion {
  id: string;
  projetId: string;
  /** Nom du projet, renseigné par le serveur à la lecture. */
  nomProjet: string | null;
  titre: string;
  description: string;
  /** Heure de Tunis, sans fuseau : elle s'affiche telle quelle. */
  debut: string;
  dureeMinutes: number;
  participantNoms: string[];
  lienMeet: string;
  organisateurNom: string;
  /** Vrai pour l'organisateur d'une réunion à venir : le serveur décide, l'écran s'y conforme. */
  peutAnnuler: boolean;
}

/** Réponse commune de la liste, de la planification et de l'annulation. */
export interface ListeReunions {
  reunions: Reunion[];
  /** Vrai pour un chef de projet ou un pilote qualité. */
  peutPlanifier: boolean;
  /** Faux tant que le compte Google n'est pas configuré sur le serveur. */
  planificationActive: boolean;
}

export interface ParticipantPossible {
  email: string;
  /** Affiché en info-bulle. */
  nom: string;
}

/** Équipe du projet choisi : `sansEmail` compte les membres que Google ne pourrait pas inviter. */
export interface EquipeProjet {
  membres: ParticipantPossible[];
  sansEmail: number;
}

/** Projet du chef connecté, proposé dans le formulaire. */
export interface ProjetPossible {
  id: string;
  nom: string;
}

export interface NouvelleReunion {
  titre: string;
  description: string;
  debut: string;
  dureeMinutes: number;
  participantEmails: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ReunionService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api`;

  lister(): Observable<ListeReunions> {
    return this.http.get<ListeReunions>(`${this.apiUrl}/reunions`);
  }

  participants(): Observable<ParticipantPossible[]> {
    return this.http.get<ParticipantPossible[]>(`${this.apiUrl}/reunions/participants`);
  }

  equipe(projetId: string): Observable<EquipeProjet> {
    return this.http.get<EquipeProjet>(`${this.apiUrl}/projets/${projetId}/reunions/equipe`);
  }

  /** Les projets du chef connecté, par ordre alphabétique. */
  mesProjets(): Observable<ProjetPossible[]> {
    return this.http.get<{ id: string; nomProjet?: string; designationProjet?: string }[]>(
      `${this.apiUrl}/chef-projet/fiches-projet`
    ).pipe(
      map(projets => projets
        .map(projet => ({ id: projet.id, nom: projet.nomProjet || projet.designationProjet || 'Projet sans nom' }))
        .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')))
    );
  }

  planifier(projetId: string, reunion: NouvelleReunion): Observable<ListeReunions> {
    return this.http.post<ListeReunions>(`${this.apiUrl}/projets/${projetId}/reunions`, reunion);
  }

  /** Réunion du pilote qualité avec des chefs de projet : elle n'est rattachée à aucun projet. */
  planifierSansProjet(reunion: NouvelleReunion): Observable<ListeReunions> {
    return this.http.post<ListeReunions>(`${this.apiUrl}/reunions`, reunion);
  }

  annuler(id: string): Observable<ListeReunions> {
    return this.http.delete<ListeReunions>(`${this.apiUrl}/reunions/${id}`);
  }
}
