import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FicheProjet } from './pilote-qualite-fiche-projet.service';
import { FicheSuivi } from './fiche-suivi.service';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt?: string;
}

export interface Nomenclature {
  id?: string;
  type?: string;
  code?: string;
  libelle?: string;
  description?: string;
  actif?: boolean;
  dateCreation?: string;
  dateModification?: string;
}

/**
 * Données de pilotage de la plateforme, réservées au rôle ADMIN.
 *
 * Les quatre sources sont volontairement brutes : le dashboard fait lui-même les
 * agrégations, ce qui évite d'ajouter des endpoints de statistiques côté backend.
 */
@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  /** Tous les comptes avec leurs rôles et leur date d'inscription. */
  getUsers(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(`${this.apiUrl}/api/admin/users`);
  }

  /** Toutes les fiches projet de la plateforme (et non les seules fiches du compte connecté). */
  getAllFichesProjet(): Observable<FicheProjet[]> {
    return this.http.get<FicheProjet[]>(`${this.apiUrl}/api/chef-projet/fiches-projet/all`);
  }

  /** Toutes les fiches de suivi déposées, tous chefs de projet confondus. */
  getAllFichesSuivi(): Observable<FicheSuivi[]> {
    return this.http.get<FicheSuivi[]>(`${this.apiUrl}/api/chef-projet/fiches-suivi/all`);
  }

  /** Référentiel : statuts, catégories et types de fiche. */
  getNomenclatures(): Observable<Nomenclature[]> {
    return this.http.get<Nomenclature[]>(`${this.apiUrl}/api/admin/nomenclatures`);
  }
}
