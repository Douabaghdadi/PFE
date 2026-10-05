import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminDashboardService, AdminUser, Nomenclature } from '../../../services/admin-dashboard.service';
import { FicheProjet } from '../../../services/pilote-qualite-fiche-projet.service';
import { FicheSuivi } from '../../../services/fiche-suivi.service';

/**
 * Tableau de bord de l'ADMINISTRATEUR.
 *
 * Périmètre : la gouvernance de la plateforme (comptes, rôles, référentiel) et la
 * vue d'ensemble du portefeuille. On ne juge jamais ici la qualité d'un projet :
 * la ponctualité du reporting et la complétude des fiches appartiennent au
 * tableau de bord du pilote qualité (/pilote-qualite/dashboard).
 */

type Periode = '30' | '90' | '365' | 'all';

const JOUR_MS = 24 * 60 * 60 * 1000;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 54;
const SANS_ROLE = 'SANS_ROLE';

interface RoleDef {
  key: string;
  label: string;
  court: string;
  color: string;
}

/** Ordre = priorité d'affichage du « rôle principal » d'un compte. */
const ROLE_DEFS: RoleDef[] = [
  { key: 'ROLE_ADMIN', label: 'Administrateur', court: 'Admin', color: '#ef4444' },
  { key: 'ROLE_PILOTE_QUALITE', label: 'Pilote qualité', court: 'Pilote', color: '#6366f1' },
  { key: 'ROLE_CHEF_PROJET', label: 'Chef de projet', court: 'Chef projet', color: '#3b82f6' },
  { key: 'ROLE_USER', label: 'Utilisateur', court: 'Utilisateur', color: '#09C82C' },
  { key: SANS_ROLE, label: 'Sans rôle', court: 'Sans rôle', color: '#94a3b8' },
];

const STATUT_DEFS: { key: string; label: string; color: string }[] = [
  { key: 'EN_COURS', label: 'En cours', color: '#3b82f6' },
  { key: 'TERMINE', label: 'Terminé', color: '#09C82C' },
  { key: 'EN_ATTENTE', label: 'En attente', color: '#f59e0b' },
  { key: 'ANNULE', label: 'Annulé', color: '#94a3b8' },
  { key: 'NON_RENSEIGNE', label: 'Non renseigné', color: '#cbd5e1' },
];

const NOMENCLATURE_DEFS: { key: string; label: string }[] = [
  { key: 'STATUT', label: 'Statuts' },
  { key: 'CATEGORIE_PROJET', label: 'Catégories de projet' },
  { key: 'TYPE_FICHE', label: 'Types de fiche' },
];

interface UserRow {
  id: string;
  username: string;
  email: string;
  roles: string[];
  rolePrincipal: string;
  roleLabel: string;
  roleColor: string;
  createdAt?: string;
  projets: number;
  fiches: number;
  derniereActivite?: string;
}

interface KpiCard {
  key: string;
  title: string;
  value: string;
  hint: string;
  icon: string;
  accent: string;
  action: 'role' | 'route' | 'reset';
  payload?: string;
}

interface DonutSegment {
  key: string;
  label: string;
  color: string;
  count: number;
  percent: number;
  dash: string;
  offset: number;
}

interface BarreStat {
  key: string;
  label: string;
  color: string;
  count: number;
  percent: number;
}

interface MoisBar {
  label: string;
  titre: string;
  comptes: number;
  projets: number;
  fiches: number;
  total: number;
  hComptes: number;
  hProjets: number;
  hFiches: number;
}

interface ReferentielGroupe {
  key: string;
  label: string;
  total: number;
  actifs: number;
  inactifs: number;
  percent: number;
}

interface ChefStat {
  id: string;
  nom: string;
  projets: number;
  fiches: number;
  part: number;
  dernierDepot?: string;
}

interface ActiviteItem {
  type: 'compte' | 'projet' | 'fiche';
  icon: string;
  titre: string;
  meta: string;
  date: string;
  lien?: any[];
}

