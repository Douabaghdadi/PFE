package com.example.demo.controller;

import com.example.demo.model.FicheSuivi;
import com.example.demo.service.FicheSuiviService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur pour permettre au Pilote Qualité de consulter toutes les fiches de suivi
 * en lecture seule (pas de création, modification ou suppression)
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/pilote-qualite/fiches-suivi")
@PreAuthorize("hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class PiloteQualiteFicheSuiviController {
    
    @Autowired
    private FicheSuiviService ficheSuiviService;

    /**
     * Récupère toutes les fiches de suivi (lecture seule)
     */
    @GetMapping
    public ResponseEntity<List<FicheSuivi>> getAllFichesSuivi() {
        return ResponseEntity.ok(ficheSuiviService.getAllFichesSuivi());
    }

    /**
     * Récupère une fiche de suivi par son ID (lecture seule)
     */
    @GetMapping("/{id}")
    public ResponseEntity<FicheSuivi> getFicheSuiviById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(ficheSuiviService.getFicheSuiviById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Récupère les fiches de suivi d'un projet spécifique (lecture seule)
     */
    @GetMapping("/projet/{ficheProjetId}")
    public ResponseEntity<List<FicheSuivi>> getFichesSuiviByProjet(@PathVariable String ficheProjetId) {
        return ResponseEntity.ok(ficheSuiviService.getFichesSuiviByProjet(ficheProjetId));
    }

    /**
     * Récupère les fiches de suivi d'un chef de projet spécifique (lecture seule)
     */
    @GetMapping("/chef-projet/{chefProjetId}")
    public ResponseEntity<List<FicheSuivi>> getFichesSuiviByChefProjet(@PathVariable String chefProjetId) {
        return ResponseEntity.ok(ficheSuiviService.getFichesSuiviByChefProjet(chefProjetId));
    }
}
