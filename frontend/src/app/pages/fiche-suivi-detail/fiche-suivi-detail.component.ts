import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FicheSuiviService, FicheSuivi, TacheGantt } from '../../services/fiche-suivi.service';

@Component({
  selector: 'app-fiche-suivi-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fiche-suivi-detail.component.html',
  styleUrls: ['./fiche-suivi-detail.component.css']
})
export class FicheSuiviDetailComponent implements OnInit {
  private ficheSuiviService = inject(FicheSuiviService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ficheSuivi: FicheSuivi | null = null;
  loading = true;
  error: string | null = null;
  currentTab = 'signaletique';

  // Gantt
  ganttDayWidth = 28;
  ganttStart: Date = new Date();
  ganttEnd: Date = new Date();
  ganttTotalDays = 1;
  ganttTotalWidth = 1;
  ganttMonths: { label: string; days: number }[] = [];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFicheSuivi(id);
    } else {
      this.error = 'ID de la fiche de suivi non fourni';
      this.loading = false;
    }
  }

  loadFicheSuivi(id: string) {
    this.loading = true;
    this.error = null;

    this.ficheSuiviService.getFicheSuiviById(id).subscribe({
      next: (fiche) => {
        this.ficheSuivi = fiche;
        this.buildGantt(fiche.planningActuel?.taches || []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la fiche de suivi:', err);
        this.error = 'Erreur lors du chargement de la fiche de suivi';
        this.loading = false;
      }
    });
  }

  setTab(tab: string) {
    this.currentTab = tab;
  }

  formatDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatShortDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  getStatutStyle(statut: string | undefined): string {
    let bg = '';
    switch (statut?.toLowerCase()) {
      case 'terminé':
        bg = 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; break;
      case 'en cours':
        bg = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'; break;
      case 'en retard':
        bg = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; break;
      case 'bloqué':
        bg = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; break;
      default:
        bg = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
    }
    return `background: ${bg}; color: white; padding: 0.25rem 0.75rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; display: inline-block;`;
  }

  goBack() {
    this.router.navigate(['/fiches-suivi']);
  }

  buildGantt(taches: TacheGantt[]) {
    const dates = taches
      .flatMap(t => [t.dateDebut, t.dateFin])
      .filter(Boolean)
      .map(d => new Date(d!));
    if (!dates.length) return;

    this.ganttStart = new Date(Math.min(...dates.map(d => d.getTime())));
    this.ganttEnd   = new Date(Math.max(...dates.map(d => d.getTime())));
    // start at first day of month
    this.ganttStart = new Date(this.ganttStart.getFullYear(), this.ganttStart.getMonth(), 1);
    // end at last day of month
    this.ganttEnd   = new Date(this.ganttEnd.getFullYear(), this.ganttEnd.getMonth() + 1, 0);

    this.ganttTotalDays = Math.ceil((this.ganttEnd.getTime() - this.ganttStart.getTime()) / 86400000) + 1;
    this.ganttTotalWidth = this.ganttTotalDays * this.ganttDayWidth;

    // Build months
    this.ganttMonths = [];
    let cur = new Date(this.ganttStart);
    while (cur <= this.ganttEnd) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const endOfMonth = lastDay < this.ganttEnd ? lastDay : this.ganttEnd;
      const days = Math.ceil((endOfMonth.getTime() - cur.getTime()) / 86400000) + 1;
      this.ganttMonths.push({
        label: cur.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        days
      });
      cur = new Date(year, month + 1, 1);
    }
  }

  getBarLeft(dateDebut?: string): number {
    if (!dateDebut) return 0;
    const diff = Math.ceil((new Date(dateDebut).getTime() - this.ganttStart.getTime()) / 86400000);
    return Math.max(0, diff) * this.ganttDayWidth;
  }

  getBarWidth(dateDebut?: string, dateFin?: string): number {
    if (!dateDebut || !dateFin) return this.ganttDayWidth;
    const days = Math.ceil((new Date(dateFin).getTime() - new Date(dateDebut).getTime()) / 86400000) + 1;
    return Math.max(1, days) * this.ganttDayWidth;
  }

  getBarStyle(statut?: string): string {
    const colors: Record<string, string> = {
      'terminé': '#10b981',
      'en cours': '#3b82f6',
      'en retard': '#f59e0b',
      'bloqué': '#ef4444'
    };
    const color = colors[(statut || '').toLowerCase()] || '#6b7280';
    return `background:${color};`;
  }
}
