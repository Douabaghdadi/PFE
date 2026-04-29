import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full px-6 py-6 mx-auto">
      <!-- Alerts -->
      @if (successMessage()) {
        <div class="relative p-4 mb-4 text-white bg-green-500 rounded-lg shadow-lg animate-fade-in">
          <div class="flex items-center">
            <i class="fas fa-check-circle mr-3"></i>
            <span>{{ successMessage() }}</span>
          </div>
        </div>
      }

      @if (errorMessage()) {
        <div class="relative p-4 mb-4 text-white bg-red-500 rounded-lg shadow-lg animate-fade-in">
          <div class="flex items-center">
            <i class="fas fa-exclamation-circle mr-3"></i>
            <span>{{ errorMessage() }}</span>
          </div>
        </div>
      }

      <div class="flex flex-wrap -mx-3">
        <!-- Profile Card -->
        <div class="w-full max-w-full px-3 lg:w-4/12 lg:flex-none">
          <div class="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-xl rounded-2xl bg-clip-border">
            <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-500 to-green-600 h-32">
              <span class="absolute top-0 left-0 w-full h-full bg-center bg-cover opacity-20"></span>
            </div>
            
            <div class="flex-auto p-6">
              <div class="flex flex-wrap -mx-3">
                <div class="w-full max-w-full px-3 flex-0">
                  <div class="flex justify-center -mt-16 mb-4">
                    <div class="relative inline-flex items-center justify-center w-24 h-24 text-white transition-all duration-200 ease-in-out text-3xl rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 shadow-lg">
                      <i class="fas fa-user"></i>
                    </div>
                  </div>
                  
                  <div class="text-center">
                    <h5 class="mb-1 text-xl font-bold text-slate-700">{{ userProfile().username }}</h5>
                    <p class="mb-0 text-sm leading-normal text-slate-400">
                      <i class="fas fa-envelope mr-1"></i>
                      {{ userProfile().email }}
                    </p>
                    <div class="mt-3">
                      <span class="inline-block px-3 py-1 text-xs font-semibold text-emerald-600 bg-emerald-100 rounded-full">
                        <i class="fas fa-shield-alt mr-1"></i>
                        {{ getRoleName(userProfile().role) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-6 pt-6 border-t border-gray-200">
                <div class="flex flex-col space-y-3">
                  <div class="flex items-center text-sm">
                    <i class="fas fa-calendar-alt text-emerald-500 mr-3 w-5"></i>
                    <span class="text-slate-600">Membre depuis</span>
                    <span class="ml-auto font-semibold text-slate-700">{{ formatDate(userProfile().createdAt) }}</span>
                  </div>
                  <div class="flex items-center text-sm">
                    <i class="fas fa-clock text-emerald-500 mr-3 w-5"></i>
                    <span class="text-slate-600">Dernière connexion</span>
                    <span class="ml-auto font-semibold text-slate-700">{{ formatDate(userProfile().lastLogin) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Edit Profile Form -->
        <div class="w-full max-w-full px-3 lg:w-8/12 lg:flex-none mt-6 lg:mt-0">
          <div class="relative flex flex-col min-w-0 break-words bg-white border-0 shadow-xl rounded-2xl bg-clip-border">
            <div class="border-b border-gray-200 rounded-t-2xl p-6">
              <h6 class="mb-0 text-lg font-bold text-slate-700">
                <i class="fas fa-user-edit mr-2 text-emerald-500"></i>
                Modifier mon profil
              </h6>
            </div>
            
            <div class="flex-auto p-6">
              <form (ngSubmit)="updateProfile()">
                <div class="flex flex-wrap -mx-3">
                  <!-- Username -->
                  <div class="w-full max-w-full px-3 mb-6 md:w-6/12">
                    <label class="block mb-2 text-xs font-bold uppercase text-slate-600">
                      <i class="fas fa-user mr-1"></i>
                      Nom d'utilisateur
                    </label>
                    <input 
                      type="text" 
                      [(ngModel)]="formData.username" 
                      name="username"
                      class="focus:shadow-primary-outline text-sm leading-5.6 ease block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="Nom d'utilisateur">
                  </div>

                  <!-- Email -->
                  <div class="w-full max-w-full px-3 mb-6 md:w-6/12">
                    <label class="block mb-2 text-xs font-bold uppercase text-slate-600">
                      <i class="fas fa-envelope mr-1"></i>
                      Email
                    </label>
                    <input 
                      type="email" 
                      [(ngModel)]="formData.email" 
                      name="email"
                      class="focus:shadow-primary-outline text-sm leading-5.6 ease block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="Email">
                  </div>

                  <!-- First Name -->
                  <div class="w-full max-w-full px-3 mb-6 md:w-6/12">
                    <label class="block mb-2 text-xs font-bold uppercase text-slate-600">
                      <i class="fas fa-id-card mr-1"></i>
                      Prénom
                    </label>
                    <input 
                      type="text" 
                      [(ngModel)]="formData.firstName" 
                      name="firstName"
                      class="focus:shadow-primary-outline text-sm leading-5.6 ease block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="Prénom">
                  </div>

                  <!-- Last Name -->
                  <div class="w-full max-w-full px-3 mb-6 md:w-6/12">
                    <label class="block mb-2 text-xs font-bold uppercase text-slate-600">
                      <i class="fas fa-id-card mr-1"></i>
                      Nom
                    </label>
                    <input 
                      type="text" 
                      [(ngModel)]="formData.lastName" 
                      name="lastName"
                      class="focus:shadow-primary-outline text-sm leading-5.6 ease block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="Nom">
                  </div>
                </div>

                <hr class="h-px mx-0 my-6 bg-transparent border-0 opacity-25 bg-gradient-to-r from-transparent via-black/40 to-transparent">

                <h6 class="mb-4 text-sm font-bold text-slate-700">
                  <i class="fas fa-lock mr-2 text-emerald-500"></i>
                  Changer le mot de passe
                </h6>

                <div class="flex flex-wrap -mx-3">
                  <!-- Current Password -->
                  <div class="w-full max-w-full px-3 mb-6 md:w-6/12">
                    <label class="block mb-2 text-xs font-bold uppercase text-slate-600">
                      <i class="fas fa-key mr-1"></i>
                      Mot de passe actuel
                    </label>
                    <input 
                      type="password" 
                      [(ngModel)]="formData.currentPassword" 
                      name="currentPassword"
                      class="focus:shadow-primary-outline text-sm leading-5.6 ease block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="••••••••">
                  </div>

                  <!-- New Password -->
                  <div class="w-full max-w-full px-3 mb-6 md:w-6/12">
                    <label class="block mb-2 text-xs font-bold uppercase text-slate-600">
                      <i class="fas fa-lock mr-1"></i>
                      Nouveau mot de passe
                    </label>
                    <input 
                      type="password" 
                      [(ngModel)]="formData.newPassword" 
                      name="newPassword"
                      class="focus:shadow-primary-outline text-sm leading-5.6 ease block w-full appearance-none rounded-lg border border-solid border-gray-300 bg-white bg-clip-padding px-3 py-2 font-normal text-gray-700 outline-none transition-all placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
                      placeholder="••••••••">
                  </div>
                </div>

                <div class="flex justify-end mt-6">
                  <button 
                    type="submit" 
                    [disabled]="isLoading()"
                    class="inline-block px-6 py-3 font-bold text-center text-white uppercase align-middle transition-all bg-gradient-to-r from-emerald-500 to-green-600 border-0 rounded-lg cursor-pointer hover:scale-105 active:opacity-85 hover:shadow-lg text-xs ease-in tracking-tight-rem shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                    @if (isLoading()) {
                      <i class="fas fa-spinner fa-spin mr-2"></i>
                      Enregistrement...
                    } @else {
                      <i class="fas fa-save mr-2"></i>
                      Enregistrer les modifications
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in {
      animation: slideInUp 0.3s ease-out;
    }

    input:focus {
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }
  `]
})
export class AdminProfileComponent {
  authService = inject(AuthService);
  http = inject(HttpClient);

  successMessage = signal('');
  errorMessage = signal('');
  isLoading = signal(false);

  userProfile = signal({
    id: '',
    username: '',
    email: '',
    role: '',
    firstName: '',
    lastName: '',
    createdAt: new Date(),
    lastLogin: new Date()
  });

  formData = {
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    currentPassword: '',
    newPassword: ''
  };

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    const user = this.authService.currentUser();
    if (user) {
      this.userProfile.set({
        id: user.id || '',
        username: user.username || '',
        email: user.email || '',
        role: user.role || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        createdAt: user.createdAt || new Date(),
        lastLogin: new Date()
      });

      this.formData = {
        username: user.username || '',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        currentPassword: '',
        newPassword: ''
      };
    }
  }

  getRoleName(role: string): string {
    const roles: { [key: string]: string } = {
      'ADMIN': 'Administrateur',
      'CHEF_PROJET': 'Chef de Projet',
      'USER': 'Utilisateur'
    };
    return roles[role] || role;
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  updateProfile() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const token = localStorage.getItem('token');
    if (!token) {
      this.errorMessage.set('Session expirée. Veuillez vous reconnecter.');
      this.isLoading.set(false);
      return;
    }

    const updateData: any = {
      username: this.formData.username,
      email: this.formData.email,
      firstName: this.formData.firstName,
      lastName: this.formData.lastName
    };

    // Add password fields only if provided
    if (this.formData.currentPassword && this.formData.newPassword) {
      updateData.currentPassword = this.formData.currentPassword;
      updateData.newPassword = this.formData.newPassword;
    }

    this.http.put(`http://localhost:8081/api/users/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        this.isLoading.set(false);
        this.successMessage.set('Profil mis à jour avec succès !');
        
        // Update local user data
        const currentUser = this.authService.currentUser();
        if (currentUser) {
          this.authService.setCurrentUser({
            ...currentUser,
            username: this.formData.username,
            email: this.formData.email,
            firstName: this.formData.firstName,
            lastName: this.formData.lastName
          });
        }

        // Clear password fields
        this.formData.currentPassword = '';
        this.formData.newPassword = '';

        // Reload profile
        this.loadProfile();

        setTimeout(() => this.successMessage.set(''), 5000);
      },
      error: (error) => {
        this.isLoading.set(false);
        let errorMsg = 'Erreur lors de la mise à jour du profil';
        
        if (error.status === 401) {
          errorMsg = 'Mot de passe actuel incorrect';
        } else if (error.status === 400) {
          errorMsg = error.error?.message || 'Données invalides';
        } else if (error.error?.message) {
          errorMsg = error.error.message;
        }
        
        this.errorMessage.set(errorMsg);
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }
}
