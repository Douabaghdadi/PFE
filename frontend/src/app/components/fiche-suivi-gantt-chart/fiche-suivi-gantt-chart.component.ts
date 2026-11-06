import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TacheSuivi } from '../../services/fiche-suivi.service';
import { StatutTache, isTitre, statutTache } from '../../pages/shared/suivi-stats';

interface GanttMois {
  /** « juil. » : le mois seul, l'année est affichée au-dessus. */
  label: string;
  /** « juillet 2026 » : infobulle des mois trop étroits pour leur nom. */
  titre: string;
  percent: number;
  annee: number;
}

interface GanttPeriode {
  debut: Date;
  fin: Date;
  jours: number;
  mois: GanttMois[];
  annees: { label: string; percent: number }[];
}

interface LigneGantt {
  titre: boolean;
  nom: string;
  statut: StatutTache;
  statutLibelle: string;
  pct: number;
  avecBarre: boolean;
  left: number;
  width: number;
  /** « du 01/07/2026 au 10/07/2026 », lu par les lecteurs d'écran à la place de la barre. */
  plage: string;
}

/**
 * Diagramme de Gantt d'une fiche de suivi, en lecture seule.
 * Commun à la page du chef de projet (/fiche-suivi/:id/gantt) et à celle du pilote qualité
 * (/pilote-qualite/fiches-suivi/:id/gantt), qui ne gardent que l'en-tête et le chargement.
 *
 * Le diagramme est dimensionné en pourcentage de la période : sur grand écran toute la période tient
 * sans défilement ; sur écran étroit la frise défile et la colonne des tâches reste visible.
 */
@Component({
  selector: 'app-fiche-suivi-gantt-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fiche-suivi-gantt-chart.component.html',
  styleUrls: ['../../pages/shared/lecture-ui.css', './fiche-suivi-gantt-chart.component.css']
})
export class FicheSuiviGanttChartComponent {
  readonly taches = input.required<TacheSuivi[]>();

  readonly legende: { cle: StatutTache; libelle: string }[] = [
    { cle: 'cours', libelle: 'En cours' },
    { cle: 'termine', libelle: 'Terminé' },
    { cle: 'retard', libelle: 'En retard' },
    { cle: 'bloque', libelle: 'Bloqué' },
  ];

  /** Du premier jour du mois de la première date au dernier jour du mois de la dernière ; null sans aucune date. */
  readonly periode = computed<GanttPeriode | null>(() => {
    const dates = this.taches()
      .flatMap(t => [t.debut, t.echeance])
      .filter(Boolean)
      .map(d => new Date(d!));
    if (!dates.length) return null;

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    // début au 1er jour du mois, fin au dernier jour du mois
    const debut = new Date(min.getFullYear(), min.getMonth(), 1);
    const fin = new Date(max.getFullYear(), max.getMonth() + 1, 0);
    const jours = Math.ceil((fin.getTime() - debut.getTime()) / 86400000) + 1;

    const mois: GanttMois[] = [];
    let cur = new Date(debut);
    while (cur <= fin) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const lastDay = new Date(year, month + 1, 0);
      const endOfMonth = lastDay < fin ? lastDay : fin;
      const days = Math.ceil((endOfMonth.getTime() - cur.getTime()) / 86400000) + 1;
      mois.push({
        label: cur.toLocaleDateString('fr-FR', { month: 'short' }),
        titre: cur.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        percent: days / jours * 100,
        annee: year
      });
      cur = new Date(year, month + 1, 1);
    }

    const annees: { label: string; percent: number }[] = [];
    for (const m of mois) {
      const derniere = annees[annees.length - 1];
      if (derniere && derniere.label === String(m.annee)) derniere.percent += m.percent;
      else annees.push({ label: String(m.annee), percent: m.percent });
    }

    return { debut, fin, jours, mois, annees };
  });

  /** « juillet 2026 – février 2027 ». */
  readonly periodeTexte = computed(() => {
    const p = this.periode();
    if (!p) return '';
    const format = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    return `${format(p.debut)} – ${format(p.fin)}`;
  });

  /** Position de la ligne « aujourd'hui », en % de la période ; null si le jour est hors période. */
  readonly aujourdhui = computed<number | null>(() => {
    const p = this.periode();
    if (!p) return null;
    const diff = Math.ceil((Date.now() - p.debut.getTime()) / 86400000);
    return diff < 0 || diff > p.jours ? null : diff / p.jours * 100;
  });

  readonly lignes = computed<LigneGantt[]>(() => {
    const p = this.periode();
    return this.taches().map(t => {
      const titre = isTitre(t);
      const debut = t.debut;
      const echeance = t.echeance;
      return {
        titre,
        nom: t.sujet || '-',
        statut: statutTache(t.statut),
        statutLibelle: t.statut || '',
        pct: t.pourcentageRealise || 0,
        avecBarre: !titre && !!p && !!(debut || echeance),
        left: p ? this.barLeft(p, debut || echeance) : 0,
        width: p ? this.barWidth(p, debut, echeance) : 0,
        plage: debut && echeance
          ? `du ${this.dateCourte(debut)} au ${this.dateCourte(echeance)}`
          : `le ${this.dateCourte(debut || echeance)}`
      };
    });
  });

  /** Position du début de la barre, en % de la période affichée. */
  private barLeft(p: GanttPeriode, date?: string): number {
    if (!date) return 0;
    const diff = Math.ceil((new Date(date).getTime() - p.debut.getTime()) / 86400000);
    return Math.max(0, diff) / p.jours * 100;
  }

  /** Longueur de la barre, en % de la période affichée (un jour au minimum). */
  private barWidth(p: GanttPeriode, debut?: string, echeance?: string): number {
    if (!debut || !echeance) return 1 / p.jours * 100;
    const days = Math.ceil((new Date(echeance).getTime() - new Date(debut).getTime()) / 86400000) + 1;
    return Math.max(1, days) / p.jours * 100;
  }

  private dateCourte(date?: string): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
}
