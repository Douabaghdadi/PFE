package com.example.demo.controller;

import com.example.demo.model.HistoriqueModification;
import com.example.demo.service.HistoriqueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/historique")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class HistoriqueController {
    
    @Autowired
    private HistoriqueService historiqueService;

    /**
     * Récupère l'historique d'une entité spécifique
     */
    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<List<HistoriqueModification>> getHistoriqueByEntity(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        List<HistoriqueModification> historique = historiqueService.getHistoriqueByEntity(entityType, entityId);
        return ResponseEntity.ok(historique);
    }

    /**
     * Récupère l'historique complet d'un projet (fiche projet + toutes les fiches de suivi liées)
     */
    @GetMapping("/projet/{projetId}/complet")
    public ResponseEntity<List<HistoriqueModification>> getHistoriqueCompletProjet(
            @PathVariable String projetId) {
        List<HistoriqueModification> historique = historiqueService.getHistoriqueCompletProjet(projetId);
        return ResponseEntity.ok(historique);
    }

    /**
     * Récupère l'historique des modifications d'un utilisateur
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<HistoriqueModification>> getHistoriqueByUser(@PathVariable String userId) {
        List<HistoriqueModification> historique = historiqueService.getHistoriqueByUser(userId);
        return ResponseEntity.ok(historique);
    }
}
