import { Injectable, computed, effect, signal, untracked } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Client } from '@stomp/stompjs';
import { Observable, Subject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

const API_URL = `${environment.apiUrl}/api/user-notifications`;
// http -> ws, https -> wss
const WS_URL = `${environment.apiUrl.replace(/^http/, 'ws')}/ws`;

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
  private incoming = new Subject<Notification>();
  private client: Client | null = null;

  /** Notifications reçues en temps réel, au fil de l'eau */
  readonly incoming$ = this.incoming.asObservable();

  constructor(private http: HttpClient, private authService: AuthService) {
    // La connexion suit la session : ouverte à la connexion de l'utilisateur
    // (y compris sans rechargement de page), fermée à la déconnexion
    const token = computed(() => this.authService.currentUser()?.token ?? null);
    effect(() => {
      const hasToken = token() !== null;
      untracked(() => (hasToken ? this.connect() : this.disconnect()));
    });
  }

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
   * Rafraîchir manuellement le compteur
   */
  refreshUnreadCount() {
    this.getUnreadCount().subscribe();
  }

  /**
   * Ouvrir la connexion temps réel (STOMP sur WebSocket) et écouter la file personnelle
   * de l'utilisateur. La bibliothèque se reconnecte seule si la connexion tombe.
   */
  private connect() {
    this.disconnect();

    const client: Client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      // Relu à chaque (re)connexion : le jeton a pu changer entre-temps
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${this.authService.currentUser()?.token}` };
      },
      onConnect: () => {
        client.subscribe('/user/queue/notifications', frame => {
          const event: { notification: Notification; unreadCount: number } = JSON.parse(frame.body);
          this.unreadCount.set(event.unreadCount);
          this.incoming.next(event.notification);
        });
        // Rattrape ce qui est arrivé pendant que la connexion était fermée
        this.refreshUnreadCount();
      },
      // Le serveur refuse le jeton (expiré, invalide) : inutile d'insister
      onStompError: frame => {
        console.error('Connexion temps réel refusée:', frame.headers['message']);
        client.deactivate();
      }
    });

    this.client = client;
    client.activate();
  }

  private disconnect() {
    this.client?.deactivate();
    this.client = null;
    this.unreadCount.set(0);
  }
}
