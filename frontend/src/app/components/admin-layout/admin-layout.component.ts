import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50">
      <!-- Sidebar -->
      <aside [class.translate-x-0]="sidebarOpen()" 
             class="fixed inset-y-0 flex-wrap items-center justify-between block w-full p-0 my-4 overflow-y-auto antialiased transition-transform duration-200 -translate-x-full bg-white border-0 shadow-xl max-w-64 ease-nav-brand z-990 xl:ml-6 rounded-2xl xl:left-0 xl:translate-x-0">
        
        <!-- Header Simple -->
        <div class="relative overflow-hidden rounded-t-2xl bg-gradient-to-r from-emerald-500 to-green-600">
          <i (click)="toggleSidebar()" class="absolute top-0 right-0 p-4 cursor-pointer fas fa-times text-white/80 hover:text-white xl:hidden z-10"></i>
          
          <a class="relative block px-6 py-6 m-0 text-sm whitespace-nowrap" routerLink="/admin/dashboard">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <i class="fas fa-shield-alt text-white text-lg"></i>
              </div>
              <span class="font-bold text-white text-xl">Admin Panel</span>
            </div>
          </a>
        </div>

        <!-- Menu Items -->
        <div class="items-center block w-auto max-h-screen overflow-auto h-sidenav grow basis-full px-4 py-4">
          <ul class="flex flex-col pl-0 mb-0 space-y-1">
            <li class="w-full">
              <a routerLink="/admin/dashboard" 
                 routerLinkActive="bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600"
                 [routerLinkActiveOptions]="{exact: false}"
                 class="py-3 text-sm flex items-center whitespace-nowrap rounded-lg px-4 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 border-l-4 border-transparent">
                <i class="fas fa-tv text-lg mr-3 w-5"></i>
                <span>Dashboard</span>
              </a>
            </li>

            <li class="w-full">
              <a routerLink="/admin/users" 
                 routerLinkActive="bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600"
                 [routerLinkActiveOptions]="{exact: false}"
                 class="py-3 text-sm flex items-center whitespace-nowrap rounded-lg px-4 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 border-l-4 border-transparent">
                <i class="fas fa-users text-lg mr-3 w-5"></i>
                <span>Utilisateurs</span>
              </a>
            </li>

            <li class="w-full">
              <a routerLink="/admin/nomenclature" 
                 routerLinkActive="bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600"
                 [routerLinkActiveOptions]="{exact: false}"
                 class="py-3 text-sm flex items-center whitespace-nowrap rounded-lg px-4 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 border-l-4 border-transparent">
                <i class="fas fa-list text-lg mr-3 w-5"></i>
                <span>Nomenclature</span>
              </a>
            </li>

            <!-- Divider -->
            <li class="w-full pt-4 pb-2">
              <div class="h-px bg-gray-200"></div>
            </li>

            <li class="w-full">
              <h6 class="px-4 text-xs font-semibold uppercase text-gray-400 mb-2">Compte</h6>
            </li>

            <li class="w-full">
              <a routerLink="/admin/profile" 
                 routerLinkActive="bg-emerald-50 text-emerald-600 border-l-4 border-emerald-600"
                 [routerLinkActiveOptions]="{exact: false}"
                 class="py-3 text-sm flex items-center whitespace-nowrap rounded-lg px-4 font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 border-l-4 border-transparent">
                <i class="fas fa-user text-lg mr-3 w-5"></i>
                <span>Profil</span>
              </a>
            </li>

            <li class="w-full">
              <a (click)="logout()" 
                 class="py-3 text-sm flex items-center whitespace-nowrap rounded-lg px-4 font-medium text-gray-700 transition-all duration-200 hover:bg-red-50 hover:text-red-600 cursor-pointer border-l-4 border-transparent">
                <i class="fas fa-sign-out-alt text-lg mr-3 w-5"></i>
                <span>Déconnexion</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="relative h-full max-h-screen transition-all duration-200 ease-in-out xl:ml-68 rounded-xl">
        <!-- Navbar -->
        <nav class="relative flex flex-wrap items-center justify-between px-0 py-2 mx-6 transition-all ease-in shadow-none duration-250 rounded-2xl lg:flex-nowrap lg:justify-start">
          <div class="flex items-center justify-between w-full px-4 py-1 mx-auto flex-wrap-inherit">
            <nav>
              <ol class="flex flex-wrap pt-1 mr-12 bg-transparent rounded-lg sm:mr-16">
                <li class="text-sm leading-normal">
                  <a class="opacity-50 text-slate-700 dark:text-white" href="javascript:;">Admin</a>
                </li>
                <li class="text-sm pl-2 capitalize leading-normal text-slate-700 dark:text-white before:float-left before:pr-2 before:text-gray-600 before:content-['/']" aria-current="page">
                  {{ getCurrentPage() }}
                </li>
              </ol>
              <h6 class="mb-0 font-bold capitalize text-slate-700 dark:text-white">{{ getCurrentPage() }}</h6>
            </nav>

            <div class="flex items-center mt-2 grow sm:mt-0 sm:mr-6 md:mr-0 lg:flex lg:basis-auto">
              <div class="flex items-center md:ml-auto md:pr-4">
                <div class="relative flex flex-wrap items-stretch w-full transition-all rounded-lg ease">
                  <span class="text-sm ease leading-5.6 absolute z-50 -ml-px flex h-full items-center whitespace-nowrap rounded-lg rounded-tr-none rounded-br-none border border-r-0 border-transparent bg-transparent py-2 px-2.5 text-center font-normal text-slate-500 transition-all">
                    <i class="fas fa-search"></i>
                  </span>
                  <input type="text" class="pl-9 text-sm focus:shadow-primary-outline ease w-1/100 leading-5.6 relative -ml-px block min-w-0 flex-auto rounded-lg border border-solid border-gray-300 dark:bg-slate-850 dark:text-white bg-white bg-clip-padding py-2 pr-3 text-gray-700 transition-all placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:transition-shadow" placeholder="Rechercher..." />
                </div>
              </div>
              
              <ul class="flex flex-row justify-end pl-0 mb-0 list-none md-max:w-full">
                <li class="flex items-center">
                  <a class="block px-0 py-2 text-sm font-semibold transition-all ease-nav-brand text-slate-500 dark:text-white">
                    <i class="fa fa-user sm:mr-1"></i>
                    <span class="hidden sm:inline">{{ currentUser() }}</span>
                  </a>
                </li>
                <li class="flex items-center pl-4 xl:hidden">
                  <a (click)="toggleSidebar()" class="block p-0 text-sm transition-all ease-nav-brand text-slate-500 dark:text-white cursor-pointer">
                    <div class="w-4.5 overflow-hidden">
                      <i class="ease mb-0.75 relative block h-0.5 rounded-sm bg-slate-500 transition-all"></i>
                      <i class="ease mb-0.75 relative block h-0.5 rounded-sm bg-slate-500 transition-all"></i>
                      <i class="ease relative block h-0.5 rounded-sm bg-slate-500 transition-all"></i>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </nav>

        <!-- Page Content -->
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .h-sidenav {
      height: calc(100vh - 280px);
    }
    
    .xl\\:ml-68 {
      margin-left: 17rem;
    }
    
    .max-w-64 {
      max-width: 16rem;
    }
    
    .z-990 {
      z-index: 990;
    }
  `]
})
export class AdminLayoutComponent {
  authService = inject(AuthService);
  router = inject(Router);
  
  sidebarOpen = signal(false);
  currentUser = signal('Admin');

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.currentUser.set(user.username || user.email);
    }
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  getCurrentPage(): string {
    const url = this.router.url;
    const segments = url.split('/');
    return segments[segments.length - 1] || 'dashboard';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
