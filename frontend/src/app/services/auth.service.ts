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
        const user: User = {
          id: response.id,
          username: response.username,
          email: response.email,
          roles: response.roles,
          token: response.accessToken || response.token // Essayer les deux noms
        };
        
        this.currentUserSignal.set(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('token', response.accessToken || response.token);
      }),
      catchError((error) => {
        console.error('Erreur de connexion:', error);
        return throwError(() => error);
      })
    );
  }

  logout() {
    this.currentUserSignal.set(null);
    localStorage.removeItem('currentUser');
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
