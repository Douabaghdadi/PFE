/**
 * Statuts et petits utilitaires communs aux listes de projets
 * (pilote qualité : /pilote-qualite/fiches-projet, chef de projet : /projets).
 */

export type StatutKey = 'en_cours' | 'termine' | 'en_attente' | 'annule' | 'autre';

export interface StatutDef {
  key: StatutKey;
  label: string;
  /** Couleur du point des indicateurs ; la pastille de statut utilise des teintes plus foncées pour son texte (CSS). */
  color: string;
}

export const STATUT_DEFS: StatutDef[] = [
  { key: 'en_cours', label: 'En cours', color: '#3b6cc4' },
  { key: 'termine', label: 'Terminé', color: '#09c82c' },
  { key: 'en_attente', label: 'En attente', color: '#f59e0b' },
  { key: 'annule', label: 'Annulé', color: '#ef4444' },
  { key: 'autre', label: 'Autre', color: '#94a3b8' },
];

/**
 * Normalise un statut quel que soit son écriture : « EN_COURS », « En cours » et « en cours » donnent tous 'en_cours'.
 * Les statuts inconnus ou absents donnent 'autre'.
 */
export function statutKey(statut: string | undefined | null): StatutKey {
  const normalise = (statut ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[\s_-]+/g, '_');
  switch (normalise) {
    case 'en_cours': return 'en_cours';
    case 'termine': case 'terminee': return 'termine';
    case 'en_attente': return 'en_attente';
    case 'annule': case 'annulee': return 'annule';
    default: return 'autre';
  }
}

export function statutDef(statut: string | undefined | null): StatutDef {
  const key = statutKey(statut);
  return STATUT_DEFS.find(d => d.key === key)!;
}

export interface StatutStat extends StatutDef {
  count: number;
  percent: number;
}

/** Nombre et part de projets par statut (les statuts sans projet restent dans la liste, à zéro). */
export function statutStats(statuts: (string | undefined | null)[]): StatutStat[] {
  const total = statuts.length;
  return STATUT_DEFS.map(def => {
    const count = statuts.filter(s => statutKey(s) === def.key).length;
    return { ...def, count, percent: total ? Math.round((count / total) * 100) : 0 };
  });
}

/** Initiales d'un nom (« mehdi.bouaziz » → MB, « chefprojet » → CH). */
export function initiales(nom: string | undefined | null): string {
  const parts = (nom || '').trim().split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
}

/** Accord simple : pl(1, 'projet') → « 1 projet », pl(3, 'projet') → « 3 projets ». */
export function pl(n: number, singulier: string, pluriel = singulier + 's'): string {
  return `${n} ${n > 1 ? pluriel : singulier}`;
}
