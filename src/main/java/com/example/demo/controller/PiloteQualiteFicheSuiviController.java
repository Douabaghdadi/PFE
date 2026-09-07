package com.example.demo.controller;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.FicheProjetService;
import com.example.demo.service.FicheSuiviService;
import com.example.demo.service.UserNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    
    @Autowired
    private FicheProjetService ficheProjetService;
    
    @Autowired
    private UserNotificationService userNotificationService;

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
    public ResponseEntity<FicheSuivi> getFicheSuiviById(@PathVariable String id, Authentication authentication) {
        try {
            FicheSuivi ficheSuivi = ficheSuiviService.getFicheSuiviById(id);
            FicheProjet ficheProjet = ficheProjetService.getFicheProjetById(ficheSuivi.getFicheProjetId());
            
            // Créer une notification pour le chef de projet
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            userNotificationService.createViewNotification(
                ficheSuivi.getId(),
                "FICHE_SUIVI",
                ficheProjet.getNomProjet(),
                userDetails.getId(),
                ficheProjet.getChefProjetId()
            );
            
            return ResponseEntity.ok(ficheSuivi);
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
