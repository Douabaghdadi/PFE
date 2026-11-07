package com.example.demo.controller;

import com.example.demo.dto.FicheProjetRequest;
import com.example.demo.dto.MessageResponse;
import com.example.demo.model.FicheProjet;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.FicheProjetService;
import com.example.demo.service.UserNotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
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
    
    @Autowired
    private UserNotificationService userNotificationService;

    @Autowired
    private ControleAcces controleAcces;

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
    public ResponseEntity<FicheProjet> getFicheProjetById(@PathVariable String id, Authentication authentication) {
        try {
            FicheProjet ficheProjet = ficheProjetService.getFicheProjetById(id);
            if (!controleAcces.peutLire(ficheProjet.getChefProjetId(), authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
            return ResponseEntity.ok(ficheProjet);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<FicheProjet>> getFichesProjetByStatut(@PathVariable String statut,
                                                                     Authentication authentication) {
        return ResponseEntity.ok(fichesLisibles(ficheProjetService.getFichesProjetByStatut(statut), authentication));
    }

    private List<FicheProjet> fichesLisibles(List<FicheProjet> fiches, Authentication authentication) {
        return fiches.stream()
                .filter(fiche -> controleAcces.peutLire(fiche.getChefProjetId(), authentication))
                .toList();
    }

    @PostMapping
    public ResponseEntity<?> createFicheProjet(@Valid @RequestBody FicheProjetRequest request,
                                               Authentication authentication) {
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            FicheProjet ficheProjet = ficheProjetService.createFicheProjet(request, userDetails.getId());
            
            // Créer une notification pour les pilotes qualité
            userNotificationService.createFicheProjetNotification(
                ficheProjet.getId(), 
                "CREATED", 
                userDetails.getId()
            );
            
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
            
            // Créer une notification pour les pilotes qualité
            userNotificationService.createFicheProjetNotification(
                ficheProjet.getId(), 
                "UPDATED", 
                userDetails.getId()
            );
            
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
            ficheProjetService.verifierSuppression(id, userDetails.getId());

            // Créer une notification avant de supprimer
            userNotificationService.createFicheProjetNotification(
                id,
                "DELETED",
                userDetails.getId()
            );

            ficheProjetService.deleteFicheProjet(id, userDetails.getId());
            return ResponseEntity.ok(new MessageResponse("Fiche projet deleted successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
}
