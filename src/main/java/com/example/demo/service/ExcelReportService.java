package com.example.demo.service;

import com.example.demo.dto.ProjetKPIReportDTO;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ExcelReportService {

    public byte[] generateProjetKPIExcel(ProjetKPIReportDTO kpi) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("KPI Projet");
            
            // Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle numberStyle = createNumberStyle(workbook);
            
            int rowNum = 0;
            
            // Titre principal
            Row titleRow = sheet.createRow(rowNum++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("RAPPORT KPI PROJET - QUALITYHUB");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 3));
            rowNum++;
            
            // Informations du projet
            Row sectionRow = sheet.createRow(rowNum++);
            Cell sectionCell = sectionRow.createCell(0);
            sectionCell.setCellValue("INFORMATIONS DU PROJET");
            sectionCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
            
            addDataRow(sheet, rowNum++, "Nom du Projet", kpi.getNomProjet(), dataStyle);
            addDataRow(sheet, rowNum++, "Statut", kpi.getStatut(), dataStyle);
            addDataRow(sheet, rowNum++, "Date Début", kpi.getDateDebut(), dataStyle);
            addDataRow(sheet, rowNum++, "Date Fin Prévue", kpi.getDateFinPrevue(), dataStyle);
            rowNum++;
            
            // KPI de Performance
            sectionRow = sheet.createRow(rowNum++);
            sectionCell = sectionRow.createCell(0);
            sectionCell.setCellValue("KPI DE PERFORMANCE");
            sectionCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
            
            addDataRow(sheet, rowNum++, "Taux d'Avancement", String.format("%.2f%%", kpi.getTauxAvancement()), numberStyle);
            addDataRow(sheet, rowNum++, "Jours de Retard", String.valueOf(kpi.getJoursRetard()), numberStyle);
            rowNum++;
            
            // KPI de Qualité
            sectionRow = sheet.createRow(rowNum++);
            sectionCell = sectionRow.createCell(0);
            sectionCell.setCellValue("KPI DE QUALITÉ");
            sectionCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
            
            addDataRow(sheet, rowNum++, "Nombre de Problèmes", String.valueOf(kpi.getNombreProblemes()), numberStyle);
            addDataRow(sheet, rowNum++, "Nombre de Risques", String.valueOf(kpi.getNombreRisques()), numberStyle);
            rowNum++;
            
            // Budget
            sectionRow = sheet.createRow(rowNum++);
            sectionCell = sectionRow.createCell(0);
            sectionCell.setCellValue("BUDGET");
            sectionCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
            
            addDataRow(sheet, rowNum++, "Budget Total (MDH)", String.format("%.2f", kpi.getBudgetTotal()), numberStyle);
            addDataRow(sheet, rowNum++, "Budget Total (DH)", String.format("%,.0f", kpi.getBudgetTotal() * 1000000), numberStyle);
            rowNum++;
            
            // Équipe
            sectionRow = sheet.createRow(rowNum++);
            sectionCell = sectionRow.createCell(0);
            sectionCell.setCellValue("ÉQUIPE");
            sectionCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
            
            addDataRow(sheet, rowNum++, "Taille de l'Équipe", String.valueOf(kpi.getTailleEquipe()) + " membres", dataStyle);
            rowNum++;
            
            // Problèmes
            if (kpi.getListeProblemes() != null && !kpi.getListeProblemes().isEmpty()) {
                sectionRow = sheet.createRow(rowNum++);
                sectionCell = sectionRow.createCell(0);
                sectionCell.setCellValue("LISTE DES PROBLÈMES");
                sectionCell.setCellStyle(headerStyle);
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
                
                for (String probleme : kpi.getListeProblemes()) {
                    Row row = sheet.createRow(rowNum++);
                    Cell cell = row.createCell(0);
                    cell.setCellValue("• " + probleme);
                    cell.setCellStyle(dataStyle);
                    sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
                }
                rowNum++;
            }
            
            // Risques
            if (kpi.getListeRisques() != null && !kpi.getListeRisques().isEmpty()) {
                sectionRow = sheet.createRow(rowNum++);
                sectionCell = sectionRow.createCell(0);
                sectionCell.setCellValue("LISTE DES RISQUES");
                sectionCell.setCellStyle(headerStyle);
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
                
                for (String risque : kpi.getListeRisques()) {
                    Row row = sheet.createRow(rowNum++);
                    Cell cell = row.createCell(0);
                    cell.setCellValue("• " + risque);
                    cell.setCellStyle(dataStyle);
                    sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowNum-1, rowNum-1, 0, 3));
                }
            }
            
            // Ajuster la largeur des colonnes
            sheet.setColumnWidth(0, 8000);
            sheet.setColumnWidth(1, 8000);
            sheet.setColumnWidth(2, 4000);
            sheet.setColumnWidth(3, 4000);
            
            // Écrire dans un ByteArrayOutputStream
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }
    
    private void addDataRow(Sheet sheet, int rowNum, String label, String value, CellStyle style) {
        Row row = sheet.createRow(rowNum);
        Cell labelCell = row.createCell(0);
        labelCell.setCellValue(label);
        labelCell.setCellStyle(style);
        
        Cell valueCell = row.createCell(1);
        valueCell.setCellValue(value != null ? value : "-");
        valueCell.setCellStyle(style);
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
