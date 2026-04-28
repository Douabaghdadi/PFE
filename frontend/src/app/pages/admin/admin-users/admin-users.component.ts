import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt?: string;
}

interface NewUser {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    .modal-content {
      animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .form-control:focus {
      transform: translateY(-2px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .role-card {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      overflow: hidden;
    }

    .role-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }

    .role-card:hover::before {
      left: 100%;
    }

    .role-card:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
    }

    .role-card.selected {
      transform: scale(1.02);
      box-shadow: 0 12px 30px rgba(0,0,0,0.2);
    }

    .glass-effect {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .gradient-border {
      position: relative;
      background: linear-gradient(white, white) padding-box,
                  linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box;
      border: 3px solid transparent;
    }

    .luxury-input {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 2px solid #e5e7eb;
      background: linear-gradient(to bottom, #ffffff, #f9fafb);
    }

    .luxury-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1), 0 8px 16px rgba(16, 185, 129, 0.15);
      background: white;
    }

    .luxury-btn {
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .luxury-btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .luxury-btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .luxury-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
    }

    .luxury-btn:active {
      transform: translateY(0);
    }

    .badge-luxury {
      background: linear-gradient(135deg, var(--badge-color-1), var(--badge-color-2));
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
    }

    .badge-luxury:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0,0,0,0.2);
    }

    .modal-backdrop.show {
      backdrop-filter: blur(8px);
      background-color: rgba(0, 0, 0, 0.6);
    }

    .success-checkmark {
      animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }

    .input-icon {
      transition: all 0.3s ease;
    }

    .luxury-input:focus ~ .input-icon {
      color: #10b981;
      transform: scale(1.1);
    }

    .floating-label {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .form-control:focus ~ .floating-label,
    .form-control:not(:placeholder-shown) ~ .floating-label {
      transform: translateY(-1.5rem) scale(0.85);
      color: #10b981;
    }
  `],
  template: `
    <div class="w-full px-6 py-6 mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-bold text-gray-800 dark:text-white">Gestion des Utilisateurs</h2>
          <p class="text-gray-600 dark:text-gray-400">Liste de tous les utilisateurs de la plateforme</p>
        </div>
        <button class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors" data-bs-toggle="modal" data-bs-target="#createUserModal">
          <i class="fas fa-plus mr-2"></i>
          Nouvel Utilisateur
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-white dark:bg-slate-850 rounded-2xl shadow-xl p-4 mb-6">
        <div class="flex gap-4">
          <div class="flex-1">
            <input type="text" 
                   [(ngModel)]="searchTerm" 
                   (input)="filterUsers()"
                   class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                   placeholder="🔍 Rechercher par nom ou email...">
          </div>
          <select [(ngModel)]="filterRole" 
                  (change)="filterUsers()"
                  class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500">
            <option value="">Tous les rôles</option>
            <option value="ROLE_ADMIN">Admin</option>
            <option value="ROLE_CHEF_PROJET">Chef de Projet</option>
            <option value="ROLE_USER">Utilisateur</option>
          </select>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      }

      <!-- Error State -->
      @if (errorMessage()) {
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <i class="fas fa-exclamation-circle mr-2"></i>
          {{ errorMessage() }}
        </div>
      }

      <!-- Users Table -->
      @if (!isLoading() && !errorMessage()) {
        <div class="bg-white dark:bg-slate-850 rounded-2xl shadow-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rôles
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date d'inscription
                  </th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-slate-850 divide-y divide-gray-200 dark:divide-slate-700">
                @for (user of filteredUsers(); track user.id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                          <div class="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {{ getInitials(user.username) }}
                          </div>
                        </div>
                        <div class="ml-4">
                          <div class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ user.username }}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="text-sm text-gray-900 dark:text-white">{{ user.email }}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex gap-2">
                        @for (role of user.roles; track role) {
                          <span [class]="getRoleBadgeClass(role)" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                            {{ getRoleLabel(role) }}
                          </span>
                        }
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(user.createdAt) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        (click)="editUser(user.id)" 
                        class="inline-flex items-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors mr-2"
                        title="Modifier">
                        <i class="fas fa-edit mr-1"></i>
                        Modifier
                      </button>
                      <button 
                        (click)="deleteUser(user.id)" 
                        class="inline-flex items-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        title="Supprimer">
                        <i class="fas fa-trash mr-1"></i>
                        Supprimer
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="bg-gray-50 dark:bg-slate-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-slate-700">
            <div class="flex-1 flex justify-between sm:hidden">
              <button class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Précédent
              </button>
              <button class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                Suivant
              </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p class="text-sm text-gray-700 dark:text-gray-400">
                  Affichage de <span class="font-medium">1</span> à <span class="font-medium">{{ filteredUsers().length }}</span> sur <span class="font-medium">{{ filteredUsers().length }}</span> résultats
                </p>
              </div>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Modal Créer Utilisateur - Design Luxe -->
    <div class="modal fade" id="createUserModal" tabindex="-1" aria-labelledby="createUserModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content border-0 shadow-2xl" style="border-radius: 24px; overflow: hidden;">
          
          <!-- Header avec gradient luxueux -->
          <div class="modal-header border-0 p-0 position-relative" style="background: linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%); height: 140px;">
            <!-- Effet de brillance animé -->
            <div class="position-absolute w-100 h-100" style="background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%); background-size: 200% 200%; animation: shimmer 3s infinite;"></div>
            
            <div class="position-relative w-100 d-flex align-items-center justify-content-between p-4">
              <div class="d-flex align-items-center">
                <div>
                  <h5 class="modal-title mb-1 fw-bold text-white" id="createUserModalLabel" style="font-size: 26px; text-shadow: 0 2px 8px rgba(0,0,0,0.2); letter-spacing: -0.5px;">
                    @if (isEditMode()) {
                      Modifier un utilisateur
                    } @else {
                      Créer un utilisateur
                    }
                  </h5>
                  <p class="mb-0 text-white" style="opacity: 0.95; font-size: 14px; text-shadow: 0 1px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-sparkles me-1"></i>
                    @if (isEditMode()) {
                      Modifiez les informations du membre
                    } @else {
                      Ajoutez un nouveau membre à votre équipe
                    }
                  </p>
                </div>
              </div>
              <button type="button" class="btn-close btn-close-white opacity-100" data-bs-dismiss="modal" aria-label="Close" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); font-size: 14px;"></button>
            </div>

            <!-- Vague décorative -->
            <svg class="position-absolute bottom-0 w-100" style="height: 30px; margin-bottom: -1px;" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="white"></path>
            </svg>
          </div>

          <div class="modal-body p-5" style="background: linear-gradient(to bottom, #ffffff, #f8f9fa);">
            @if (createError()) {
              <div class="alert alert-danger alert-dismissible fade show border-0 shadow-sm mb-4" role="alert" style="border-radius: 16px; background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); animation: fadeIn 0.3s ease;">
                <div class="d-flex align-items-center">
                  <div class="rounded-circle bg-white p-2 me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                    <i class="fas fa-exclamation-triangle text-danger fs-5"></i>
                  </div>
                  <div class="flex-grow-1">
                    <strong class="d-block mb-1">Erreur de validation</strong>
                    <span>{{ createError() }}</span>
                  </div>
                </div>
                <button type="button" class="btn-close" (click)="createError.set('')"></button>
              </div>
            }

            <form #createForm="ngForm">
              <!-- Nom d'utilisateur -->
              <div class="mb-4 position-relative">
                <label for="newUsername" class="form-label fw-bold mb-3" style="color: #1f2937; font-size: 15px; letter-spacing: -0.2px;">
                  <i class="fas fa-user me-2" style="color: #10b981;"></i>
                  Nom d'utilisateur
                  <span class="text-danger ms-1">*</span>
                </label>
                <div class="position-relative">
                  <input 
                    type="text" 
                    class="form-control luxury-input form-control-lg ps-4 pe-4" 
                    id="newUsername" 
                    [(ngModel)]="newUser.username"
                    name="username"
                    required
                    placeholder="Ex: jdupont"
                    style="border-radius: 14px; font-size: 15px; padding: 14px 20px; font-weight: 500;"
                    [class.is-invalid]="!newUser.username && createForm.submitted">
                  <div class="position-absolute top-50 end-0 translate-middle-y me-3">
                    <i class="fas fa-check-circle text-success" *ngIf="newUser.username" style="font-size: 18px;"></i>
                  </div>
                </div>
                <small class="form-text text-muted d-block mt-2 ms-1" style="font-size: 13px;">
                  <i class="fas fa-info-circle me-1" style="color: #10b981;"></i>
                  Identifiant unique pour la connexion
                </small>
              </div>

              <!-- Email -->
              <div class="mb-4 position-relative">
                <label for="newEmail" class="form-label fw-bold mb-3" style="color: #1f2937; font-size: 15px; letter-spacing: -0.2px;">
                  <i class="fas fa-envelope me-2" style="color: #10b981;"></i>
                  Adresse email
                  <span class="text-danger ms-1">*</span>
                </label>
                <div class="position-relative">
                  <input 
                    type="email" 
                    class="form-control luxury-input form-control-lg ps-4 pe-4" 
                    id="newEmail" 
                    [(ngModel)]="newUser.email"
                    name="email"
                    required
                    placeholder="Ex: jdupont@qualityhub.com"
                    style="border-radius: 14px; font-size: 15px; padding: 14px 20px; font-weight: 500;"
                    [class.is-invalid]="!newUser.email && createForm.submitted">
                  <div class="position-absolute top-50 end-0 translate-middle-y me-3">
                    <i class="fas fa-check-circle text-success" *ngIf="newUser.email && newUser.email.includes('@')" style="font-size: 18px;"></i>
                  </div>
                </div>
                <small class="form-text text-muted d-block mt-2 ms-1" style="font-size: 13px;">
                  <i class="fas fa-bell me-1" style="color: #10b981;"></i>
                  Utilisé pour les notifications importantes
                </small>
              </div>
              <!-- Mot de passe (seulement en mode création) -->
              @if (!isEditMode()) {
                <div class="mb-4 position-relative">
                  <label for="newPassword" class="form-label fw-bold mb-3" style="color: #1f2937; font-size: 15px; letter-spacing: -0.2px;">
                    <i class="fas fa-lock me-2" style="color: #10b981;"></i>
                    Mot de passe
                    <span class="text-danger ms-1">*</span>
                  </label>
                  <div class="input-group">
                    <input 
                      [type]="showPassword() ? 'text' : 'password'"
                      class="form-control luxury-input form-control-lg border-end-0" 
                      id="newPassword" 
                      [(ngModel)]="newUser.password"
                      name="password"
                      required
                      placeholder="Minimum 6 caractères"
                      style="border-radius: 14px 0 0 14px; font-size: 15px; padding: 14px 20px; font-weight: 500;"
                      [class.is-invalid]="!newUser.password && createForm.submitted">
                    <button 
                      class="btn luxury-input border-start-0 px-4" 
                      type="button"
                      (click)="showPassword.set(!showPassword())"
                      style="border-radius: 0 14px 14px 0; background: linear-gradient(to bottom, #ffffff, #f9fafb); border: 2px solid #e5e7eb; border-left: none;">
                      <i [class]="showPassword() ? 'fas fa-eye-slash' : 'fas fa-eye'" style="color: #10b981; font-size: 16px;"></i>
                    </button>
                  </div>
                  <div class="d-flex align-items-center mt-2 ms-1">
                    <div class="flex-grow-1">
                      <small class="form-text text-muted" style="font-size: 13px;">
                        <i class="fas fa-shield-alt me-1" style="color: #10b981;"></i>
                        Minimum 6 caractères requis
                      </small>
                    </div>
                    @if (newUser.password.length >= 6) {
                      <span class="badge bg-success" style="border-radius: 8px; font-size: 11px; padding: 4px 10px;">
                        <i class="fas fa-check me-1"></i>
                        Valide
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Rôles et permissions - Design Luxe -->
              <div class="mb-4">
                <label class="form-label fw-bold mb-3" style="color: #1f2937; font-size: 15px; letter-spacing: -0.2px;">
                  <i class="fas fa-crown me-2" style="color: #10b981;"></i>
                  Rôles et permissions
                  <span class="text-danger ms-1">*</span>
                </label>
                
                <div class="row g-3">
                  <!-- Admin -->
                  <div class="col-12">
                    <div class="role-card card border-0 shadow-sm cursor-pointer" 
                         [class.selected]="newUser.roles.includes('admin')"
                         [style.border]="newUser.roles.includes('admin') ? '3px solid #ef4444' : '2px solid #e5e7eb'"
                         [style.background]="newUser.roles.includes('admin') ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 50%, #fca5a5 100%)' : 'white'"
                         (click)="toggleRole('admin')"
                         style="border-radius: 16px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                      <div class="card-body p-4">
                        <div class="d-flex align-items-center">
                          <div class="form-check me-3">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              id="roleAdmin"
                              [checked]="newUser.roles.includes('admin')"
                              (click)="$event.stopPropagation()"
                              style="width: 24px; height: 24px; border-radius: 8px; border: 2px solid #ef4444; cursor: pointer;">
                          </div>
                          <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                              <span class="badge badge-luxury me-2" 
                                    style="--badge-color-1: #ef4444; --badge-color-2: #dc2626; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600;">
                                <i class="fas fa-crown me-2"></i>
                                Administrateur
                              </span>
                              <span class="badge bg-light text-dark" style="border-radius: 8px; font-size: 11px; padding: 4px 10px;">
                                Accès complet
                              </span>
                            </div>
                          </div>
                          @if (newUser.roles.includes('admin')) {
                            <div class="ms-3">
                              <i class="fas fa-check-circle text-danger success-checkmark" style="font-size: 28px;"></i>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Chef de Projet -->
                  <div class="col-12">
                    <div class="role-card card border-0 shadow-sm cursor-pointer" 
                         [class.selected]="newUser.roles.includes('chef')"
                         [style.border]="newUser.roles.includes('chef') ? '3px solid #3b82f6' : '2px solid #e5e7eb'"
                         [style.background]="newUser.roles.includes('chef') ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 50%, #93c5fd 100%)' : 'white'"
                         (click)="toggleRole('chef')"
                         style="border-radius: 16px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                      <div class="card-body p-4">
                        <div class="d-flex align-items-center">
                          <div class="form-check me-3">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              id="roleChef"
                              [checked]="newUser.roles.includes('chef')"
                              (click)="$event.stopPropagation()"
                              style="width: 24px; height: 24px; border-radius: 8px; border: 2px solid #3b82f6; cursor: pointer;">
                          </div>
                          <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                              <span class="badge badge-luxury me-2" 
                                    style="--badge-color-1: #3b82f6; --badge-color-2: #2563eb; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600;">
                                <i class="fas fa-project-diagram me-2"></i>
                                Chef de Projet
                              </span>
                              <span class="badge bg-light text-dark" style="border-radius: 8px; font-size: 11px; padding: 4px 10px;">
                                Gestion projets
                              </span>
                            </div>
                          </div>
                          @if (newUser.roles.includes('chef')) {
                            <div class="ms-3">
                              <i class="fas fa-check-circle text-primary success-checkmark" style="font-size: 28px;"></i>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Pilote Qualité -->
                  <div class="col-12">
                    <div class="role-card card border-0 shadow-sm cursor-pointer" 
                         [class.selected]="newUser.roles.includes('pilote')"
                         [style.border]="newUser.roles.includes('pilote') ? '3px solid #10b981' : '2px solid #e5e7eb'"
                         [style.background]="newUser.roles.includes('pilote') ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)' : 'white'"
                         (click)="toggleRole('pilote')"
                         style="border-radius: 16px; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);">
                      <div class="card-body p-4">
                        <div class="d-flex align-items-center">
                          <div class="form-check me-3">
                            <input 
                              class="form-check-input" 
                              type="checkbox" 
                              id="rolePilote"
                              [checked]="newUser.roles.includes('pilote')"
                              (click)="$event.stopPropagation()"
                              style="width: 24px; height: 24px; border-radius: 8px; border: 2px solid #10b981; cursor: pointer;">
                          </div>
                          <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                              <span class="badge badge-luxury me-2" 
                                    style="--badge-color-1: #10b981; --badge-color-2: #059669; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 600;">
                                <i class="fas fa-clipboard-check me-2"></i>
                                Pilote Qualité
                              </span>
                              <span class="badge bg-light text-dark" style="border-radius: 8px; font-size: 11px; padding: 4px 10px;">
                                Suivi qualité
                              </span>
                            </div>
                          </div>
                          @if (newUser.roles.includes('pilote')) {
                            <div class="ms-3">
                              <i class="fas fa-check-circle text-success success-checkmark" style="font-size: 28px;"></i>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                @if (newUser.roles.length === 0 && createForm.submitted) {
                  <div class="alert alert-warning border-0 mt-3 shadow-sm" role="alert" style="border-radius: 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Veuillez sélectionner au moins un rôle
                  </div>
                }
              </div>
            </form>
          </div>

          <!-- Footer avec design luxe -->
          <div class="modal-footer border-0 p-4" style="background: linear-gradient(to top, #f8f9fa, #ffffff);">
            <button type="button" class="btn btn-lg px-5 me-2" data-bs-dismiss="modal" 
                    style="border-radius: 12px; border: 2px solid #e5e7eb; background: white; color: #6b7280; font-weight: 600; transition: all 0.3s ease;">
              <i class="fas fa-times me-2"></i>
              Annuler
            </button>
            <button 
              type="button" 
              class="btn btn-lg luxury-btn px-5 position-relative" 
              (click)="createUser()"
              [disabled]="isCreating() || !newUser.username || !newUser.email || (!isEditMode() && !newUser.password) || newUser.roles.length === 0"
              style="border-radius: 12px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: white; font-weight: 600; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);">
              @if (isCreating()) {
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                @if (isEditMode()) {
                  Modification en cours...
                } @else {
                  Création en cours...
                }
              } @else {
                <i class="fas fa-magic me-2"></i>
                @if (isEditMode()) {
                  Modifier l'utilisateur
                } @else {
                  Créer l'utilisateur
                }
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  http = inject(HttpClient);

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  
  searchTerm = '';
  filterRole = '';

  // Propriétés pour la création d'utilisateur
  newUser: NewUser = {
    username: '',
    email: '',
    password: '',
    roles: []
  };
  isCreating = signal(false);
  createError = signal('');
  showPassword = signal(false);

  // Propriétés pour la modification d'utilisateur
  isEditMode = signal(false);
  editingUserId = signal<string>('');

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.errorMessage.set('Vous devez être connecté');
      this.isLoading.set(false);
      return;
    }

    console.log('Loading users with token:', token);

    this.http.get<User[]>('http://localhost:8081/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log('Users loaded successfully:', data);
        this.users.set(data);
        this.filteredUsers.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Error details:', error.error);
        this.errorMessage.set(`Erreur lors du chargement des utilisateurs: ${error.status} - ${error.error?.message || error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  filterUsers() {
    let filtered = this.users();

    // Filter by search term
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(u => 
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    // Filter by role
    if (this.filterRole) {
      filtered = filtered.filter(u => u.roles.includes(this.filterRole));
    }

    this.filteredUsers.set(filtered);
  }

  getInitials(name: string): string {
    return name?.substring(0, 2).toUpperCase() || 'U';
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'bg-red-100 text-red-800';
      case 'ROLE_CHEF_PROJET': return 'bg-blue-100 text-blue-800';
      case 'ROLE_USER': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'Admin';
      case 'ROLE_CHEF_PROJET': return 'Chef de Projet';
      case 'ROLE_USER': return 'Utilisateur';
      default: return role;
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  editUser(id: string) {
    const user = this.users().find(u => u.id === id);
    if (user) {
      this.isEditMode.set(true);
      this.editingUserId.set(id);
      
      // Remplir le formulaire avec les données de l'utilisateur
      this.newUser.username = user.username;
      this.newUser.email = user.email;
      this.newUser.password = ''; // Ne pas pré-remplir le mot de passe
      
      // Convertir les rôles du format backend au format frontend
      this.newUser.roles = [];
      if (user.roles.includes('ROLE_ADMIN')) {
        this.newUser.roles.push('admin');
      }
      if (user.roles.includes('ROLE_CHEF_PROJET')) {
        this.newUser.roles.push('chef');
      }
      if (user.roles.includes('ROLE_USER')) {
        this.newUser.roles.push('pilote');
      }
      
      // Ouvrir le modal
      const modalElement = document.getElementById('createUserModal');
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  deleteUser(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      const token = localStorage.getItem('token');
      this.http.delete(`http://localhost:8081/api/admin/users/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          alert('Erreur lors de la suppression de l\'utilisateur');
        }
      });
    }
  }

  toggleRole(role: string) {
    const index = this.newUser.roles.indexOf(role);
    if (index > -1) {
      this.newUser.roles.splice(index, 1);
    } else {
      this.newUser.roles.push(role);
    }
  }

  createUser() {
    // Validation
    if (!this.newUser.username || !this.newUser.email) {
      this.createError.set('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Validation du mot de passe seulement en mode création
    if (!this.isEditMode() && !this.newUser.password) {
      this.createError.set('Le mot de passe est obligatoire');
      return;
    }

    if (!this.isEditMode() && this.newUser.password.length < 6) {
      this.createError.set('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (this.newUser.roles.length === 0) {
      this.createError.set('Veuillez sélectionner au moins un rôle');
      return;
    }

    this.createError.set('');
    this.isCreating.set(true);

    const token = localStorage.getItem('token');
    
    if (this.isEditMode()) {
      // Mode modification
      const updateData: any = {
        username: this.newUser.username,
        email: this.newUser.email,
        roles: this.newUser.roles
      };
      
      // Ajouter le mot de passe seulement s'il est renseigné
      if (this.newUser.password) {
        updateData.password = this.newUser.password;
      }
      
      this.http.put(`http://localhost:8081/api/admin/users/${this.editingUserId()}`, updateData, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.isCreating.set(false);
          this.closeModal();
          this.loadUsers();
          alert('Utilisateur modifié avec succès!');
        },
        error: (error) => {
          this.isCreating.set(false);
          console.error('Error updating user:', error);
          
          if (error.error && error.error.message) {
            this.createError.set(error.error.message);
          } else {
            this.createError.set('Erreur lors de la modification de l\'utilisateur');
          }
        }
      });
    } else {
      // Mode création
      this.http.post('http://localhost:8081/api/admin/users', this.newUser, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.isCreating.set(false);
          this.closeModal();
          this.loadUsers();
          alert('Utilisateur créé avec succès!');
        },
        error: (error) => {
          this.isCreating.set(false);
          console.error('Error creating user:', error);
          
          if (error.error && error.error.message) {
            this.createError.set(error.error.message);
          } else {
            this.createError.set('Erreur lors de la création de l\'utilisateur');
          }
        }
      });
    }
  }

  closeModal() {
    const modalElement = document.getElementById('createUserModal');
    const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }

    // Réinitialiser le formulaire
    this.newUser = {
      username: '',
      email: '',
      password: '',
      roles: []
    };
    this.isEditMode.set(false);
    this.editingUserId.set('');
    this.createError.set('');
  }
}
