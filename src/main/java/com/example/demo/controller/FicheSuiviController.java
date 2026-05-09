package com.example.demo.controller;

import com.example.demo.dto.FicheSuiviRequest;
import com.example.demo.dto.MessageResponse;
import com.example.demo.model.FicheSuivi;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.FicheSuiviService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/chef-projet/fiches-suivi")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('ADMIN')")
public class FicheSuiviController {
    @Autowired
    private FicheSuiviService ficheSuiviService;

    @GetMapping
    public ResponseEntity<List<FicheSuivi>> getMyFichesSuivi(Authentication authentication) {
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(ficheSuiviService.getFichesSuiviByChefProjet(userDetails.getId()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FicheSuivi>> getAllFichesSuivi() {
        return ResponseEntity.ok(ficheSuiviService.getAllFichesSuivi());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FicheSuivi> getFicheSuiviById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(ficheSuiviService.getFicheSuiviById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/projet/{ficheProjetId}")
    public ResponseEntity<List<FicheSuivi>> getFichesSuiviByProjet(@PathVariable String ficheProjetId) {
        return ResponseEntity.ok(ficheSuiviService.getFichesSuiviByProjet(ficheProjetId));
    }

    @GetMapping("/projet/{ficheProjetId}/name")
    public ResponseEntity<String> getProjetName(@PathVariable String ficheProjetId) {
        String projetName = ficheSuiviService.getProjetName(ficheProjetId);
        return ResponseEntity.ok(projetName);
    }

    @PostMapping
    public ResponseEntity<?> createFicheSuivi(@Valid @RequestBody FicheSuiviRequest request,
                                              Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            FicheSuivi ficheSuivi = ficheSuiviService.createFicheSuivi(request, userDetails.getId());
            return ResponseEntity.ok(ficheSuivi);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateFicheSuivi(@PathVariable String id,
                                              @Valid @RequestBody FicheSuiviRequest request,
                                              Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            FicheSuivi ficheSuivi = ficheSuiviService.updateFicheSuivi(id, request, userDetails.getId());
            return ResponseEntity.ok(ficheSuivi);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFicheSuivi(@PathVariable String id,
                                              Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            ficheSuiviService.deleteFicheSuivi(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Fiche suivi deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    /**
     * Endpoint pour synchroniser les dates de toutes les fiches de suivi
     * avec les dates de leur fiche projet associée
     */
    @PostMapping("/sync-dates")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> synchronizeDates() {
        try {
            int updatedCount = ficheSuiviService.synchronizeDatesFromFicheProjet();
            return ResponseEntity.ok(new MessageResponse(
                "Synchronization completed. " + updatedCount + " fiche(s) suivi updated."));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error during synchronization: " + e.getMessage()));
        }
    }
}
