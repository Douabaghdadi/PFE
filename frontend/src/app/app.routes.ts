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
import { AdminProfileComponent } from './pages/admin/admin-profile/admin-profile.component';
import { PiloteDashboardComponent } from './pages/pilote-qualite/dashboard/dashboard.component';
import { PiloteFichesProjetListComponent } from './pages/pilote-qualite/fiches-projet-list/fiches-projet-list.component';
import { PiloteFicheProjetDetailComponent } from './pages/pilote-qualite/fiche-projet-detail/fiche-projet-detail.component';
import { PiloteFichesSuiviListComponent } from './pages/pilote-qualite/fiches-suivi-list/fiches-suivi-list.component';
import { PiloteFicheSuiviDetailComponent } from './pages/pilote-qualite/fiche-suivi-detail/fiche-suivi-detail.component';
import { ProjetKPIComponent } from './pages/pilote-qualite/projet-kpi/projet-kpi.component';
import { NotificationsComponent } from './pages/pilote-qualite/notifications/notifications.component';
import { FicheSuiviDetailComponent } from './pages/fiche-suivi-detail/fiche-suivi-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'fiche-projet/new', component: FicheProjetFormComponent },
  { path: 'fiche-projet/edit/:id', component: FicheProjetFormComponent },
  { path: 'fiche-suivi/new', component: FicheSuiviFormComponent },
  { path: 'fiche-suivi/edit/:id', component: FicheSuiviFormComponent },
  { path: 'fiche-suivi/:id', component: FicheSuiviDetailComponent },
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
      { path: 'profile', component: AdminProfileComponent },
    ]
  },
  {
    path: 'pilote-qualite',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: PiloteDashboardComponent },
      { path: 'fiches-projet', component: PiloteFichesProjetListComponent },
      { path: 'fiches-projet/:id', component: PiloteFicheProjetDetailComponent },
      { path: 'fiches-suivi', component: PiloteFichesSuiviListComponent },
      { path: 'fiches-suivi/:id', component: PiloteFicheSuiviDetailComponent },
      { path: 'projet-kpi/:id', component: ProjetKPIComponent },
      { path: 'notifications', component: NotificationsComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
