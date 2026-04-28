import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FicheProjetFormComponent } from './pages/fiche-projet-form/fiche-projet-form.component';
import { ProjetsListComponent } from './pages/projets-list/projets-list.component';
import { ProjetDetailComponent } from './pages/projet-detail/projet-detail.component';
import { FicheSuiviFormComponent } from './pages/fiche-suivi-form/fiche-suivi-form.component';
import { FichesSuiviListComponent } from './pages/fiches-suivi-list/fiches-suivi-list.component';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './pages/admin/admin-dashboard/admin-dashboard.component';
import { AdminUsersComponent } from './pages/admin/admin-users/admin-users.component';
import { AdminNomenclatureComponent } from './pages/admin/admin-nomenclature/admin-nomenclature.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'fiche-projet/new', component: FicheProjetFormComponent },
  { path: 'fiche-suivi/new', component: FicheSuiviFormComponent },
  { path: 'fiche-suivi/edit/:id', component: FicheSuiviFormComponent },
  { path: 'fiches-suivi', component: FichesSuiviListComponent },
  { path: 'projets', component: ProjetsListComponent },
  { path: 'projets/:id', component: ProjetDetailComponent },
  { path: 'dashboard', component: HomeComponent }, // Temporaire, à remplacer par un vrai dashboard
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'nomenclature', component: AdminNomenclatureComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