interface Attention {
  key: string;
  label: string;
  detail: string;
  count: number;
  ton: 'rouge' | 'orange' | 'gris';
  lien?: any[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminDashboardService);
  private router = inject(Router);

  // --- État ---
  loading = true;
  error: string | null = null;
  generatedAt = new Date();

  // --- Données brutes ---
  users: AdminUser[] = [];
  projets: FicheProjet[] = [];
  fiches: FicheSuivi[] = [];
  nomenclatures: Nomenclature[] = [];

  // --- Filtres ---
  searchTerm = '';
  roleFilter = '';
  periode: Periode = '365';
  readonly periodeOptions: { value: Periode; label: string }[] = [
    { value: '30', label: '30 derniers jours' },
    { value: '90', label: '90 derniers jours' },
    { value: '365', label: '12 derniers mois' },
    { value: 'all', label: 'Depuis le début' },
  ];

  // --- Tri du tableau des comptes ---
  sortKey: 'username' | 'createdAt' | 'projets' | 'fiches' = 'createdAt';
  sortAsc = false;
  tableComplete = false;

  // --- Données calculées ---
  rowsAll: UserRow[] = [];
  rows: UserRow[] = [];
  kpis: KpiCard[] = [];
  roleSegments: DonutSegment[] = [];
  statutBarres: BarreStat[] = [];
  categorieBarres: BarreStat[] = [];
  moisBars: MoisBar[] = [];
  referentiel: ReferentielGroupe[] = [];
  chefStats: ChefStat[] = [];
  activites: ActiviteItem[] = [];
  attentions: Attention[] = [];

  nouveauxComptes = 0;
  projetsPeriode = 0;
  fichesPeriode = 0;
  projetsActifs = 0;
  nomenclaturesActives = 0;
  nomenclaturesInactives = 0;
  activitesCompletes = false;

  readonly roleDefs = ROLE_DEFS;
  readonly donutCircumference = DONUT_CIRCUMFERENCE;

  ngOnInit() {
    this.loadData();
  }

  // ==================== Chargement ====================

  loadData() {
    this.loading = true;
    this.error = null;

    Promise.all([
      firstValueFrom(this.adminService.getUsers()),
      firstValueFrom(this.adminService.getAllFichesProjet()),
      firstValueFrom(this.adminService.getAllFichesSuivi()),
      firstValueFrom(this.adminService.getNomenclatures()),
    ]).then(([users, projets, fiches, nomenclatures]) => {
      this.users = users || [];
      this.projets = projets || [];
      this.fiches = fiches || [];
      this.nomenclatures = nomenclatures || [];
      this.generatedAt = new Date();
      this.construireLignes();
      this.applyFilters();
      this.loading = false;
    }).catch(err => {
      console.error('Erreur lors du chargement du tableau de bord admin:', err);
      this.error = 'Impossible de charger les données d\'administration.';
      this.loading = false;
    });
  }

  refresh() {
    this.loadData();
  }

  // ==================== Construction des lignes ====================

  /** Une ligne par compte, enrichie du nombre de projets pilotés et de fiches déposées. */
  private construireLignes() {
    const projetsParChef = new Map<string, number>();
    for (const p of this.projets) {
      if (!p.chefProjetId) continue;
      projetsParChef.set(p.chefProjetId, (projetsParChef.get(p.chefProjetId) || 0) + 1);
    }

    const fichesParChef = new Map<string, number>();
    const dernierDepot = new Map<string, number>();
    for (const f of this.fiches) {
      if (!f.chefProjetId) continue;
      fichesParChef.set(f.chefProjetId, (fichesParChef.get(f.chefProjetId) || 0) + 1);
      const t = this.temps(f.dateCreation || f.dateRapport);
      if (t > (dernierDepot.get(f.chefProjetId) || 0)) dernierDepot.set(f.chefProjetId, t);
    }

    this.rowsAll = this.users.map(u => {
      const roles = u.roles || [];
      const principal = this.rolePrincipal(roles);
      const def = this.roleDef(principal);
      const dernier = dernierDepot.get(u.id);

      return {
        id: u.id,
        username: u.username || '—',
        email: u.email || '',
        roles,
        rolePrincipal: principal,
        roleLabel: def.label,
        roleColor: def.color,
        createdAt: u.createdAt,
        projets: projetsParChef.get(u.id) || 0,
        fiches: fichesParChef.get(u.id) || 0,
        derniereActivite: dernier ? new Date(dernier).toISOString() : undefined,
      };
    });
  }

