package com.example.demo.controller;

import com.example.demo.dto.ProjetSuiviStatusDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.FicheProjetService;
import com.example.demo.service.UserNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Contrôleur pour permettre au Pilote Qualité de consulter toutes les fiches projet
 * en lecture seule (pas de création, modification ou suppression)
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/pilote-qualite/fiches-projet")
@PreAuthorize("hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class PiloteQualiteFicheProjetController {
    
    @Autowired
    private FicheProjetService ficheProjetService;
    
    @Autowired
    private UserNotificationService userNotificationService;

    /**
     * Récupère toutes les fiches projet (lecture seule)
     */
    @GetMapping
    public ResponseEntity<List<FicheProjet>> getAllFichesProjet() {
        return ResponseEntity.ok(ficheProjetService.getAllFichesProjet());
    }

    /**
     * Récupère une fiche projet par son ID (lecture seule)
     */
    @GetMapping("/{id}")
    public ResponseEntity<FicheProjet> getFicheProjetById(
            @PathVariable String id,
            Authentication authentication) {
        try {
            FicheProjet ficheProjet = ficheProjetService.getFicheProjetById(id);
            
            if (authentication != null) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                userNotificationService.createViewNotification(
                    ficheProjet.getId(),
                    "FICHE_PROJET",
                    ficheProjet.getNomProjet(),
                    userDetails.getId(),
                    ficheProjet.getChefProjetId()
                );
            }
            
            return ResponseEntity.ok(ficheProjet);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Récupère les fiches projet par statut (lecture seule)
     */
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<FicheProjet>> getFichesProjetByStatut(@PathVariable String statut) {
        return ResponseEntity.ok(ficheProjetService.getFichesProjetByStatut(statut));
    }

    /**
     * Récupère les fiches projet par catégorie (lecture seule)
     */
    @GetMapping("/categorie/{categorie}")
    public ResponseEntity<List<FicheProjet>> getFichesProjetByCategorie(@PathVariable String categorie) {
        return ResponseEntity.ok(ficheProjetService.getFichesProjetByCategorie(categorie));
    }

    /**
     * Récupère les fiches projet d'un chef de projet spécifique (lecture seule)
     */
    @GetMapping("/chef-projet/{chefProjetId}")
    public ResponseEntity<List<FicheProjet>> getFichesProjetByChefProjet(@PathVariable String chefProjetId) {
        return ResponseEntity.ok(ficheProjetService.getFichesProjetByChefProjet(chefProjetId));
    }

    /**
     * Récupère le statut des fiches de suivi pour tous les projets
     * Retourne uniquement les projets dont la fiche de suivi est en retard
     */
    @GetMapping("/suivi-status")
    public ResponseEntity<List<ProjetSuiviStatusDTO>> getProjetsSuiviStatus() {
        return ResponseEntity.ok(ficheProjetService.getProjetsSuiviStatus());
    }

    /**
     * Initialise les dates de suivi pour tous les projets existants
     */
    @PostMapping("/init-suivi-dates")
    public ResponseEntity<String> initSuiviDates() {
        int count = ficheProjetService.initializeSuiviDates();
        return ResponseEntity.ok(count + " projet(s) initialisé(s)");
    }

    /**
     * Configure la périodicité de remplissage des fiches de suivi pour un projet
     */
    @PutMapping("/{id}/periodicite")
    public ResponseEntity<FicheProjet> configurerPeriodicite(
            @PathVariable String id,
            @RequestBody Map<String, Integer> body,
            Authentication authentication) {
        Integer periodiciteMois = body.get("periodiciteMois");
        if (periodiciteMois == null || periodiciteMois < 1) {
            return ResponseEntity.badRequest().build();
        }
        try {
            FicheProjet updated = ficheProjetService.configurerPeriodicite(id, periodiciteMois);
            if (authentication != null && updated.getChefProjetId() != null) {
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                userNotificationService.createViewNotification(
                    updated.getId(),
                    "PERIODICITE",
                    updated.getNomProjet() + "|" + periodiciteMois,
                    userDetails.getId(),
                    updated.getChefProjetId()
                );
            }
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
