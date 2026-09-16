import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

/** Lecture d'un axe de pilotage par l'IA. */
interface AxeAnalyseIA {
  axe: string;
  constat: string;
  tendance: 'POSITIVE' | 'STABLE' | 'NEGATIVE';
}

/** Action corrective proposée par l'IA, priorisée. */
interface ActionIA {
  priorite: number;
  titre: string;
  description: string;
  impactAttendu: string;
  delai: string;
}

interface AIKPIReport {
  scorePerformance: number;
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE' | 'CRITIQUE';
  niveauConfiance: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  syntheseExecutive: string;
  predictionDateFin: string;
  justificationPrediction: string;
  axes: AxeAnalyseIA[];
  forces: string[];
  pointsDeVigilance: string[];
  actions: ActionIA[];
  alertes: string[];
  genereLe?: string;
  modele?: string;
  depuisCache: boolean;
  success: boolean;
  errorMessage?: string;
}

interface MembreEquipe {
  nom: string;
  role?: string;
}

interface TacheKPI {
  code?: string;
  sujet: string;
  assigneA?: string;
  echeance?: string;
  pourcentageRealise: number;
  statut?: string;
  joursEcart: number;
}

interface ChargeMembre {
  nom: string;
  nombreTaches: number;
  tachesTerminees: number;
  tachesEnRetard: number;
  avancementMoyen: number;
  chargeEstimee: number;
  chargeConsommee: number;
}

interface PointHistorique {
  date?: string;
  numeroRapport?: string;
  tauxAvancement: number;
  nombreProblemes: number;
  nombreRisques: number;
}

interface ComposanteScore {
  libelle: string;
  points: number;
  pointsMax: number;
  commentaire: string;
}

interface AlerteKPI {
  niveau: 'CRITIQUE' | 'MAJEUR' | 'MINEUR';
  categorie: string;
  titre: string;
  message: string;
}

interface ProjetKPI {
  projetId: string;
  nomProjet: string;
  statut: string;
  dateDebut: string;
  dateFinPrevue: string;
  dateFinReelle?: string;

  nombreFichesSuivi: number;
  dateDerniereFiche?: string;
  numeroDerniereFiche?: string;

  tauxAvancement: number;
  tauxAvancementPlanifie: number;
  ecartPlanning: number;
  spi: number;
  joursRetard: number;
  dateFinProjetee?: string;
  joursDerapageProjete: number;
  deltaAvancement: number;

  totalTaches: number;
  tachesTerminees: number;
  tachesEnCours: number;
  tachesNonDemarrees: number;
  tachesEnRetard: number;
  tachesEcheanceProche: number;
  tauxRespectEcheances: number;
  listeTachesEnRetard: TacheKPI[];
  listeTachesEcheanceProche: TacheKPI[];

  chargeEstimee: number;
  chargeConsommee: number;
  chargeRestanteEstimee: number;
  tauxConsommationCharge: number;
  indiceEfficacite: number;

  nombreProblemes: number;
  nombreProblemesPersistants: number;
  nombreRisques: number;
  nombreRecommandations: number;
  listeProblemes: string[];
  listeRisques: string[];
  listeRecommandations: string[];

  budgetTotal: number;
  budgetPrevision: number;
  budgetRealisation: number;
  ecartBudget: number;
  tauxConsommationBudget: number;

  tailleEquipe: number;
  listeMembresEquipe?: MembreEquipe[];
  chargeParMembre: ChargeMembre[];

  scoreSante: number;
  niveauSante: 'EXCELLENT' | 'BON' | 'ATTENTION' | 'CRITIQUE';
  detailScore: ComposanteScore[];
  alertes: AlerteKPI[];
  historique: PointHistorique[];
}

/** Segment du donut de répartition des tâches. */
interface DonutSegment {
  label: string;
  value: number;
  color: string;
  dashArray: string;
  dashOffset: number;
  percent: number;
}

/** Point projeté dans le repère de la courbe d'évolution. */
interface TrendPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