  /** Le rôle le plus fort porté par le compte, selon l'ordre de ROLE_DEFS. */
  private rolePrincipal(roles: string[]): string {
    for (const def of ROLE_DEFS) {
      if (def.key !== SANS_ROLE && roles.includes(def.key)) return def.key;
    }
    return SANS_ROLE;
  }

  private roleDef(key: string): RoleDef {
    return ROLE_DEFS.find(d => d.key === key)
      || { key, label: key, court: key, color: '#94a3b8' };
  }

  // ==================== Filtres ====================

  applyFilters() {
    const terme = this.searchTerm.trim().toLowerCase();

    this.rows = this.rowsAll.filter(r => {
      if (this.roleFilter && r.rolePrincipal !== this.roleFilter) return false;
      if (!terme) return true;
      return r.username.toLowerCase().includes(terme) || r.email.toLowerCase().includes(terme);
    });

    this.trierLignes();
    this.calculerIndicateurs();
  }

  resetFilters() {
    this.searchTerm = '';
    this.roleFilter = '';
    this.periode = '365';
    this.applyFilters();
  }

  get filtresActifs(): boolean {
    return !!this.searchTerm || !!this.roleFilter || this.periode !== '365';
  }

  get roleFilterLabel(): string {
    return this.roleDef(this.roleFilter).label;
  }

  get periodeLabel(): string {
    return this.periodeOptions.find(o => o.value === this.periode)?.label || '';
  }

  setRoleFilter(key: string) {
    this.roleFilter = this.roleFilter === key ? '' : key;
    this.applyFilters();
  }

  /** Borne basse de la période, ou null quand on regarde tout l'historique. */
  private periodeLimite(): number | null {
    if (this.periode === 'all') return null;
    return Date.now() - parseInt(this.periode, 10) * JOUR_MS;
  }

  private dansPeriode(date?: string): boolean {
    const limite = this.periodeLimite();
    if (limite === null) return true;
    const t = this.temps(date);
    return t > 0 && t >= limite;
  }

  // ==================== Indicateurs ====================

  private calculerIndicateurs() {
    this.nouveauxComptes = this.rowsAll.filter(r => this.dansPeriode(r.createdAt)).length;
    this.projetsPeriode = this.projets.filter(p => this.dansPeriode(p.dateCreation)).length;
    this.fichesPeriode = this.fiches.filter(f => this.dansPeriode(f.dateCreation || f.dateRapport)).length;
    this.projetsActifs = this.projets.filter(p => (p.statut || '') === 'EN_COURS').length;
    this.nomenclaturesActives = this.nomenclatures.filter(n => n.actif !== false).length;
    this.nomenclaturesInactives = this.nomenclatures.length - this.nomenclaturesActives;

    this.construireRoleSegments();
    this.construireKpis();
    this.construireStatuts();
    this.construireCategories();
    this.construireMois();
    this.construireReferentiel();
    this.construireChefStats();
    this.construireActivites();
    this.construireAttentions();
  }

