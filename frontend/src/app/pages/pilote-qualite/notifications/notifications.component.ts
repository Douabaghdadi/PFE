import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface NotificationInfo {
  projetId: string;
  projetName: string;
  chefProjetId: string;
  chefProjetName: string;
  chefProjetEmail: string;
  chefProjetPhone: string;
  joursRetard: number;
  dateProchaineFicheSuivi: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen py-8" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
      <div class="container mx-auto px-4" style="max-width: 1400px;">
        
        <!-- Header -->
        <div class="mb-8" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 1rem; padding: 2rem; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
          <h1 class="text-4xl font-bold" style="color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <i class="fas fa-bell mr-3"></i>Notifications
          </h1>
          <p class="mt-2" style="color: rgba(255,255,255,0.9); font-size: 1.1rem;">
            <i class="fas fa-paper-plane mr-2"></i>Envoyer des rappels aux chefs de projet en retard
          </p>
        </div>

        <!-- Actions -->
        <div style="background: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <button (click)="sendAllNotifications()" 
                  [disabled]="sending || lateProjects.length === 0"
                  style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.875rem 1.75rem; border-radius: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);"
                  [style.opacity]="sending || lateProjects.length === 0 ? '0.5' : '1'"
                  [style.cursor]="sending || lateProjects.length === 0 ? 'not-allowed' : 'pointer'">
            <i class="fas fa-paper-plane mr-2"></i>
            {{ sending ? 'Envoi en cours...' : 'Envoyer à tous (' + lateProjects.length + ')' }}
          </button>
        </div>

        <!-- Success Message -->
        <div *ngIf="successMessage" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #10b981; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">
          <div style="display: flex; align-items: center; color: #065f46;">
            <i class="fas fa-check-circle mr-3" style="font-size: 1.5rem;"></i>
            <span style="font-weight: 600;">{{ successMessage }}</span>
          </div>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);">
          <div style="display: flex; align-items: center; color: #991b1b;">
            <i class="fas fa-exclamation-circle mr-3" style="font-size: 1.5rem;"></i>
            <span style="font-weight: 600;">{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="text-center py-12">
          <div style="display: inline-block; width: 3rem; height: 3rem; border: 4px solid #d1fae5; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p class="mt-4" style="color: #065f46; font-weight: 600;">Chargement...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && lateProjects.length === 0" style="background: white; border-radius: 1.5rem; padding: 4rem 2rem; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.08);">
          <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem;">
            <i class="fas fa-check-circle" style="font-size: 3rem; color: #10b981;"></i>
          </div>
          <h3 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 1rem;">
            Aucun projet en retard
          </h3>
          <p style="color: #6b7280; font-size: 1.1rem;">
            Tous les chefs de projet sont à jour avec leurs fiches de suivi.
          </p>
        </div>

        <!-- Projects List -->
        <div *ngIf="!loading && lateProjects.length > 0">
          <div style="margin-bottom: 1rem; color: #6b7280; font-weight: 600;">
            {{ lateProjects.length }} projet(s) en retard
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div *ngFor="let projet of lateProjects"
                 style="background: white; border-radius: 1rem; padding: 1.5rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08); transition: all 0.3s ease; border: 2px solid transparent;"
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 12px 24px rgba(16, 185, 129, 0.15)'; this.style.borderColor='#10b981';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'; this.style.borderColor='transparent';">
              
              <!-- Header -->
              <div style="margin-bottom: 1rem;">
                <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">
                  <i class="fas fa-folder mr-2" style="color: #10b981;"></i>
                  {{ projet.projetName }}
                </h3>
                <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 0.5rem 1rem; border-radius: 0.5rem; display: inline-block;">
                  <span style="color: #991b1b; font-weight: 600; font-size: 0.875rem;">
                    <i class="fas fa-clock mr-1"></i>
                    {{ projet.joursRetard }} jour(s) de retard
                  </span>
                </div>
              </div>

              <!-- Chef Info -->
              <div style="background: #f9fafb; padding: 1rem; border-radius: 0.75rem; margin-bottom: 1rem;">
                <div style="margin-bottom: 0.5rem;">
                  <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">
                    <i class="fas fa-user mr-1"></i>Chef de projet:
                  </span>
                  <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ projet.chefProjetName }}</span>
                </div>
                <div style="margin-bottom: 0.5rem;">
                  <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">
                    <i class="fas fa-envelope mr-1"></i>Email:
                  </span>
                  <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ projet.chefProjetEmail || 'Non renseigné' }}</span>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 0.875rem; font-weight: 600;">
                    <i class="fas fa-phone mr-1"></i>Téléphone:
                  </span>
                  <span style="color: #111827; font-size: 0.875rem; margin-left: 0.5rem;">{{ projet.chefProjetPhone || 'Non renseigné' }}</span>
                </div>
              </div>

              <!-- Action Button -->
              <button (click)="sendNotification(projet.projetId)" 
                      [disabled]="sendingProjetId === projet.projetId || (!projet.chefProjetEmail && !projet.chefProjetPhone)"
                      style="width: 100%; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);"
                      [style.opacity]="sendingProjetId === projet.projetId || (!projet.chefProjetEmail && !projet.chefProjetPhone) ? '0.5' : '1'"
                      [style.cursor]="sendingProjetId === projet.projetId || (!projet.chefProjetEmail && !projet.chefProjetPhone) ? 'not-allowed' : 'pointer'">
                <i class="fas fa-paper-plane mr-2"></i>
                {{ sendingProjetId === projet.projetId ? 'Envoi...' : 'Envoyer Email + SMS' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      button:not(:disabled):hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2) !important;
      }
    </style>
  `
})
export class NotificationsComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/pilote-qualite/notifications';

  lateProjects: NotificationInfo[] = [];
  loading = true;
  sending = false;
  sendingProjetId: string | null = null;
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.loadLateProjects();
  }

  loadLateProjects() {
    this.loading = true;
    this.http.get<NotificationInfo[]>(`${this.apiUrl}/late-projects`).subscribe({
      next: (data) => {
        this.lateProjects = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des projets en retard:', err);
        this.errorMessage = 'Erreur lors du chargement des projets en retard';
        this.loading = false;
      }
    });
  }

  sendNotification(projetId: string) {
    this.sendingProjetId = projetId;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.post<any>(`${this.apiUrl}/send/${projetId}`, {}).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.sendingProjetId = null;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'envoi de la notification';
        this.sendingProjetId = null;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  sendAllNotifications() {
    this.sending = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.post<any>(`${this.apiUrl}/send-all`, {}).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.sending = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'envoi des notifications';
        this.sending = false;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }
}
