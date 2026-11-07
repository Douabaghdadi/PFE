import { FicheSuivi, TacheSuivi } from '../../services/fiche-suivi.service';

/**
 * Chiffres communs aux listes de fiches de suivi
 * (pilote qualité : /pilote-qualite/fiches-suivi, chef de projet : /fiches-suivi).
 */

export interface SuiviResume {
  taches: number;
  problemes: number;
  risques: number;
}

/** Les lignes vides de la saisie (champ laissé blanc) ne comptent pas comme un problème ni comme un risque. */
function lignesRenseignees(lignes: string[] | undefined | null): number {
  return (lignes || []).filter(ligne => !!ligne && ligne.trim()).length;
}

/**
 * Le résultat est gardé par fiche : le template l'appelle à chaque détection de changement
 * et doit retrouver le même objet tant que la fiche n'a pas été rechargée.
 */
const resumes = new WeakMap<FicheSuivi, SuiviResume>();

export function resumeFiche(fiche: FicheSuivi): SuiviResume {
  let resume = resumes.get(fiche);
  if (!resume) {
    const problemes = lignesRenseignees(fiche.constatGlobal?.problemesRencontres);
    const risques = lignesRenseignees(fiche.constatGlobal?.principauxRisques);
    resume = { taches: (fiche.tachesSuivi || []).length, problemes, risques };
    resumes.set(fiche, resume);
  }
  return resume;
}

export interface SuiviTotaux {
  fiches: number;
  projets: number;
  taches: number;
  problemes: number;
  risques: number;
  fichesAvecProblemes: number;
  fichesAvecRisques: number;
}

export function totauxSuivi(fiches: FicheSuivi[]): SuiviTotaux {
  const detail = fiches.map(resumeFiche);
  const somme = (valeur: (r: SuiviResume) => number) => detail.reduce((total, r) => total + valeur(r), 0);
  return {
    fiches: fiches.length,
    projets: new Set(fiches.map(f => f.ficheProjetId).filter(id => !!id)).size,
    taches: somme(r => r.taches),
    problemes: somme(r => r.problemes),
    risques: somme(r => r.risques),
    fichesAvecProblemes: detail.filter(r => r.problemes > 0).length,
    fichesAvecRisques: detail.filter(r => r.risques > 0).length,
  };
}

/** Date de la fiche la plus récente (date du rapport, à défaut date de création). */
export function dateDerniereFiche(fiches: FicheSuivi[]): string | undefined {
  let derniere: string | undefined;
  let max = -Infinity;
  for (const fiche of fiches) {
    const date = fiche.dateRapport || fiche.dateCreation;
    const temps = date ? new Date(date).getTime() : NaN;
    if (!isNaN(temps) && temps > max) {
      max = temps;
      derniere = date;
    }
  }
  return derniere;
}

/**
 * Une ligne est un "grand titre" (action de la fiche de projet) si elle est
 * marquée estTitre, ou - pour les fiches enregistrées avant l'ajout de ce
 * marqueur - si elle ne porte aucune des infos propres à une sous-tâche.
 */
export function isTitre(t: TacheSuivi): boolean {
  return !!t.estTitre || (!t.code && !t.livrable && !t.assigneA && !t.debut && !t.echeance);
}

/** Même règle que le calcul des KPI : le pourcentage saisi prime, le statut sert de repli. */
export function tacheTerminee(t: TacheSuivi): boolean {
  return t.pourcentageRealise != null ? t.pourcentageRealise >= 100 : statutTache(t.statut) === 'termine';
}

export type StatutTache = 'termine' | 'cours' | 'retard' | 'bloque' | 'autre';

/** « Terminé », « terminé » et « Termine » donnent tous 'termine'. */
export function statutTache(statut: string | undefined): StatutTache {
  const s = (statut || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  switch (s) {
    case 'termine': return 'termine';
    case 'en cours': return 'cours';
    case 'en retard': return 'retard';
    case 'bloque': return 'bloque';
    default: return 'autre';
  }
}
