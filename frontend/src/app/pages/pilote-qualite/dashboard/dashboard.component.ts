import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PiloteQualiteFicheProjetService, FicheProjet, ProjetSuiviStatus } from '../../../services/pilote-qualite-fiche-projet.service';
import { PiloteQualiteFicheSuiviService } from '../../../services/pilote-qualite-fiche-suivi.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';
import { ChatbotComponent } from '../../../components/chatbot/chatbot.component';

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
  planning: boolean;
  recommandations: boolean;
  score: number;
}

interface ProjetRow {
  id: string;
  nom: string;
  statut: string;
  statutKey: string;
  chefProjet: string;
  conformite: Conformite;
  joursRetard: number;
  periodicite?: number;
  derniereFiche?: string;
  prochaineFiche?: string;
  joursAvantEcheance: number | null;
  nbFiches: number;
  nbFichesPeriode: number;
  completude: number;
  derive: number | null;
  cases: HeatCase[];
}

interface HeatCase {
  label: string;
  count: number;
  niveau: number;
}

interface KpiCard {
  key: string;
  title: string;
  value: string;
  hint: string;
  icon: string;
  accent: string;
  action: 'conformite' | 'route' | 'reset';
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

interface Echeance {
  projetId: string;
  projetNom: string;
  date: string;
  jours: number;
  periodicite?: number;
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
  { cle: 'planning', label: 'Planning actuel' },
  { cle: 'recommandations', label: 'Recommandations' },
];

const DONUT_CIRCUMFERENCE = 2 * Math.PI * 54;
const JOUR_MS = 24 * 60 * 60 * 1000;
const MOIS_JOURS = 30.44;
const NB_MOIS_HEATMAP = 6;

@Component({
  selector: 'app-pilote-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ChatbotComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class PiloteDashboardComponent implements OnInit {
  private ficheProjetService = inject(PiloteQualiteFicheProjetService);
  private ficheSuiviService = inject(PiloteQualiteFicheSuiviService);
  private router = inject(Router);

  loading = true;
  error: string | null = null;
  generatedAt = new Date();

  // --- Données brutes ---
  fichesProjet: FicheProjet[] = [];
  fichesSuivi: FicheSuivi[] = [];
  suiviStatus: ProjetSuiviStatus[] = [];

  // --- Filtres ---
  searchTerm = '';
  statutFilter = '';
  periode: 'all' | '90' | '180' | '365' = 'all';
  conformiteFilter: '' | Conformite = '';

  periodeOptions = [
    { value: 'all', label: 'Tout l\'historique' },
    { value: '90', label: 'Dépôts des 3 derniers mois' },
    { value: '180', label: 'Dépôts des 6 derniers mois' },
    { value: '365', label: 'Dépôts des 12 derniers mois' },
  ];

  // --- Options d'affichage ---
  alertesOuvertes = true;
  toutesLesLignes = false;
  heatmapComplete = false;
  sortKey: 'retard' | 'completude' | 'anciennete' | 'nom' = 'retard';
  sortAsc = false;

  // --- Données calculées ---
  rowsAll: ProjetRow[] = [];
  rows: ProjetRow[] = [];
  auditsParFiche = new Map<string, AuditFiche>();
  kpis: KpiCard[] = [];
  conformiteSegments: ConformiteSegment[] = [];
  rubriques: RubriqueStat[] = [];
  moisLabels: string[] = [];
  echeanceBuckets: EcheanceBucket[] = [];
  prochainesEcheances: Echeance[] = [];
  chefStats: ChefStat[] = [];
  derniersDepots: Depot[] = [];

  tauxConformite = 0;
  completudeMoyenne = 0;
  deriveMoyenne = 0;
  nbFichesPeriode = 0;
  nbEnRetard = 0;
  nbJamaisSuivi = 0;
  nbEcheances30j = 0;

  readonly donutCircumference = DONUT_CIRCUMFERENCE;
  readonly rubriqueDefs = RUBRIQUES;

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
      firstValueFrom(this.ficheProjetService.getProjetsSuiviStatus())
    ]).then(([projets, suivis, status]) => {
      this.fichesProjet = projets || [];
      this.fichesSuivi = suivis || [];
      this.suiviStatus = status || [];
      this.auditerFiches();
      this.generatedAt = new Date();
      this.applyFilters();
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
        planning: (f.planningActuel?.taches || []).length > 0,
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

  // ==================== Filtres ====================

  applyFilters() {
    this.rowsAll = this.buildRows();

    const terme = this.searchTerm.trim().toLowerCase();
    this.rows = this.rowsAll.filter(r => {
      if (terme && !r.nom.toLowerCase().includes(terme) && !r.chefProjet.toLowerCase().includes(terme)) return false;
      if (this.statutFilter && r.statutKey !== this.statutFilter) return false;
      if (this.conformiteFilter && r.conformite !== this.conformiteFilter) return false;
      return true;
    });

    this.computeAggregates();
  }

  resetFilters() {
    this.searchTerm = '';
    this.statutFilter = '';
    this.periode = 'all';
    this.conformiteFilter = '';
    this.applyFilters();
  }

  setConformiteFilter(key: Conformite) {
    this.conformiteFilter = this.conformiteFilter === key ? '' : key;
    this.applyFilters();
  }

  get filtresActifs(): boolean {
    return !!this.searchTerm || !!this.statutFilter || this.periode !== 'all' || !!this.conformiteFilter;
  }

  get conformiteFilterLabel(): string {
    return CONFORMITE_DEFS.find(d => d.key === this.conformiteFilter)?.label || '';
  }

  get periodeLabel(): string {
    return this.periodeOptions.find(o => o.value === this.periode)?.label || '';
  }

  get statutFilterLabel(): string {
    const labels: { [key: string]: string } = {
      EN_COURS: 'En cours', TERMINE: 'Terminés', EN_ATTENTE: 'En attente', ANNULE: 'Annulés',
    };
    return labels[this.statutFilter] || this.statutFilter;
  }

  private periodeLimite(): number | null {
    if (this.periode === 'all') return null;
    return Date.now() - parseInt(this.periode, 10) * JOUR_MS;
  }

  // ==================== Construction des lignes ====================

  private buildRows(): ProjetRow[] {
    const limite = this.periodeLimite();
    const now = Date.now();

    const parProjet = new Map<string, FicheSuivi[]>();
    for (const f of this.fichesSuivi) {
      const liste = parProjet.get(f.ficheProjetId) || [];
      liste.push(f);
      parProjet.set(f.ficheProjetId, liste);
    }

    const statusParProjet = new Map(this.suiviStatus.map(s => [s.projetId, s]));
    this.moisLabels = this.construireMoisLabels();

    return this.fichesProjet.filter(p => !!p.id).map(p => {
      const id = p.id!;
      const liste = (parProjet.get(id) || []).sort((a, b) => this.dateOf(b) - this.dateOf(a));
      const dansPeriode = liste.filter(f => !limite || this.dateOf(f) >= limite);
      const status = statusParProjet.get(id);

      const joursRetard = status?.ficheSuiviEnRetard ? status.joursRetard : 0;
      const conformite: Conformite = liste.length === 0 ? 'JAMAIS_SUIVI' : (joursRetard > 0 ? 'EN_RETARD' : 'A_JOUR');

      const prochaine = status?.dateProchaineFicheSuivi || p.dateProchaineFicheSuivi;
      const prochaineTs = prochaine ? new Date(prochaine).getTime() : NaN;
      const joursAvantEcheance = isNaN(prochaineTs) ? null : Math.round((prochaineTs - now) / JOUR_MS);

      const scores = dansPeriode.map(f => this.auditDe(f)?.score).filter((s): s is number => s != null);
      const completude = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      return {
        id,
        nom: p.nomProjet || p.designationProjet || 'Projet sans nom',
        statut: p.statut || 'Non défini',
        statutKey: this.normalize(p.statut),
        chefProjet: p.responsable || liste[0]?.ficheSignaletique?.chefProjet?.nom || 'Non attribué',
        conformite,
        joursRetard,
        periodicite: status?.periodiciteSuiviMois || p.periodiciteSuiviMois,
        derniereFiche: status?.dateDerniereFicheSuivi || liste[0]?.dateRapport,
        prochaineFiche: prochaine,
        joursAvantEcheance,
        nbFiches: liste.length,
        nbFichesPeriode: dansPeriode.length,
        completude,
        derive: this.calculerDerive(liste, status?.periodiciteSuiviMois || p.periodiciteSuiviMois),
        cases: this.construireCases(liste),
      };
    });
  }

  /** Dérive moyenne : écart en jours entre l'intervalle réel de dépôt et la périodicité attendue. */
  private calculerDerive(liste: FicheSuivi[], periodicite?: number): number | null {
    if (!periodicite || liste.length < 2) return null;
    const dates = liste.map(f => this.dateOf(f)).filter(t => t > 0).sort((a, b) => a - b);
    if (dates.length < 2) return null;

    const attendu = periodicite * MOIS_JOURS;
    let total = 0;
    for (let i = 1; i < dates.length; i++) {
      total += (dates[i] - dates[i - 1]) / JOUR_MS - attendu;
    }
    return Math.round(total / (dates.length - 1));
  }

  private construireMoisLabels(): string[] {
    const labels: string[] = [];
    const now = new Date();
    for (let i = NB_MOIS_HEATMAP - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''));
    }
    return labels;
  }

