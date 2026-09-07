import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, interval, of } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';

const API_URL = 'http://localhost:8081/api/user-notifications';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  message: string;
  entityId: string;
  entityType: string;
  actorId: string;
  actorName: string;
  read: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserNotificationService {
  private unreadCount = signal<number>(0);
  private pollingStarted = false;
  
  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les notifications
   */
  getNotifications(): Observable<Notification[]> {
    console.log('Fetching notifications from:', API_URL);
    return this.http.get<Notification[]>(API_URL).pipe(
      tap(notifications => console.log('Notifications received:', notifications)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching notifications:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupérer les notifications non lues
   */
  getUnreadNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${API_URL}/unread`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching unread notifications:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupérer le nombre de notifications non lues
   */
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${API_URL}/unread/count`).pipe(
      tap(response => {
        console.log('Unread count:', response.count);
        this.unreadCount.set(response.count);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching unread count:', error);
        return of({ count: 0 });
      })
    );
  }

  /**
   * Marquer une notification comme lue
   */
  markAsRead(notificationId: string): Observable<any> {
    return this.http.put(`${API_URL}/${notificationId}/read`, {}).pipe(
      tap(() => {
        // Décrémenter le compteur
        const currentCount = this.unreadCount();
        if (currentCount > 0) {
          this.unreadCount.set(currentCount - 1);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error marking notification as read:', error);
        return of(null);
      })
    );
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllAsRead(): Observable<any> {
    return this.http.put(`${API_URL}/read-all`, {}).pipe(
      tap(() => this.unreadCount.set(0)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error marking all notifications as read:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtenir le signal du compteur de notifications non lues
   */
  getUnreadCountSignal() {
    return this.unreadCount;
  }

  /**
   * Démarrer le polling pour mettre à jour le compteur de notifications
   */
  startPolling() {
    if (this.pollingStarted) {
      return; // Éviter de démarrer plusieurs fois
    }
    
    this.pollingStarted = true;
    console.log('Starting notification polling...');
    
    // Charger immédiatement
    this.getUnreadCount().subscribe();

    // Polling toutes les 30 secondes
    interval(30000).pipe(
      switchMap(() => this.getUnreadCount())
    ).subscribe();
  }

  /**
   * Rafraîchir manuellement le compteur
   */
  refreshUnreadCount() {
    this.getUnreadCount().subscribe();
  }
}
