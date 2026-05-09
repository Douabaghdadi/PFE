package com.example.demo.controller;

import com.example.demo.dto.KPIReportDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.service.KPIService;
import com.example.demo.service.ExcelReportService;
import com.example.demo.service.PDFReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/pilote-qualite/rapports")
@PreAuthorize("hasRole('PILOTE_QUALITE')")
public class KPIReportController {

    @Autowired
    private KPIService kpiService;
    
    @Autowired
    private ExcelReportService excelReportService;
    
    @Autowired
    private PDFReportService pdfReportService;

    /**
     * Récupère les KPI sous forme JSON
     */
    @GetMapping("/kpi")
    public ResponseEntity<KPIReportDTO> getKPIs() {
        try {
            KPIReportDTO kpis = kpiService.calculateKPIs();
            return ResponseEntity.ok(kpis);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Télécharge un rapport KPI au format JSON
     */
    @GetMapping("/kpi/download/json")
    public ResponseEntity<byte[]> downloadKPIReportJSON() {
        try {
            KPIReportDTO kpis = kpiService.calculateKPIs();
            
            // Convertir en JSON formaté
            ObjectMapper mapper = new ObjectMapper();
            mapper.enable(SerializationFeature.INDENT_OUTPUT);
            String jsonContent = mapper.writeValueAsString(kpis);
            
            byte[] content = jsonContent.getBytes(StandardCharsets.UTF_8);
            
            // Nom du fichier avec timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "rapport_kpi_" + timestamp + ".json";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(content.length);
            
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Télécharge un rapport KPI au format CSV
     */
    @GetMapping("/kpi/download/csv")
    public ResponseEntity<byte[]> downloadKPIReportCSV() {
        try {
            KPIReportDTO kpis = kpiService.calculateKPIs();
            
            // Créer le contenu CSV
            StringBuilder csv = new StringBuilder();
            csv.append("Rapport KPI - QualityHub\n");
            csv.append("Date de génération,").append(kpis.getDateGeneration()).append("\n\n");
            
            csv.append("STATISTIQUES GÉNÉRALES\n");
            csv.append("Indicateur,Valeur\n");
            csv.append("Total Projets,").append(kpis.getTotalProjets()).append("\n");
            csv.append("Projets en Cours,").append(kpis.getProjetsEnCours()).append("\n");
            csv.append("Projets Terminés,").append(kpis.getProjetsTermines()).append("\n");
            csv.append("Projets en Attente,").append(kpis.getProjetsEnAttente()).append("\n");
            csv.append("Projets Annulés,").append(kpis.getProjetsAnnules()).append("\n");
            csv.append("Projets en Retard,").append(kpis.getProjetsEnRetard()).append("\n");
            csv.append("Total Fiches de Suivi,").append(kpis.getTotalFichesSuivi()).append("\n\n");
            
            csv.append("KPI DE PERFORMANCE\n");
            csv.append("Indicateur,Valeur\n");
            csv.append("Taux de Complétion (%),").append(String.format("%.2f", kpis.getTauxCompletion())).append("\n");
            csv.append("Taux Projets en Cours (%),").append(String.format("%.2f", kpis.getTauxProjetsEnCours())).append("\n\n");
            
            csv.append("KPI DE QUALITÉ\n");
            csv.append("Indicateur,Valeur\n");
            csv.append("Total Tâches,").append(kpis.getTotalTaches()).append("\n");
            csv.append("Total Problèmes,").append(kpis.getTotalProblemes()).append("\n");
            csv.append("Total Risques,").append(kpis.getTotalRisques()).append("\n");
            csv.append("Moyenne Tâches par Projet,").append(String.format("%.2f", kpis.getMoyenneTachesParProjet())).append("\n");
            csv.append("Moyenne Problèmes par Projet,").append(String.format("%.2f", kpis.getMoyenneProblemsParProjet())).append("\n\n");
            
            csv.append("KPI BUDGÉTAIRES\n");
            csv.append("Indicateur,Valeur (MD)\n");
            csv.append("Budget Total,").append(String.format("%.2f", kpis.getBudgetTotal())).append("\n");
            csv.append("Budget Moyen par Projet,").append(String.format("%.2f", kpis.getBudgetMoyen())).append("\n\n");
            
            if (kpis.getRepartitionParStatut() != null && !kpis.getRepartitionParStatut().isEmpty()) {
                csv.append("RÉPARTITION PAR STATUT\n");
                csv.append("Statut,Nombre\n");
                kpis.getRepartitionParStatut().forEach((statut, count) -> 
                    csv.append(statut).append(",").append(count).append("\n")
                );
                csv.append("\n");
            }
            
            if (kpis.getRepartitionParType() != null && !kpis.getRepartitionParType().isEmpty()) {
                csv.append("RÉPARTITION PAR TYPE\n");
                csv.append("Type,Nombre\n");
                kpis.getRepartitionParType().forEach((type, count) -> 
                    csv.append(type).append(",").append(count).append("\n")
                );
            }
            
            byte[] content = csv.toString().getBytes(StandardCharsets.UTF_8);
            
            // Nom du fichier avec timestamp
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "rapport_kpi_" + timestamp + ".csv";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(content.length);
            
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Récupère les KPI d'un projet spécifique
     */
    @GetMapping("/projet/{projetId}/kpi")
    public ResponseEntity<ProjetKPIReportDTO> getProjetKPIs(@PathVariable String projetId) {
        try {
            ProjetKPIReportDTO kpis = kpiService.calculateProjetKPIs(projetId);
            return ResponseEntity.ok(kpis);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Télécharge un rapport KPI pour un projet spécifique au format JSON
     */
    @GetMapping("/projet/{projetId}/kpi/download/json")
    public ResponseEntity<byte[]> downloadProjetKPIReportJSON(@PathVariable String projetId) {
        try {
            ProjetKPIReportDTO kpis = kpiService.calculateProjetKPIs(projetId);
            
            ObjectMapper mapper = new ObjectMapper();
            mapper.enable(SerializationFeature.INDENT_OUTPUT);
            String jsonContent = mapper.writeValueAsString(kpis);
            
            byte[] content = jsonContent.getBytes(StandardCharsets.UTF_8);
            
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "rapport_kpi_projet_" + kpis.getNomProjet().replaceAll("[^a-zA-Z0-9]", "_") + "_" + timestamp + ".json";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(content.length);
            
            return new ResponseEntity<>(content, headers, HttpStatus.OK);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Télécharge un rapport KPI pour un projet spécifique au format Excel
     */
    @GetMapping("/projet/{projetId}/kpi/download/excel")
    public ResponseEntity<byte[]> downloadProjetKPIReportExcel(@PathVariable String projetId) {
        try {
            ProjetKPIReportDTO kpis = kpiService.calculateProjetKPIs(projetId);
            byte[] excelContent = excelReportService.generateProjetKPIExcel(kpis);
            
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "rapport_kpi_" + kpis.getNomProjet().replaceAll("[^a-zA-Z0-9]", "_") + "_" + timestamp + ".xlsx";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("application", "vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(excelContent.length);
            
            return new ResponseEntity<>(excelContent, headers, HttpStatus.OK);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Télécharge un rapport KPI pour un projet spécifique au format PDF
     */
    @GetMapping("/projet/{projetId}/kpi/download/pdf")
    public ResponseEntity<byte[]> downloadProjetKPIReportPDF(@PathVariable String projetId) {
        try {
            ProjetKPIReportDTO kpis = kpiService.calculateProjetKPIs(projetId);
            byte[] pdfContent = pdfReportService.generateProjetKPIPDF(kpis);
            
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String filename = "rapport_kpi_" + kpis.getNomProjet().replaceAll("[^a-zA-Z0-9]", "_") + "_" + timestamp + ".pdf";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(pdfContent.length);
            
            return new ResponseEntity<>(pdfContent, headers, HttpStatus.OK);
        } catch (RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