  private construireKpis() {
    const chefs = this.rowsAll.filter(r => r.roles.includes('ROLE_CHEF_PROJET'));
    const chefsSansProjet = chefs.filter(r => r.projets === 0).length;
    const privilegies = this.rowsAll.filter(
      r => r.roles.includes('ROLE_ADMIN') || r.roles.includes('ROLE_PILOTE_QUALITE')
    ).length;
    const sansRole = this.rowsAll.filter(r => r.rolePrincipal === SANS_ROLE).length;
    const projetsSansSuivi = this.projetsSansSuivi().length;

    this.kpis = [
      {
        key: 'comptes',
        title: 'Comptes actifs',
        value: String(this.rowsAll.length),
        hint: sansRole ? `${sansRole} sans rôle attribué` : 'Tous les comptes ont un rôle',
        icon: '👥',
        accent: 'blue',
        action: 'route',
        payload: '/admin/users',
      },
      {
        key: 'nouveaux',
        title: 'Nouvelles inscriptions',
        value: String(this.nouveauxComptes),
        hint: this.periode === 'all' ? 'Depuis le début' : this.periodeLabel.toLowerCase(),
        icon: '✨',
        accent: 'green',
        action: 'reset',
      },
      {
        key: 'chefs',
        title: 'Chefs de projet',
        value: String(chefs.length),
        hint: chefsSansProjet ? `${chefsSansProjet} sans projet rattaché` : 'Tous ont au moins un projet',
        icon: '📁',
        accent: 'indigo',
        action: 'role',
        payload: 'ROLE_CHEF_PROJET',
      },
      {
        key: 'privilegies',
        title: 'Comptes privilégiés',
        value: String(privilegies),
        hint: 'Administrateurs et pilotes qualité',
        icon: '🛡️',
        accent: 'red',
        action: 'role',
        payload: 'ROLE_ADMIN',
      },
      {
        key: 'projets',
        title: 'Projets de la plateforme',
        value: String(this.projets.length),
        hint: `${this.projetsActifs} en cours · ${projetsSansSuivi} sans fiche de suivi`,
        icon: '🗂️',
        accent: 'orange',
        action: 'reset',
      },
      {
        key: 'referentiel',
        title: 'Référentiel',
        value: String(this.nomenclaturesActives),
        hint: this.nomenclaturesInactives
          ? `${this.nomenclaturesInactives} entrée(s) désactivée(s)`
          : 'Toutes les entrées sont actives',
        icon: '⚙️',
        accent: 'gray',
        action: 'route',
        payload: '/admin/nomenclature',
      },
    ];
  }

  private construireRoleSegments() {
    const total = this.rowsAll.length;
    let offset = 0;

    this.roleSegments = ROLE_DEFS.map(def => ({
      def,
      count: this.rowsAll.filter(r => r.rolePrincipal === def.key).length,
    })).filter(x => x.count > 0).map(x => {
      const percent = total ? (x.count / total) * 100 : 0;
      const longueur = (percent / 100) * DONUT_CIRCUMFERENCE;
      const segment: DonutSegment = {
        key: x.def.key,
        label: x.def.label,
        color: x.def.color,
        count: x.count,
        percent: Math.round(percent),
        dash: `${longueur} ${DONUT_CIRCUMFERENCE - longueur}`,
        offset: -offset,
      };
      offset += longueur;
      return segment;
    });
  }

  private construireStatuts() {
    const total = this.projets.length;
    const comptes = new Map<string, number>();

    for (const p of this.projets) {
      const brut = (p.statut || '').trim().toUpperCase();
      const cle = STATUT_DEFS.some(d => d.key === brut && d.key !== 'NON_RENSEIGNE') ? brut : 'NON_RENSEIGNE';
      comptes.set(cle, (comptes.get(cle) || 0) + 1);
    }

    this.statutBarres = STATUT_DEFS
      .map(d => ({
        key: d.key,
        label: d.label,
        color: d.color,
        count: comptes.get(d.key) || 0,
        percent: total ? Math.round(((comptes.get(d.key) || 0) / total) * 100) : 0,
      }))
      .filter(b => b.count > 0);
  }