  private construireCases(liste: FicheSuivi[]): HeatCase[] {
    const cases: HeatCase[] = [];
    const cles: string[] = [];
    const now = new Date();

    for (let i = NB_MOIS_HEATMAP - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cles.push(`${d.getFullYear()}-${d.getMonth()}`);
      cases.push({ label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), count: 0, niveau: 0 });
    }

    for (const f of liste) {
      if (!f.dateRapport) continue;
      const d = new Date(f.dateRapport);
      if (isNaN(d.getTime())) continue;
      const index = cles.indexOf(`${d.getFullYear()}-${d.getMonth()}`);
      if (index >= 0) cases[index].count++;
    }

    cases.forEach(c => (c.niveau = c.count === 0 ? 0 : Math.min(3, c.count)));
    return cases;
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
    const limite = this.periodeLimite();
    const fichesVisibles = this.fichesSuivi.filter(f =>
      idsVisibles.has(f.ficheProjetId) && (!limite || this.dateOf(f) >= limite));
    this.nbFichesPeriode = fichesVisibles.length;

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

    // --- Ponctualité ---
    const derives = rows.map(r => r.derive).filter((d): d is number => d != null);
    this.deriveMoyenne = derives.length ? Math.round(derives.reduce((a, b) => a + b, 0) / derives.length) : 0;

