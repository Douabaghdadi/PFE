package com.example.demo.controller;

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