  /** Les catégories viennent du référentiel : on affiche le libellé quand le code est connu. */
  private construireCategories() {
    const total = this.projets.length;
    const comptes = new Map<string, number>();

    for (const p of this.projets) {
      const cle = (p.categorie || '').trim() || 'NON_RENSEIGNE';
      comptes.set(cle, (comptes.get(cle) || 0) + 1);
    }

    const palette = ['#6366f1', '#09C82C', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#94a3b8'];

    this.categorieBarres = [...comptes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([cle, count], i) => ({
        key: cle,
        label: cle === 'NON_RENSEIGNE' ? 'Non renseignée' : this.libelleNomenclature('CATEGORIE_PROJET', cle),
        color: palette[i % palette.length],
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
      }));
  }

  private libelleNomenclature(type: string, code: string): string {
    const n = this.nomenclatures.find(x => x.type === type && x.code === code);
    return n?.libelle || code;
  }

  /** Volumétrie mensuelle sur 12 mois : comptes créés, projets créés, fiches déposées. */
  private construireMois() {
    const maintenant = new Date();
    const cases: MoisBar[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      cases.push({
        label: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
        titre: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
        comptes: 0, projets: 0, fiches: 0, total: 0,
        hComptes: 0, hProjets: 0, hFiches: 0,
      });
    }

    const index = (date?: string): number => {
      const t = this.temps(date);
      if (!t) return -1;
      const d = new Date(t);
      const diff = (maintenant.getFullYear() - d.getFullYear()) * 12 + (maintenant.getMonth() - d.getMonth());
      return diff >= 0 && diff <= 11 ? 11 - diff : -1;
    };

    for (const r of this.rowsAll) {
      const i = index(r.createdAt);
      if (i >= 0) cases[i].comptes++;
    }
    for (const p of this.projets) {
      const i = index(p.dateCreation);
      if (i >= 0) cases[i].projets++;
    }
    for (const f of this.fiches) {
      const i = index(f.dateCreation || f.dateRapport);
      if (i >= 0) cases[i].fiches++;
    }

    const max = Math.max(1, ...cases.map(c => c.comptes + c.projets + c.fiches));
    for (const c of cases) {
      c.total = c.comptes + c.projets + c.fiches;
      c.hComptes = (c.comptes / max) * 100;
      c.hProjets = (c.projets / max) * 100;
      c.hFiches = (c.fiches / max) * 100;
    }

    this.moisBars = cases;
  }

  private construireReferentiel() {
    const total = this.nomenclatures.length;

    const connus = NOMENCLATURE_DEFS.map(def => {
      const items = this.nomenclatures.filter(n => n.type === def.key);
      const actifs = items.filter(n => n.actif !== false).length;
      return {
        key: def.key,
        label: def.label,
        total: items.length,
        actifs,
        inactifs: items.length - actifs,
        percent: total ? Math.round((items.length / total) * 100) : 0,
      };
    });

    const autres = this.nomenclatures.filter(n => !NOMENCLATURE_DEFS.some(d => d.key === n.type));
    if (autres.length) {
      const actifs = autres.filter(n => n.actif !== false).length;
      connus.push({
        key: 'AUTRES',
        label: 'Autres types',
        total: autres.length,
        actifs,
        inactifs: autres.length - actifs,
        percent: total ? Math.round((autres.length / total) * 100) : 0,
      });
    }

    this.referentiel = connus.filter(g => g.total > 0);
  }

  private construireChefStats() {
    const totalProjets = this.projets.length || 1;

    this.chefStats = this.rowsAll
      .filter(r => r.roles.includes('ROLE_CHEF_PROJET') || r.projets > 0)
      .map(r => ({
        id: r.id,
        nom: r.username,
        projets: r.projets,
        fiches: r.fiches,
        part: Math.round((r.projets / totalProjets) * 100),
        dernierDepot: r.derniereActivite,
      }))
      .sort((a, b) => b.projets - a.projets || b.fiches - a.fiches)
      .slice(0, 8);
  }

  /** Flux réel reconstitué à partir des dates de création des trois collections. */
  private construireActivites() {
    const nomProjet = new Map<string, string>();
    for (const p of this.projets) {
      if (p.id) nomProjet.set(p.id, p.nomProjet || 'Projet sans nom');
    }
    const nomUser = new Map<string, string>();
    for (const r of this.rowsAll) nomUser.set(r.id, r.username);

    const items: ActiviteItem[] = [];

    for (const r of this.rowsAll) {
      if (!this.dansPeriode(r.createdAt)) continue;
      items.push({
        type: 'compte',
        icon: '👤',
        titre: `Nouveau compte : ${r.username}`,
        meta: r.roleLabel,
        date: r.createdAt!,
        lien: ['/admin/users'],
      });
    }

    for (const p of this.projets) {
      if (!this.dansPeriode(p.dateCreation)) continue;
      items.push({
        type: 'projet',
        icon: '🗂️',
        titre: `Projet créé : ${p.nomProjet || 'Sans nom'}`,
        meta: nomUser.get(p.chefProjetId || '') || p.responsable || 'Chef de projet inconnu',
        date: p.dateCreation!,
      });
    }

    for (const f of this.fiches) {
      const date = f.dateCreation || f.dateRapport;
      if (!this.dansPeriode(date)) continue;
      items.push({
        type: 'fiche',
        icon: '📝',
        titre: `Fiche de suivi déposée${f.numeroRapport ? ' n°' + f.numeroRapport : ''}`,
        meta: nomProjet.get(f.ficheProjetId) || 'Projet inconnu',
        date: date!,
      });
    }

    this.activites = items
      .filter(i => this.temps(i.date) > 0)
      .sort((a, b) => this.temps(b.date) - this.temps(a.date));
  }

  get activitesVisibles(): ActiviteItem[] {
    return this.activitesCompletes ? this.activites.slice(0, 40) : this.activites.slice(0, 8);
  }

  private projetsSansSuivi(): FicheProjet[] {
    const avecFiche = new Set(this.fiches.map(f => f.ficheProjetId));
    return this.projets.filter(p => p.id && !avecFiche.has(p.id));
  }

  private construireAttentions() {
    const idsConnus = new Set(this.rowsAll.map(r => r.id));
    const sansRole = this.rowsAll.filter(r => r.rolePrincipal === SANS_ROLE).length;
    const chefsSansProjet = this.rowsAll.filter(
      r => r.roles.includes('ROLE_CHEF_PROJET') && r.projets === 0
    ).length;
    const projetsOrphelins = this.projets.filter(
      p => !p.chefProjetId || !idsConnus.has(p.chefProjetId)
    ).length;
    const sansSuivi = this.projetsSansSuivi().length;
    const aucunPilote = this.rowsAll.filter(r => r.roles.includes('ROLE_PILOTE_QUALITE')).length === 0;

    const items: Attention[] = [
      {
        key: 'sans-role',
        label: 'Comptes sans rôle',
        detail: 'Ces comptes ne peuvent accéder à aucun espace applicatif.',
        count: sansRole,
        ton: 'rouge',
        lien: ['/admin/users'],
      },
      {
        key: 'projets-orphelins',
        label: 'Projets sans chef de projet valide',
        detail: 'Le compte rattaché est absent ou a été supprimé.',
        count: projetsOrphelins,
        ton: 'rouge',
      },
      {
        key: 'chefs-sans-projet',
        label: 'Chefs de projet sans projet',
        detail: 'Rôle attribué mais aucune fiche projet rattachée.',
        count: chefsSansProjet,
        ton: 'orange',
        lien: ['/admin/users'],
      },
      {
        key: 'projets-sans-suivi',
        label: 'Projets sans aucune fiche de suivi',
        detail: 'Aucun dépôt enregistré depuis la création du projet.',
        count: sansSuivi,
        ton: 'orange',
      },
      {
        key: 'referentiel-inactif',
        label: 'Entrées de référentiel désactivées',
        detail: 'Elles restent invisibles dans les formulaires.',
        count: this.nomenclaturesInactives,
        ton: 'gris',
        lien: ['/admin/nomenclature'],
      },
      {
        key: 'aucun-pilote',
        label: 'Aucun pilote qualité déclaré',
        detail: 'Le processus de supervision qualité n\'a aucun titulaire.',
        count: aucunPilote ? 1 : 0,
        ton: 'rouge',
        lien: ['/admin/users'],
      },
    ];

    this.attentions = items.filter(a => a.count > 0);
  }

  // ==================== Tri ====================

  trier(key: 'username' | 'createdAt' | 'projets' | 'fiches') {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = key === 'username';
    }
    this.trierLignes();
  }

