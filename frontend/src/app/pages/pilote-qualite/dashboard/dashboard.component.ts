import { ChangeDetectorRef, Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PiloteQualiteFicheProjetService, FicheProjet, ProjetSuiviStatus } from '../../../services/pilote-qualite-fiche-projet.service';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { PiloteQualiteNotificationService } from '../../../services/pilote-qualite-notification.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';
import { statutValidation } from '../../shared/validation-stats';
import type { StatutValidation } from '../../../services/validation-fiche.service';

/**
 * Tableau de bord du PROCESSUS qualité.
 *
 * Périmètre volontairement disjoint de la page KPI projet :
 *  - ici on ne juge jamais la performance d'un projet (avancement, budget, problèmes, risques,
 *    score de santé, analyse IA) : tout cela appartient à /pilote-qualite/projet-kpi/:id ;
 *  - ici on surveille uniquement la DISCIPLINE DE REPORTING : couverture du portefeuille,
 *    ponctualité des dépôts, complétude des documents et échéances à venir.
 */

type Conformite = 'A_JOUR' | 'EN_RETARD' | 'JAMAIS_SUIVI';

/** Audit de remplissage d'une fiche de suivi : on regarde la PRÉSENCE des rubriques, jamais leur valeur. */
interface AuditFiche {
  signaletique: boolean;
  delaisFinancier: boolean;
  constat: boolean;
  taches: boolean;
  recommandations: boolean;
  score: number;
}

interface ProjetRow {
  id: string;
  nom: string;
  statut: string;
  chefProjet: string;
  conformite: Conformite;
  joursRetard: number;
  periodicite?: number;
  derniereFiche?: string;
  prochaineFiche?: string;
  joursAvantEcheance: number | null;
  nbFiches: number;
  completude: number;
  derniereFicheId?: string;
  /** Rubriques absentes de la dernière fiche déposée. */
  manquantes: string[];
  /** Fiches de suivi qui attendent la décision du pilote, de la plus récente à la plus ancienne. */
  fichesAValider: string[];
  ficheProjetAValider: boolean;
}

type Probleme = 'retard' | 'jamais' | 'incomplete' | 'validation';

/** Un projet à traiter : son problème le plus urgent, dit en une phrase, et l'action qui va avec. */
interface ProjetATraiter {
  id: string;
  nom: string;
  chefProjet: string;
  probleme: Probleme;
  badge: string;
  detail: string;
  ficheId?: string;
}

/** Une fiche qui attend la décision du pilote : une ligne, une action. */
interface FicheAValider {
  id: string;
  type: 'projet' | 'suivi';
  projetNom: string;
  chefProjet: string;
  date?: string;
}

/** Dépôts d'un mois, classés selon l'échéance de chaque fiche (périodicité du projet). */
interface MoisPonctualite {
  label: string;
  libelleLong: string;
  aTemps: number;
  enRetard: number;
}

interface KpiCard {
  key: string;
  title: string;
  value: string;
  hint: string;
  accent: string;
  /** Pourcentage affiché en barre sous la valeur (indicateurs exprimés en %). */
  percent?: number;
  /** Sans action, la carte est purement informative et n'est pas cliquable. */
  action?: 'route';
  payload?: string;
}

interface ConformiteSegment {
  key: Conformite;
  label: string;
  color: string;
  count: number;
  percent: number;
  dash: string;
  offset: number;
}

interface RubriqueStat {
  cle: keyof AuditFiche;
  label: string;
  renseignees: number;
  percent: number;
}

interface EcheanceBucket {
  key: string;
  label: string;
  color: string;
  count: number;
}

interface ChefStat {
  nom: string;
  projets: number;
  fiches: number;
  retards: number;
  conformite: number;
  completude: number;
}

interface Depot {
  id: string;
  projetId: string;
  projetNom: string;
  date?: string;
  numero?: string;
  completude: number;
  manquantes: string[];
}

const CONFORMITE_DEFS: { key: Conformite; label: string; color: string }[] = [
  { key: 'A_JOUR', label: 'Suivi à jour', color: '#09C82C' },
  { key: 'EN_RETARD', label: 'Fiche en retard', color: '#ef4444' },
  { key: 'JAMAIS_SUIVI', label: 'Jamais suivi', color: '#94a3b8' },
];

