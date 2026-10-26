package com.example.demo.service;

import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.ChargeMembreDTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.PointHistoriqueKPIDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import org.apache.poi.ss.SpreadsheetVersion;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.ClientAnchor;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.PrintSetup;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.AreaReference;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.util.Units;
import org.apache.poi.xddf.usermodel.XDDFColor;
import org.apache.poi.xddf.usermodel.XDDFLineProperties;
import org.apache.poi.xddf.usermodel.XDDFShapeProperties;
import org.apache.poi.xddf.usermodel.XDDFSolidFillProperties;
import org.apache.poi.xddf.usermodel.chart.AxisCrosses;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.MarkerStyle;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSourcesFactory;
import org.apache.poi.xddf.usermodel.chart.XDDFLineChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFNumericalDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFClientAnchor;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFDataFormat;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFTable;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTTableStyleInfo;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Export Excel du rapport KPI d'un projet.
 *
 * Les valeurs sont de vraies valeurs Excel (nombres, pourcentages, dates, montants) et les listes de
 * vrais tableaux Excel filtrables : le fichier se trie, se filtre et se recalcule. La synthèse reprend
 * les indicateurs et les libellés de la page KPI du pilote qualité.
 */
@Service
public class ExcelReportService {

    private static final String LOGO_PATH = "branding/qualinet-logo-horizontal.png";
    /** Hauteur du logo dans l'en-tête de la synthèse, en pixels. */
    private static final double HAUTEUR_LOGO = 40;
    /** Style de tableau Excel intégré : en-tête vert, lignes alternées. */
    private static final String STYLE_TABLEAU = "TableStyleMedium7";

    private static final byte[] VERT_FONCE = rgb(5, 110, 30);
    private static final byte[] VERT_CLAIR = rgb(230, 250, 236);
    private static final byte[] VERT_COURBE = rgb(9, 200, 44);
    private static final byte[] GRIS_LIGNE = rgb(226, 232, 240);
    private static final byte[] ENCRE = rgb(15, 23, 42);
    private static final byte[] GRIS_TEXTE = rgb(100, 116, 139);
    private static final byte[] TON_BON = rgb(7, 166, 37);
    private static final byte[] TON_ATTENTION = rgb(180, 83, 9);
    private static final byte[] TON_MAUVAIS = rgb(220, 38, 38);

    /** Couleur de la colonne « Lecture » : elle dit si l'indicateur est bon, à surveiller ou mauvais. */
    private enum Ton { NEUTRE, BON, ATTENTION, MAUVAIS }

    public byte[] generateProjetKPIExcel(ProjetKPIReportDTO kpi) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Styles styles = new Styles(workbook);

            ecrireSynthese(workbook, kpi, styles);
            ecrireQualite(workbook, kpi, styles);
            ecrireTaches(workbook, kpi, styles);
            ecrireEquipe(workbook, kpi, styles);
            ecrireHistorique(workbook, kpi, styles);

            workbook.getProperties().getCoreProperties().setTitle("Rapport KPI - " + orDash(kpi.getNomProjet()));
            workbook.getProperties().getCoreProperties().setCreator("Qualinet");

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Onglet « Synthèse » : les indicateurs de la page KPI                 */
    /* ------------------------------------------------------------------ */

