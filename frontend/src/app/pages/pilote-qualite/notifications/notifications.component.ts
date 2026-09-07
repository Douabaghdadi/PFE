import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

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

interface Chef {
  id: string;
  username: string;
  email: string;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="min-h-screen py-8" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);">
      <div class="container mx-auto px-4" style="max-width: 1400px;">
        
        <!-- Header -->
        <div class="mb-8" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 1rem; padding: 2rem; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
          <h1 class="text-4xl font-bold" style="color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <i class="fas fa-bell mr-3"></i>Notifications
          </h1>

        </div>

        <!-- Section Email Personnalisé -->
        <div style="background: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin-bottom: 1.25rem;">
            <i class="fas fa-envelope mr-2" style="color: #10b981;"></i>Envoyer un email personnalisé
          </h2>

          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <!-- Destinataire -->
            <div style="position: relative;">
              <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.4rem; font-size: 0.875rem;">Destinataire</label>
              
              <!-- Trigger -->
              <div (click)="dropdownOpen = !dropdownOpen"
                   style="display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 1rem; border: 1.5px solid #d1d5db; border-radius: 0.5rem; cursor: pointer; background: white; user-select: none;">
                <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <span style="color: white; font-weight: 700; font-size: 0.8rem;">
                    {{ customEmail.chefId === '' ? '👥' : getSelectedChef()?.username?.charAt(0)?.toUpperCase() }}
                  </span>
                </div>
                <span style="flex: 1; color: #111827; font-size: 0.95rem;">
                  {{ customEmail.chefId === '' ? 'Tous les chefs de projet' : getSelectedChef()?.username + ' (' + getSelectedChef()?.email + ')' }}
                </span>
                <i class="fas" [class.fa-chevron-down]="!dropdownOpen" [class.fa-chevron-up]="dropdownOpen" style="color: #6b7280;"></i>
              </div>

              <!-- Dropdown -->
              <div *ngIf="dropdownOpen"
                   style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1.5px solid #d1d5db; border-radius: 0.5rem; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 100; margin-top: 0.25rem; max-height: 260px; overflow-y: auto;">
                
                <!-- Tous -->
                <div (click)="customEmail.chefId = ''; dropdownOpen = false"
                     style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.15s;"
                     [style.background]="customEmail.chefId === '' ? '#f0fdf4' : 'white'"
                     onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background=this.getAttribute('data-selected')==='true'?'#f0fdf4':'white'"
                     [attr.data-selected]="customEmail.chefId === ''">
                  <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-users" style="color: white; font-size: 0.75rem;"></i>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: #111827; font-size: 0.875rem;">Tous les chefs de projet</div>
                    <div style="color: #6b7280; font-size: 0.75rem;">{{ chefs.length }} destinataire(s)</div>
                  </div>
                  <i *ngIf="customEmail.chefId === ''" class="fas fa-check" style="color: #10b981;"></i>
                </div>

                <div style="height: 1px; background: #e5e7eb; margin: 0 0.5rem;"></div>

                <!-- Chefs -->
                <div *ngFor="let chef of chefs"
                     (click)="customEmail.chefId = chef.id; dropdownOpen = false"
                     style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.15s;"
                     [style.background]="customEmail.chefId === chef.id ? '#eff6ff' : 'white'"
                     onmouseover="this.style.background='#f9fafb'" onmouseout="this.style.background=this.getAttribute('data-selected')==='true'?'#eff6ff':'white'"
                     [attr.data-selected]="customEmail.chefId === chef.id">
                  <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #2563eb); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-weight: 700; font-size: 0.8rem;">{{ chef.username.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: #111827; font-size: 0.875rem;">{{ chef.username }}</div>
                    <div style="color: #6b7280; font-size: 0.75rem;">{{ chef.email }}</div>
                  </div>
                  <i *ngIf="customEmail.chefId === chef.id" class="fas fa-check" style="color: #3b82f6;"></i>
                </div>
              </div>
            </div>

            <!-- Sujet -->
            <div>
              <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.4rem; font-size: 0.875rem;">Sujet</label>
              <input [(ngModel)]="customEmail.subject" type="text" placeholder="Sujet de l'email"
                     style="width: 100%; padding: 0.625rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 0.5rem; font-size: 0.95rem; outline: none; color: #111827;" />
            </div>

            <!-- Message -->
            <div>
              <label style="display: block; font-weight: 600; color: #374151; margin-bottom: 0.4rem; font-size: 0.875rem;">Message</label>
              <textarea [(ngModel)]="customEmail.message" rows="5" placeholder="Contenu de l'email..."
                        style="width: 100%; padding: 0.625rem 0.875rem; border: 1.5px solid #d1d5db; border-radius: 0.5rem; font-size: 0.95rem; outline: none; color: #111827; resize: vertical;"></textarea>
            </div>

            <!-- Bouton -->
            <div>
              <button (click)="sendCustomEmail()"
                      [disabled]="sendingCustom || !customEmail.subject || !customEmail.message"
                      style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer;"
                      [style.opacity]="sendingCustom || !customEmail.subject || !customEmail.message ? '0.5' : '1'"
                      [style.cursor]="sendingCustom || !customEmail.subject || !customEmail.message ? 'not-allowed' : 'pointer'">
                <i class="fas fa-paper-plane mr-2"></i>
                {{ sendingCustom ? 'Envoi...' : 'Envoyer' }}
              </button>
            </div>
          </div>
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

  chefs: Chef[] = [];
  customEmail = { chefId: '', subject: '', message: '' };
  sendingCustom = false;
  dropdownOpen = false;

  getSelectedChef(): Chef | undefined {
    return this.chefs.find(c => c.id === this.customEmail.chefId);
  }

  ngOnInit() {
    this.loadLateProjects();
    this.loadChefs();
  }

  loadChefs() {
    this.http.get<Chef[]>(`${this.apiUrl}/chefs`).subscribe({
      next: (data) => this.chefs = data,
      error: (err) => console.error('Erreur chargement chefs:', err)
    });
  }

  sendCustomEmail() {
    this.sendingCustom = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.http.post<any>(`${this.apiUrl}/send-custom-email`, this.customEmail).subscribe({
      next: (res) => {
        this.successMessage = res.message;
        this.customEmail = { chefId: '', subject: '', message: '' };
        this.sendingCustom = false;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Erreur lors de l\'envoi';
        this.sendingCustom = false;
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
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
