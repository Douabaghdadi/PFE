import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';

export interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  token: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSignal = signal<User | null>(null);
  currentUser = this.currentUserSignal.asReadonly();
  private apiUrl = 'http://localhost:8081/api/auth';

  constructor(private router: Router, private http: HttpClient) {
    // Charger l'utilisateur depuis le localStorage au démarrage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUserSignal.set(JSON.parse(storedUser));
    }
  }

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/signin`, {
      username,
      password
    }).pipe(
      tap((response) => {
        console.log('📥 Réponse de connexion:', response);
        
        // Essayer de trouver le token avec différents noms de clés
        const token = response.accessToken || response.token || response.jwt;
        
        if (!token) {
          console.error('❌ Aucun token trouvé dans la réponse:', response);
          throw new Error('Token non trouvé dans la réponse du serveur');
        }
        
        console.log('✅ Token trouvé:', token.substring(0, 20) + '...');
        
        const user: User = {
          id: response.id,
          username: response.username,
          email: response.email,
          roles: response.roles || [],
          token: token
        };
        
        this.currentUserSignal.set(user);
        
        // Sauvegarder avec les deux clés pour compatibilité
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
        
        console.log('✅ Connexion réussie et token sauvegardé:', {
          username: user.username,
          roles: user.roles,
          tokenLength: token.length,
          tokenSaved: localStorage.getItem('token') !== null
        });
      }),
      catchError((error) => {
        console.error('❌ Erreur de connexion:', error);
        return throwError(() => error);
      })
    );
  }

  logout() {
    this.currentUserSignal.set(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user'); // Supprimer aussi cette clé
    localStorage.removeItem('token'); // Supprimer le token
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.roles.includes(role) ?? false;
  }

  register(username: string, email: string, password: string) {
    return this.http.post(`${this.apiUrl}/signup`, {
      username,
      email,
      password
    });
  }

  setCurrentUser(user: User) {
    this.currentUserSignal.set(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}
