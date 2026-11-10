import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CalendrierSuiviService, EcheanceSuivi, StatutEcheance } from '../../services/calendrier-suivi.service';
import { JOURS_SEMAINE, JourCalendrier, premierDuMois, semainesDuMois, titreDuMois } from '../shared/calendrier-mois';

/** Les plus anciennes restent visibles dans le calendrier. */
const NOMBRE_DEPOTS_LISTES = 5;

/** Dans une case trop petite pour tout montrer, ce qui demande une action passe d'abord. */
const ORDRE_DANS_LA_JOURNEE: Record<StatutEcheance, number> = { EN_RETARD: 0, A_DEPOSER: 1, DEPOSEE: 2, PREVUE: 3 };

const LIBELLES: Record<StatutEcheance, string> = {
  EN_RETARD: 'En retard',
  A_DEPOSER: 'À déposer',
  DEPOSEE: 'Déposée',
  PREVUE: 'Prévue'
};

/**
 * Page « Calendrier des dépôts » du chef de projet : la fiche la plus urgente en tête, les suivantes en colonne,
 * et le calendrier du mois. Le serveur décide de ce qui est attendu, en retard ou déposé.
 */
@Component({
  selector: 'app-calendrier-suivi',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './calendrier-suivi.component.html',
  styleUrls: [
    '../pilote-qualite/pilote-ui.css',
    '../shared/projets-ui.css',
    '../reunions/reunions.component.css',
    './calendrier-suivi.component.css'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendrierSuiviComponent implements OnInit {
  private service = inject(CalendrierSuiviService);

  readonly echeances = signal<EcheanceSuivi[]>([]);
  readonly projetsSansEcheance = signal<string[]>([]);
  readonly chargement = signal(true);
  /** Faux si le calendrier n'a pas pu être lu : rien n'est alors affiché à sa place. */
  readonly calendrierCharge = signal(false);
  readonly erreur = signal('');

  /** Une ligne par projet, la plus ancienne date en tête : un retard passe donc avant tout le reste. */
  readonly aDeposer = computed(() => this.echeances()
    .filter(echeance => echeance.statut === 'EN_RETARD' || echeance.statut === 'A_DEPOSER')
    .sort((a, b) => a.date.localeCompare(b.date)));

  /** Mise en avant en haut de page ; les suivantes sont listées dessous. */
  readonly plusUrgente = computed(() => this.aDeposer()[0] ?? null);
  readonly ensuite = computed(() => this.aDeposer().slice(1));

  readonly recentes = computed(() => this.echeances()
    .filter(echeance => echeance.statut === 'DEPOSEE')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, NOMBRE_DEPOTS_LISTES));

  readonly avisSansEcheance = computed(() => {
    const projets = this.projetsSansEcheance();
    if (!projets.length) return '';
    return projets.length === 1
      ? `Le projet ${projets[0]} n'a pas encore de date : le pilote qualité doit fixer sa périodicité de suivi.`
      : `Ces projets n'ont pas encore de date, le pilote qualité doit fixer leur périodicité de suivi : ${projets.join(', ')}.`;
  });

  // Calendrier
  readonly joursSemaine = JOURS_SEMAINE;
  readonly legende: StatutEcheance[] = ['EN_RETARD', 'A_DEPOSER', 'DEPOSEE', 'PREVUE'];
  readonly moisAffiche = signal(premierDuMois(new Date()));
  readonly titreMois = computed(() => titreDuMois(this.moisAffiche()));

  readonly semaines = computed<JourCalendrier<EcheanceSuivi>[][]>(() => {
    const parJour = new Map<string, EcheanceSuivi[]>();
    for (const echeance of this.echeances()) {
      parJour.set(echeance.date, [...(parJour.get(echeance.date) ?? []), echeance]);
    }
    for (const liste of parJour.values()) {
      liste.sort((a, b) => ORDRE_DANS_LA_JOURNEE[a.statut] - ORDRE_DANS_LA_JOURNEE[b.statut]);
    }
    return semainesDuMois(this.moisAffiche(), parJour);
  });

  ngOnInit() {
    this.service.charger().subscribe({
      next: (calendrier) => {
        this.echeances.set(calendrier.echeances);
        this.projetsSansEcheance.set(calendrier.projetsSansEcheance);
        this.calendrierCharge.set(true);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Le calendrier n\'a pas pu être chargé. Rechargez la page.');
        this.chargement.set(false);
      }
    });
  }

  changerMois(ecart: number) {
    const courant = this.moisAffiche();
    this.moisAffiche.set(new Date(courant.getFullYear(), courant.getMonth() + ecart, 1));
  }

  libelle(statut: StatutEcheance): string {
    return LIBELLES[statut];
  }

  /** « En retard de 12 jours », « À déposer demain »… */
  delai(echeance: EcheanceSuivi): string {
    const jours = echeance.joursRestants ?? 0;
    if (jours < 0) return `En retard de ${-jours} jour${jours < -1 ? 's' : ''}`;
    if (jours === 0) return 'À déposer aujourd\'hui';
    if (jours === 1) return 'À déposer demain';
    return `À déposer dans ${jours} jours`;
  }

  estEnRetard(echeance: EcheanceSuivi): boolean {
    return echeance.statut === 'EN_RETARD';
  }

  jour(echeance: EcheanceSuivi): string {
    return dateDe(echeance).toLocaleDateString('fr-FR', { day: 'numeric' });
  }

  mois(echeance: EcheanceSuivi): string {
    return dateDe(echeance).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  }

  /** « jeudi 12 novembre 2026 », écrit pour suivre « Attendue le » ou « Déposée le ». */
  dateLongue(echeance: EcheanceSuivi): string {
    return dateDe(echeance).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /** Ce que la case ne montre pas, en info-bulle sur « +2 ». */
  nomsEnPlus(elements: EcheanceSuivi[]): string {
    return elements.slice(2).map(echeance => `${this.libelle(echeance.statut)} : ${echeance.nomProjet}`).join('\n');
  }
}

/** À minuit, heure locale : lue sans heure, la date serait décalée au jour d'avant sous certains fuseaux. */
function dateDe(echeance: EcheanceSuivi): Date {
  return new Date(`${echeance.date}T00:00:00`);
}
