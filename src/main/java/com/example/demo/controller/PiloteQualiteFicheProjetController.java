package com.example.demo.controller;

import com.example.demo.model.FicheProjet;
import com.example.demo.service.FicheProjetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<FicheProjet> getFicheProjetById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(ficheProjetService.getFicheProjetById(id));
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
}
