import { Component, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FicheSuivi } from '../../services/fiche-suivi.service';
import { isTitre, statutTache } from '../../pages/shared/suivi-stats';

export type OngletFicheSuivi = 'signaletique' | 'constat' | 'taches';

/**
 * Corps d'une fiche de suivi en lecture seule : trois onglets
 * (fiche signalétique, constat global, tâches).
 * Commun à la page du chef de projet (/fiche-suivi/:id) et à celle du pilote qualité
 * (/pilote-qualite/fiches-suivi/:id), qui ne gardent que l'en-tête et le chargement.
 */
@Component({
  selector: 'app-fiche-suivi-corps',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './fiche-suivi-corps.component.html',
  styleUrls: ['../../pages/shared/lecture-ui.css', './fiche-suivi-corps.component.css']
})
export class FicheSuiviCorpsComponent {
  readonly fiche = input.required<FicheSuivi>();
  /** Destination du diagramme de Gantt : elle diffère entre l'espace du chef de projet et celui du pilote. */
  readonly ganttLink = input.required<any[]>();

  readonly onglet = signal<OngletFicheSuivi>('signaletique');

  readonly onglets: { cle: OngletFicheSuivi; libelle: string }[] = [
    { cle: 'signaletique', libelle: 'Fiche signalétique' },
    { cle: 'constat', libelle: 'Constat global' },
    { cle: 'taches', libelle: 'Tâches' },
  ];

  readonly taches = computed(() => this.fiche().tachesSuivi || []);

  setOnglet(onglet: OngletFicheSuivi) {
    this.onglet.set(onglet);
  }

  // Ces deux règles sont communes avec le diagramme de Gantt (pages/shared/suivi-stats.ts)
  readonly isTitre = isTitre;
  readonly statutTache = statutTache;

  formatShortDate(date: any): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /** Montant en MD/HT (« 0.48 » → « 0,48 ») ; une valeur absente donne une chaîne vide. */
  nombre(valeur: unknown): string {
    if (valeur === null || valeur === undefined || valeur === '') return '';
    const n = Number(valeur);
    return isFinite(n) ? n.toLocaleString('fr-FR') : String(valeur);
  }
}
