/**
 * Configuration de production : l'API est servie sous le même domaine que le front
 * (reverse proxy), il n'y a donc pas d'hôte à coder en dur.
 */
export const environment = {
  production: true,
  apiUrl: ''
};
