import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { initiales, pl, statutDef, statutKey } from '../../shared/projet-stats';

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
  niveauSante: 'EXCELLENT' | 'BON' | 'ATTENTION' | 'CRITIQUE' | 'NON_EVALUE';
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

/**
 * Tonalité d'un indicateur. Elle colore un point, un texte ou une barre, mais le sens est toujours
 * écrit aussi (libellé, valeur) : la couleur ne porte jamais l'information seule.
 */
type Tone = 'ok' | 'warn' | 'danger' | 'neutral';

@Component({
  selector: 'app-projet-kpi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projet-kpi.component.html',
  styleUrls: ['../pilote-ui.css', '../../shared/detail-ui.css', '../../shared/lecture-ui.css', './projet-kpi.component.css']
})
export class ProjetKPIComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);

  projetId = '';
  kpiData: ProjetKPI | null = null;
  loading = true;
  error: string | null = null;
  downloading: 'pdf' | 'excel' | null = null;
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
  trendSummary = '';
  readonly chartWidth = 640;
  readonly chartHeight = 220;
  readonly chartPadding = { top: 20, right: 44, bottom: 34, left: 48 };
  /** Écart entre l'axe et le premier point (et entre le dernier point et le bord) : les étiquettes ne se chevauchent pas. */
  private readonly chartInset = 16;
  readonly gridLevels = [100, 75, 50, 25, 0];

  readonly pl = pl;
  readonly initiales = initiales;

  ngOnInit() {
    const projetId = this.route.snapshot.paramMap.get('id');
    if (projetId) {
      this.projetId = projetId;
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

  retry() {
    if (this.projetId) this.loadKPIData(this.projetId);
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
      { label: 'Terminées', value: data.tachesTerminees, color: '#09c82c' },
      { label: 'En cours', value: data.tachesEnCours, color: '#3b6cc4' },
      { label: 'Non démarrées', value: data.tachesNonDemarrees, color: '#c3d4ca' }
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
    this.trendSummary = '';
    if (!historique || historique.length === 0) return;

    const { top, right, bottom, left } = this.chartPadding;
    const innerWidth = this.chartWidth - left - right;
    const innerHeight = this.chartHeight - top - bottom;
    const baseline = top + innerHeight;

    const trackWidth = innerWidth - 2 * this.chartInset;
    this.trendPoints = historique.map((point, index) => ({
      x: historique.length === 1
        ? left + innerWidth / 2
        : left + this.chartInset + (index / (historique.length - 1)) * trackWidth,
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

    this.trendSummary = `Courbe d'avancement sur ${this.trendPoints.length} relevés, de ${Math.round(premier.value)} % à ${Math.round(dernier.value)} %.`;
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
    const filled = (this.clampPercent(this.kpiData?.scoreSante || 0) / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  scoreRatio(composante: ComposanteScore): number {
    return composante.pointsMax > 0 ? (composante.points / composante.pointsMax) * 100 : 0;
  }

  /* ---------------- Tonalités et libellés d'état ---------------- */

  /** Classe de pastille (celles des statuts de projet) correspondant à une tonalité. */
  pillTone(tone: Tone): string {
    switch (tone) {
      case 'ok': return 'pill-termine';
      case 'warn': return 'pill-en_attente';
      case 'danger': return 'pill-annule';
      default: return 'pill-autre';
    }
  }

  composanteTone(composante: ComposanteScore): Tone {
    const ratio = this.scoreRatio(composante);
    if (ratio >= 80) return 'ok';
    if (ratio >= 50) return 'warn';
    return 'danger';
  }

  /** Sans fiche de suivi, le projet n'a pas de score : on affiche « Non évalué » plutôt qu'une note. */
  scoreEvalue(): boolean {
    return this.kpiData?.niveauSante !== 'NON_EVALUE';
  }

  healthTone(): Tone {
    switch (this.kpiData?.niveauSante) {
      case 'EXCELLENT':
      case 'BON': return 'ok';
      case 'ATTENTION': return 'warn';
      case 'NON_EVALUE': return 'neutral';
      default: return 'danger';
    }
  }

  getHealthLabel(): string {
    switch (this.kpiData?.niveauSante) {
      case 'EXCELLENT': return 'Excellent';
      case 'BON': return 'Bon';
      case 'ATTENTION': return 'Attention';
      case 'NON_EVALUE': return 'Non évalué';
      default: return 'Critique';
    }
  }

  getHealthDescription(): string {
    switch (this.kpiData?.niveauSante) {
      case 'EXCELLENT': return 'Les indicateurs sont au vert sur les quatre axes de pilotage.';
      case 'BON': return 'Le projet avance correctement, avec quelques points de vigilance.';
      case 'ATTENTION': return 'Plusieurs indicateurs se dégradent : un arbitrage est nécessaire.';
      case 'NON_EVALUE': return 'Aucune fiche de suivi : le score sera calculé dès le premier dépôt.';
      default: return 'Le projet est en difficulté, une intervention rapide est recommandée.';
    }
  }

  /** Lecture du SPI : nettement au-dessus de 1 le projet est en avance, autour de 1 il est conforme. */
  getSpiLabel(): string {
    if (!this.kpiData || this.kpiData.tauxAvancementPlanifie <= 0) return 'Planning non exploitable';
    const spi = this.kpiData.spi;
    if (spi > 1.05) return 'En avance sur le planning';
    if (spi >= 0.9) return 'Conforme au planning';
    if (spi >= 0.8) return 'Léger retrait';
    return 'Retard significatif';
  }

  spiTone(): Tone {
    if (!this.kpiData || this.kpiData.tauxAvancementPlanifie <= 0) return 'neutral';
    if (this.kpiData.spi >= 0.9) return 'ok';
    if (this.kpiData.spi >= 0.8) return 'warn';
    return 'danger';
  }

  ecartTone(): Tone {
    const ecart = this.kpiData?.ecartPlanning || 0;
    if (ecart >= 0) return 'ok';
    if (ecart >= -10) return 'warn';
    return 'danger';
  }

  /** Évolution depuis la fiche précédente : un recul inquiète, une absence de changement n'a pas de couleur. */
  deltaTone(): Tone {
    const delta = this.kpiData?.deltaAvancement || 0;
    if (delta > 0) return 'ok';
    return delta < 0 ? 'warn' : 'neutral';
  }

  efficaciteTone(): Tone {
    const cpi = this.kpiData?.indiceEfficacite || 0;
    if (cpi >= 1) return 'ok';
    if (cpi >= 0.8) return 'warn';
    return 'danger';
  }

  /** Une consommation (charge ou budget) qui dépasse l'avancement de plus de 15 points inquiète. */
  consommationTone(taux: number): Tone {
    return taux > (this.kpiData?.tauxAvancement || 0) + 15 ? 'danger' : 'ok';
  }

  alerteTone(niveau: string): Tone {
    switch (niveau) {
      case 'CRITIQUE': return 'danger';
      case 'MAJEUR': return 'warn';
      default: return 'neutral';
    }
  }

  alerteLabel(niveau: string): string {
    switch (niveau) {
      case 'CRITIQUE': return 'Critique';
      case 'MAJEUR': return 'Majeure';
      default: return 'Mineure';
    }
  }

  alertesBloquantes(): number {
    if (!this.kpiData) return 0;
    return this.kpiData.alertes.filter(a => a.niveau === 'CRITIQUE' || a.niveau === 'MAJEUR').length;
  }

  statutPill(statut: string): string {
    return 'pill-' + statutKey(statut);
  }

  formatStatut(statut: string): string {
    return statut ? statutDef(statut).label : '-';
  }

  getProgressLabel(percentage: number): string {
    if (percentage >= 75) return 'Excellent progrès';
    if (percentage >= 50) return 'Bon avancement';
    if (percentage >= 25) return 'En cours';
    return 'Démarrage';
  }

  /* ---------------- Calendrier ---------------- */

  getDurationDays(): number | null {
    if (!this.kpiData?.dateDebut || !this.kpiData?.dateFinPrevue) return null;
    const start = new Date(this.kpiData.dateDebut).getTime();
    const end = new Date(this.kpiData.dateFinPrevue).getTime();
    if (isNaN(start) || isNaN(end) || end < start) return null;
    return Math.round((end - start) / 86400000);
  }

  /**
   * Retard de livraison d'un projet livré (fin réelle - fin prévue, en jours), null s'il n'est pas livré :
   * une fois le projet clos, le retard « à date » vaut 0 et ne dit plus rien de la livraison.
   */
  getRetardLivraison(): number | null {
    if (!this.kpiData?.dateFinReelle || !this.kpiData?.dateFinPrevue) return null;
    const prevue = new Date(this.kpiData.dateFinPrevue).getTime();
    const reelle = new Date(this.kpiData.dateFinReelle).getTime();
    if (isNaN(prevue) || isNaN(reelle)) return null;
    return Math.round((reelle - prevue) / 86400000);
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
    // L'espace fine insécable de fr-FR est presque invisible à grande taille : une espace insécable ordinaire se lit mieux
    return (budgetMD * 1000000).toLocaleString('fr-FR', { maximumFractionDigits: 0 }).replace(/ /g, ' ');
  }

  /* ---------------- Export ---------------- */

  downloadPDF() {
    this.downloadReport('pdf');
  }

  downloadExcel() {
    this.downloadReport('excel');
  }

  private downloadReport(format: 'pdf' | 'excel') {
    if (!this.kpiData || this.downloading) return;

    this.downloading = format;
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

        this.downloading = null;
        this.downloadSuccess = true;
        setTimeout(() => this.downloadSuccess = false, 3000);
      },
      error: (err) => {
        console.error('Erreur lors du téléchargement:', err);
        this.downloading = null;
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

  aiRiskTone(niveau: string): Tone {
    switch (niveau) {
      case 'FAIBLE': return 'ok';
      case 'MOYEN': return 'warn';
      case 'ELEVE':
      case 'CRITIQUE': return 'danger';
      default: return 'neutral';
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

  aiConfianceTone(niveau: string): Tone {
    switch (niveau) {
      case 'ELEVE': return 'ok';
      case 'MOYEN': return 'warn';
      case 'FAIBLE': return 'danger';
      default: return 'neutral';
    }
  }

  aiScoreTone(score: number): Tone {
    if (score >= 60) return 'ok';
    if (score >= 40) return 'warn';
    return 'danger';
  }

  tendanceLabel(tendance: string): string {
    switch (tendance) {
      case 'POSITIVE': return 'En amélioration';
      case 'NEGATIVE': return 'En dégradation';
      default: return 'Stable';
    }
  }

  tendanceTone(tendance: string): Tone {
    switch (tendance) {
      case 'POSITIVE': return 'ok';
      case 'NEGATIVE': return 'danger';
      default: return 'neutral';
    }
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
