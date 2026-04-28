import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface DashboardStats {
  totalUsers: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="w-full px-6 py-6 mx-auto">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Dashboard Admin</h1>
        <p class="text-gray-600 dark:text-gray-400">Vue d'ensemble de la plateforme</p>
      </div>

      <!-- Stats Cards -->
      <div class="flex flex-wrap -mx-3 mb-6">
        <!-- Card 1: Total Users -->
        <div class="w-full max-w-full px-3 mb-6 sm:w-1/2 sm:flex-none xl:mb-0 xl:w-1/4">
          <div class="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
            <div class="flex-auto p-4">
              <div class="flex flex-row -mx-3">
                <div class="flex-none w-2/3 max-w-full px-3">
                  <div>
                    <p class="mb-0 font-sans text-sm font-semibold leading-normal uppercase dark:text-white dark:opacity-60">Total Utilisateurs</p>
                    <h5 class="mb-2 font-bold dark:text-white text-2xl">{{ stats().totalUsers }}</h5>
                    <p class="mb-0 dark:text-white dark:opacity-60">
                      <span class="text-sm font-bold leading-normal text-emerald-500">+12%</span>
                      ce mois
                    </p>
                  </div>
                </div>
                <div class="px-3 text-right basis-1/3">
                  <div class="inline-block w-12 h-12 text-center rounded-full bg-gradient-to-tl from-blue-500 to-violet-500">
                    <i class="fas fa-users text-lg relative top-3.5 text-white"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 2: Total Projects -->
        <div class="w-full max-w-full px-3 mb-6 sm:w-1/2 sm:flex-none xl:mb-0 xl:w-1/4">
          <div class="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
            <div class="flex-auto p-4">
              <div class="flex flex-row -mx-3">
                <div class="flex-none w-2/3 max-w-full px-3">
                  <div>
                    <p class="mb-0 font-sans text-sm font-semibold leading-normal uppercase dark:text-white dark:opacity-60">Total Projets</p>
                    <h5 class="mb-2 font-bold dark:text-white text-2xl">{{ stats().totalProjects }}</h5>
                    <p class="mb-0 dark:text-white dark:opacity-60">
                      <span class="text-sm font-bold leading-normal text-emerald-500">+8%</span>
                      ce mois
                    </p>
                  </div>
                </div>
                <div class="px-3 text-right basis-1/3">
                  <div class="inline-block w-12 h-12 text-center rounded-full bg-gradient-to-tl from-red-600 to-orange-600">
                    <i class="fas fa-folder text-lg relative top-3.5 text-white"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 3: Active Projects -->
        <div class="w-full max-w-full px-3 mb-6 sm:w-1/2 sm:flex-none xl:mb-0 xl:w-1/4">
          <div class="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
            <div class="flex-auto p-4">
              <div class="flex flex-row -mx-3">
                <div class="flex-none w-2/3 max-w-full px-3">
                  <div>
                    <p class="mb-0 font-sans text-sm font-semibold leading-normal uppercase dark:text-white dark:opacity-60">Projets Actifs</p>
                    <h5 class="mb-2 font-bold dark:text-white text-2xl">{{ stats().activeProjects }}</h5>
                    <p class="mb-0 dark:text-white dark:opacity-60">
                      <span class="text-sm font-bold leading-normal text-blue-500">En cours</span>
                    </p>
                  </div>
                </div>
                <div class="px-3 text-right basis-1/3">
                  <div class="inline-block w-12 h-12 text-center rounded-full bg-gradient-to-tl from-emerald-500 to-teal-400">
                    <i class="fas fa-tasks text-lg relative top-3.5 text-white"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Card 4: Completed Projects -->
        <div class="w-full max-w-full px-3 sm:w-1/2 sm:flex-none xl:w-1/4">
          <div class="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
            <div class="flex-auto p-4">
              <div class="flex flex-row -mx-3">
                <div class="flex-none w-2/3 max-w-full px-3">
                  <div>
                    <p class="mb-0 font-sans text-sm font-semibold leading-normal uppercase dark:text-white dark:opacity-60">Projets Terminés</p>
                    <h5 class="mb-2 font-bold dark:text-white text-2xl">{{ stats().completedProjects }}</h5>
                    <p class="mb-0 dark:text-white dark:opacity-60">
                      <span class="text-sm font-bold leading-normal text-emerald-500">+15%</span>
                      ce mois
                    </p>
                  </div>
                </div>
                <div class="px-3 text-right basis-1/3">
                  <div class="inline-block w-12 h-12 text-center rounded-full bg-gradient-to-tl from-orange-500 to-yellow-500">
                    <i class="fas fa-check-circle text-lg relative top-3.5 text-white"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="flex flex-wrap -mx-3">
        <div class="w-full max-w-full px-3 mb-6 lg:w-7/12 lg:flex-none">
          <div class="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
            <div class="border-black/12.5 mb-0 rounded-t-2xl border-b-0 border-solid p-6 pt-4 pb-0">
              <h6 class="capitalize dark:text-white font-bold">Activité Récente</h6>
              <p class="mb-0 text-sm leading-normal dark:text-white dark:opacity-60">
                <i class="fa fa-check text-emerald-500"></i>
                <span class="font-semibold">Dernières actions</span> sur la plateforme
              </p>
            </div>
            <div class="flex-auto p-4">
              <div class="space-y-4">
                <div class="flex items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <i class="fas fa-user text-white"></i>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-semibold dark:text-white">Nouvel utilisateur inscrit</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Il y a 2 heures</p>
                  </div>
                </div>
                <div class="flex items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <i class="fas fa-folder-plus text-white"></i>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-semibold dark:text-white">Nouveau projet créé</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Il y a 5 heures</p>
                  </div>
                </div>
                <div class="flex items-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <div class="flex-shrink-0">
                    <div class="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <i class="fas fa-edit text-white"></i>
                    </div>
                  </div>
                  <div class="ml-4">
                    <p class="text-sm font-semibold dark:text-white">Projet mis à jour</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Il y a 1 jour</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="w-full max-w-full px-3 lg:w-5/12 lg:flex-none">
          <div class="relative flex flex-col min-w-0 break-words bg-white shadow-xl dark:bg-slate-850 dark:shadow-dark-xl rounded-2xl bg-clip-border">
            <div class="border-black/12.5 mb-0 rounded-t-2xl border-b-0 border-solid p-6 pt-4 pb-0">
              <h6 class="capitalize dark:text-white font-bold">Actions Rapides</h6>
            </div>
            <div class="flex-auto p-4">
              <div class="space-y-3">
                <a routerLink="/admin/users" class="block p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg text-white transition-all">
                  <div class="flex items-center">
                    <i class="fas fa-users text-2xl"></i>
                    <div class="ml-4">
                      <p class="font-semibold">Gérer les Utilisateurs</p>
                      <p class="text-xs opacity-80">Voir tous les utilisateurs</p>
                    </div>
                  </div>
                </a>
                <a routerLink="/admin/projects" class="block p-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg text-white transition-all">
                  <div class="flex items-center">
                    <i class="fas fa-folder text-2xl"></i>
                    <div class="ml-4">
                      <p class="font-semibold">Gérer les Projets</p>
                      <p class="text-xs opacity-80">Voir tous les projets</p>
                    </div>
                  </div>
                </a>
                <a routerLink="/admin/settings" class="block p-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-lg text-white transition-all">
                  <div class="flex items-center">
                    <i class="fas fa-cog text-2xl"></i>
                    <div class="ml-4">
                      <p class="font-semibold">Paramètres</p>
                      <p class="text-xs opacity-80">Configuration système</p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #f8f9fa;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  http = inject(HttpClient);
  
  stats = signal<DashboardStats>({
    totalUsers: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0
  });

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }

    // Load users count
    this.http.get<any[]>('http://localhost:8081/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (users) => {
        this.stats.update(s => ({ ...s, totalUsers: users.length }));
      },
      error: (error) => console.error('Error loading users:', error)
    });

    // Load projects stats
    this.http.get<any[]>('http://localhost:8081/api/admin/fiches-projet', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (projects) => {
        const activeProjects = projects.filter(p => p.statut === 'EN_COURS').length;
        const completedProjects = projects.filter(p => p.statut === 'TERMINE').length;
        
        this.stats.update(s => ({
          ...s,
          totalProjects: projects.length,
          activeProjects,
          completedProjects
        }));
      },
      error: (error) => console.error('Error loading projects:', error)
    });
  }
}