    private void ecrireSynthese(XSSFWorkbook workbook, ProjetKPIReportDTO kpi, Styles s) {
        XSSFSheet sheet = workbook.createSheet("Synthèse");
        sheet.setDisplayGridlines(false);
        sheet.setColumnWidth(0, 40 * 256);
        sheet.setColumnWidth(1, 20 * 256);
        sheet.setColumnWidth(2, 64 * 256);
        miseEnPage(sheet, kpi, false);

        // En-tête : logo, titre, projet et date de génération
        Row ligneTitre = sheet.createRow(0);
        ligneTitre.setHeightInPoints(40);
        ajouterLogo(workbook, sheet);
        ecrire(ligneTitre, 1, "RAPPORT KPI DU PROJET", s.titre);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 1, 2));

        Row ligneProjet = sheet.createRow(1);
        ligneProjet.setHeightInPoints(24);
        ecrire(ligneProjet, 0, orDash(kpi.getNomProjet()), s.nomProjet);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 2));

        Row ligneInfo = sheet.createRow(2);
        ecrire(ligneInfo, 0, "Statut : " + formatStatut(kpi.getStatut()) + "     Généré le "
            + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm")), s.sousTitre);
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, 2));

        int row = 4;
        boolean planning = kpi.getTauxAvancementPlanifie() > 0;

        // Indicateurs clés : les 4 cartes du haut de la page KPI
        row = section(sheet, row, "INDICATEURS CLÉS", s);
        row = enteteColonnes(sheet, row, s, "Indicateur", "Valeur", "Lecture");
        row = ligneNombre(sheet, row, s, "Avancement réel", kpi.getTauxAvancement() / 100, s.valeurPct,
            planning ? signe(kpi.getEcartPlanning(), 0) + " pts par rapport au planning" : progressLabel(kpi.getTauxAvancement()),
            planning ? tonEcart(kpi.getEcartPlanning()) : Ton.NEUTRE);
        if (planning) {
            row = ligneNombre(sheet, row, s, "Indice de délai (SPI)", kpi.getSpi(), s.valeurDecimal, spiLabel(kpi), tonSpi(kpi));
        } else {
            row = ligneTexte(sheet, row, s, "Indice de délai (SPI)", "–", spiLabel(kpi), Ton.NEUTRE);
        }
        row = ligneNombre(sheet, row, s, "Santé du projet", kpi.getScoreSante(), s.valeurScore,
            niveauSanteLabel(kpi.getNiveauSante()), tonSante(kpi.getScoreSante()));
        int bloquantes = compterAlertes(kpi, AlerteKPIDTO.CRITIQUE) + compterAlertes(kpi, AlerteKPIDTO.MAJEUR);
        row = ligneNombre(sheet, row, s, "Alertes", taille(kpi.getAlertes()), s.valeurEntier,
            bloquantes > 0 ? bloquantes + " à traiter en priorité (détail dans l'onglet Alertes et qualité)" : "Aucune alerte bloquante",
            bloquantes > 0 ? Ton.MAUVAIS : Ton.BON);
        row++;

        // Avancement vs planning
        row = section(sheet, row, "AVANCEMENT VS PLANNING", s);
        row = ligneNombre(sheet, row, s, "Réalisé", kpi.getTauxAvancement() / 100, s.valeurPct,
            "Avancement pondéré des tâches de la dernière fiche de suivi", Ton.NEUTRE);
        if (planning) {
            row = ligneNombre(sheet, row, s, "Planifié à ce jour", kpi.getTauxAvancementPlanifie() / 100, s.valeurPct,
                "Ce qui devrait être réalisé aujourd'hui d'après les échéances", Ton.NEUTRE);
        } else {
            row = ligneTexte(sheet, row, s, "Planifié à ce jour", "–", "Aucune échéance exploitable", Ton.NEUTRE);
        }
        row = ligneNombre(sheet, row, s, "Depuis la fiche précédente", kpi.getDeltaAvancement(), s.valeurPoints,
            kpi.getNombreFichesSuivi() >= 2 ? "Progression entre les deux dernières fiches" : "Une seule fiche : pas encore de comparaison",
            kpi.getDeltaAvancement() > 0 ? Ton.BON : Ton.ATTENTION);
        row = ligneNombre(sheet, row, s, "Jours de retard", kpi.getJoursRetard(), s.valeurJours,
            kpi.getJoursRetard() > 0 ? "Date de fin prévue dépassée" : "Date de fin prévue non dépassée",
            kpi.getJoursRetard() > 0 ? Ton.MAUVAIS : Ton.BON);
        if (kpi.getDateFinProjetee() != null) {
            boolean derapage = kpi.getJoursDerapageProjete() > 0;
            row = ligneDate(sheet, row, s, "Fin projetée", kpi.getDateFinProjetee(),
                derapage ? "Au rythme actuel, soit " + kpi.getJoursDerapageProjete() + " jour(s) après la date prévue"
                    : "Au rythme actuel, le projet se termine dans les délais prévus",
                derapage ? Ton.MAUVAIS : Ton.BON);
        }
        row++;

        // Calendrier
        row = section(sheet, row, "CALENDRIER", s);
        row = ligneDate(sheet, row, s, "Début", kpi.getDateDebut(), dureeJours(kpi), Ton.NEUTRE);
        row = ligneDate(sheet, row, s, "Fin prévue", kpi.getDateFinPrevue(), "", Ton.NEUTRE);
        Long retardLivraison = retardLivraison(kpi);
        if (retardLivraison != null) {
            row = ligneDate(sheet, row, s, "Livré le", kpi.getDateFinReelle(),
                retardLivraison > 0 ? "Livré avec " + retardLivraison + " jour(s) de retard" : "Livré dans les délais",
                retardLivraison > 0 ? Ton.MAUVAIS : Ton.BON);
        }
        row = ligneNombre(sheet, row, s, "Fiches de suivi exploitées", kpi.getNombreFichesSuivi(), s.valeurEntier, "", Ton.NEUTRE);
        if (kpi.getDateDerniereFiche() != null) {
            row = ligneDate(sheet, row, s, "Dernière fiche de suivi", kpi.getDateDerniereFiche(),
                kpi.getNumeroDerniereFiche() != null ? "N° " + kpi.getNumeroDerniereFiche() : "", Ton.NEUTRE);
        }
        row++;

        // Exécution des tâches
        if (kpi.getTotalTaches() > 0) {
            row = section(sheet, row, "EXÉCUTION DES TÂCHES", s);
            row = ligneNombre(sheet, row, s, "Tâches suivies", kpi.getTotalTaches(), s.valeurEntier, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Terminées", kpi.getTachesTerminees(), s.valeurEntier, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "En cours", kpi.getTachesEnCours(), s.valeurEntier, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Non démarrées", kpi.getTachesNonDemarrees(), s.valeurEntier, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Hors délai", kpi.getTachesEnRetard(), s.valeurEntier,
                kpi.getTachesEnRetard() > 0 ? "Échéance dépassée sans être terminées (onglet Tâches)" : "",
                kpi.getTachesEnRetard() > 0 ? Ton.MAUVAIS : Ton.BON);
            row = ligneNombre(sheet, row, s, "Échéances imminentes", kpi.getTachesEcheanceProche(), s.valeurEntier,
                kpi.getTachesEcheanceProche() > 0 ? "Échéance dans les 14 prochains jours" : "",
                kpi.getTachesEcheanceProche() > 0 ? Ton.ATTENTION : Ton.NEUTRE);
            if (kpi.getTauxRespectEcheances() >= 0) {
                row = ligneNombre(sheet, row, s, "Respect des échéances", kpi.getTauxRespectEcheances() / 100, s.valeurPct, "", Ton.NEUTRE);
            } else {
                row = ligneTexte(sheet, row, s, "Respect des échéances", "–", "Aucune échéance encore mesurable", Ton.NEUTRE);
            }
            row++;
        }

        // Charge : seulement si des temps ont été saisis, comme sur la page
        if (kpi.getChargeEstimee() > 0 || kpi.getChargeConsommee() > 0) {
            row = section(sheet, row, "CHARGE ET EFFICACITÉ", s);
            row = ligneNombre(sheet, row, s, "Charge estimée", kpi.getChargeEstimee(), s.valeurJours, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Charge consommée", kpi.getChargeConsommee(), s.valeurJours, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Reste à faire", kpi.getChargeRestanteEstimee(), s.valeurJours, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Consommation de la charge", kpi.getTauxConsommationCharge() / 100, s.valeurPct,
                String.format(Locale.FRANCE, "Pour %.0f %% d'avancement", kpi.getTauxAvancement()),
                kpi.getTauxConsommationCharge() > kpi.getTauxAvancement() + 15 ? Ton.MAUVAIS : Ton.NEUTRE);
            if (kpi.getChargeConsommee() > 0) {
                row = ligneNombre(sheet, row, s, "Efficacité (CPI)", kpi.getIndiceEfficacite(), s.valeurDecimal,
                    "Au-dessus de 1 : le travail coûte moins que prévu",
                    kpi.getIndiceEfficacite() >= 1 ? Ton.BON : (kpi.getIndiceEfficacite() >= 0.8 ? Ton.ATTENTION : Ton.MAUVAIS));
            }
            row++;
        }

        // Budget
        row = section(sheet, row, "BUDGET", s);
        row = ligneNombre(sheet, row, s, "Budget cadré dans la fiche projet", kpi.getBudgetTotal() * 1_000_000, s.valeurDinars,
            String.format(Locale.FRANCE, "%.2f MD HT", kpi.getBudgetTotal()), Ton.NEUTRE);
        if (kpi.getBudgetPrevision() > 0 || kpi.getBudgetRealisation() > 0) {
            row = ligneNombre(sheet, row, s, "Prévu", kpi.getBudgetPrevision() * 1_000_000, s.valeurDinars, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Consommé", kpi.getBudgetRealisation() * 1_000_000, s.valeurDinars, "", Ton.NEUTRE);
            row = ligneNombre(sheet, row, s, "Écart disponible", kpi.getEcartBudget() * 1_000_000, s.valeurDinars,
                kpi.getEcartBudget() >= 0 ? "Reste à engager" : "Dépassement du budget prévu",
                kpi.getEcartBudget() >= 0 ? Ton.BON : Ton.MAUVAIS);
            row = ligneNombre(sheet, row, s, "Taux de consommation", kpi.getTauxConsommationBudget() / 100, s.valeurPct,
                String.format(Locale.FRANCE, "Pour %.0f %% d'avancement", kpi.getTauxAvancement()),
                kpi.getTauxConsommationBudget() > kpi.getTauxAvancement() + 15 ? Ton.MAUVAIS : Ton.BON);
        } else {
            row = ligneTexte(sheet, row, s, "Suivi budgétaire", "Non renseigné",
                "Aucune prévision ni réalisation dans les fiches de suivi", Ton.NEUTRE);
        }
        row++;

        // Santé du projet : détail du calcul du score
        row = section(sheet, row, "SANTÉ DU PROJET", s);
        row = enteteColonnes(sheet, row, s, "Composante", "Points", "Détail");
        if (kpi.getDetailScore() != null) {
            for (ComposanteScoreDTO composante : kpi.getDetailScore()) {
                double ratio = composante.getPointsMax() > 0 ? composante.getPoints() / composante.getPointsMax() : 0;
                row = ligneNombre(sheet, row, s,
                    composante.getLibelle() + String.format(Locale.FRANCE, " (sur %.0f)", composante.getPointsMax()),
                    composante.getPoints(), s.valeurPointsScore, orDash(composante.getCommentaire()),
                    ratio >= 0.8 ? Ton.BON : (ratio >= 0.5 ? Ton.ATTENTION : Ton.MAUVAIS));
            }
        }
        Row total = sheet.createRow(row);
        ecrire(total, 0, "Score total", s.totalLibelle);
        Cell cellTotal = total.createCell(1);
        cellTotal.setCellValue(kpi.getScoreSante());
        cellTotal.setCellStyle(s.totalScore);
        ecrire(total, 2, niveauSanteLabel(kpi.getNiveauSante()) + " : " + niveauSanteDescription(kpi.getNiveauSante()),
            s.totalLibelle);
    }

    /* ------------------------------------------------------------------ */
    /* Onglet « Alertes et qualité »                                        */
    /* ------------------------------------------------------------------ */

    private void ecrireQualite(XSSFWorkbook workbook, ProjetKPIReportDTO kpi, Styles s) {
        boolean alertes = taille(kpi.getAlertes()) > 0;
        boolean problemes = taille(kpi.getListeProblemes()) > 0;
        boolean risques = taille(kpi.getListeRisques()) > 0;
        boolean recommandations = taille(kpi.getListeRecommandations()) > 0;
        if (!alertes && !problemes && !risques && !recommandations) {
            return;
        }

        XSSFSheet sheet = workbook.createSheet("Alertes et qualité");
        sheet.setColumnWidth(0, 14 * 256);
        sheet.setColumnWidth(1, 16 * 256);
        sheet.setColumnWidth(2, 40 * 256);
        sheet.setColumnWidth(3, 80 * 256);
        miseEnPage(sheet, kpi, true);
        int row = titreOnglet(sheet, "Alertes et qualité", "Alertes de pilotage et dernière fiche de suivi", s);

        if (alertes) {
            row = sousTitre(sheet, row, "Alertes de pilotage", s);
            int entete = row;
            row = entetes(sheet, row, "Niveau", "Catégorie", "Alerte", "Détail");
            for (AlerteKPIDTO alerte : kpi.getAlertes()) {
                Row ligne = sheet.createRow(row++);
                ecrire(ligne, 0, alerte.getNiveau(), s.tTexteGras);
                ecrire(ligne, 1, orDash(alerte.getCategorie()), s.tTexte);
                ecrire(ligne, 2, orDash(alerte.getTitre()), s.tTexte);
                ecrire(ligne, 3, orDash(alerte.getMessage()), s.tTexte);
                ajusterHauteur(ligne, orDash(alerte.getMessage()), 80);
            }
            tableau(sheet, "Alertes", entete, row - 1, 0, 3);
            row++;
        }
        row = listeNumerotee(sheet, row, "Problèmes déclarés", "Problemes", "Problème", kpi.getListeProblemes(), s);
        row = listeNumerotee(sheet, row, "Risques déclarés", "Risques", "Risque", kpi.getListeRisques(), s);
        listeNumerotee(sheet, row, "Recommandations du chef de projet", "Recommandations", "Recommandation",
            kpi.getListeRecommandations(), s);
    }

    private int listeNumerotee(XSSFSheet sheet, int row, String titre, String nomTableau, String colonne,
                               List<String> elements, Styles s) {
        if (taille(elements) == 0) {
            return row;
        }
        row = sousTitre(sheet, row, titre, s);
        int entete = row;
        row = entetes(sheet, row, "N°", colonne);
        int numero = 1;
        for (String element : elements) {
            Row ligne = sheet.createRow(row++);
            Cell cellNumero = ligne.createCell(0);
            cellNumero.setCellValue(numero++);
            cellNumero.setCellStyle(s.tEntier);
            ecrire(ligne, 1, element, s.tTexte);
            // Le texte occupe les colonnes B à D : on les fusionne pour qu'il reste lisible
            sheet.addMergedRegion(new CellRangeAddress(ligne.getRowNum(), ligne.getRowNum(), 1, 3));
            ajusterHauteur(ligne, element, 130);
        }
        // Un tableau Excel ne peut pas contenir de cellules fusionnées : la liste garde une mise en forme simple
        styliserEnteteListe(sheet, entete, s);
        sheet.addMergedRegion(new CellRangeAddress(entete, entete, 1, 3));
        return row + 1;
    }

    /* ------------------------------------------------------------------ */
    /* Onglet « Tâches » : tâches hors délai et échéances imminentes        */
    /* ------------------------------------------------------------------ */

    private void ecrireTaches(XSSFWorkbook workbook, ProjetKPIReportDTO kpi, Styles s) {
        List<TacheKPIDTO> retards = kpi.getListeTachesEnRetard() != null ? kpi.getListeTachesEnRetard() : List.of();
        List<TacheKPIDTO> imminentes = kpi.getListeTachesEcheanceProche() != null ? kpi.getListeTachesEcheanceProche() : List.of();
        if (retards.isEmpty() && imminentes.isEmpty()) {
            return;
        }

        XSSFSheet sheet = workbook.createSheet("Tâches");
        int[] largeurs = {20, 10, 48, 22, 13, 11, 11, 13};
        for (int i = 0; i < largeurs.length; i++) {
            sheet.setColumnWidth(i, largeurs[i] * 256);
        }
        miseEnPage(sheet, kpi, true);
        int row = titreOnglet(sheet, "Tâches sous surveillance",
            "Tâches hors délai et échéances des 14 prochains jours, d'après la dernière fiche de suivi", s);

        int entete = row;
        row = entetes(sheet, row, "Situation", "Code", "Tâche", "Assignée à", "Échéance", "Réalisé",
            "Retard (j)", "Restant (j)");
        for (TacheKPIDTO tache : retards) {
            row = ligneTache(sheet, row, "Hors délai", tache, Math.abs(tache.getJoursEcart()), null, s);
        }
        for (TacheKPIDTO tache : imminentes) {
            row = ligneTache(sheet, row, "Échéance imminente", tache, null, Math.abs(tache.getJoursEcart()), s);
        }
        tableau(sheet, "Taches", entete, row - 1, 0, 7);
        sheet.createFreezePane(0, entete + 1);
    }

    private int ligneTache(XSSFSheet sheet, int row, String situation, TacheKPIDTO tache,
                           Integer retard, Integer restant, Styles s) {
        Row ligne = sheet.createRow(row);
        ecrire(ligne, 0, situation, s.tTexteGras);
        ecrire(ligne, 1, orDash(tache.getCode()), s.tTexte);
        ecrire(ligne, 2, orDash(tache.getSujet()), s.tTexte);
        ecrire(ligne, 3, orDash(tache.getAssigneA()), s.tTexte);
        ecrireDate(ligne, 4, tache.getEcheance(), s.tDate, s.tTexte);
        Cell realise = ligne.createCell(5);
        realise.setCellValue(tache.getPourcentageRealise() / 100.0);
        realise.setCellStyle(s.tPct);
        ecrireEntierOuVide(ligne, 6, retard, s.tEntier);
        ecrireEntierOuVide(ligne, 7, restant, s.tEntier);
        ajusterHauteur(ligne, orDash(tache.getSujet()), 48);
        return row + 1;
    }

    /* ------------------------------------------------------------------ */
    /* Onglet « Équipe » : composition et répartition du travail            */
    /* ------------------------------------------------------------------ */

    private void ecrireEquipe(XSSFWorkbook workbook, ProjetKPIReportDTO kpi, Styles s) {
        List<MembreEquipeDTO> membres = kpi.getListeMembresEquipe();
        List<ChargeMembreDTO> charges = kpi.getChargeParMembre();
        if (taille(membres) == 0 && taille(charges) == 0) {
            return;
        }

        XSSFSheet sheet = workbook.createSheet("Équipe");
        int[] largeurs = {30, 30, 12, 12, 14, 18, 18};
        for (int i = 0; i < largeurs.length; i++) {
            sheet.setColumnWidth(i, largeurs[i] * 256);
        }
        miseEnPage(sheet, kpi, true);
        int row = titreOnglet(sheet, "Équipe du projet", "Composition saisie dans la fiche projet et répartition des tâches suivies", s);

        if (taille(membres) > 0) {
            row = sousTitre(sheet, row, "Composition de l'équipe (" + membres.size() + " membre(s))", s);
            int entete = row;
            row = entetes(sheet, row, "Membre", "Rôle");
            for (MembreEquipeDTO membre : membres) {
                Row ligne = sheet.createRow(row++);
                ecrire(ligne, 0, orDash(membre.getNom()), s.tTexteGras);
                ecrire(ligne, 1, orDash(membre.getRole()), s.tTexte);
            }
            tableau(sheet, "Equipe", entete, row - 1, 0, 1);
            row++;
        }

        if (taille(charges) > 0) {
            // Les colonnes de charge ne sont utiles que si des temps ont été saisis dans les fiches
            boolean avecCharge = charges.stream().anyMatch(c -> c.getChargeEstimee() > 0 || c.getChargeConsommee() > 0);
            row = sousTitre(sheet, row, "Répartition des tâches suivies", s);
            int entete = row;
            row = avecCharge
                ? entetes(sheet, row, "Intervenant", "Tâches", "Terminées", "Hors délai", "Avancement moyen",
                    "Charge estimée (j)", "Charge consommée (j)")
                : entetes(sheet, row, "Intervenant", "Tâches", "Terminées", "Hors délai", "Avancement moyen");
            for (ChargeMembreDTO charge : charges) {
                Row ligne = sheet.createRow(row++);
                ecrire(ligne, 0, orDash(charge.getNom()), s.tTexteGras);
                ecrireNombre(ligne, 1, charge.getNombreTaches(), s.tEntier);
                ecrireNombre(ligne, 2, charge.getTachesTerminees(), s.tEntier);
                ecrireNombre(ligne, 3, charge.getTachesEnRetard(), s.tEntier);
                ecrireNombre(ligne, 4, charge.getAvancementMoyen() / 100, s.tPct);
                if (avecCharge) {
                    ecrireNombre(ligne, 5, charge.getChargeEstimee(), s.tDecimal);
                    ecrireNombre(ligne, 6, charge.getChargeConsommee(), s.tDecimal);
                }
            }
            tableau(sheet, "Repartition", entete, row - 1, 0, avecCharge ? 6 : 4);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Onglet « Historique » : une ligne par fiche de suivi, et sa courbe   */
    /* ------------------------------------------------------------------ */

    private void ecrireHistorique(XSSFWorkbook workbook, ProjetKPIReportDTO kpi, Styles s) {
        List<PointHistoriqueKPIDTO> historique = kpi.getHistorique();
        if (taille(historique) == 0) {
            return;
        }

        XSSFSheet sheet = workbook.createSheet("Historique");
        int[] largeurs = {13, 28, 14, 12, 12};
        for (int i = 0; i < largeurs.length; i++) {
            sheet.setColumnWidth(i, largeurs[i] * 256);
        }
        miseEnPage(sheet, kpi, true);
        int row = titreOnglet(sheet, "Évolution de l'avancement", "Une ligne par fiche de suivi déposée", s);

        int entete = row;
        row = entetes(sheet, row, "Date", "Rapport", "Avancement", "Problèmes", "Risques");
        List<String> etiquettes = new ArrayList<>();
        for (PointHistoriqueKPIDTO point : historique) {
            Row ligne = sheet.createRow(row++);
            ecrireDate(ligne, 0, point.getDate(), s.tDate, s.tTexte);
            ecrire(ligne, 1, orDash(point.getNumeroRapport()), s.tTexte);
            ecrireNombre(ligne, 2, point.getTauxAvancement() / 100, s.tPct);
            ecrireNombre(ligne, 3, point.getNombreProblemes(), s.tEntier);
            ecrireNombre(ligne, 4, point.getNombreRisques(), s.tEntier);
            etiquettes.add(formatDate(point.getDate()));
        }
        tableau(sheet, "Historique", entete, row - 1, 0, 4);
        sheet.createFreezePane(0, entete + 1);

        if (historique.size() >= 2) {
            ajouterCourbe(sheet, etiquettes, entete + 1, row - 1);
        }
    }

    /** Courbe de l'avancement par fiche, à droite du tableau, liée aux cellules de la colonne Avancement. */
    private void ajouterCourbe(XSSFSheet sheet, List<String> etiquettes, int premiereLigne, int derniereLigne) {
        XSSFDrawing dessin = sheet.createDrawingPatriarch();
        XSSFClientAnchor ancre = dessin.createAnchor(0, 0, 0, 0, 6, 1, 15, 19);
        XSSFChart graphique = dessin.createChart(ancre);
        graphique.setTitleText("Avancement par fiche de suivi");
        graphique.setTitleOverlay(false);

        XDDFCategoryAxis axeX = graphique.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis axeY = graphique.createValueAxis(AxisPosition.LEFT);
        axeY.setCrosses(AxisCrosses.AUTO_ZERO);
        axeY.setMinimum(0);
        axeY.setMaximum(1);

        XDDFDataSource<String> dates = XDDFDataSourcesFactory.fromArray(etiquettes.toArray(new String[0]));
        XDDFNumericalDataSource<Double> avancement = XDDFDataSourcesFactory.fromNumericCellRange(
            sheet, new CellRangeAddress(premiereLigne, derniereLigne, 2, 2));

        XDDFLineChartData donnees = (XDDFLineChartData) graphique.createData(ChartTypes.LINE, axeX, axeY);
        XDDFLineChartData.Series serie = (XDDFLineChartData.Series) donnees.addSeries(dates, avancement);
        serie.setTitle("Avancement", null);
        serie.setSmooth(false);
        serie.setMarkerStyle(MarkerStyle.CIRCLE);

        XDDFLineProperties trait = new XDDFLineProperties(new XDDFSolidFillProperties(XDDFColor.from(VERT_COURBE)));
        trait.setWidth(2.5);
        XDDFShapeProperties forme = serie.getShapeProperties() != null ? serie.getShapeProperties() : new XDDFShapeProperties();
        forme.setLineProperties(trait);
        serie.setShapeProperties(forme);

        graphique.plot(donnees);
    }

    /* ------------------------------------------------------------------ */
    /* Briques de la synthèse                                               */
    /* ------------------------------------------------------------------ */

    private int section(XSSFSheet sheet, int row, String titre, Styles s) {
        Row ligne = sheet.createRow(row);
        ligne.setHeightInPoints(20);
        for (int c = 0; c <= 2; c++) {
            ecrire(ligne, c, c == 0 ? titre : "", s.section);
        }
        sheet.addMergedRegion(new CellRangeAddress(row, row, 0, 2));
        return row + 1;
    }

    private int enteteColonnes(XSSFSheet sheet, int row, Styles s, String... titres) {
        Row ligne = sheet.createRow(row);
        for (int c = 0; c < titres.length; c++) {
            ecrire(ligne, c, titres[c], s.enteteColonne);
        }
        return row + 1;
    }

    private int ligneNombre(XSSFSheet sheet, int row, Styles s, String libelle, double valeur, CellStyle style,
                            String lecture, Ton ton) {
        Row ligne = sheet.createRow(row);
        ecrire(ligne, 0, libelle, s.libelle);
        Cell cell = ligne.createCell(1);
        cell.setCellValue(valeur);
        cell.setCellStyle(style);
        ecrire(ligne, 2, lecture, s.lecture.get(ton));
        ajusterHauteur(ligne, lecture, 70);
        return row + 1;
    }

    private int ligneTexte(XSSFSheet sheet, int row, Styles s, String libelle, String valeur, String lecture, Ton ton) {
        Row ligne = sheet.createRow(row);
        ecrire(ligne, 0, libelle, s.libelle);
        ecrire(ligne, 1, valeur, s.valeurTexte);
        ecrire(ligne, 2, lecture, s.lecture.get(ton));
        return row + 1;
    }

    private int ligneDate(XSSFSheet sheet, int row, Styles s, String libelle, String iso, String lecture, Ton ton) {
        Row ligne = sheet.createRow(row);
        ecrire(ligne, 0, libelle, s.libelle);
        ecrireDate(ligne, 1, iso, s.valeurDate, s.valeurTexte);
        ecrire(ligne, 2, lecture, s.lecture.get(ton));
        return row + 1;
    }

    /* ------------------------------------------------------------------ */
    /* Briques des onglets de détail                                        */
    /* ------------------------------------------------------------------ */

    private int titreOnglet(XSSFSheet sheet, String titre, String description, Styles s) {
        Row ligne = sheet.createRow(0);
        ligne.setHeightInPoints(26);
        ecrire(ligne, 0, titre, s.titreOnglet);
        ecrire(sheet.createRow(1), 0, description, s.sousTitre);
        return 3;
    }

    private int sousTitre(XSSFSheet sheet, int row, String titre, Styles s) {
        ecrire(sheet.createRow(row), 0, titre, s.sousTitreTableau);
        return row + 1;
    }

    private int entetes(XSSFSheet sheet, int row, String... titres) {
        Row ligne = sheet.createRow(row);
        for (int c = 0; c < titres.length; c++) {
            ligne.createCell(c).setCellValue(titres[c]);
        }
        return row + 1;
    }

    /** Transforme une plage en vrai tableau Excel : en-tête vert, lignes alternées, filtres. */
    private void tableau(XSSFSheet sheet, String nom, int ligneEntete, int derniereLigne, int premiereColonne, int derniereColonne) {
        AreaReference zone = new AreaReference(new CellReference(ligneEntete, premiereColonne),
            new CellReference(derniereLigne, derniereColonne), SpreadsheetVersion.EXCEL2007);
        XSSFTable table = sheet.createTable(zone);
        table.setName(nom);
        table.setDisplayName(nom);
        table.updateHeaders();
        table.setStyleName(STYLE_TABLEAU);
        CTTableStyleInfo style = table.getCTTable().getTableStyleInfo();
        style.setShowRowStripes(true);
        style.setShowColumnStripes(false);
        table.getCTTable().addNewAutoFilter().setRef(zone.formatAsString());
    }

    /** En-tête d'une liste numérotée, sur les colonnes A à D. */
    private void styliserEnteteListe(XSSFSheet sheet, int row, Styles s) {
        Row ligne = sheet.getRow(row);
        for (int c = 0; c <= 3; c++) {
            Cell cell = ligne.getCell(c) != null ? ligne.getCell(c) : ligne.createCell(c);
            cell.setCellStyle(s.enteteColonne);
        }
    }

    /** Mise en page d'impression : A4, une page en largeur, pied de page avec le projet et la pagination. */
    private void miseEnPage(XSSFSheet sheet, ProjetKPIReportDTO kpi, boolean paysage) {
        PrintSetup impression = sheet.getPrintSetup();
        impression.setPaperSize(PrintSetup.A4_PAPERSIZE);
        impression.setLandscape(paysage);
        impression.setFitWidth((short) 1);
        impression.setFitHeight((short) 0);
        sheet.setFitToPage(true);
        sheet.setHorizontallyCenter(true);
        sheet.getFooter().setLeft("Qualinet - Rapport KPI - " + orDash(kpi.getNomProjet()));
        sheet.getFooter().setRight("Page &P / &N");
    }

    private void ajouterLogo(XSSFWorkbook workbook, XSSFSheet sheet) {
        try (InputStream in = new ClassPathResource(LOGO_PATH).getInputStream()) {
            byte[] png = in.readAllBytes();
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(png));
            int index = workbook.addPicture(png, Workbook.PICTURE_TYPE_PNG);
            // Taille fixée en EMU dans la cellule A1 : le redimensionnement automatique de POI
            // se trompe sur une ligne de hauteur personnalisée et rendait un logo minuscule.
            int largeur = (int) Math.round(HAUTEUR_LOGO * image.getWidth() / image.getHeight());
            int x = 4 * Units.EMU_PER_PIXEL;
            int y = 6 * Units.EMU_PER_PIXEL;
            XSSFClientAnchor ancre = new XSSFClientAnchor(x, y,
                x + largeur * Units.EMU_PER_PIXEL, y + (int) HAUTEUR_LOGO * Units.EMU_PER_PIXEL, 0, 0, 0, 0);
            ancre.setAnchorType(ClientAnchor.AnchorType.MOVE_DONT_RESIZE);
            sheet.createDrawingPatriarch().createPicture(ancre, index);
        } catch (Exception e) {
            // Sans logo, le rapport reste lisible : on ne bloque pas l'export
        }
    }

    /* ------------------------------------------------------------------ */
    /* Écriture des cellules                                                */
    /* ------------------------------------------------------------------ */

    private void ecrire(Row row, int colonne, String valeur, CellStyle style) {
        Cell cell = row.createCell(colonne);
        cell.setCellValue(valeur != null ? valeur : "");
        cell.setCellStyle(style);
    }

    private void ecrireNombre(Row row, int colonne, double valeur, CellStyle style) {
        Cell cell = row.createCell(colonne);
        cell.setCellValue(valeur);
        cell.setCellStyle(style);
    }

    private void ecrireEntierOuVide(Row row, int colonne, Integer valeur, CellStyle style) {
        Cell cell = row.createCell(colonne);
        if (valeur != null) {
            cell.setCellValue(valeur);
        }
        cell.setCellStyle(style);
    }

    /** Une vraie date Excel quand la valeur est lisible, sinon le texte tel quel. */
    private void ecrireDate(Row row, int colonne, String iso, CellStyle styleDate, CellStyle styleTexte) {
        Cell cell = row.createCell(colonne);
        LocalDate date = parseDate(iso);
        if (date != null) {
            cell.setCellValue(date);
            cell.setCellStyle(styleDate);
        } else {
            cell.setCellValue(iso == null || iso.isBlank() ? "Non définie" : iso);
            cell.setCellStyle(styleTexte);
        }
    }

    /**
     * Excel n'ajuste pas seul la hauteur des lignes à texte renvoyé à la ligne : on l'estime.
     * En police 10, une colonne de N unités de largeur affiche environ 1,2 x N caractères.
     */
    private void ajusterHauteur(Row row, String texte, int largeurColonne) {
        int lignes = Math.max(1, (int) Math.ceil(texte.length() / (largeurColonne * 1.2)));
        if (lignes > 1) {
            row.setHeightInPoints(15f * lignes + 3);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                               */
    /* ------------------------------------------------------------------ */

    /** Styles du classeur, créés une seule fois (Excel limite leur nombre). */
    private static final class Styles {
        final XSSFCellStyle titre;
        final XSSFCellStyle nomProjet;
        final XSSFCellStyle sousTitre;
        final XSSFCellStyle titreOnglet;
        final XSSFCellStyle sousTitreTableau;
        final XSSFCellStyle section;
        final XSSFCellStyle enteteColonne;
        final XSSFCellStyle libelle;
        final XSSFCellStyle valeurTexte;
        final XSSFCellStyle valeurPct;
        final XSSFCellStyle valeurDecimal;
        final XSSFCellStyle valeurEntier;
        final XSSFCellStyle valeurJours;
        final XSSFCellStyle valeurPoints;
        final XSSFCellStyle valeurPointsScore;
        final XSSFCellStyle valeurScore;
        final XSSFCellStyle valeurDinars;
        final XSSFCellStyle valeurDate;
        final XSSFCellStyle totalLibelle;
        final XSSFCellStyle totalScore;
        final Map<Ton, XSSFCellStyle> lecture = new HashMap<>();
        // Cellules des tableaux Excel : sans remplissage, pour laisser apparaître le style du tableau
        final XSSFCellStyle tTexte;
        final XSSFCellStyle tTexteGras;
        final XSSFCellStyle tEntier;
        final XSSFCellStyle tDecimal;
        final XSSFCellStyle tPct;
        final XSSFCellStyle tDate;

        private final XSSFWorkbook workbook;
        private final XSSFDataFormat formats;

        Styles(XSSFWorkbook workbook) {
            this.workbook = workbook;
            this.formats = workbook.createDataFormat();

            titre = style(police(16, true, VERT_FONCE), null);
            titre.setVerticalAlignment(VerticalAlignment.CENTER);
            nomProjet = style(police(14, true, ENCRE), null);
            sousTitre = style(police(10, false, GRIS_TEXTE), null);
            titreOnglet = style(police(14, true, VERT_FONCE), null);
            sousTitreTableau = style(police(11, true, ENCRE), null);

            section = style(police(11, true, rgb(255, 255, 255)), VERT_FONCE);
            section.setVerticalAlignment(VerticalAlignment.CENTER);
            enteteColonne = style(police(10, true, VERT_FONCE), VERT_CLAIR);
            bordureBas(enteteColonne);

            libelle = ligne(style(police(11, false, ENCRE), null));
            valeurTexte = ligne(style(police(11, true, ENCRE), null));
            valeurPct = format(valeurTexte, "0.0%");
            valeurDecimal = format(valeurTexte, "0.00");
            valeurEntier = format(valeurTexte, "0");
            valeurJours = format(valeurTexte, "0\" j\"");
            valeurPoints = format(valeurTexte, "+0.0\" pts\";-0.0\" pts\";0.0\" pts\"");
            valeurPointsScore = format(valeurTexte, "0.0\" pts\"");
            valeurScore = format(valeurTexte, "0\" / 100\"");
            valeurDinars = format(valeurTexte, "#,##0\" DT\"");
            valeurDate = format(valeurTexte, "dd/mm/yyyy");
            for (XSSFCellStyle st : List.of(valeurTexte, valeurPct, valeurDecimal, valeurEntier, valeurJours,
                    valeurPoints, valeurPointsScore, valeurScore, valeurDinars, valeurDate)) {
                st.setAlignment(HorizontalAlignment.RIGHT);
            }

            lecture.put(Ton.NEUTRE, ligne(style(police(10, false, GRIS_TEXTE), null)));
            lecture.put(Ton.BON, ligne(style(police(10, true, TON_BON), null)));
            lecture.put(Ton.ATTENTION, ligne(style(police(10, true, TON_ATTENTION), null)));
            lecture.put(Ton.MAUVAIS, ligne(style(police(10, true, TON_MAUVAIS), null)));
            for (XSSFCellStyle st : lecture.values()) {
                st.setWrapText(true);
            }

            totalLibelle = style(police(11, true, ENCRE), VERT_CLAIR);
            totalScore = format(style(police(12, true, VERT_FONCE), VERT_CLAIR), "0\" / 100\"");
            totalScore.setAlignment(HorizontalAlignment.RIGHT);

            tTexte = style(police(10, false, ENCRE), null);
            tTexte.setWrapText(true);
            tTexte.setVerticalAlignment(VerticalAlignment.TOP);
            tTexteGras = style(police(10, true, ENCRE), null);
            tTexteGras.setVerticalAlignment(VerticalAlignment.TOP);
            tEntier = format(style(police(10, false, ENCRE), null), "0");
            tDecimal = format(style(police(10, false, ENCRE), null), "0.0");
            tPct = format(style(police(10, false, ENCRE), null), "0%");
            tDate = format(style(police(10, false, ENCRE), null), "dd/mm/yyyy");
            for (XSSFCellStyle st : List.of(tEntier, tDecimal, tPct, tDate)) {
                st.setVerticalAlignment(VerticalAlignment.TOP);
            }
        }

        private XSSFFont police(int taille, boolean gras, byte[] couleur) {
            XSSFFont font = workbook.createFont();
            font.setFontName("Calibri");
            font.setFontHeightInPoints((short) taille);
            font.setBold(gras);
            font.setColor(new XSSFColor(couleur, null));
            return font;
        }

        private XSSFCellStyle style(XSSFFont font, byte[] fond) {
            XSSFCellStyle style = workbook.createCellStyle();
            style.setFont(font);
            style.setVerticalAlignment(VerticalAlignment.CENTER);
            if (fond != null) {
                style.setFillForegroundColor(new XSSFColor(fond, null));
                style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            }
            return style;
        }

        /** Ligne de la synthèse : un filet gris sous chaque indicateur. */
        private XSSFCellStyle ligne(XSSFCellStyle style) {
            bordureBas(style);
            return style;
        }

        private void bordureBas(XSSFCellStyle style) {
            style.setBorderBottom(BorderStyle.THIN);
            style.setBottomBorderColor(new XSSFColor(GRIS_LIGNE, null));
        }

        private XSSFCellStyle format(XSSFCellStyle modele, String format) {
            XSSFCellStyle style = workbook.createCellStyle();
            style.cloneStyleFrom(modele);
            style.setDataFormat(formats.getFormat(format));
            return style;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Libellés et seuils, identiques à la page KPI et au rapport PDF       */
    /* ------------------------------------------------------------------ */

    private Ton tonEcart(double ecart) {
        if (ecart >= 0) return Ton.BON;
        if (ecart >= -10) return Ton.ATTENTION;
        return Ton.MAUVAIS;
    }

    private Ton tonSpi(ProjetKPIReportDTO kpi) {
        if (kpi.getSpi() >= 0.9) return Ton.BON;
        if (kpi.getSpi() >= 0.8) return Ton.ATTENTION;
        return Ton.MAUVAIS;
    }

    private Ton tonSante(double score) {
        if (score >= 60) return Ton.BON;
        if (score >= 40) return Ton.ATTENTION;
        return Ton.MAUVAIS;
    }

    private String spiLabel(ProjetKPIReportDTO kpi) {
        if (kpi.getTauxAvancementPlanifie() <= 0) return "Planning non exploitable";
        if (kpi.getSpi() > 1.05) return "En avance sur le planning";
        if (kpi.getSpi() >= 0.9) return "Conforme au planning";
        if (kpi.getSpi() >= 0.8) return "Léger retrait";
        return "Retard significatif";
    }

    private String niveauSanteLabel(String niveau) {
        if (niveau == null) return "-";
        switch (niveau) {
            case "EXCELLENT": return "Excellent";
            case "BON": return "Bon";
            case "ATTENTION": return "Attention";
            default: return "Critique";
        }
    }

    private String niveauSanteDescription(String niveau) {
        if (niveau == null) return "";
        switch (niveau) {
            case "EXCELLENT": return "les indicateurs sont au vert sur les quatre axes de pilotage.";
            case "BON": return "le projet avance correctement, avec quelques points de vigilance.";
            case "ATTENTION": return "plusieurs indicateurs se dégradent, un arbitrage est nécessaire.";
            default: return "le projet est en difficulté, une intervention rapide est recommandée.";
        }
    }

    private String progressLabel(double percentage) {
        if (percentage >= 75) return "Excellent progrès";
        if (percentage >= 50) return "Bon avancement";
        if (percentage >= 25) return "En cours";
        return "Démarrage";
    }

    private String formatStatut(String statut) {
        if (statut == null || statut.isBlank()) return "-";
        switch (statut.toUpperCase()) {
            case "EN_COURS": return "En cours";
            case "TERMINE": return "Terminé";
            case "EN_ATTENTE": return "En attente";
            case "ANNULE": return "Annulé";
            default:
                String lower = statut.toLowerCase(Locale.FRANCE).replace('_', ' ');
                return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
        }
    }

    private int compterAlertes(ProjetKPIReportDTO kpi, String niveau) {
        if (kpi.getAlertes() == null) return 0;
        return (int) kpi.getAlertes().stream().filter(a -> niveau.equals(a.getNiveau())).count();
    }

    /** Retard de livraison d'un projet livré, en jours ; null s'il n'est pas livré. */
    private Long retardLivraison(ProjetKPIReportDTO kpi) {
        LocalDate prevue = parseDate(kpi.getDateFinPrevue());
        LocalDate reelle = parseDate(kpi.getDateFinReelle());
        return prevue != null && reelle != null ? ChronoUnit.DAYS.between(prevue, reelle) : null;
    }

    private String dureeJours(ProjetKPIReportDTO kpi) {
        LocalDate debut = parseDate(kpi.getDateDebut());
        LocalDate fin = parseDate(kpi.getDateFinPrevue());
        return debut != null && fin != null && fin.isAfter(debut)
            ? "Durée prévue : " + ChronoUnit.DAYS.between(debut, fin) + " jours" : "";
    }

    private String signe(double valeur, int decimales) {
        String texte = String.format(Locale.FRANCE, "%." + decimales + "f", valeur);
        return valeur > 0 ? "+" + texte : texte;
    }

    private static LocalDate parseDate(String valeur) {
        if (valeur == null || valeur.isBlank()) return null;
        try {
            return LocalDate.parse(valeur);
        } catch (Exception e) {
            try {
                return LocalDateTime.parse(valeur).toLocalDate();
            } catch (Exception ignored) {
                return null;
            }
        }
    }

    private String formatDate(String valeur) {
        LocalDate date = parseDate(valeur);
        return date != null ? date.format(DateTimeFormatter.ofPattern("dd/MM/yy")) : orDash(valeur);
    }

    private static int taille(List<?> liste) {
        return liste == null ? 0 : liste.size();
    }

    private static String orDash(String valeur) {
        return valeur != null && !valeur.isBlank() ? valeur : "-";
    }

    private static byte[] rgb(int r, int g, int b) {
        return new byte[]{(byte) r, (byte) g, (byte) b};
    }
}
