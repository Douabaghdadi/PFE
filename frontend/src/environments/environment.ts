/**
 * Configuration de développement.
 * L'URL de l'API est centralisée ici : aucun composant ne doit coder en dur « localhost ».
 */
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  // Lien "Incorporer le rapport" fourni par Power BI Service
  powerBiReportUrl: 'https://app.powerbi.com/reportEmbed?reportId=7d02ebd0-bc25-4a33-ad5f-0d231f5b9055&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730&filterPaneEnabled=false'
};
