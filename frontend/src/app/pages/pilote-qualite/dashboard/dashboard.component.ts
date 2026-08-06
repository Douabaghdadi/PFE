import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PiloteQualiteFicheProjetService, FicheProjet, ProjetSuiviStatus } from '../../../services/pilote-qualite-fiche-projet.service';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';
import { ChatbotComponent } from '../../../components/chatbot/chatbot.component';

interface StatCard {
  title: string;
  value: number;
  icon: string;
  color: string;
  link: string;
}

interface KPIData {
  totalProjets: number;
  projetsEnCours: number;
  projetsTermines: number;
  projetsEnAttente: number;
  projetsAnnules: number;
  totalFichesSuivi: number;
  tauxCompletion: number;
  tauxProjetsEnCours: number;
  projetsEnRetard: number;
  totalTaches: number;
  totalProblemes: number;
  totalRisques: number;
  moyenneTachesParProjet: number;
  moyenneProblemsParProjet: number;
  budgetTotal: number;
  budgetMoyen: number;
  repartitionParType: { [key: string]: number };
  repartitionParStatut: { [key: string]: number };
  dateGeneration: string;
}

@Component({
  selector: 'app-pilote-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ChatbotComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class PiloteDashboardComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private router = inject(Router);
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  powerBiUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
    'https://app.powerbi.com/reportEmbed?reportId=TON_REPORT_ID&autoAuth=true&ctid=TON_TENANT_ID'
  );

  loading = true;
  error: string | null = null;

  fichesProjet: FicheProjet[] = [];
  fichesSuivi: FicheSuivi[] = [];
  projetsEnRetardSuivi: ProjetSuiviStatus[] = [];

  stats: StatCard[] = [];
  
  // KPI Data
  kpiData: KPIData | null = null;
  loadingKPI = false;
  downloadingReport = false;
  downloadSuccess = false;
  downloadError: string | null = null;

  ngOnInit() {
    this.loadData();
    this.loadKPIData();
    this.loadRetardAlerts();
  }

  loadRetardAlerts() {
    this.ficheProjetService.getProjetsSuiviStatus().subscribe({
      next: (status) => { this.projetsEnRetardSuivi = status; },
      error: () => {}
    });
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

  loadKPIData() {
    this.loadingKPI = true;
    const token = localStorage.getItem('token');
    
    this.ficheProjetService.getAllFichesProjet().subscribe({
      next: (projets) => {
        if (projets && projets.length > 0) {
          // Charger les KPI du premier projet disponible
          this.http.get<KPIData>(`http://localhost:8081/api/pilote-qualite/rapports/projet/${projets[0].id}/kpi`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }).subscribe({
            next: (data) => { this.kpiData = data; this.loadingKPI = false; },
            error: () => { this.loadingKPI = false; }
          });
        } else {
          this.loadingKPI = false;
        }
      },
      error: () => { this.loadingKPI = false; }
    });
  }

  refreshKPIData() {
    this.downloadSuccess = false;
    this.downloadError = null;
    this.loadKPIData();
  }

  downloadKPIReport(format: 'json' | 'csv') {
    this.downloadingReport = true;
    this.downloadSuccess = false;
    this.downloadError = null;
    
    const token = localStorage.getItem('token');
    
    if (!this.fichesProjet || this.fichesProjet.length === 0) {
      this.downloadError = 'Aucun projet disponible pour générer un rapport.';
      this.downloadingReport = false;
      return;
    }

    const projetId = this.fichesProjet[0].id;
    const url = `http://localhost:8081/api/pilote-qualite/rapports/projet/${projetId}/kpi/download/${format}`;
    
    this.http.get(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `rapport_kpi_${new Date().getTime()}.${format}`;
        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) filename = matches[1];
        }
        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
          this.downloadSuccess = true;
          setTimeout(() => this.downloadSuccess = false, 5000);
        }
        this.downloadingReport = false;
      },
      error: (err) => {
        this.downloadError = 'Erreur lors du téléchargement du rapport.';
        setTimeout(() => this.downloadError = null, 5000);
        this.downloadingReport = false;
      }
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
