import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FicheProjetFormComponent } from './pages/fiche-projet-form/fiche-projet-form.component';
import { ProjetsListComponent } from './pages/projets-list/projets-list.component';
import { ProjetDetailComponent } from './pages/projet-detail/projet-detail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'fiche-projet/new', component: FicheProjetFormComponent },
  { path: 'projets', component: ProjetsListComponent },
  { path: 'projets/:id', component: ProjetDetailComponent },
  { path: 'dashboard', component: HomeComponent }, // Temporaire, à remplacer par un vrai dashboard
  { path: '**', redirectTo: '' }
];