const RUBRIQUES: { cle: keyof AuditFiche; label: string }[] = [
  { cle: 'signaletique', label: 'Fiche signalétique' },
  { cle: 'delaisFinancier', label: 'Délais & données financières' },
  { cle: 'constat', label: 'Constat global' },
  { cle: 'taches', label: 'Tâches de suivi' },
  { cle: 'recommandations', label: 'Recommandations' },
];

const DONUT_CIRCUMFERENCE = 2 * Math.PI * 54;
const JOUR_MS = 24 * 60 * 60 * 1000;
const MOIS_JOURS = 30.44;
const NB_MOIS_PONCTUALITE = 12;

@Component({
  selector: 'app-pilote-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['../pilote-ui.css', './dashboard.component.css']
})
export class PiloteDashboardComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private notificationService = inject(PiloteQualiteNotificationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = true;
  error: string | null = null;
  generatedAt = new Date();

  // --- Données brutes ---
  fichesProjet: FicheProjet[] = [];
  fichesSuivi: FicheSuivi[] = [];
  suiviStatus: ProjetSuiviStatus[] = [];
  /** Nom du compte de chaque chef de projet, par identifiant. */
  nomsChefs = new Map<string, string>();

  // --- Options d'affichage ---
  /** Les alertes s'ouvrent repliées : les plus en retard d'abord, les autres sur demande. */
  alertesOuvertes = false;
  toutesLesLignes = false;
  fichesAValiderOuvertes = false;
  /** Pendant l'impression, les listes raccourcies à l'écran sont imprimées en entier. */
  impression = false;

  // --- Relances envoyées depuis le tableau de bord ---
  relancesEnCours = new Set<string>();
  relances = new Map<string, { ok: boolean; message: string }>();

  // --- Données calculées ---
  rows: ProjetRow[] = [];
  auditsParFiche = new Map<string, AuditFiche>();
  kpis: KpiCard[] = [];
  conformiteSegments: ConformiteSegment[] = [];
  rubriques: RubriqueStat[] = [];
  ponctualite: MoisPonctualite[] = [];
  echeanceBuckets: EcheanceBucket[] = [];
  chefStats: ChefStat[] = [];
  derniersDepots: Depot[] = [];
  projetsATraiter: ProjetATraiter[] = [];
  fichesAValider: FicheAValider[] = [];
  bilanValidation = { total: 0, nbProjets: 0, nbSuivis: 0, validees: 0, aValider: 0, aCorriger: 0 };

  tauxConformite = 0;
  completudeMoyenne = 0;
  nbFichesAuditees = 0;
  nbEnRetard = 0;
  nbJamaisSuivi = 0;
  nbEcheances30j = 0;
  nbDepotsEvalues = 0;
  tauxPonctualite = 0;
  maxDepotsMois = 0;

  readonly donutCircumference = DONUT_CIRCUMFERENCE;
  readonly rubriqueDefs = RUBRIQUES;
  /** Lignes d'une seule ligne de haut : cinq tiennent dans la hauteur des trois alertes de retard. */
  readonly nbFichesAValiderVisibles = 5;

  ngOnInit() {
    this.loadData();
  }

  // ==================== Chargement ====================

  loadData() {
    this.loading = true;
    this.error = null;

    Promise.all([
      firstValueFrom(this.ficheProjetService.getAllFichesProjet()),
      firstValueFrom(this.ficheSuiviService.getAllFichesSuivi()),
      firstValueFrom(this.ficheProjetService.getProjetsSuiviStatus()),
      firstValueFrom(this.notificationService.getChefsProjet())
    ]).then(([projets, suivis, status, chefs]) => {
      this.fichesProjet = projets || [];
      this.fichesSuivi = suivis || [];
      this.suiviStatus = status || [];
      this.nomsChefs = new Map((chefs || []).map(c => [c.id, c.username]));
      this.auditerFiches();
      this.generatedAt = new Date();
      this.buildDashboard();
      this.loading = false;
    }).catch(err => {
      console.error('Erreur lors du chargement des données:', err);
      this.error = 'Impossible de charger les données de supervision.';
      this.loading = false;
    });
  }

  refresh() {
    this.loadData();
  }

  // ==================== Audit de complétude ====================

  /** Une rubrique est « renseignée » si elle est présente : on ne lit jamais la valeur métier. */
  private auditerFiches() {
    this.auditsParFiche.clear();
    for (const f of this.fichesSuivi) {
      if (!f.id) continue;
      const sig = f.ficheSignaletique;
      const constat = f.constatGlobal;

      const audit: AuditFiche = {
        signaletique: this.rempli(sig?.maitreOuvrage) && this.rempli(sig?.maitreOeuvre) && this.rempli(sig?.chefProjet?.nom),
        delaisFinancier: !!(sig?.delais?.dateDebut || sig?.delais?.dateDebutPrevision)
          && !!(sig?.delais?.dateFin || sig?.delais?.dateFinPrevision)
          && sig?.financier?.budgetPrevision != null,
        constat: this.rempli(constat?.etatAvancement) && this.rempli(constat?.objectifPrincipal),
        taches: (f.tachesSuivi || []).some(t => !t.estTitre),
        recommandations: (constat?.recommandations || []).some(r => this.rempli(r)),
        score: 0,
      };

      const total = RUBRIQUES.filter(r => audit[r.cle] === true).length;
      audit.score = Math.round((total / RUBRIQUES.length) * 100);
      this.auditsParFiche.set(f.id, audit);
    }
  }

  private rempli(valeur?: string): boolean {
    return !!valeur && valeur.trim().length > 0;
  }

  private auditDe(f: FicheSuivi): AuditFiche | undefined {
    return f.id ? this.auditsParFiche.get(f.id) : undefined;
  }

  private rubriquesManquantes(f: FicheSuivi): string[] {
    const audit = this.auditDe(f);
    if (!audit) return [];
    return RUBRIQUES.filter(r => audit[r.cle] !== true).map(r => r.label);
  }

  // ==================== Calcul du tableau de bord ====================

  private buildDashboard() {
    this.rows = this.buildRows();
    this.computeAggregates();
  }

  // ==================== Construction des lignes ====================

  private buildRows(): ProjetRow[] {
    const now = Date.now();

    const parProjet = new Map<string, FicheSuivi[]>();
    for (const f of this.fichesSuivi) {
      const liste = parProjet.get(f.ficheProjetId) || [];
      liste.push(f);
      parProjet.set(f.ficheProjetId, liste);
    }

    const statusParProjet = new Map(this.suiviStatus.map(s => [s.projetId, s]));

    return this.fichesProjet.filter(p => !!p.id).map(p => {
      const id = p.id!;
      const liste = (parProjet.get(id) || []).sort((a, b) => this.dateOf(b) - this.dateOf(a));
      const status = statusParProjet.get(id);

      const joursRetard = status?.ficheSuiviEnRetard ? status.joursRetard : 0;
      const conformite: Conformite = liste.length === 0 ? 'JAMAIS_SUIVI' : (joursRetard > 0 ? 'EN_RETARD' : 'A_JOUR');

      const prochaine = status?.dateProchaineFicheSuivi || p.dateProchaineFicheSuivi;
      const prochaineTs = prochaine ? new Date(prochaine).getTime() : NaN;
      const joursAvantEcheance = isNaN(prochaineTs) ? null : Math.round((prochaineTs - now) / JOUR_MS);

      const scores = liste.map(f => this.auditDe(f)?.score).filter((s): s is number => s != null);
      const completude = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      return {
        id,
        nom: p.nomProjet || p.designationProjet || 'Projet sans nom',
        statut: this.statutLabel(p.statut),
        // Le chef est le compte rattaché au projet, comme sur le tableau de bord admin.
        chefProjet: this.nomsChefs.get(p.chefProjetId || '') || 'Non attribué',
        conformite,
        joursRetard,
        periodicite: status?.periodiciteSuiviMois || p.periodiciteSuiviMois,
        derniereFiche: status?.dateDerniereFicheSuivi || liste[0]?.dateRapport,
        prochaineFiche: prochaine,
        joursAvantEcheance,
        nbFiches: liste.length,
        completude,
        derniereFicheId: liste[0]?.id,
        manquantes: liste[0] ? this.rubriquesManquantes(liste[0]) : [],
        fichesAValider: liste.filter(f => statutValidation(f.validation) === 'A_VALIDER').map(f => f.id!),
        ficheProjetAValider: statutValidation(p.validation) === 'A_VALIDER',
      };
    });
  }

  // ==================== Ponctualité des dépôts ====================

  /**
   * Même règle que le serveur : la 1re fiche est attendue une périodicité après le début du projet,
   * chaque fiche suivante une périodicité après la précédente. Une fiche déposée au plus tard
   * à son échéance est « à temps ». Chaque dépôt est compté dans le mois où il a été fait.
   */
  private construirePonctualite(rows: ProjetRow[]) {
    const now = new Date();
    const cles: string[] = [];
    this.ponctualite = [];
    for (let i = NB_MOIS_PONCTUALITE - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cles.push(`${d.getFullYear()}-${d.getMonth()}`);
      this.ponctualite.push({
        label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
        libelleLong: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        aTemps: 0,
        enRetard: 0,
      });
    }

    const debuts = new Map(this.fichesProjet.map(p => [p.id, p.dateDebut]));

    for (const r of rows) {
      const periodicite = r.periodicite || 1;
      const liste = this.fichesSuivi
        .filter(f => f.ficheProjetId === r.id && this.jourOf(f.dateRapport) != null)
        .sort((a, b) => this.jourOf(a.dateRapport)! - this.jourOf(b.dateRapport)!);

      let reference = this.jourOf(debuts.get(r.id));
      for (const f of liste) {
        const depot = this.jourOf(f.dateRapport)!;
        if (reference != null) {
          const index = cles.indexOf(`${new Date(depot).getUTCFullYear()}-${new Date(depot).getUTCMonth()}`);
          if (index >= 0) {
            const retard = Math.round((depot - this.ajouterMois(reference, periodicite)) / JOUR_MS);
            if (retard > 0) {
              this.ponctualite[index].enRetard++;
            } else {
              this.ponctualite[index].aTemps++;
            }
          }
        }
        reference = depot;
      }
    }

    this.nbDepotsEvalues = this.ponctualite.reduce((s, m) => s + m.aTemps + m.enRetard, 0);
    this.maxDepotsMois = Math.max(0, ...this.ponctualite.map(m => m.aTemps + m.enRetard));
    const nbATemps = this.ponctualite.reduce((s, m) => s + m.aTemps, 0);
    this.tauxPonctualite = this.nbDepotsEvalues ? Math.round((nbATemps / this.nbDepotsEvalues) * 100) : 0;
  }

  /** Date « AAAA-MM-JJ » ramenée à minuit UTC, pour compter les jours sans effet de fuseau. */
  private jourOf(date?: string): number | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }

  /** Ajoute des mois comme LocalDate.plusMonths : le 31 janvier + 1 mois donne le 28 février. */
  private ajouterMois(jour: number, mois: number): number {
    const d = new Date(jour);
    const cible = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + mois, 1));
    const dernierJour = new Date(Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth() + 1, 0)).getUTCDate();
    return Date.UTC(cible.getUTCFullYear(), cible.getUTCMonth(), Math.min(d.getUTCDate(), dernierJour));
  }

  // ==================== Agrégats ====================

  private computeAggregates() {
    const rows = this.rows;
    const total = rows.length;

    // --- Donut de conformité ---
    const counts = CONFORMITE_DEFS.map(d => ({ ...d, count: rows.filter(r => r.conformite === d.key).length }));
    let offset = 0;
    this.conformiteSegments = counts.filter(c => c.count > 0).map(c => {
      const percent = total ? (c.count / total) * 100 : 0;
      const longueur = (percent / 100) * DONUT_CIRCUMFERENCE;
      const segment: ConformiteSegment = {
        key: c.key,
        label: c.label,
        color: c.color,
        count: c.count,
        percent: Math.round(percent),
        dash: `${longueur} ${DONUT_CIRCUMFERENCE - longueur}`,
        offset: -offset,
      };
      offset += longueur;
      return segment;
    });

    this.nbEnRetard = rows.filter(r => r.conformite === 'EN_RETARD').length;
    this.nbJamaisSuivi = rows.filter(r => r.conformite === 'JAMAIS_SUIVI').length;
    this.tauxConformite = total ? Math.round((rows.filter(r => r.conformite === 'A_JOUR').length / total) * 100) : 0;

    // --- Complétude documentaire ---
    const idsVisibles = new Set(rows.map(r => r.id));
    const fichesVisibles = this.fichesSuivi.filter(f => idsVisibles.has(f.ficheProjetId));
    this.nbFichesAuditees = fichesVisibles.length;

    this.rubriques = RUBRIQUES.map(r => {
      const renseignees = fichesVisibles.filter(f => this.auditDe(f)?.[r.cle] === true).length;
      return {
        cle: r.cle,
        label: r.label,
        renseignees,
        percent: fichesVisibles.length ? Math.round((renseignees / fichesVisibles.length) * 100) : 0,
      };
    });

    const scores = fichesVisibles.map(f => this.auditDe(f)?.score).filter((s): s is number => s != null);
    this.completudeMoyenne = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // --- Validation des fiches ---
    this.construireValidation(rows, fichesVisibles);

    // --- Échéancier ---
    this.construireEcheancier(rows);

    // --- Ponctualité des dépôts ---
    this.construirePonctualite(rows);

    // --- Discipline par chef de projet ---
    this.chefStats = this.construireChefStats(rows);

    // --- Projets à traiter ---
    this.projetsATraiter = this.construireProjetsATraiter(rows);

    // --- Derniers dépôts ---
    const noms = new Map(rows.map(r => [r.id, r.nom]));
    this.derniersDepots = [...fichesVisibles]
      .sort((a, b) => this.dateOf(b) - this.dateOf(a))
      .slice(0, 6)
      .map(f => ({
        id: f.id || '',
        projetId: f.ficheProjetId,
        projetNom: noms.get(f.ficheProjetId) || 'Projet inconnu',
        date: f.dateRapport,
        numero: f.numeroRapport,
        completude: this.auditDe(f)?.score ?? 0,
        manquantes: this.rubriquesManquantes(f),
      }));

    this.buildKpis();
  }

  private construireEcheancier(rows: ProjetRow[]) {
    const avecEcheance = rows.filter(r => r.joursAvantEcheance != null);

    const compte = (min: number, max: number) =>
      avecEcheance.filter(r => r.joursAvantEcheance! >= min && r.joursAvantEcheance! < max).length;

    this.echeanceBuckets = [
      { key: 'retard', label: 'Dépassée', color: '#ef4444', count: avecEcheance.filter(r => r.joursAvantEcheance! < 0).length },
      { key: 'semaine', label: 'Sous 7 jours', color: '#f97316', count: compte(0, 7) },
      { key: 'mois', label: 'Sous 30 jours', color: '#f59e0b', count: compte(7, 30) },
      { key: 'plus', label: 'Au-delà', color: '#3b82f6', count: avecEcheance.filter(r => r.joursAvantEcheance! >= 30).length },
    ];

    this.nbEcheances30j = compte(0, 30);
  }

  private construireChefStats(rows: ProjetRow[]): ChefStat[] {
    const parChef = new Map<string, ProjetRow[]>();
    for (const r of rows) {
      const liste = parChef.get(r.chefProjet) || [];
      liste.push(r);
      parChef.set(r.chefProjet, liste);
    }

    return [...parChef.entries()]
      .map(([nom, liste]) => {
        const aJour = liste.filter(r => r.conformite === 'A_JOUR').length;
        const avecFiches = liste.filter(r => r.nbFiches > 0);
        return {
          nom,
          projets: liste.length,
          fiches: liste.reduce((s, r) => s + r.nbFiches, 0),
          retards: liste.filter(r => r.conformite !== 'A_JOUR').length,
          conformite: Math.round((aJour / liste.length) * 100),
          completude: avecFiches.length
            ? Math.round(avecFiches.reduce((s, r) => s + r.completude, 0) / avecFiches.length)
            : 0,
        };
      })
      .sort((a, b) => a.conformite - b.conformite || b.retards - a.retards);
  }

  /** Chaque projet n'apparaît qu'une fois, avec son problème le plus urgent : retard, aucune fiche, fiche incomplète, puis fiche à valider. */
  private construireProjetsATraiter(rows: ProjetRow[]): ProjetATraiter[] {
    const retards = rows
      .filter(r => r.conformite === 'EN_RETARD')
      .sort((a, b) => b.joursRetard - a.joursRetard)
      .map(r => ({
        id: r.id, nom: r.nom, chefProjet: r.chefProjet, probleme: 'retard' as const,
        badge: `En retard de ${r.joursRetard} j`,
        detail: r.prochaineFiche
          ? `Fiche de suivi attendue depuis le ${new Date(r.prochaineFiche).toLocaleDateString('fr-FR')}.`
          : 'Fiche de suivi attendue et non déposée.',
      }));

    const jamaisSuivis = rows
      .filter(r => r.conformite === 'JAMAIS_SUIVI')
      .map(r => ({
        id: r.id, nom: r.nom, chefProjet: r.chefProjet, probleme: 'jamais' as const,
        badge: 'Aucune fiche',
        detail: 'Aucune fiche de suivi déposée depuis la création du projet.',
      }));

    const incompletes = rows
      .filter(r => r.conformite === 'A_JOUR' && r.manquantes.length > 0)
      .sort((a, b) => b.manquantes.length - a.manquantes.length)
      .map(r => ({
        id: r.id, nom: r.nom, chefProjet: r.chefProjet, probleme: 'incomplete' as const,
        badge: 'Fiche incomplète',
        detail: `Il manque dans la dernière fiche : ${r.manquantes.join(', ')}.`,
        ficheId: r.derniereFicheId,
      }));

    const aValider = rows
      .filter(r => r.conformite === 'A_JOUR' && r.manquantes.length === 0)
      .filter(r => r.fichesAValider.length > 0 || r.ficheProjetAValider)
      .map(r => ({
        id: r.id, nom: r.nom, chefProjet: r.chefProjet, probleme: 'validation' as const,
        badge: 'À valider',
        detail: this.phraseAValider(r),
        ficheId: r.fichesAValider[0],
      }));

    return [...retards, ...jamaisSuivis, ...incompletes, ...aValider];
  }

  private phraseAValider(r: ProjetRow): string {
    const nb = r.fichesAValider.length;
    const suivi = this.pl(nb, 'fiche de suivi', 'fiches de suivi');
    if (nb === 0) return 'La fiche projet attend votre décision.';
    if (r.ficheProjetAValider) return `La fiche projet et ${suivi} attendent votre décision.`;
    return `${suivi} ${nb > 1 ? 'attendent' : 'attend'} votre décision.`;
  }

  /** Fiches projet et fiches de suivi ensemble. Même périmètre que la complétude : seules comptent les fiches dont le projet existe encore. */
  private construireValidation(rows: ProjetRow[], suivis: FicheSuivi[]) {
    const projets = this.fichesProjet.filter(p => !!p.id);
    const statuts = [...projets, ...suivis].map(f => statutValidation(f.validation));
    const compter = (statut: StatutValidation) => statuts.filter(s => s === statut).length;

    this.bilanValidation = {
      total: statuts.length,
      nbProjets: projets.length,
      nbSuivis: suivis.length,
      validees: compter('VALIDEE'),
      aValider: compter('A_VALIDER'),
      aCorriger: compter('A_CORRIGER'),
    };

    const parProjet = new Map(rows.map(r => [r.id, r]));
    const ligne = (id: string, type: FicheAValider['type'], projetId: string, date?: string): FicheAValider => ({
      id,
      type,
      date,
      projetNom: parProjet.get(projetId)?.nom || 'Projet inconnu',
      chefProjet: parProjet.get(projetId)?.chefProjet || 'Non attribué',
    });

    // Une fiche à corriger attend son chef de projet, pas le pilote : elle n'est pas dans cette liste.
    this.fichesAValider = [
      ...projets.filter(p => statutValidation(p.validation) === 'A_VALIDER')
        .map(p => ligne(p.id!, 'projet', p.id!, p.dateCreation)),
      ...suivis.filter(f => f.id && statutValidation(f.validation) === 'A_VALIDER')
        .map(f => ligne(f.id!, 'suivi', f.ficheProjetId, f.dateRapport)),
    ].sort((a, b) => this.tsOf(a.date) - this.tsOf(b.date));
  }

  private buildKpis() {
    // Espace fine insécable avant « % » (typographie française)
    this.kpis = [
      {
        key: 'conformite', title: 'Conformité du suivi', value: `${this.tauxConformite} %`, accent: 'green',
        percent: this.tauxConformite,
        hint: `${this.rows.length - this.nbEnRetard - this.nbJamaisSuivi} sur ${this.rows.length} projets à jour`,
      },
      {
        key: 'retard', title: 'Fiches en retard', value: `${this.nbEnRetard}`, accent: 'red',
        hint: this.nbEnRetard ? `sur ${this.pl(this.rows.length, 'projet')}` : 'Aucun retard',
      },
      {
        key: 'jamais', title: 'Jamais suivis', value: `${this.nbJamaisSuivi}`, accent: 'gray',
        hint: this.nbJamaisSuivi ? `sur ${this.pl(this.rows.length, 'projet')}` : 'Tous les projets ont une fiche',
      },
      {
        key: 'completude', title: 'Complétude des fiches', value: `${this.completudeMoyenne} %`, accent: 'green',
        percent: this.completudeMoyenne,
        hint: `${RUBRIQUES.length} rubriques contrôlées`,
      },
      {
        key: 'echeances', title: 'Échéances sous 30 jours', value: `${this.nbEcheances30j}`, accent: 'amber',
        hint: 'Ouvrir la messagerie',
        action: 'route', payload: '/pilote-qualite/notifications',
      },
    ];
  }

  /** Initiales d'un nom de compte (« mehdi.bouaziz » → MB, « chefprojet » → CH). */
  initiales(nom: string): string {
    const parts = (nom || '').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
  }

  /** Accord simple : pl(1, 'projet') → « 1 projet », pl(3, 'projet') → « 3 projets ». */
  pl(n: number, singulier: string, pluriel = singulier + 's'): string {
    return `${n} ${n > 1 ? pluriel : singulier}`;
  }

  // ==================== Tri & rendu ====================

  get projetsATraiterVisibles(): ProjetATraiter[] {
    return this.toutesLesLignes || this.impression ? this.projetsATraiter : this.projetsATraiter.slice(0, 6);
  }

  get fichesAValiderVisibles(): FicheAValider[] {
    return this.fichesAValiderOuvertes || this.impression
      ? this.fichesAValider
      : this.fichesAValider.slice(0, this.nbFichesAValiderVisibles);
  }

  get nbNonValidees(): number {
    return this.bilanValidation.aValider + this.bilanValidation.aCorriger;
  }

  get pourcentValidees(): number {
    return this.bilanValidation.total ? Math.round((this.bilanValidation.validees / this.bilanValidation.total) * 100) : 0;
  }

  get alertes(): ProjetRow[] {
    const liste = this.rows.filter(r => r.conformite === 'EN_RETARD').sort((a, b) => b.joursRetard - a.joursRetard);
    return this.alertesOuvertes || this.impression ? liste : liste.slice(0, 3);
  }

  get nbAlertes(): number {
    return this.rows.filter(r => r.conformite === 'EN_RETARD').length;
  }

  get totalJoursRetard(): number {
    return this.rows.filter(r => r.conformite === 'EN_RETARD').reduce((s, r) => s + r.joursRetard, 0);
  }

  get pireRetard(): number {
    return this.rows.filter(r => r.conformite === 'EN_RETARD').reduce((max, r) => Math.max(max, r.joursRetard), 0);
  }

  /** Trois paliers de gravité pour hiérarchiser visuellement les relances. */
  severite(joursRetard: number): 'critique' | 'eleve' | 'modere' {
    if (joursRetard > 60) return 'critique';
    if (joursRetard > 30) return 'eleve';
    return 'modere';
  }

  severiteLabel(joursRetard: number): string {
    switch (this.severite(joursRetard)) {
      case 'critique': return 'Critique';
      case 'eleve': return 'Élevé';
      default: return 'Modéré';
    }
  }

  /** Nombre de cycles de reporting sautés : traduit le retard en unités du processus. */
  cyclesManques(row: ProjetRow): number {
    if (!row.periodicite) return 0;
    return Math.floor(row.joursRetard / (row.periodicite * MOIS_JOURS));
  }

  /** Remplissage de la barre de retard : 100 % dès qu'un cycle complet est sauté. */
  remplissageRetard(row: ProjetRow): number {
    const reference = row.periodicite ? row.periodicite * MOIS_JOURS : 90;
    return Math.min(100, Math.round((row.joursRetard / reference) * 100));
  }

  conformiteColor(c: Conformite): string {
    return CONFORMITE_DEFS.find(d => d.key === c)?.color || '#94a3b8';
  }

  completudeColor(score: number): string {
    if (score >= 100) return '#09C82C';
    if (score >= 67) return '#f59e0b';
    if (score >= 34) return '#f97316';
    return '#ef4444';
  }

  /** Même palier que completudeColor, en teinte plus foncée pour rester lisible en texte sur fond blanc. */
  completudeTextColor(score: number): string {
    if (score >= 100) return '#047857';
    if (score >= 67) return '#b45309';
    if (score >= 34) return '#c2410c';
    return '#b91c1c';
  }

  /** Hauteur d'une barre du mois, relative au mois le plus chargé. */
  hauteurDepots(n: number): number {
    return this.maxDepotsMois ? (n / this.maxDepotsMois) * 100 : 0;
  }

  private dateOf(f: FicheSuivi): number {
    return this.tsOf(f.dateRapport);
  }

  private tsOf(date?: string): number {
    const t = date ? new Date(date).getTime() : 0;
    return isNaN(t) ? 0 : t;
  }

  /** Statut tel qu'on le lit : « En cours » plutôt que le code EN_COURS. */
  private statutLabel(statut?: string): string {
    switch ((statut || '').toUpperCase()) {
      case 'EN_COURS': return 'En cours';
      case 'TERMINE': return 'Terminé';
      case 'EN_ATTENTE': return 'En attente';
      case 'ANNULE': return 'Annulé';
      case '': return 'Non défini';
      default: return statut!;
    }
  }

  // ==================== Impression & navigation ====================

  imprimer() {
    this.avantImpression();
    window.print();
  }

  // Aussi déclenché par Ctrl+P : le DOM doit être complété avant que le navigateur ne mette en page
  @HostListener('window:beforeprint')
  avantImpression() {
    this.impression = true;
    this.cdr.detectChanges();
  }

  @HostListener('window:afterprint')
  apresImpression() {
    this.impression = false;
  }

  onKpiClick(kpi: KpiCard) {
    if (kpi.action === 'route') this.navigateTo(kpi.payload!);
  }

  /** Envoie au chef de projet l'email de relance du projet, sans quitter le tableau de bord. */
  relancer(projetId: string, event: Event) {
    event.stopPropagation();
    this.relancesEnCours.add(projetId);
    this.relances.delete(projetId);

    this.notificationService.relancerProjet(projetId).subscribe({
      next: (res) => {
        this.relances.set(projetId, { ok: true, message: res.message });
        this.relancesEnCours.delete(projetId);
      },
      error: (err) => {
        this.relances.set(projetId, { ok: false, message: err.error?.message || 'Erreur lors de l\'envoi de la relance' });
        this.relancesEnCours.delete(projetId);
      }
    });
  }

  libelleRelance(projetId: string): string {
    if (this.relancesEnCours.has(projetId)) return 'Envoi…';
    const relance = this.relances.get(projetId);
    if (!relance) return 'Relancer';
    return relance.ok ? 'Relance envoyée' : 'Échec, réessayer';
  }

  navigateTo(link: string) {
    this.router.navigate([link]);
  }

  viewProjet(id: string) {
    this.router.navigate(['/pilote-qualite/fiches-projet', id]);
  }

  voirFiche(fiche: FicheAValider) {
    if (fiche.type === 'projet') {
      this.viewProjet(fiche.id);
    } else {
      this.viewFicheSuivi(fiche.id);
    }
  }

  viewFicheSuivi(id: string) {
    if (id) this.router.navigate(['/pilote-qualite/fiches-suivi', id]);
  }
}
