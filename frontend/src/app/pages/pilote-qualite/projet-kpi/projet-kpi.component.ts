import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface AIKPIReport {
  scorePerformanceIA: string;
  niveauRisque: string;
  predictionDateFin: string;
  analyseGlobale: string;
  recommandationsIA: string;
  alertes: string;
  success: boolean;
  errorMessage?: string;
}

interface ProjetKPI {
  projetId: string;
  nomProjet: string;
  statut: string;
  dateDebut: string;
  dateFinPrevue: string;
  dateFinReelle?: string;
  tauxAvancement: number;
  joursRetard: number;
  nombreProblemes: number;
  nombreRisques: number;
  listeProblemes: string[];
  listeRisques: string[];
  budgetTotal: number;
  budgetMateriel: number;
  budgetLogiciel: number;
  budgetRessourcesHumaines: number;
  tailleEquipe: number;
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
    const token = localStorage.getItem('token');

    this.http.get<ProjetKPI>(`http://localhost:8081/api/pilote-qualite/rapports/projet/${projetId}/kpi`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        console.log('KPI Data received:', data);
        // Initialiser les listes si elles sont undefined
        if (!data.listeProblemes) data.listeProblemes = [];
        if (!data.listeRisques) data.listeRisques = [];
        this.kpiData = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des KPI:', err);
        this.error = 'Erreur lors du chargement des KPI du projet';
        this.loading = false;
      }
    });
  }

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
    const token = localStorage.getItem('token');
    const url = `http://localhost:8081/api/pilote-qualite/rapports/projet/${this.kpiData.projetId}/kpi/download/${format}`;

    this.http.get(url, {
      headers: { 'Authorization': `Bearer ${token}` },
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

  setTab(tab: 'classique' | 'ia') {
    this.activeTab = tab;
  }

  analyzeWithAI() {
    if (!this.kpiData) return;
    this.loadingAI = true;
    this.aiError = null;
    const token = localStorage.getItem('token');

    this.http.get<AIKPIReport>(
      `http://localhost:8081/api/pilote-qualite/rapports/projet/${this.kpiData.projetId}/kpi/ai`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    ).subscribe({
      next: (data) => {
        this.aiKpiData = data;
        this.loadingAI = false;
        this.activeTab = 'ia';
      },
      error: () => {
        this.aiError = 'Erreur lors de l\'analyse IA';
        this.loadingAI = false;
      }
    });
  }

  getAIRiskStyle(niveau: string): string {
    switch (niveau?.toUpperCase()) {
      case 'FAIBLE': return 'background:#d1fae5; color:#065f46; border:1px solid #6ee7b7;';
      case 'MOYEN': return 'background:#fef3c7; color:#92400e; border:1px solid #fcd34d;';
      case 'ÉLEVÉ': return 'background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;';
      case 'CRITIQUE': return 'background:#4c0519; color:#fecdd3; border:1px solid #e11d48;';
      default: return 'background:#f3f4f6; color:#374151;';
    }
  }

  getAIRecommandations(): string[] {
    if (!this.aiKpiData?.recommandationsIA) return [];
    return this.aiKpiData.recommandationsIA.split('|').map(r => r.trim()).filter(r => r.length > 0);
  }

  getAIAlertes(): string[] {
    if (!this.aiKpiData?.alertes || this.aiKpiData.alertes === 'Aucune alerte') return [];
    return this.aiKpiData.alertes.split('|').map(a => a.trim()).filter(a => a.length > 0);
  }

  goBack() {
    this.router.navigate(['/pilote-qualite/fiches-projet']);
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

  getProgressStyle(percentage: number): string {
    let bg = '';
    if (percentage >= 75) bg = 'background: linear-gradient(135deg, #10b981 0%, #059669 100%);';
    else if (percentage >= 50) bg = 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);';
    else if (percentage >= 25) bg = 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);';
    else bg = 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);';
    return bg;
  }

  getProgressLabel(percentage: number): string {
    if (percentage >= 75) return 'Excellent progrès';
    if (percentage >= 50) return 'Bon avancement';
    if (percentage >= 25) return 'En cours';
    return 'Démarrage';
  }

  getHealthIcon(): string {
    const score = this.calculateHealthScore();
    if (score >= 80) return '🚀';
    if (score >= 60) return '👍';
    if (score >= 40) return '⚠️';
    return '🚨';
  }

  getHealthLabel(): string {
    const score = this.calculateHealthScore();
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Attention';
    return 'Critique';
  }

  getHealthDescription(): string {
    const score = this.calculateHealthScore();
    if (score >= 80) return 'Le projet progresse très bien, continuez ainsi !';
    if (score >= 60) return 'Le projet avance correctement avec quelques points d\'attention.';
    if (score >= 40) return 'Le projet nécessite une attention particulière.';
    return 'Le projet est en difficulté, intervention urgente recommandée.';
  }

  getHealthStyle(): string {
    const score = this.calculateHealthScore();
    if (score >= 80) return 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;';
    if (score >= 60) return 'background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;';
    if (score >= 40) return 'background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;';
    return 'background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white;';
  }

  calculateHealthScore(): number {
    if (!this.kpiData) return 0;
    
    let score = 0;
    
    // Avancement (40 points max)
    score += (this.kpiData.tauxAvancement / 100) * 40;
    
    // Problèmes (30 points max, pénalité)
    const problemPenalty = Math.min(this.kpiData.nombreProblemes * 5, 30);
    score += 30 - problemPenalty;
    
    // Risques (20 points max, pénalité)
    const riskPenalty = Math.min(this.kpiData.nombreRisques * 5, 20);
    score += 20 - riskPenalty;
    
    // Retard (10 points max, pénalité)
    if (this.kpiData.joursRetard === 0) {
      score += 10;
    } else if (this.kpiData.joursRetard <= 7) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  getAvancementScore(): number {
    if (!this.kpiData) return 0;
    return Math.round((this.kpiData.tauxAvancement / 100) * 40);
  }

  getProblemsScore(): number {
    if (!this.kpiData) return 0;
    const penalty = Math.min(this.kpiData.nombreProblemes * 5, 30);
    return 30 - penalty;
  }

  getRisksScore(): number {
    if (!this.kpiData) return 0;
    const penalty = Math.min(this.kpiData.nombreRisques * 5, 20);
    return 20 - penalty;
  }

  getDelayScore(): number {
    if (!this.kpiData) return 0;
    if (this.kpiData.joursRetard === 0) return 10;
    if (this.kpiData.joursRetard <= 7) return 5;
    return 0;
  }

  getHealthScoreColor(): string {
    const score = this.calculateHealthScore();
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  }

  formatDate(date: string | undefined): string {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return date;
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return date; }
  }

  formatBudget(budgetMDH: number): string {
    if (!budgetMDH || budgetMDH === 0) return '0';
    // Convertir MDH en DH (1 MDH = 1,000,000 DH)
    const budgetDH = budgetMDH * 1000000;
    // Formater avec séparateurs de milliers
    return budgetDH.toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  }

  getRecommendations(): Array<{icon: string, title: string, description: string}> {
    if (!this.kpiData) return [];
    
    const recommendations = [];
    
    // Avancement faible
    if (this.kpiData.tauxAvancement < 30) {
      recommendations.push({
        icon: '📈',
        title: 'Accélérer l\'avancement',
        description: 'Le projet avance lentement. Considérez d\'augmenter les ressources ou de revoir les priorités.'
      });
    }
    
    // Trop de problèmes
    if (this.kpiData.nombreProblemes > 5) {
      recommendations.push({
        icon: '🔧',
        title: 'Résoudre les problèmes',
        description: `${this.kpiData.nombreProblemes} problèmes identifiés. Organisez une réunion pour les traiter en priorité.`
      });
    }
    
    // Trop de risques
    if (this.kpiData.nombreRisques > 3) {
      recommendations.push({
        icon: '🛡️',
        title: 'Mitiger les risques',
        description: `${this.kpiData.nombreRisques} risques détectés. Établissez un plan de mitigation pour chacun.`
      });
    }
    
    // Retard
    if (this.kpiData.joursRetard > 0) {
      recommendations.push({
        icon: '⏰',
        title: 'Rattraper le retard',
        description: `Le projet a ${this.kpiData.joursRetard} jour(s) de retard. Revoyez le planning et les dépendances.`
      });
    }
    
    // Budget à 0
    if (this.kpiData.budgetTotal === 0) {
      recommendations.push({
        icon: '💰',
        title: 'Définir le budget',
        description: 'Aucun budget défini. Ajoutez les informations budgétaires pour un meilleur suivi.'
      });
    }
    
    // Projet en bonne santé
    if (recommendations.length === 0 && this.kpiData.tauxAvancement > 50) {
      recommendations.push({
        icon: '✅',
        title: 'Continuez ainsi !',
        description: 'Le projet progresse bien. Maintenez le rythme et la qualité du travail.'
      });
    }
    
    return recommendations;
  }
}
