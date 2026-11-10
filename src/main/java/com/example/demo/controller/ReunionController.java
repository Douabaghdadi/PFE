package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.dto.ReunionRequest;
import com.example.demo.service.GoogleMeetService;
import com.example.demo.service.ReunionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;
import java.util.function.Supplier;

/** Réunions Google Meet. Ce que chacun voit et peut faire se décide dans {@link ReunionService}. */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class ReunionController {

    @Autowired
    private ReunionService reunionService;

    @GetMapping("/reunions")
    public ResponseEntity<?> lister(Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(reunionService.lister(authentication)));
    }

    @GetMapping("/reunions/participants")
    public ResponseEntity<?> participants(Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(reunionService.participantsPossibles(authentication)));
    }

    @GetMapping("/projets/{projetId}/reunions/equipe")
    public ResponseEntity<?> equipe(@PathVariable String projetId, Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(reunionService.equipeDuProjet(projetId, authentication)));
    }

    @PostMapping("/projets/{projetId}/reunions")
    public ResponseEntity<?> planifier(@PathVariable String projetId, @RequestBody ReunionRequest demande,
                                       Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(reunionService.planifier(projetId, demande, authentication)));
    }

    @PostMapping("/reunions")
    public ResponseEntity<?> planifierSansProjet(@RequestBody ReunionRequest demande, Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(reunionService.planifierSansProjet(demande, authentication)));
    }

    @DeleteMapping("/reunions/{id}")
    public ResponseEntity<?> annuler(@PathVariable String id, Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(reunionService.annuler(id, authentication)));
    }

    /** 404 si le projet ou la réunion n'existe plus, 403 hors droits, 400 ou 409 avec la raison, 503 si Google échoue. */
    private ResponseEntity<?> repondre(Supplier<ResponseEntity<?>> action) {
        try {
            return action.get();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new MessageResponse(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(e.getMessage()));
        } catch (GoogleMeetService.Indisponible e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new MessageResponse(e.getMessage()));
        }
    }
}