    // --- Échéancier ---
    this.construireEcheancier(rows);

    // --- Discipline par chef de projet ---
    this.chefStats = this.construireChefStats(rows);

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

    this.prochainesEcheances = avecEcheance
      .filter(r => r.joursAvantEcheance! >= 0)
      .sort((a, b) => a.joursAvantEcheance! - b.joursAvantEcheance!)
      .slice(0, 6)
      .map(r => ({
        projetId: r.id,
        projetNom: r.nom,
        date: r.prochaineFiche!,
        jours: r.joursAvantEcheance!,
        periodicite: r.periodicite,
      }));
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
        const avecFiches = liste.filter(r => r.nbFichesPeriode > 0);
        return {
          nom,
          projets: liste.length,
          fiches: liste.reduce((s, r) => s + r.nbFichesPeriode, 0),
          retards: liste.filter(r => r.conformite !== 'A_JOUR').length,
          conformite: Math.round((aJour / liste.length) * 100),
          completude: avecFiches.length
            ? Math.round(avecFiches.reduce((s, r) => s + r.completude, 0) / avecFiches.length)
            : 0,
        };
      })
      .sort((a, b) => a.conformite - b.conformite || b.retards - a.retards);
  }

  private buildKpis() {
    this.kpis = [
      {
        key: 'conformite', title: 'Conformité du suivi', value: `${this.tauxConformite}%`, icon: '✅', accent: 'green',
        hint: `${this.rows.length - this.nbEnRetard - this.nbJamaisSuivi}/${this.rows.length} projets à jour`,
        action: 'conformite', payload: 'A_JOUR',
      },
      {
        key: 'retard', title: 'Fiches en retard', value: `${this.nbEnRetard}`, icon: '⏰', accent: 'red',
        hint: this.nbEnRetard ? 'Cliquer pour isoler' : 'Aucun retard 🎉',
        action: 'conformite', payload: 'EN_RETARD',
      },
      {
        key: 'jamais', title: 'Jamais suivis', value: `${this.nbJamaisSuivi}`, icon: '📭', accent: 'gray',
        hint: 'Aucune fiche déposée à ce jour',
        action: 'conformite', payload: 'JAMAIS_SUIVI',
      },
      {
        key: 'completude', title: 'Complétude des fiches', value: `${this.completudeMoyenne}%`, icon: '📝', accent: 'indigo',
        hint: `${RUBRIQUES.length} rubriques auditées`,
        action: 'reset',
      },
      {
        key: 'derive', title: 'Dérive de dépôt', value: this.formatDerive(this.deriveMoyenne), icon: '📅', accent: 'orange',
        hint: 'Écart moyen vs périodicité',
        action: 'reset',
      },
      {
        key: 'echeances', title: 'Échéances sous 30 j', value: `${this.nbEcheances30j}`, icon: '🔔', accent: 'blue',
        hint: `${this.nbFichesPeriode} dépôt(s) sur la période`,
        action: 'route', payload: '/pilote-qualite/notifications',
      },
    ];
  }

  // ==================== Tri & rendu ====================

  get projetsNonConformes(): ProjetRow[] {
    const liste = this.rows.filter(r => r.conformite !== 'A_JOUR' || r.completude < 100);
    const sens = this.sortAsc ? 1 : -1;
    liste.sort((a, b) => {
      switch (this.sortKey) {
        case 'nom': return a.nom.localeCompare(b.nom) * sens;
        case 'completude': return (a.completude - b.completude) * sens;
        case 'anciennete': return (this.tsOf(a.derniereFiche) - this.tsOf(b.derniereFiche)) * sens * -1;
        default: return (a.joursRetard - b.joursRetard) * sens;
      }
    });
    return this.toutesLesLignes ? liste : liste.slice(0, 6);
  }

  get nbNonConformes(): number {
    return this.rows.filter(r => r.conformite !== 'A_JOUR' || r.completude < 100).length;
  }

  get heatmapRows(): ProjetRow[] {
    const liste = [...this.rows].sort((a, b) => a.nom.localeCompare(b.nom));
    return this.heatmapComplete ? liste : liste.slice(0, 8);
  }

  get alertes(): ProjetRow[] {
    const liste = this.rows.filter(r => r.conformite === 'EN_RETARD').sort((a, b) => b.joursRetard - a.joursRetard);
    return this.alertesOuvertes ? liste : liste.slice(0, 2);
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

  sortBy(key: 'retard' | 'completude' | 'anciennete' | 'nom') {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = key === 'nom' || key === 'completude';
    }
  }

  conformiteColor(c: Conformite): string {
    return CONFORMITE_DEFS.find(d => d.key === c)?.color || '#94a3b8';
  }

  conformiteLabel(c: Conformite): string {
    return CONFORMITE_DEFS.find(d => d.key === c)?.label || c;
  }

  completudeColor(score: number): string {
    if (score >= 100) return '#09C82C';
    if (score >= 67) return '#f59e0b';
    if (score >= 34) return '#f97316';
    return '#ef4444';
  }

  caseColor(niveau: number): string {
    switch (niveau) {
      case 0: return '#f1f5f9';
      case 1: return '#bbf7d0';
      case 2: return '#4ade80';
      default: return '#09C82C';
    }
  }

  formatDerive(jours: number): string {
    if (!jours) return '0 j';
    return `${jours > 0 ? '+' : ''}${jours} j`;
  }

  formatEcheance(jours: number): string {
    if (jours === 0) return "aujourd'hui";
    if (jours === 1) return 'demain';
    return `dans ${jours} j`;
  }

  private normalize(valeur?: string): string {
    return (valeur || '')
      .toUpperCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[\s-]+/g, '_');
  }

  private dateOf(f: FicheSuivi): number {
    return this.tsOf(f.dateRapport);
  }

  private tsOf(date?: string): number {
    const t = date ? new Date(date).getTime() : 0;
    return isNaN(t) ? 0 : t;
  }

  // ==================== Export & navigation ====================

  exportCsv() {
    const entetes = ['Projet', 'Statut', 'Chef de projet', 'Conformite', 'Jours de retard', 'Periodicite (mois)',
      'Derniere fiche', 'Prochaine echeance', 'Fiches deposees', 'Completude (%)', 'Derive (j)'];

    const lignes = this.rows.map(r => [
      r.nom, r.statut, r.chefProjet, this.conformiteLabel(r.conformite), r.joursRetard, r.periodicite ?? '',
      r.derniereFiche ? new Date(r.derniereFiche).toLocaleDateString('fr-FR') : '',
      r.prochaineFiche ? new Date(r.prochaineFiche).toLocaleDateString('fr-FR') : '',
      r.nbFichesPeriode, r.completude, r.derive ?? ''
    ]);

    const echapper = (v: any) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [entetes, ...lignes].map(l => l.map(echapper).join(';')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `audit-reporting-qualite-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  imprimer() {
    window.print();
  }

  onKpiClick(kpi: KpiCard) {
    switch (kpi.action) {
      case 'conformite': this.setConformiteFilter(kpi.payload as Conformite); break;
      case 'route': this.navigateTo(kpi.payload!); break;
      case 'reset': this.resetFilters(); break;
    }
  }

  navigateTo(link: string) {
    this.router.navigate([link]);
  }

  /** Passage de relais vers l'analyse de performance : le dashboard détecte, la page KPI diagnostique. */
  analyserProjet(id: string, event?: Event) {
    event?.stopPropagation();
    this.router.navigate(['/pilote-qualite/projet-kpi', id]);
  }

  viewProjet(id: string) {
    this.router.navigate(['/pilote-qualite/fiches-projet', id]);
  }

  viewFicheSuivi(id: string) {
    if (id) this.router.navigate(['/pilote-qualite/fiches-suivi', id]);
  }
}