@Component({
  selector: 'app-projet-kpi',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './projet-kpi.component.html',
  styleUrls: ['./projet-kpi.component.css']
})
export class ProjetKPIComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  kpiData: ProjetKPI | null = null;
  loading = true;
  error: string | null = null;
  downloading = false;
  downloadSuccess = false;
  downloadError: string | null = null;

  activeTab: 'classique' | 'ia' = 'classique';
  aiKpiData: AIKPIReport | null = null;
  loadingAI = false;
  aiError: string | null = null;

  teamMembers: MembreEquipe[] = [];
  teamOverflow = 0;

  // Séries graphiques préparées au chargement plutôt que recalculées à chaque cycle de rendu.
  donutSegments: DonutSegment[] = [];
  readonly donutRadius = 56;
  readonly donutCircumference = 2 * Math.PI * 56;

  trendPoints: TrendPoint[] = [];
  trendLine = '';
  trendArea = '';
  readonly chartWidth = 640;
  readonly chartHeight = 220;
  readonly chartPadding = { top: 16, right: 20, bottom: 34, left: 40 };
  readonly gridLevels = [100, 75, 50, 25, 0];

  ngOnInit() {
    const projetId = this.route.snapshot.paramMap.get('id');
    if (projetId) {
      this.loadKPIData(projetId);
    } else {
      this.error = 'ID du projet non fourni';
      this.loading = false;
    }
  }

  loadKPIData(projetId: string) {
    this.loading = true;
    this.error = null;

    // Le jeton est ajouté par authInterceptor : aucun en-tête à poser ici.
    this.http.get<ProjetKPI>(`${environment.apiUrl}/api/pilote-qualite/rapports/projet/${projetId}/kpi`).subscribe({
      next: (data) => {
        this.kpiData = this.withDefaults(data);
        this.prepareCharts(this.kpiData);

        const membres = this.kpiData.listeMembresEquipe || [];
        this.teamMembers = membres.slice(0, 6);
        this.teamOverflow = Math.max(0, membres.length - 6);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des KPI:', err);
        this.error = 'Erreur lors du chargement des KPI du projet';
        this.loading = false;
      }
    });
  }

  /** Les listes absentes de la réponse sont normalisées pour simplifier le template. */
  private withDefaults(data: ProjetKPI): ProjetKPI {
    return {
      ...data,
      listeProblemes: data.listeProblemes || [],
      listeRisques: data.listeRisques || [],
      listeRecommandations: data.listeRecommandations || [],
      listeTachesEnRetard: data.listeTachesEnRetard || [],
      listeTachesEcheanceProche: data.listeTachesEcheanceProche || [],
      chargeParMembre: data.chargeParMembre || [],
      detailScore: data.detailScore || [],
      alertes: data.alertes || [],
      historique: data.historique || []
    };
  }

  private prepareCharts(data: ProjetKPI) {
    this.donutSegments = this.buildDonut(data);
    this.buildTrend(data.historique);
  }

  /* ---------------- Donut de répartition des tâches ---------------- */

  private buildDonut(data: ProjetKPI): DonutSegment[] {
    const parts = [
      { label: 'Terminées', value: data.tachesTerminees, color: '#09C82C' },
      { label: 'En cours', value: data.tachesEnCours, color: '#3b82f6' },
      { label: 'Non démarrées', value: data.tachesNonDemarrees, color: '#cbd5e1' }
    ].filter(part => part.value > 0);

    const total = parts.reduce((sum, part) => sum + part.value, 0);
    if (total === 0) return [];

    let cumul = 0;
    return parts.map(part => {
      const longueur = (part.value / total) * this.donutCircumference;
      const segment: DonutSegment = {
        ...part,
        percent: (part.value / total) * 100,
        dashArray: `${longueur} ${this.donutCircumference - longueur}`,
        dashOffset: -cumul
      };
      cumul += longueur;
      return segment;
    });
  }

  /* ---------------- Courbe d'évolution de l'avancement ---------------- */

  private buildTrend(historique: PointHistorique[]) {
    this.trendPoints = [];
    this.trendLine = '';
    this.trendArea = '';
    if (!historique || historique.length === 0) return;

    const { top, right, bottom, left } = this.chartPadding;
    const innerWidth = this.chartWidth - left - right;
    const innerHeight = this.chartHeight - top - bottom;
    const baseline = top + innerHeight;

    this.trendPoints = historique.map((point, index) => ({
      x: historique.length === 1
        ? left + innerWidth / 2
        : left + (index / (historique.length - 1)) * innerWidth,
      y: baseline - (Math.max(0, Math.min(100, point.tauxAvancement)) / 100) * innerHeight,
      value: point.tauxAvancement,
      label: this.formatShortDate(point.date) || point.numeroRapport || `#${index + 1}`
    }));

    this.trendLine = this.trendPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const premier = this.trendPoints[0];
    const dernier = this.trendPoints[this.trendPoints.length - 1];
    this.trendArea = `M ${premier.x.toFixed(1)} ${baseline} L `
      + this.trendPoints.map(p => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')
      + ` L ${dernier.x.toFixed(1)} ${baseline} Z`;
  }

  gridY(level: number): number {
    const { top, bottom } = this.chartPadding;
    const innerHeight = this.chartHeight - top - bottom;
    return top + innerHeight - (level / 100) * innerHeight;
  }

  /* ---------------- Barres et jauges ---------------- */

  clampPercent(valeur: number): number {
    return Math.max(0, Math.min(100, valeur || 0));
  }

  getHealthRingCircumference(): number {
    return 2 * Math.PI * 42;
  }

  getHealthRingDashArray(): string {
    const circumference = this.getHealthRingCircumference();
    const filled = ((this.kpiData?.scoreSante || 0) / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  scoreRatio(composante: ComposanteScore): number {
    return composante.pointsMax > 0 ? (composante.points / composante.pointsMax) * 100 : 0;
  }

  scoreColor(composante: ComposanteScore): string {
    const ratio = this.scoreRatio(composante);
    if (ratio >= 80) return '#09C82C';
    if (ratio >= 50) return '#f59e0b';
    return '#ef4444';
  }

  /* ---------------- Libellés et couleurs d'état ---------------- */

  getHealthScoreColor(): string {
    const score = this.kpiData?.scoreSante || 0;
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  getHealthIcon(): string {
    switch (this.kpiData?.niveauSante) {
      case 'EXCELLENT': return '🚀';
      case 'BON': return '👍';
      case 'ATTENTION': return '⚠️';
      default: return '🚨';
    }
  }

  getHealthLabel(): string {
    switch (this.kpiData?.niveauSante) {
      case 'EXCELLENT': return 'Excellent';
      case 'BON': return 'Bon';
      case 'ATTENTION': return 'Attention';
      default: return 'Critique';
    }
  }

  getHealthDescription(): string {
    switch (this.kpiData?.niveauSante) {
      case 'EXCELLENT': return 'Les indicateurs sont au vert sur les quatre axes de pilotage.';
      case 'BON': return 'Le projet avance correctement, avec quelques points de vigilance.';
      case 'ATTENTION': return 'Plusieurs indicateurs se dégradent : un arbitrage est nécessaire.';
      default: return 'Le projet est en difficulté, une intervention rapide est recommandée.';
    }
  }

  /** Lecture du SPI : au-dessus de 1 le projet est en avance sur son planning. */
  getSpiLabel(): string {
    if (!this.kpiData || this.kpiData.tauxAvancementPlanifie <= 0) return 'Planning non exploitable';
    const spi = this.kpiData.spi;
    if (spi >= 1) return 'En avance sur le planning';
    if (spi >= 0.9) return 'Conforme au planning';
    if (spi >= 0.8) return 'Léger retrait';
    return 'Retard significatif';
  }

  getSpiColor(): string {
    if (!this.kpiData || this.kpiData.tauxAvancementPlanifie <= 0) return '#64748b';
    if (this.kpiData.spi >= 0.9) return '#09C82C';
    if (this.kpiData.spi >= 0.8) return '#f59e0b';
    return '#ef4444';
  }

  getEcartColor(): string {
    const ecart = this.kpiData?.ecartPlanning || 0;
    if (ecart >= 0) return '#09C82C';
    if (ecart >= -10) return '#f59e0b';
    return '#ef4444';
  }

  getEfficaciteColor(): string {
    const cpi = this.kpiData?.indiceEfficacite || 0;
    if (cpi >= 1) return '#09C82C';
    if (cpi >= 0.8) return '#f59e0b';
    return '#ef4444';
  }

  getAlerteIcon(niveau: string): string {
    switch (niveau) {
      case 'CRITIQUE': return '🚨';
      case 'MAJEUR': return '⚠️';
      default: return 'ℹ️';
    }
  }

  alertesBloquantes(): number {
    if (!this.kpiData) return 0;
    return this.kpiData.alertes.filter(a => a.niveau === 'CRITIQUE' || a.niveau === 'MAJEUR').length;
  }

  getStatusStyle(statut: string): string {
    let bg = '';
    switch (statut?.toUpperCase()) {
      case 'EN_COURS': bg = 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);'; break;
      case 'TERMINE': bg = 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);'; break;
      case 'EN_ATTENTE': bg = 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);'; break;
      case 'ANNULE': bg = 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);'; break;
      default: bg = 'background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);';
    }
    return bg + ' color: white;';
  }

  formatStatut(statut: string): string {
    switch (statut?.toUpperCase()) {
      case 'EN_COURS': return 'En cours';
      case 'TERMINE': return 'Terminé';
      case 'EN_ATTENTE': return 'En attente';
      case 'ANNULE': return 'Annulé';
      default: return statut || '-';
    }
  }

  getProgressStyle(percentage: number): string {
    if (percentage >= 75) return 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);';
    if (percentage >= 50) return 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);';
    if (percentage >= 25) return 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);';
    return 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);';
  }

  getProgressLabel(percentage: number): string {
    if (percentage >= 75) return 'Excellent progrès';
    if (percentage >= 50) return 'Bon avancement';
    if (percentage >= 25) return 'En cours';
    return 'Démarrage';
  }

  getInitials(nom: string): string {
    if (!nom) return '?';
    const parts = nom.trim().split(/\s+/);
    const initials = parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0].slice(0, 2);
    return initials.toUpperCase();
  }

  /* ---------------- Calendrier ---------------- */

  getDurationDays(): number | null {
    if (!this.kpiData?.dateDebut || !this.kpiData?.dateFinPrevue) return null;
    const start = new Date(this.kpiData.dateDebut).getTime();
    const end = new Date(this.kpiData.dateFinPrevue).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return Math.round((end - start) / 86400000);
  }

  getTimelineProgress(): number {
    if (!this.kpiData?.dateDebut || !this.kpiData?.dateFinPrevue) return 0;
    const start = new Date(this.kpiData.dateDebut).getTime();
    const end = new Date(this.kpiData.dateFinPrevue).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return 0;
    return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return date; }
  }

  formatShortDate(date: string | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  /** Les budgets sont saisis en MD (millions de dinars) ; l'affichage détaillé se fait en dinars. */
  formatBudget(budgetMD: number): string {
    if (!budgetMD) return '0';
    return (budgetMD * 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  }

  /* ---------------- Export ---------------- */

  downloadPDF() {
    this.downloadReport('pdf');
  }

  downloadExcel() {
    this.downloadReport('excel');
  }

  private downloadReport(format: 'pdf' | 'excel') {
    if (!this.kpiData) return;

    this.downloading = true;
    this.downloadSuccess = false;
    this.downloadError = null;
    const url = `${environment.apiUrl}/api/pilote-qualite/rapports/projet/${this.kpiData.projetId}/kpi/download/${format}`;

    this.http.get(url, {
      responseType: 'blob',
      observe: 'response'
    }).subscribe({
      next: (response) => {
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `rapport_kpi_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

        if (contentDisposition) {
          const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (matches && matches[1]) {
            filename = matches[1];
          }
        }

        const blob = response.body;
        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          window.URL.revokeObjectURL(url);
        }

        this.downloading = false;
        this.downloadSuccess = true;
        setTimeout(() => this.downloadSuccess = false, 3000);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement:', err);
        this.downloading = false;
        this.downloadError = 'Erreur lors du téléchargement';
        setTimeout(() => this.downloadError = null, 3000);
      }
    });
  }

  /* ---------------- Onglet IA ---------------- */

  setTab(tab: 'classique' | 'ia') {
    this.activeTab = tab;
  }

  /**
   * @param forceRefresh relance le modèle au lieu de réutiliser l'analyse mise en cache
   *                     côté serveur tant que les KPI n'ont pas bougé.
   */
  analyzeWithAI(forceRefresh = false) {
    if (!this.kpiData) return;
    this.loadingAI = true;
    this.aiError = null;

    const url = `${environment.apiUrl}/api/pilote-qualite/rapports/projet/${this.kpiData.projetId}/kpi/ai`
      + (forceRefresh ? '?refresh=true' : '');

    this.http.get<AIKPIReport>(url).subscribe({
      next: (data) => {
        this.aiKpiData = this.withAIDefaults(data);
        this.loadingAI = false;
        this.activeTab = 'ia';
      },
      error: () => {
        this.aiError = 'Impossible de joindre le service d\'analyse IA.';
        this.loadingAI = false;
      }
    });
  }

  /** Normalise les listes absentes pour que le template n'ait pas à se protéger partout. */
  private withAIDefaults(data: AIKPIReport): AIKPIReport {
    return {
      ...data,
      axes: data.axes || [],
      forces: data.forces || [],
      pointsDeVigilance: data.pointsDeVigilance || [],
      actions: data.actions || [],
      alertes: data.alertes || []
    };
  }

  getAIRiskStyle(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
      case 'MOYEN': return 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
      case 'ELEVE': return 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;';
      case 'CRITIQUE': return 'background:#4c0519; color:#fecdd3; border:1px solid #e11d48;';
      default: return 'background:#f3f4f6; color:#374151;';
    }
  }

  getAIRiskLabel(niveau: string): string {
    switch (niveau) {
      case 'FAIBLE': return 'Faible';
      case 'MOYEN': return 'Moyen';
      case 'ELEVE': return 'Élevé';
      case 'CRITIQUE': return 'Critique';
      default: return '–';
    }
  }

  /** La confiance dit à quel point les données disponibles étayent l'analyse. */
  getAIConfianceLabel(niveau: string): string {
    switch (niveau) {
      case 'ELEVE': return 'Confiance élevée';
      case 'MOYEN': return 'Confiance moyenne';
      case 'FAIBLE': return 'Confiance faible';
      default: return 'Confiance non évaluée';
    }
  }

  getAIConfianceColor(niveau: string): string {
    switch (niveau) {
      case 'ELEVE': return '#09C82C';
      case 'MOYEN': return '#f59e0b';
      case 'FAIBLE': return '#ef4444';
      default: return '#64748b';
    }
  }

  getAIScoreColor(score: number): string {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  getTendanceIcon(tendance: string): string {
    switch (tendance) {
      case 'POSITIVE': return '▲';
      case 'NEGATIVE': return '▼';
      default: return '▬';
    }
  }

  getTendanceColor(tendance: string): string {
    switch (tendance) {
      case 'POSITIVE': return '#09C82C';
      case 'NEGATIVE': return '#ef4444';
      default: return '#64748b';
    }
  }

  getAxeIcon(axe: string): string {
    const normalise = (axe || '').toLowerCase();
    if (normalise.includes('délai') || normalise.includes('delai')) return '⏱️';
    if (normalise.includes('charge')) return '⚙️';
    if (normalise.includes('qualité') || normalise.includes('qualite')) return '🛡️';
    if (normalise.includes('budget')) return '💰';
    return '📌';
  }

  /** Compare le verdict de l'IA au score calculé par les règles déterministes. */
  getEcartAvecScoreCalcule(): number | null {
    if (!this.aiKpiData?.success || !this.kpiData) return null;
    return Math.round(this.aiKpiData.scorePerformance - this.kpiData.scoreSante);
  }

  goBack() {
    this.router.navigate(['/pilote-qualite/fiches-projet']);
  }
}
