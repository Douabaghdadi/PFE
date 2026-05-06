import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { PiloteQualiteFicheProjetService, FicheProjet } from '../../../services/pilote-qualite-fiche-projet.service';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  color: string;
  link: string;
}

@Component({
  selector: 'app-pilote-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class PiloteDashboardComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private router = inject(Router);

  loading = true;
  error: string | null = null;

  fichesProjet: FicheProjet[] = [];
  fichesSuivi: FicheSuivi[] = [];

  stats: StatCard[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    this.error = null;

    Promise.all([
      this.ficheProjetService.getAllFichesProjet().toPromise(),
      this.ficheSuiviService.getAllFichesSuivi().toPromise()
    ]).then(([projets, suivis]) => {
      this.fichesProjet = projets || [];
      this.fichesSuivi = suivis || [];
      this.calculateStats();
      this.loading = false;
    }).catch(err => {
      console.error('Erreur lors du chargement des données:', err);
      this.error = 'Erreur lors du chargement des données';
      this.loading = false;
    });
  }

  calculateStats() {
    const totalProjets = this.fichesProjet.length;
    const projetsEnCours = this.fichesProjet.filter(p => 
      p.statut?.toLowerCase() === 'en cours'
    ).length;
    const projetsTermines = this.fichesProjet.filter(p => 
      p.statut?.toLowerCase() === 'terminé'
    ).length;
    const totalSuivis = this.fichesSuivi.length;

    this.stats = [
      {
        title: 'Total Projets',
        value: totalProjets,
        icon: '📋',
        color: 'bg-blue-500',
        link: '/pilote-qualite/fiches-projet'
      },
      {
        title: 'Projets en Cours',
        value: projetsEnCours,
        icon: '⚡',
        color: 'bg-yellow-500',
        link: '/pilote-qualite/fiches-projet'
      },
      {
        title: 'Projets Terminés',
        value: projetsTermines,
        icon: '✅',
        color: 'bg-green-500',
        link: '/pilote-qualite/fiches-projet'
      },
      {
        title: 'Fiches de Suivi',
        value: totalSuivis,
        icon: '📊',
        color: 'bg-purple-500',
        link: '/pilote-qualite/fiches-suivi'
      }
    ];
  }

  navigateTo(link: string) {
    this.router.navigate([link]);
  }
}
