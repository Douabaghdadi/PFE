import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FicheProjetService } from '../../services/fiche-projet.service';
import { FicheSuiviService } from '../../services/fiche-suivi.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 2rem 0;">
      <div class="container" style="max-width: 1000px;">
        <!-- Header -->
        <div class="mb-4">
          <h1 style="font-size: 2rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Mon Profil</h1>
          <p style="color: #6b7280; font-size: 1rem;">Gérez vos informations personnelles</p>
        </div>

        <div class="row g-4">
          <!-- Carte principale du profil -->
          <div class="col-lg-4">
            <div class="card shadow-sm" style="border-radius: 1rem; border: none; overflow: hidden;">
              <!-- Bannière -->
              <div style="height: 100px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);"></div>
              
              <div class="card-body text-center" style="margin-top: -50px; padding: 1.5rem;">
                <!-- Avatar -->
                <div class="d-inline-flex align-items-center justify-content-center" 
                     style="width: 100px; height: 100px; background: white; border-radius: 50%; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 4px solid white;">
                  <div class="d-flex align-items-center justify-content-center" 
                       style="width: 92px; height: 92px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
                    <span style="font-size: 2.5rem; font-weight: 700; color: white;">{{ getInitials(user?.username) }}</span>
                  </div>
                </div>

                <h3 class="mt-3 mb-1" style="font-weight: 600; color: #111827; font-size: 1.5rem;">{{ user?.username }}</h3>
                <p class="mb-3" style="color: #6b7280; font-size: 0.95rem;">{{ user?.email }}</p>
                
                <span class="badge" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 0.5rem 1.25rem; border-radius: 2rem; font-size: 0.875rem; font-weight: 500;">
                  {{ getRoleLabel(user?.roles) }}
                </span>

                <hr style="border-color: #e5e7eb; margin: 1.5rem 0;">

                <!-- Statistiques -->
                <div class="row g-3 text-center">
                  <div class="col-6">
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 0.75rem;">
                      <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">{{ projectCount }}</div>
                      <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-top: 0.25rem;">Projets</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 0.75rem;">
                      <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;">{{ ficheSuiviCount }}</div>
                      <div style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-top: 0.25rem;">Fiches de Suivi</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Informations détaillées -->
          <div class="col-lg-8">
            <div class="card shadow-sm mb-4" style="border-radius: 1rem; border: none;">
              <div class="card-body p-4">
                <h5 class="mb-4" style="font-weight: 600; color: #111827; display: flex; align-items: center; gap: 0.5rem;">
                  <svg style="width: 20px; height: 20px; color: #10b981;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Informations personnelles
                </h5>

                <div class="row g-4">
                  <div class="col-md-6">
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 0.75rem; border-left: 4px solid #10b981;">
                      <label style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; display: block;">Nom d'utilisateur</label>
                      <p style="color: #111827; font-weight: 500; margin: 0; font-size: 1rem;">{{ user?.username }}</p>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 0.75rem; border-left: 4px solid #10b981;">
                      <label style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; display: block;">Adresse email</label>
                      <p style="color: #111827; font-weight: 500; margin: 0; font-size: 1rem;">{{ user?.email }}</p>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 0.75rem; border-left: 4px solid #10b981;">
                      <label style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; display: block;">Rôle</label>
                      <p style="color: #111827; font-weight: 500; margin: 0; font-size: 1rem;">{{ getRoleLabel(user?.roles) }}</p>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div style="padding: 1rem; background: #f9fafb; border-radius: 0.75rem; border-left: 4px solid #10b981;">
                      <label style="font-size: 0.75rem; color: #6b7280; text-transform: uppercase; font-weight: 600; margin-bottom: 0.5rem; display: block;">Statut</label>
                      <p style="margin: 0;">
                        <span style="display: inline-flex; align-items: center; gap: 0.5rem; color: #10b981; font-weight: 500;">
                          <span style="width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block;"></span>
                          Actif
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Actions rapides -->
            <div class="card shadow-sm" style="border-radius: 1rem; border: none;">
              <div class="card-body p-4">
                <h5 class="mb-4" style="font-weight: 600; color: #111827; display: flex; align-items-center; gap: 0.5rem;">
                  <svg style="width: 20px; height: 20px; color: #10b981;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  Actions rapides
                </h5>

                <div class="row g-3">
                  <div class="col-md-6">
                    <button class="btn w-100" routerLink="/edit-profile" style="background: white; border: 2px solid #e5e7eb; padding: 1rem; border-radius: 0.75rem; text-align: left; transition: all 0.2s;"
                            onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4';"
                            onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
                      <div class="d-flex align-items-center gap-3">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                          <svg style="width: 20px; height: 20px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                          </svg>
                        </div>
                        <div>
                          <div style="font-weight: 600; color: #111827; font-size: 0.95rem;">Modifier le profil</div>
                          <div style="font-size: 0.8rem; color: #6b7280;">Mettre à jour vos informations</div>
                        </div>
                      </div>
                    </button>
                  </div>
                  <div class="col-md-6">
                    <button class="btn w-100" routerLink="/change-password" style="background: white; border: 2px solid #e5e7eb; padding: 1rem; border-radius: 0.75rem; text-align: left; transition: all 0.2s;"
                            onmouseover="this.style.borderColor='#10b981'; this.style.background='#f0fdf4';"
                            onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
                      <div class="d-flex align-items-center gap-3">
                        <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center;">
                          <svg style="width: 20px; height: 20px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                          </svg>
                        </div>
                        <div>
                          <div style="font-weight: 600; color: #111827; font-size: 0.95rem;">Changer le mot de passe</div>
                          <div style="font-size: 0.8rem; color: #6b7280;">Sécuriser votre compte</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);
  ficheProjetService = inject(FicheProjetService);
  ficheSuiviService = inject(FicheSuiviService);
  
  user: any = null;
  projectCount: number = 0;
  ficheSuiviCount: number = 0;

  ngOnInit() {
    this.user = this.authService.currentUser();
    this.loadStatistics();
  }

  loadStatistics() {
    // Charger le nombre de projets du chef de projet connecté
    this.ficheProjetService.getMyFichesProjet().subscribe({
      next: (projets) => {
        this.projectCount = projets.length;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des projets:', err);
        this.projectCount = 0;
      }
    });

    // Charger le nombre de fiches de suivi du chef de projet connecté
    this.ficheSuiviService.getAllFichesSuivi().subscribe({
      next: (fiches) => {
        this.ficheSuiviCount = fiches.length;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des fiches de suivi:', err);
        this.ficheSuiviCount = 0;
      }
    });
  }

  getRoleLabel(roles: string[] | string | undefined): string {
    // Si c'est un tableau, prendre le premier rôle
    const role = Array.isArray(roles) ? roles[0] : roles;
    
    const roleMap: { [key: string]: string } = {
      'ROLE_ADMIN': 'Administrateur',
      'ROLE_CHEF_PROJET': 'Chef de Projet',
      'ROLE_PILOTE_QUALITE': 'Pilote Qualité'
    };
    return role ? (roleMap[role] || role) : 'Non défini';
  }

  getInitials(username: string): string {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  }
}
