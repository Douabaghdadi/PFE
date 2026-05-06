import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:8081/api/admin/users';

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère tous les utilisateurs
   */
  getAllUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(this.apiUrl);
  }

  /**
   * Récupère le nom d'utilisateur à partir de l'ID
   * Optimisé pour utiliser l'utilisateur connecté quand c'est possible
   */
  getUserNameById(id: string): Observable<string> {
    return new Observable(observer => {
      // Vérifier d'abord si c'est l'utilisateur connecté
      const currentUser = this.authService.currentUser();
      if (currentUser && currentUser.id === id) {
        observer.next(currentUser.username);
        observer.complete();
        return;
      }

      // Vérifier dans le localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user && user.id === id && user.username) {
            observer.next(user.username);
            observer.complete();
            return;
          }
        } catch (error) {
          console.error('Error parsing stored user:', error);
        }
      }

      // Utiliser l'endpoint public pour récupérer le nom
      this.http.get(`http://localhost:8081/api/public/users/${id}/name`, { responseType: 'text' }).subscribe({
        next: (username) => {
          observer.next(username);
          observer.complete();
        },
        error: (error) => {
          observer.next('Utilisateur inconnu');
          observer.complete();
        }
      });
    });
  }

  /**
   * Récupère directement le nom de l'utilisateur connecté
   */
  getCurrentUserName(): string {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      return currentUser.username;
    }

    // Fallback vers localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.username || 'Utilisateur inconnu';
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }

    return 'Utilisateur inconnu';
  }

  /**
   * Récupère directement l'ID de l'utilisateur connecté
   */
  getCurrentUserId(): string {
    const currentUser = this.authService.currentUser();
    if (currentUser) {
      return currentUser.id;
    }

    // Fallback vers localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.id || '';
      } catch (error) {
        console.error('Error parsing stored user:', error);
      }
    }

    return '';
  }
}
