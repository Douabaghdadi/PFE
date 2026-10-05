package com.example.demo.service;

import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.ChargeMembreDTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.PointHistoriqueKPIDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

/**
 * Export tableur du rapport KPI : un onglet de synthèse exploitable tel quel,
 * complété par le détail des tâches, de la charge et de l'historique de suivi.
 */
@Service
public class ExcelReportService {

    public byte[] generateProjetKPIExcel(ProjetKPIReportDTO kpi) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);
            CellStyle columnStyle = createColumnHeaderStyle(workbook);

            ecrireSynthese(workbook, kpi, titleStyle, headerStyle, dataStyle, numberStyle);
            ecrireTaches(workbook, kpi, headerStyle, columnStyle, dataStyle);
            ecrireEquipe(workbook, kpi, headerStyle, columnStyle, dataStyle);
            ecrireHistorique(workbook, kpi, headerStyle, columnStyle, dataStyle);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    /* ------------------------------------------------------------------ */
    /* Onglet 1 : synthèse                                                  */
    /* ------------------------------------------------------------------ */

    private void ecrireSynthese(Workbook workbook, ProjetKPIReportDTO kpi, CellStyle titleStyle,
                                CellStyle headerStyle, CellStyle dataStyle, CellStyle numberStyle) {
        Sheet sheet = workbook.createSheet("Synthèse");
        int rowNum = 0;

        Row titleRow = sheet.createRow(rowNum++);
        Cell titleCell = titleRow.createCell(0);
        titleCell.setCellValue("RAPPORT KPI PROJET - QUALINET");
        titleCell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));
        rowNum++;

        rowNum = addSection(sheet, rowNum, "INFORMATIONS DU PROJET", headerStyle);
        addDataRow(sheet, rowNum++, "Nom du Projet", kpi.getNomProjet(), dataStyle);
        addDataRow(sheet, rowNum++, "Statut", kpi.getStatut(), dataStyle);
        addDataRow(sheet, rowNum++, "Date Début", kpi.getDateDebut(), dataStyle);
        addDataRow(sheet, rowNum++, "Date Fin Prévue", kpi.getDateFinPrevue(), dataStyle);
        addDataRow(sheet, rowNum++, "Fiches de suivi exploitées", String.valueOf(kpi.getNombreFichesSuivi()), dataStyle);
        addDataRow(sheet, rowNum++, "Dernière fiche de suivi", kpi.getDateDerniereFiche(), dataStyle);
        rowNum++;

        rowNum = addSection(sheet, rowNum, "PERFORMANCE ET DÉLAIS", headerStyle);
        addDataRow(sheet, rowNum++, "Avancement réel", pourcent(kpi.getTauxAvancement()), numberStyle);
        addDataRow(sheet, rowNum++, "Avancement planifié à ce jour", pourcent(kpi.getTauxAvancementPlanifie()), numberStyle);
        addDataRow(sheet, rowNum++, "Écart au planning", signe(kpi.getEcartPlanning()) + " pts", numberStyle);
        addDataRow(sheet, rowNum++, "Indice de délai (SPI)",
            kpi.getTauxAvancementPlanifie() > 0 ? decimal(kpi.getSpi()) : "Non calculable", numberStyle);
        addDataRow(sheet, rowNum++, "Progression depuis la fiche précédente", signe(kpi.getDeltaAvancement()) + " pts", numberStyle);
        addDataRow(sheet, rowNum++, "Jours de retard", String.valueOf(kpi.getJoursRetard()), numberStyle);
        addDataRow(sheet, rowNum++, "Fin projetée (vélocité actuelle)",
            kpi.getDateFinProjetee() != null ? kpi.getDateFinProjetee() : "Non calculable", numberStyle);
        addDataRow(sheet, rowNum++, "Dérapage projeté (jours)", String.valueOf(kpi.getJoursDerapageProjete()), numberStyle);
        rowNum++;

        rowNum = addSection(sheet, rowNum, "EXÉCUTION DES TÂCHES", headerStyle);
        addDataRow(sheet, rowNum++, "Total des tâches", String.valueOf(kpi.getTotalTaches()), numberStyle);
        addDataRow(sheet, rowNum++, "Terminées", String.valueOf(kpi.getTachesTerminees()), numberStyle);
        addDataRow(sheet, rowNum++, "En cours", String.valueOf(kpi.getTachesEnCours()), numberStyle);
        addDataRow(sheet, rowNum++, "Non démarrées", String.valueOf(kpi.getTachesNonDemarrees()), numberStyle);
        addDataRow(sheet, rowNum++, "Hors délai", String.valueOf(kpi.getTachesEnRetard()), numberStyle);
        addDataRow(sheet, rowNum++, "Échéances imminentes", String.valueOf(kpi.getTachesEcheanceProche()), numberStyle);
        addDataRow(sheet, rowNum++, "Taux de respect des échéances",
            kpi.getTauxRespectEcheances() >= 0 ? pourcent(kpi.getTauxRespectEcheances()) : "Non mesurable", numberStyle);
        rowNum++;

        rowNum = addSection(sheet, rowNum, "CHARGE", headerStyle);
        addDataRow(sheet, rowNum++, "Charge estimée (jours)", decimal(kpi.getChargeEstimee()), numberStyle);
        addDataRow(sheet, rowNum++, "Charge consommée (jours)", decimal(kpi.getChargeConsommee()), numberStyle);
        addDataRow(sheet, rowNum++, "Reste à faire (jours)", decimal(kpi.getChargeRestanteEstimee()), numberStyle);
        addDataRow(sheet, rowNum++, "Taux de consommation", pourcent(kpi.getTauxConsommationCharge()), numberStyle);
        addDataRow(sheet, rowNum++, "Indice d'efficacité (CPI)",
            kpi.getChargeConsommee() > 0 ? decimal(kpi.getIndiceEfficacite()) : "Non calculable", numberStyle);
        rowNum++;

        rowNum = addSection(sheet, rowNum, "QUALITÉ", headerStyle);
        addDataRow(sheet, rowNum++, "Nombre de Problèmes", String.valueOf(kpi.getNombreProblemes()), numberStyle);
        addDataRow(sheet, rowNum++, "Dont non résolus depuis la fiche précédente",
            String.valueOf(kpi.getNombreProblemesPersistants()), numberStyle);
        addDataRow(sheet, rowNum++, "Nombre de Risques", String.valueOf(kpi.getNombreRisques()), numberStyle);
        addDataRow(sheet, rowNum++, "Recommandations du chef de projet",
            String.valueOf(kpi.getNombreRecommandations()), numberStyle);
        rowNum++;

        rowNum = addSection(sheet, rowNum, "SANTÉ DU PROJET", headerStyle);
        addDataRow(sheet, rowNum++, "Score de Santé",
            String.format(Locale.FRANCE, "%.0f / 100", kpi.getScoreSante()), numberStyle);
        addDataRow(sheet, rowNum++, "Niveau", kpi.getNiveauSante(), numberStyle);
        if (kpi.getDetailScore() != null) {
            for (ComposanteScoreDTO composante : kpi.getDetailScore()) {
                addDataRow(sheet, rowNum++,
                    composante.getLibelle() + String.format(Locale.FRANCE, " (/%.0f)", composante.getPointsMax()),
                    String.format(Locale.FRANCE, "%.1f pts - %s", composante.getPoints(), composante.getCommentaire()),
                    dataStyle);
            }
        }
        rowNum++;

        rowNum = addSection(sheet, rowNum, "BUDGET", headerStyle);
        addDataRow(sheet, rowNum++, "Budget cadré (MD)", decimal(kpi.getBudgetTotal()), numberStyle);
        addDataRow(sheet, rowNum++, "Budget cadré (DT)", montant(kpi.getBudgetTotal()), numberStyle);
        addDataRow(sheet, rowNum++, "Budget prévu (MD)", decimal(kpi.getBudgetPrevision()), numberStyle);
        addDataRow(sheet, rowNum++, "Budget consommé (MD)", decimal(kpi.getBudgetRealisation()), numberStyle);
        addDataRow(sheet, rowNum++, "Écart disponible (MD)", decimal(kpi.getEcartBudget()), numberStyle);
        addDataRow(sheet, rowNum++, "Taux de consommation", pourcent(kpi.getTauxConsommationBudget()), numberStyle);
        rowNum++;

        if (kpi.getAlertes() != null && !kpi.getAlertes().isEmpty()) {
            rowNum = addSection(sheet, rowNum, "ALERTES DE PILOTAGE", headerStyle);
            for (AlerteKPIDTO alerte : kpi.getAlertes()) {
                addDataRow(sheet, rowNum++,
                    alerte.getNiveau() + " - " + alerte.getCategorie(),
                    alerte.getTitre() + " : " + alerte.getMessage(), dataStyle);
            }
            rowNum++;
        }

        rowNum = ecrireListe(sheet, rowNum, "LISTE DES PROBLÈMES", kpi.getListeProblemes(), headerStyle, dataStyle);
        rowNum = ecrireListe(sheet, rowNum, "LISTE DES RISQUES", kpi.getListeRisques(), headerStyle, dataStyle);
        ecrireListe(sheet, rowNum, "RECOMMANDATIONS DU CHEF DE PROJET",
            kpi.getListeRecommandations(), headerStyle, dataStyle);

        sheet.setColumnWidth(0, 12000);
        sheet.setColumnWidth(1, 14000);
        sheet.setColumnWidth(2, 4000);
        sheet.setColumnWidth(3, 4000);
    }

    /* ------------------------------------------------------------------ */
    /* Onglet 2 : tâches sous surveillance                                  */
    /* ------------------------------------------------------------------ */

    private void ecrireTaches(Workbook workbook, ProjetKPIReportDTO kpi,
                              CellStyle headerStyle, CellStyle columnStyle, CellStyle dataStyle) {
        boolean retards = kpi.getListeTachesEnRetard() != null && !kpi.getListeTachesEnRetard().isEmpty();
        boolean imminentes = kpi.getListeTachesEcheanceProche() != null && !kpi.getListeTachesEcheanceProche().isEmpty();
        if (!retards && !imminentes) {
            return;
        }

        Sheet sheet = workbook.createSheet("Tâches");
        int rowNum = 0;

        if (retards) {
            rowNum = addSection(sheet, rowNum, "TÂCHES HORS DÉLAI", headerStyle);
            rowNum = ecrireTableTaches(sheet, rowNum, kpi.getListeTachesEnRetard(), "Retard (j)", columnStyle, dataStyle);
            rowNum++;
        }
        if (imminentes) {
            rowNum = addSection(sheet, rowNum, "ÉCHÉANCES IMMINENTES", headerStyle);
            ecrireTableTaches(sheet, rowNum, kpi.getListeTachesEcheanceProche(), "Dans (j)", columnStyle, dataStyle);
        }

        sheet.setColumnWidth(0, 3000);
        sheet.setColumnWidth(1, 14000);
        sheet.setColumnWidth(2, 7000);
        sheet.setColumnWidth(3, 4500);
        sheet.setColumnWidth(4, 3500);
        sheet.setColumnWidth(5, 4000);
    }

    private int ecrireTableTaches(Sheet sheet, int rowNum, List<TacheKPIDTO> taches,
                                  String colonneEcart, CellStyle columnStyle, CellStyle dataStyle) {
        Row entete = sheet.createRow(rowNum++);
        String[] colonnes = {"Code", "Tâche", "Assignée à", "Échéance", "Réalisé", colonneEcart};
        for (int i = 0; i < colonnes.length; i++) {
            Cell cell = entete.createCell(i);
            cell.setCellValue(colonnes[i]);
            cell.setCellStyle(columnStyle);
        }

        for (TacheKPIDTO tache : taches) {
            Row row = sheet.createRow(rowNum++);
            ecrireCellule(row, 0, tache.getCode(), dataStyle);
            ecrireCellule(row, 1, tache.getSujet(), dataStyle);
            ecrireCellule(row, 2, tache.getAssigneA(), dataStyle);
            ecrireCellule(row, 3, tache.getEcheance(), dataStyle);
            ecrireCellule(row, 4, tache.getPourcentageRealise() + " %", dataStyle);
            ecrireCellule(row, 5, String.valueOf(Math.abs(tache.getJoursEcart())), dataStyle);
        }
        return rowNum;
    }

    /* ------------------------------------------------------------------ */
    /* Onglet 3 : équipe et charge                                          */
    /* ------------------------------------------------------------------ */

    private void ecrireEquipe(Workbook workbook, ProjetKPIReportDTO kpi,
                              CellStyle headerStyle, CellStyle columnStyle, CellStyle dataStyle) {
        List<MembreEquipeDTO> membres = kpi.getListeMembresEquipe();
        List<ChargeMembreDTO> charges = kpi.getChargeParMembre();
        boolean aMembres = membres != null && !membres.isEmpty();
        boolean aCharges = charges != null && !charges.isEmpty();
        if (!aMembres && !aCharges) {
            return;
        }

        Sheet sheet = workbook.createSheet("Équipe");
        int rowNum = 0;

        if (aMembres) {
            rowNum = addSection(sheet, rowNum, "COMPOSITION DE L'ÉQUIPE (" + kpi.getTailleEquipe() + ")", headerStyle);
            Row entete = sheet.createRow(rowNum++);
            ecrireCellule(entete, 0, "Membre", columnStyle);
            ecrireCellule(entete, 1, "Rôle", columnStyle);
            for (MembreEquipeDTO membre : membres) {
                Row row = sheet.createRow(rowNum++);
                ecrireCellule(row, 0, membre.getNom(), dataStyle);
                ecrireCellule(row, 1, membre.getRole(), dataStyle);
            }
            rowNum++;
        }

        if (aCharges) {
            rowNum = addSection(sheet, rowNum, "RÉPARTITION DE LA CHARGE", headerStyle);
            Row entete = sheet.createRow(rowNum++);
            String[] colonnes = {"Intervenant", "Tâches", "Terminées", "En retard", "Avancement moyen",
                "Charge estimée (j)", "Charge consommée (j)"};
            for (int i = 0; i < colonnes.length; i++) {
                ecrireCellule(entete, i, colonnes[i], columnStyle);
            }
            for (ChargeMembreDTO charge : charges) {
                Row row = sheet.createRow(rowNum++);
                ecrireCellule(row, 0, charge.getNom(), dataStyle);
                ecrireCellule(row, 1, String.valueOf(charge.getNombreTaches()), dataStyle);
                ecrireCellule(row, 2, String.valueOf(charge.getTachesTerminees()), dataStyle);
                ecrireCellule(row, 3, String.valueOf(charge.getTachesEnRetard()), dataStyle);
                ecrireCellule(row, 4, pourcent(charge.getAvancementMoyen()), dataStyle);
                ecrireCellule(row, 5, decimal(charge.getChargeEstimee()), dataStyle);
                ecrireCellule(row, 6, decimal(charge.getChargeConsommee()), dataStyle);
            }
        }

        sheet.setColumnWidth(0, 9000);
        for (int i = 1; i <= 6; i++) {
            sheet.setColumnWidth(i, 5500);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Onglet 4 : historique des fiches de suivi                            */
    /* ------------------------------------------------------------------ */

    private void ecrireHistorique(Workbook workbook, ProjetKPIReportDTO kpi,
                                  CellStyle headerStyle, CellStyle columnStyle, CellStyle dataStyle) {
        List<PointHistoriqueKPIDTO> historique = kpi.getHistorique();
        if (historique == null || historique.isEmpty()) {
            return;
        }

        Sheet sheet = workbook.createSheet("Historique");
        int rowNum = addSection(sheet, 0, "ÉVOLUTION PAR FICHE DE SUIVI", headerStyle);

        Row entete = sheet.createRow(rowNum++);
        String[] colonnes = {"Date", "Rapport", "Avancement", "Problèmes", "Risques"};
        for (int i = 0; i < colonnes.length; i++) {
            ecrireCellule(entete, i, colonnes[i], columnStyle);
        }

        for (PointHistoriqueKPIDTO point : historique) {
            Row row = sheet.createRow(rowNum++);
            ecrireCellule(row, 0, point.getDate(), dataStyle);
            ecrireCellule(row, 1, point.getNumeroRapport(), dataStyle);
            ecrireCellule(row, 2, pourcent(point.getTauxAvancement()), dataStyle);
            ecrireCellule(row, 3, String.valueOf(point.getNombreProblemes()), dataStyle);
            ecrireCellule(row, 4, String.valueOf(point.getNombreRisques()), dataStyle);
        }

        for (int i = 0; i < colonnes.length; i++) {
            sheet.setColumnWidth(i, 5500);
        }
    }

    /* ------------------------------------------------------------------ */
    /* Briques communes                                                     */
    /* ------------------------------------------------------------------ */

    private int addSection(Sheet sheet, int rowNum, String titre, CellStyle headerStyle) {
        Row sectionRow = sheet.createRow(rowNum);
        Cell sectionCell = sectionRow.createCell(0);
        sectionCell.setCellValue(titre);
        sectionCell.setCellStyle(headerStyle);
        sheet.addMergedRegion(new CellRangeAddress(rowNum, rowNum, 0, 3));
        return rowNum + 1;
    }

    private int ecrireListe(Sheet sheet, int rowNum, String titre, List<String> elements,
                            CellStyle headerStyle, CellStyle dataStyle) {
        if (elements == null || elements.isEmpty()) {
            return rowNum;
        }
        rowNum = addSection(sheet, rowNum, titre, headerStyle);
        for (String element : elements) {
            Row row = sheet.createRow(rowNum);
            Cell cell = row.createCell(0);
            cell.setCellValue("• " + element);
            cell.setCellStyle(dataStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowNum, rowNum, 0, 3));
            rowNum++;
        }
        return rowNum + 1;
    }

    private void ecrireCellule(Row row, int colonne, String valeur, CellStyle style) {
        Cell cell = row.createCell(colonne);
        cell.setCellValue(valeur != null && !valeur.isBlank() ? valeur : "-");
        cell.setCellStyle(style);
    }

    private void addDataRow(Sheet sheet, int rowNum, String label, String value, CellStyle style) {
        Row row = sheet.createRow(rowNum);
        Cell labelCell = row.createCell(0);
        labelCell.setCellValue(label);
        labelCell.setCellStyle(style);

        Cell valueCell = row.createCell(1);
        valueCell.setCellValue(value != null && !value.isBlank() ? value : "-");
        valueCell.setCellStyle(style);
    }

    private String pourcent(double valeur) {
        return String.format(Locale.FRANCE, "%.1f %%", valeur);
    }

    private String decimal(double valeur) {
        return String.format(Locale.FRANCE, "%.2f", valeur);
    }

    private String signe(double valeur) {
        return String.format(Locale.FRANCE, "%+.1f", valeur);
    }

    private String montant(double valeurMD) {
        return String.format(Locale.FRANCE, "%,.0f", valeurMD * 1_000_000);
    }

    private CellStyle createHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createColumnHeaderStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createTitleStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 18);
        font.setColor(IndexedColors.DARK_GREEN.getIndex());
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(true);
        return style;
    }

    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        Font font = workbook.createFont();
        font.setFontHeightInPoints((short) 11);
        font.setBold(true);
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }
}
