/** Libellés lisibles des champs enregistrés dans l'historique (fiche projet et fiche de suivi). */
const LIBELLES: { [cle: string]: string } = {
  // Fiche projet
  nomProjet: 'Nom du projet',
  designationProjet: 'Désignation du projet',
  designationClient: 'Désignation du client',
  statut: 'Statut',
  dateDebut: 'Date de début',
  dateFinPrevue: 'Date de fin prévue',
  cadreContractuelProjet: 'Cadre contractuel',
  caractereProjet: 'Caractère du projet',
  typeProjet: 'Type de projet',
  maitreOuvrage: "Maître d'ouvrage",
  maitreOeuvre: "Maître d'œuvre",
  modaliteDeveloppement: 'Modalité de développement',
  periodiciteSuiviMois: 'Périodicité de suivi (mois)',

  // Fiche de suivi
  numeroRapport: 'Numéro de rapport',
  dateRapport: 'Date du rapport',
  chefProjet: 'Chef de projet',
  descriptionProjet: 'Description du projet',
  experts: 'Experts',
  caracteristiquesTechniques: 'Caractéristiques techniques',
  etatAvancement: "État d'avancement",
  objectifPrincipal: 'Objectif principal',
  problemesRencontres: 'Problèmes rencontrés',
  principauxRisques: 'Principaux risques',
  recommandations: 'Recommandations',
  nombreTaches: 'Nombre de tâches',
  nombreTachesPlanning: 'Nombre de tâches au planning'
};

/** Nom d'un champ en clair ; une clé inconnue (« dateFinReelle ») devient « Date fin reelle » plutôt qu'un nom technique. */
export function libelleChamp(cle: string): string {
  if (LIBELLES[cle]) return LIBELLES[cle];
  const mots = cle.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return mots.charAt(0).toUpperCase() + mots.slice(1);
}

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/**
 * Valeur d'un champ telle qu'on la lit : dates en jj/mm/aaaa (avec l'heure si elle est renseignée),
 * oui/non pour les booléens, tiret pour une valeur vide, un élément par ligne pour les listes, JSON pour les objets.
 */
export function formaterValeur(valeur: any): string {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  if (typeof valeur === 'boolean') return valeur ? 'Oui' : 'Non';
  if (Array.isArray(valeur)) return valeur.length ? valeur.map(formaterValeur).join('\n') : '—';
  if (typeof valeur === 'object') return JSON.stringify(valeur);
  if (typeof valeur === 'string') {
    const date = DATE_ISO.exec(valeur);
    if (date) {
      const [, annee, mois, jour, heure, minute] = date;
      const jourComplet = `${jour}/${mois}/${annee}`;
      return heure && !(heure === '00' && minute === '00') ? `${jourComplet} ${heure}:${minute}` : jourComplet;
    }
  }
  return String(valeur);
}