  private trierLignes() {
    const sens = this.sortAsc ? 1 : -1;
    this.rows = [...this.rows].sort((a, b) => {
      switch (this.sortKey) {
        case 'username': return a.username.localeCompare(b.username, 'fr') * sens;
        case 'projets': return (a.projets - b.projets) * sens;
        case 'fiches': return (a.fiches - b.fiches) * sens;
        default: return (this.temps(a.createdAt) - this.temps(b.createdAt)) * sens;
      }
    });
  }

  get rowsVisibles(): UserRow[] {
    return this.tableComplete ? this.rows : this.rows.slice(0, 10);
  }

  // ==================== Utilitaires d'affichage ====================

  private temps(date?: string): number {
    if (!date) return 0;
    const t = new Date(date).getTime();
    return isNaN(t) ? 0 : t;
  }

  initiales(nom: string): string {
    return (nom || '?').slice(0, 2).toUpperCase();
  }

  couleurRole(key: string): string {
    return this.roleDef(key).color;
  }

  libelleRoleCourt(key: string): string {
    return this.roleDef(key).court;
  }

  /** « il y a 3 jours », « aujourd'hui »… pour le flux d'activité. */
  depuis(date?: string): string {
    const t = this.temps(date);
    if (!t) return '—';
    const jours = Math.floor((Date.now() - t) / JOUR_MS);
    if (jours <= 0) return "aujourd'hui";
    if (jours === 1) return 'hier';
    if (jours < 30) return `il y a ${jours} jours`;
    const mois = Math.floor(jours / 30);
    if (mois < 12) return `il y a ${mois} mois`;
    return `il y a ${Math.floor(mois / 12)} an(s)`;
  }

  // ==================== Export & navigation ====================

  exportCsv() {
    const entetes = ['Utilisateur', 'Email', 'Roles', 'Role principal', 'Inscription',
      'Projets pilotes', 'Fiches deposees', 'Dernier depot'];

    const lignes = this.rows.map(r => [
      r.username, r.email, (r.roles || []).join(' | '), r.roleLabel,
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '',
      r.projets, r.fiches,
      r.derniereActivite ? new Date(r.derniereActivite).toLocaleDateString('fr-FR') : '',
    ]);

    const echapper = (v: any) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [entetes, ...lignes].map(l => l.map(echapper).join(';')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement('a');
    lien.href = url;
    lien.download = `comptes-plateforme-${new Date().toISOString().slice(0, 10)}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  imprimer() {
    window.print();
  }

  onKpiClick(kpi: KpiCard) {
    switch (kpi.action) {
      case 'role': this.setRoleFilter(kpi.payload!); break;
      case 'route': this.router.navigate([kpi.payload!]); break;
      case 'reset': this.resetFilters(); break;
    }
  }

  navigateTo(lien?: any[]) {
    if (lien?.length) this.router.navigate(lien);
  }
}
