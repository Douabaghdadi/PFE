package com.example.demo.controller;

import com.example.demo.dto.FicheProjetRequest;
import com.example.demo.dto.MessageResponse;
import com.example.demo.model.FicheProjet;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.FicheProjetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/chef-projet/fiches-projet")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('ADMIN')")
public class FicheProjetController {
    @Autowired
    private FicheProjetService ficheProjetService;

    @GetMapping
    public ResponseEntity<List<FicheProjet>> getMyFichesProjet(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(ficheProjetService.getFichesProjetByChefProjet(userDetails.getId()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FicheProjet>> getAllFichesProjet() {
        return ResponseEntity.ok(ficheProjetService.getAllFichesProjet());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FicheProjet> getFicheProjetById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(ficheProjetService.getFicheProjetById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<FicheProjet>> getFichesProjetByStatut(@PathVariable String statut) {
        return ResponseEntity.ok(ficheProjetService.getFichesProjetByStatut(statut));
    }

    @GetMapping("/categorie/{categorie}")
    public ResponseEntity<List<FicheProjet>> getFichesProjetByCategorie(@PathVariable String categorie) {
        return ResponseEntity.ok(ficheProjetService.getFichesProjetByCategorie(categorie));
    }

    @PostMapping
    public ResponseEntity<?> createFicheProjet(@Valid @RequestBody FicheProjetRequest request,
                                               Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            FicheProjet ficheProjet = ficheProjetService.createFicheProjet(request, userDetails.getId());
            return ResponseEntity.ok(ficheProjet);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFicheProjet(@PathVariable String id,
                                               @Valid @RequestBody FicheProjetRequest request,
                                               Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            FicheProjet ficheProjet = ficheProjetService.updateFicheProjet(id, request, userDetails.getId());
            return ResponseEntity.ok(ficheProjet);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFicheProjet(@PathVariable String id,
                                               Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            ficheProjetService.deleteFicheProjet(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Fiche projet deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
}
