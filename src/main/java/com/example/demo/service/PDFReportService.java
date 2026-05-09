package com.example.demo.service;

import com.example.demo.dto.ProjetKPIReportDTO;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class PDFReportService {

    private static final DeviceRgb GREEN_COLOR = new DeviceRgb(16, 185, 129);
    private static final DeviceRgb LIGHT_GREEN = new DeviceRgb(220, 252, 231);

    public byte[] generateProjetKPIPDF(ProjetKPIReportDTO kpi) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        
        try {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);
            
            // Titre principal
            Paragraph title = new Paragraph("RAPPORT KPI PROJET")
                .setFontSize(24)
                .setBold()
                .setFontColor(GREEN_COLOR)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(10);
            document.add(title);
            
            Paragraph subtitle = new Paragraph("QualityHub")
                .setFontSize(14)
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginBottom(20);
            document.add(subtitle);
            
            // Informations du projet
            addSection(document, "INFORMATIONS DU PROJET");
            Table infoTable = createInfoTable();
            addRow(infoTable, "Nom du Projet", kpi.getNomProjet());
            addRow(infoTable, "Statut", kpi.getStatut());
            addRow(infoTable, "Date Début", kpi.getDateDebut());
            addRow(infoTable, "Date Fin Prévue", kpi.getDateFinPrevue());
            document.add(infoTable);
            
            // KPI de Performance
            addSection(document, "KPI DE PERFORMANCE");
            Table perfTable = createInfoTable();
            addRow(perfTable, "Taux d'Avancement", String.format("%.2f%%", kpi.getTauxAvancement()));
            addRow(perfTable, "Jours de Retard", String.valueOf(kpi.getJoursRetard()));
            document.add(perfTable);
            
            // KPI de Qualité
            addSection(document, "KPI DE QUALITÉ");
            Table qualityTable = createInfoTable();
            addRow(qualityTable, "Nombre de Problèmes", String.valueOf(kpi.getNombreProblemes()));
            addRow(qualityTable, "Nombre de Risques", String.valueOf(kpi.getNombreRisques()));
            document.add(qualityTable);
            
            // Budget
            addSection(document, "BUDGET");
            Table budgetTable = createInfoTable();
            addRow(budgetTable, "Budget Total (MDH)", String.format("%.2f", kpi.getBudgetTotal()));
            addRow(budgetTable, "Budget Total (DH)", String.format("%,.0f", kpi.getBudgetTotal() * 1000000));
            document.add(budgetTable);
            
            // Équipe
            addSection(document, "ÉQUIPE");
            Table teamTable = createInfoTable();
            addRow(teamTable, "Taille de l'Équipe", kpi.getTailleEquipe() + " membres");
            document.add(teamTable);
            
            // Problèmes
            if (kpi.getListeProblemes() != null && !kpi.getListeProblemes().isEmpty()) {
                addSection(document, "LISTE DES PROBLÈMES");
                com.itextpdf.layout.element.List problemList = new com.itextpdf.layout.element.List();
                for (String probleme : kpi.getListeProblemes()) {
                    problemList.add(probleme);
                }
                document.add(problemList);
            }
            
            // Risques
            if (kpi.getListeRisques() != null && !kpi.getListeRisques().isEmpty()) {
                addSection(document, "LISTE DES RISQUES");
                com.itextpdf.layout.element.List riskList = new com.itextpdf.layout.element.List();
                for (String risque : kpi.getListeRisques()) {
                    riskList.add(risque);
                }
                document.add(riskList);
            }
            
            // Footer
            Paragraph footer = new Paragraph("Généré par QualityHub - " + java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")))
                .setFontSize(8)
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setMarginTop(20);
            document.add(footer);
            
            document.close();
            return baos.toByteArray();
            
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }
    
    private void addSection(Document document, String title) {
        Paragraph section = new Paragraph(title)
            .setFontSize(14)
            .setBold()
            .setFontColor(GREEN_COLOR)
            .setMarginTop(15)
            .setMarginBottom(10);
        document.add(section);
    }
    
    private Table createInfoTable() {
        Table table = new Table(UnitValue.createPercentArray(new float[]{40, 60}))
            .useAllAvailableWidth()
            .setMarginBottom(15);
        return table;
    }
    
    private void addRow(Table table, String label, String value) {
        Cell labelCell = new Cell()
            .add(new Paragraph(label).setBold())
            .setBackgroundColor(LIGHT_GREEN)
            .setPadding(8);
        
        Cell valueCell = new Cell()
            .add(new Paragraph(value != null ? value : "-"))
            .setPadding(8);
        
        table.addCell(labelCell);
        table.addCell(valueCell);
    }
}
