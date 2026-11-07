package com.example.demo.controller;

import com.example.demo.dto.DemandeCorrectionRequest;
import com.example.demo.dto.MessageResponse;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.ValidationFicheService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;
import java.util.function.Supplier;

/**
 * Décisions du pilote qualité sur les fiches. Contrairement à la consultation, elles lui sont
 * réservées : l'administrateur gère la plateforme, il ne contrôle pas les fiches.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/pilote-qualite")
@PreAuthorize("hasRole('PILOTE_QUALITE')")
public class ValidationFicheController {

    @Autowired
    private ValidationFicheService validationFicheService;

    @PutMapping("/fiches-suivi/{id}/valider")
    public ResponseEntity<?> validerFicheSuivi(@PathVariable String id, Authentication authentication) {
        return decider(() -> validationFicheService.validerFicheSuivi(id, piloteId(authentication)));
    }

    @PutMapping("/fiches-suivi/{id}/demander-correction")
    public ResponseEntity<?> demanderCorrectionFicheSuivi(@PathVariable String id,
                                                          @Valid @RequestBody DemandeCorrectionRequest request,
                                                          Authentication authentication) {
        return decider(() -> validationFicheService.demanderCorrectionFicheSuivi(
                id, request.getMotif(), piloteId(authentication)));
    }

    @PutMapping("/fiches-projet/{id}/valider")
    public ResponseEntity<?> validerFicheProjet(@PathVariable String id, Authentication authentication) {
        return decider(() -> validationFicheService.validerFicheProjet(id, piloteId(authentication)));
    }

    @PutMapping("/fiches-projet/{id}/demander-correction")
    public ResponseEntity<?> demanderCorrectionFicheProjet(@PathVariable String id,
                                                           @Valid @RequestBody DemandeCorrectionRequest request,
                                                           Authentication authentication) {
        return decider(() -> validationFicheService.demanderCorrectionFicheProjet(
                id, request.getMotif(), piloteId(authentication)));
    }

    private static String piloteId(Authentication authentication) {
        return ((UserDetailsImpl) authentication.getPrincipal()).getId();
    }

    /** 404 si la fiche n'existe plus, 409 si son état ne permet plus la décision (un autre pilote a pu décider). */
    private ResponseEntity<?> decider(Supplier<Object> decision) {
        try {
            return ResponseEntity.ok(decision.get());
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(e.getMessage()));
        }
    }
}
