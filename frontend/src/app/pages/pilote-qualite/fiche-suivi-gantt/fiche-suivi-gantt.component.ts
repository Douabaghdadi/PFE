import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { FicheSuivi, TacheSuivi } from '../../../services/fiche-suivi.service';

@Component({
  selector: 'app-pilote-fiche-suivi-gantt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './fiche-suivi-gantt.component.html',
  styleUrls: ['./fiche-suivi-gantt.component.css']
})
export class PiloteFicheSuiviGanttComponent implements OnInit {
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ficheSuivi: FicheSuivi | null = null;
  loading = true;
  error: string | null = null;

  ganttDayWidth = 28;
  ganttStart: Date = new Date();
  ganttEnd: Date = new Date();
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
        this.buildGantt(fiche.tachesSuivi || []);
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la fiche de suivi:', err);
        this.error = 'Erreur lors du chargement de la fiche de suivi';
        this.loading = false;
      }
    });
  }

  /**
   * Une ligne est un "grand titre" (action de la fiche de projet) si elle est
   * marquée estTitre, ou - pour les fiches enregistrées avant l'ajout de ce
   * marqueur - si elle ne porte aucune des infos propres à une sous-tâche.
   */
  isTitre(t: TacheSuivi): boolean {
    return !!t.estTitre || (!t.code && !t.livrable && !t.assigneA && !t.debut && !t.echeance);
  }

  private buildGantt(taches: TacheSuivi[]) {
    const dates = taches
      .flatMap(t => [t.debut, t.echeance])
      .filter(Boolean)
      .map(d => new Date(d!));
    if (!dates.length) {
      this.ganttMonths = [];
      return;
    }

    this.ganttStart = new Date(Math.min(...dates.map(d => d.getTime())));
    this.ganttEnd   = new Date(Math.max(...dates.map(d => d.getTime())));
    // début au 1er jour du mois, fin au dernier jour du mois
    this.ganttStart = new Date(this.ganttStart.getFullYear(), this.ganttStart.getMonth(), 1);
    this.ganttEnd   = new Date(this.ganttEnd.getFullYear(), this.ganttEnd.getMonth() + 1, 0);

    const totalDays = Math.ceil((this.ganttEnd.getTime() - this.ganttStart.getTime()) / 86400000) + 1;
    this.ganttTotalWidth = totalDays * this.ganttDayWidth;

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

  getBarLeft(date?: string): number {
    if (!date) return 0;
    const diff = Math.ceil((new Date(date).getTime() - this.ganttStart.getTime()) / 86400000);
    return Math.max(0, diff) * this.ganttDayWidth;
  }

  getBarWidth(debut?: string, echeance?: string): number {
    if (!debut || !echeance) return this.ganttDayWidth;
    const days = Math.ceil((new Date(echeance).getTime() - new Date(debut).getTime()) / 86400000) + 1;
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

  goBack() {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/pilote-qualite/fiches-suivi', id]);
  }
}
