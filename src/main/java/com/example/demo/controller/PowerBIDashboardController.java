package com.example.demo.controller;

import com.example.demo.dto.PowerBIDashboardDTO;
import com.example.demo.service.PowerBIDashboardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/powerbi")
public class PowerBIDashboardController {
    
    @Autowired
    private PowerBIDashboardService powerBIDashboardService;
    
    /**
     * Endpoint de test - SANS authentification pour vérifier que l'API fonctionne
     */
    @GetMapping("/test")
    public ResponseEntity<String> testConnection() {
        return ResponseEntity.ok("Power BI API is working!");
    }
    
    /**
     * Endpoint pour récupérer toutes les données du dashboard
     * TEMPORAIREMENT sans authentification pour les tests
     */
    @GetMapping("/dashboard")
    // @PreAuthorize("isAuthenticated()") // ← Décommenter après les tests
    public ResponseEntity<PowerBIDashboardDTO> getDashboardData() {
        PowerBIDashboardDTO dashboard = powerBIDashboardService.getDashboardData();
        return ResponseEntity.ok(dashboard);
    }
    
    /**
     * Endpoint spécifique pour le chef de projet
     */
    @GetMapping("/dashboard/chef-projet")
    @PreAuthorize("hasRole('CHEF_PROJET')")
    public ResponseEntity<PowerBIDashboardDTO> getChefProjetDashboard() {
        PowerBIDashboardDTO dashboard = powerBIDashboardService.getDashboardData();
        return ResponseEntity.ok(dashboard);
    }
    
    /**
     * Endpoint spécifique pour le pilote qualité
     */
    @GetMapping("/dashboard/pilote-qualite")
    @PreAuthorize("hasRole('PILOTE_QUALITE')")
    public ResponseEntity<PowerBIDashboardDTO> getPiloteQualiteDashboard() {
        PowerBIDashboardDTO dashboard = powerBIDashboardService.getPiloteQualiteDashboard();
        return ResponseEntity.ok(dashboard);
    }
}
