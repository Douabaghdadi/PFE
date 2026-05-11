import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 2rem 0;">
      <div class="container" style="max-width: 800px;">
        <div class="mb-4">
          <a routerLink="/profile" style="color: #10b981; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 500;">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"></path>
            </svg>
            Retour au profil
          </a>
        </div>

        <div class="card shadow-sm" style="border-radius: 1rem; border: none;">
          <div class="card-body p-4">
            <div class="text-center mb-4">
              <div class="d-inline-flex align-items-center justify-content-center mb-3" 
                   style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%;">
                <svg style="width: 30px; height: 30px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                </svg>
              </div>
              <h2 style="font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Modifier le profil</h2>
              <p style="color: #6b7280;">Mettez à jour vos informations personnelles</p>
            </div>

            @if (errorMessage) {
              <div class="alert alert-danger" style="border-radius: 0.75rem; border-left: 4px solid #dc2626;">
                {{ errorMessage }}
              </div>
            }

            @if (successMessage) {
              <div class="alert alert-success" style="border-radius: 0.75rem; border-left: 4px solid #10b981;">
                {{ successMessage }}
              </div>
            }

            <form [formGroup]="editProfileForm" (ngSubmit)="onSubmit()">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label" style="font-weight: 500; color: #374151;">Nom d'utilisateur</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    formControlName="username"
                    placeholder="Votre nom d'utilisateur"
                    style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                  @if (editProfileForm.get('username')?.invalid && editProfileForm.get('username')?.touched) {
                    <small class="text-danger">Le nom d'utilisateur est requis</small>
                  }
                </div>

                <div class="col-md-6">
                  <label class="form-label" style="font-weight: 500; color: #374151;">Adresse email</label>
                  <input 
                    type="email" 
                    class="form-control" 
                    formControlName="email"
                    placeholder="votre.email@exemple.com"
                    style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                  @if (editProfileForm.get('email')?.invalid && editProfileForm.get('email')?.touched) {
                    <small class="text-danger">L'email est requis et doit être valide</small>
                  }
                </div>

                <div class="col-12">
                  <label class="form-label" style="font-weight: 500; color: #374151;">Numéro de téléphone</label>
                  <input 
                    type="tel" 
                    class="form-control" 
                    formControlName="phoneNumber"
                    placeholder="+216 XX XXX XXX"
                    style="border-radius: 0.5rem; border: 1px solid #e5e7eb; padding: 0.75rem;">
                </div>
              </div>

              <div class="d-flex gap-3 mt-4">
                <button 
                  type="submit" 
                  class="btn flex-grow-1" 
                  [disabled]="editProfileForm.invalid || isLoading"
                  style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; padding: 0.75rem; border-radius: 0.75rem; font-weight: 600; color: white; transition: all 0.2s;">
                  @if (isLoading) {
                    <span class="spinner-border spinner-border-sm me-2"></span>
                    Enregistrement...
                  } @else {
                    Enregistrer les modifications
                  }
                </button>
                <button 
                  type="button" 
                  class="btn" 
                  routerLink="/profile"
                  style="background: white; border: 2px solid #e5e7eb; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; color: #374151;">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class EditProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  editProfileForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor() {
    this.editProfileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['']
    });
  }

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.editProfileForm.patchValue({
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber || ''
      });
    }
  }

  onSubmit() {
    if (this.editProfileForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const user = this.authService.currentUser();
      const payload = {
        id: user?.id,
        ...this.editProfileForm.value
      };

      this.http.put('http://localhost:8081/api/users/profile', payload)
        .subscribe({
          next: (response: any) => {
            this.isLoading = false;
            this.successMessage = 'Profil mis à jour avec succès ! Redirection...';
            
            // Mettre à jour l'utilisateur dans le service
            if (user) {
              const updatedUser = {
                id: user.id,
                username: response.username,
                email: response.email,
                phoneNumber: response.phoneNumber,
                roles: user.roles,
                token: user.token
              };
              this.authService.setCurrentUser(updatedUser);
            }
            
            setTimeout(() => {
              this.router.navigate(['/profile']);
            }, 2000);
          },
          error: (error) => {
            this.isLoading = false;
            this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour du profil';
          }
        });
    }
  }
}
