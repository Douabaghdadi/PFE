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
    <div class="min-h-screen py-8" style="background: #f8fafc;">
      <div class="container mx-auto px-4" style="max-width: 1400px;">

        <!-- Header -->
        <div class="mb-8" style="background: linear-gradient(135deg, #09C82C 0%, #07a625 100%); border-radius: 1.25rem; padding: 1.5rem 2rem; position: relative; overflow: hidden;">
          <div style="position: absolute; top: -60px; right: -60px; width: 220px; height: 220px; background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
          <div style="position: absolute; bottom: -40px; left: 30%; width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
          <div style="position: relative; z-index: 1;">
            <div style="display: inline-flex; align-items: center; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 2rem; padding: 0.35rem 1rem; margin-bottom: 0.75rem;">
              <span style="width: 8px; height: 8px; background: white; border-radius: 50%; margin-right: 0.5rem;"></span>
              <span style="color: white; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em;">PILOTE QUALITÉ</span>
            </div>
            <h1 style="color: white; font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 0.25rem;">
              <i class="fas fa-bell mr-2"></i>Notifications
            </h1>
            <p style="color: rgba(255,255,255,0.85); font-size: 0.9rem; margin: 0;">Relancez les chefs de projet en retard et envoyez des emails personnalisés</p>
          </div>
        </div>

        <!-- Section Email Personnalisé -->
        <div style="background: white; border-radius: 1.5rem; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); border: 1px solid #eef1f4;">
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-bottom: 1.4rem;">
            <div style="width: 2.3rem; height: 2.3rem; border-radius: 0.8rem; background: #f0fdf4; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
              <i class="fas fa-envelope" style="color: #059669; font-size: 1rem;"></i>
            </div>
            <h2 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.01em;">Envoyer un email personnalisé</h2>
          </div>

          <div style="display: flex; flex-direction: column; gap: 1.1rem;">
            <!-- Destinataire -->
            <div style="position: relative;">
              <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 0.4rem; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em;">Destinataire</label>

              <!-- Trigger -->
              <div (click)="dropdownOpen = !dropdownOpen"
                   style="display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 1rem; border: 1.5px solid #e2e8f0; border-radius: 0.85rem; cursor: pointer; background: white; user-select: none; transition: all 0.2s ease;"
                   [style.borderColor]="dropdownOpen ? '#10b981' : '#e2e8f0'"
                   [style.boxShadow]="dropdownOpen ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none'">
                <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(16,185,129,0.25);">
                  <span style="color: white; font-weight: 700; font-size: 0.8rem;">
                    {{ customEmail.chefId === '' ? '👥' : getSelectedChef()?.username?.charAt(0)?.toUpperCase() }}
                  </span>
                </div>
                <span style="flex: 1; color: #0f172a; font-size: 0.9rem; font-weight: 600;">
                  {{ customEmail.chefId === '' ? 'Tous les chefs de projet' : getSelectedChef()?.username + ' (' + getSelectedChef()?.email + ')' }}
                </span>
                <i class="fas" [class.fa-chevron-down]="!dropdownOpen" [class.fa-chevron-up]="dropdownOpen" style="color: #94a3b8; font-size: 0.8rem;"></i>
              </div>

              <!-- Dropdown -->
              <div *ngIf="dropdownOpen"
                   style="position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #eef1f4; border-radius: 0.85rem; box-shadow: 0 12px 32px -8px rgba(15,23,42,0.16); z-index: 100; margin-top: 0.4rem; max-height: 260px; overflow-y: auto;">

                <!-- Tous -->
                <div (click)="customEmail.chefId = ''; dropdownOpen = false"
                     style="display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem; cursor: pointer; transition: background 0.15s;"
                     [style.background]="customEmail.chefId === '' ? '#f0fdf4' : 'white'"
                     onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background=this.getAttribute('data-selected')==='true'?'#f0fdf4':'white'"
                     [attr.data-selected]="customEmail.chefId === ''">
                  <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-users" style="color: white; font-size: 0.75rem;"></i>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.85rem;">Tous les chefs de projet</div>
                    <div style="color: #94a3b8; font-size: 0.72rem; font-weight: 600;">{{ chefs.length }} destinataire(s)</div>
                  </div>
                  <i *ngIf="customEmail.chefId === ''" class="fas fa-check" style="color: #10b981;"></i>
                </div>

                <div style="height: 1px; background: #f1f5f9; margin: 0 0.5rem;"></div>

                <!-- Chefs -->
                <div *ngFor="let chef of chefs"
                     (click)="customEmail.chefId = chef.id; dropdownOpen = false"
                     style="display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1rem; cursor: pointer; transition: background 0.15s;"
                     [style.background]="customEmail.chefId === chef.id ? '#eff6ff' : 'white'"
                     onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=this.getAttribute('data-selected')==='true'?'#eff6ff':'white'"
                     [attr.data-selected]="customEmail.chefId === chef.id">
                  <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <span style="color: white; font-weight: 700; font-size: 0.8rem;">{{ chef.username.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 0.85rem;">{{ chef.username }}</div>
                    <div style="color: #94a3b8; font-size: 0.72rem; font-weight: 600;">{{ chef.email }}</div>
                  </div>
                  <i *ngIf="customEmail.chefId === chef.id" class="fas fa-check" style="color: #2563eb;"></i>
                </div>
              </div>
            </div>

            <!-- Sujet -->
            <div>
              <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 0.4rem; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em;">Sujet</label>
              <input [(ngModel)]="customEmail.subject" type="text" placeholder="Sujet de l'email"
                     style="width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid #e2e8f0; border-radius: 0.85rem; font-size: 0.9rem; outline: none; color: #0f172a; transition: all 0.2s ease;"
                     onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.1)';"
                     onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';" />
            </div>

            <!-- Message -->
            <div>
              <label style="display: block; font-weight: 700; color: #334155; margin-bottom: 0.4rem; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em;">Message</label>
              <textarea [(ngModel)]="customEmail.message" rows="5" placeholder="Contenu de l'email..."
                        style="width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid #e2e8f0; border-radius: 0.85rem; font-size: 0.9rem; outline: none; color: #0f172a; resize: vertical; transition: all 0.2s ease;"
                        onfocus="this.style.borderColor='#10b981'; this.style.boxShadow='0 0 0 3px rgba(16,185,129,0.1)';"
                        onblur="this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';"></textarea>
            </div>

            <!-- Bouton -->
            <div>
              <button (click)="sendCustomEmail()"
                      [disabled]="sendingCustom || !customEmail.subject || !customEmail.message"
                      style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; padding: 0.7rem 1.5rem; border-radius: 0.75rem; font-weight: 700; cursor: pointer; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 10px rgba(16,185,129,0.3); transition: all 0.2s ease;"
                      [style.opacity]="sendingCustom || !customEmail.subject || !customEmail.message ? '0.5' : '1'"
                      [style.cursor]="sendingCustom || !customEmail.subject || !customEmail.message ? 'not-allowed' : 'pointer'">
                <i class="fas fa-paper-plane"></i>
                {{ sendingCustom ? 'Envoi...' : 'Envoyer' }}
              </button>
            </div>
          </div>
        </div>

<!-- Success Message -->
        <div *ngIf="successMessage" style="display: flex; align-items: center; gap: 0.65rem; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem 1.25rem; border-radius: 1rem; margin-bottom: 2rem;">
          <div style="width: 1.75rem; height: 1.75rem; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-check-circle" style="color: #059669; font-size: 0.9rem;"></i>
          </div>
          <span style="font-weight: 700; font-size: 0.85rem; color: #065f46;">{{ successMessage }}</span>
        </div>

        <!-- Error Message -->
        <div *ngIf="errorMessage" style="display: flex; align-items: center; gap: 0.65rem; background: #fef2f2; border: 1px solid #fecaca; padding: 1rem 1.25rem; border-radius: 1rem; margin-bottom: 2rem;">
          <div style="width: 1.75rem; height: 1.75rem; border-radius: 50%; background: #fee2e2; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i class="fas fa-exclamation-circle" style="color: #dc2626; font-size: 0.9rem;"></i>
          </div>
          <span style="font-weight: 700; font-size: 0.85rem; color: #991b1b;">{{ errorMessage }}</span>
        </div>

        <!-- Loading -->
        <div *ngIf="loading" class="text-center py-12">
          <div style="display: inline-block; width: 3rem; height: 3rem; border: 4px solid #d1fae5; border-top-color: #10b981; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
          <p class="mt-4" style="color: #065f46; font-weight: 600;">Chargement...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && lateProjects.length === 0" style="background: white; border-radius: 1.5rem; padding: 4rem 2rem; text-align: center; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); border: 1px solid #eef1f4;">
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
                 style="background: white; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03); transition: all 0.25s cubic-bezier(0.4,0,0.2,1); border: 1px solid #eef1f4; display: flex; flex-direction: column;"
                 onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 20px 32px -12px rgba(15,23,42,0.16), 0 4px 10px rgba(15,23,42,0.06)'; this.style.borderColor='#e2e8f0';"
                 onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.03)'; this.style.borderColor='#eef1f4';">

              <!-- Card Body -->
              <div style="padding: 1.25rem 1.25rem 1rem; flex: 1; display: flex; flex-direction: column;">

                <!-- Header -->
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.9rem;">
                  <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
                    <div style="width: 2.3rem; height: 2.3rem; border-radius: 0.8rem; background: #f1f5f9; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                      <i class="fas fa-folder" style="color: #475569; font-size: 1rem;"></i>
                    </div>
                    <h3 style="font-size: 0.98rem; font-weight: 800; color: #0f172a; margin: 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em;" [title]="projet.projetName">
                      {{ projet.projetName }}
                    </h3>
                  </div>
                  <span style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.28rem 0.6rem; border-radius: 999px; font-size: 0.65rem; font-weight: 700; background: #fef2f2; color: #dc2626; flex-shrink: 0; white-space: nowrap;">
                    <span style="width: 6px; height: 6px; border-radius: 50%; background: #dc2626; flex-shrink: 0;"></span>
                    {{ projet.joursRetard }}j de retard
                  </span>
                </div>

                <!-- Chef de projet -->
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem;">
                  <div style="width: 1.6rem; height: 1.6rem; border-radius: 50%; background: linear-gradient(135deg, #38bdf8 0%, #2563eb 100%); display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 6px rgba(37,99,235,0.25);">
                    <span style="color: white; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.02em;">{{ getInitials(projet.chefProjetName) }}</span>
                  </div>
                  <span style="font-size: 0.8rem; color: #334155; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ projet.chefProjetName }}</span>
                </div>

                <!-- Contact -->
                <div style="display: flex; flex-direction: column; gap: 0.35rem; margin-top: auto;">
                  <span style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #64748b; font-weight: 600;">
                    <i class="fas fa-envelope" style="color: #94a3b8; width: 0.8rem; flex-shrink: 0;"></i>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ projet.chefProjetEmail || 'Non renseigné' }}</span>
                  </span>
                  <span style="display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: #64748b; font-weight: 600;">
                    <i class="fas fa-phone" style="color: #94a3b8; width: 0.8rem; flex-shrink: 0;"></i>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ projet.chefProjetPhone || 'Non renseigné' }}</span>
                  </span>
                </div>

              </div>

              <!-- Action Button -->
              <div style="padding: 0 1.25rem 1.25rem;">
                <div style="height: 1px; background: #f1f5f9; margin-bottom: 0.75rem;"></div>
                <button (click)="sendNotification(projet.projetId)"
                        [disabled]="sendingProjetId === projet.projetId || (!projet.chefProjetEmail && !projet.chefProjetPhone)"
                        style="width: 100%; height: 2.4rem; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; border: none; border-radius: 0.7rem; font-weight: 700; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; box-shadow: 0 4px 10px rgba(37,99,235,0.3); transition: all 0.2s ease;"
                        [style.opacity]="sendingProjetId === projet.projetId || (!projet.chefProjetEmail && !projet.chefProjetPhone) ? '0.5' : '1'"
                        [style.cursor]="sendingProjetId === projet.projetId || (!projet.chefProjetEmail && !projet.chefProjetPhone) ? 'not-allowed' : 'pointer'">
                  <i class="fas fa-paper-plane"></i>
                  {{ sendingProjetId === projet.projetId ? 'Envoi...' : 'Envoyer Email + SMS' }}
                </button>
              </div>
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

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
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
