/** Grille d'un mois, commune aux pages « Réunions » et « Calendrier des dépôts ». */

export const JOURS_SEMAINE = [
  { court: 'Lun', long: 'Lundi' },
  { court: 'Mar', long: 'Mardi' },
  { court: 'Mer', long: 'Mercredi' },
  { court: 'Jeu', long: 'Jeudi' },
  { court: 'Ven', long: 'Vendredi' },
  { court: 'Sam', long: 'Samedi' },
  { court: 'Dim', long: 'Dimanche' }
];

export interface JourCalendrier<T> {
  /** « 2026-11-12 » : une date se compare telle qu'elle est écrite, sans passer par un fuseau. */
  cle: string;
  numero: number;
  dansLeMois: boolean;
  aujourdhui: boolean;
  elements: T[];
}

/** « 2026-11-12 », dans le fuseau du navigateur. */
export function cleDate(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function premierDuMois(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** « Novembre 2026 ». */
export function titreDuMois(premier: Date): string {
  const titre = premier.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return `${titre.charAt(0).toUpperCase()}${titre.slice(1)}`;
}

/** Semaines du mois, du lundi au dimanche, avec ce qui tombe chaque jour. */
export function semainesDuMois<T>(premier: Date, parJour: ReadonlyMap<string, T[]>): JourCalendrier<T>[][] {
  const annee = premier.getFullYear();
  const mois = premier.getMonth();
  const decalage = (premier.getDay() + 6) % 7;
  const joursDuMois = new Date(annee, mois + 1, 0).getDate();
  const nombreSemaines = Math.ceil((decalage + joursDuMois) / 7);
  const aujourdhui = cleDate(new Date());

  return Array.from({ length: nombreSemaines }, (_, semaine) =>
    Array.from({ length: 7 }, (_, jour) => {
      const date = new Date(annee, mois, 1 - decalage + semaine * 7 + jour);
      const cle = cleDate(date);
      return {
        cle,
        numero: date.getDate(),
        dansLeMois: date.getMonth() === mois,
        aujourdhui: cle === aujourdhui,
        elements: parJour.get(cle) ?? []
      };
    })
  );
}
