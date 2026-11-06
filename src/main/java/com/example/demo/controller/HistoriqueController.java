package com.example.demo.controller;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.HistoriqueModification;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.HistoriqueService;
import com.example.demo.service.UserNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/historique")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class HistoriqueController {
    
    @Autowired
    private HistoriqueService historiqueService;

    @Autowired
    private UserNotificationService userNotificationService;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private ControleAcces controleAcces;

    /**
     * Récupère l'historique d'une entité spécifique
     */
    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<List<HistoriqueModification>> getHistoriqueByEntity(
            @PathVariable String entityType,
            @PathVariable String entityId,
            Authentication authentication) {
        if (!peutLireEntite(entityType, entityId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<HistoriqueModification> historique = historiqueService.getHistoriqueByEntity(entityType, entityId);
        return ResponseEntity.ok(historique);
    }

    /**
     * Récupère l'historique complet d'un projet (fiche projet + toutes les fiches de suivi liées)
     */
    @GetMapping("/projet/{projetId}/complet")
    public ResponseEntity<List<HistoriqueModification>> getHistoriqueCompletProjet(
            @PathVariable String projetId, Authentication authentication) {
        if (!peutLireProjet(projetId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<HistoriqueModification> historique = historiqueService.getHistoriqueCompletProjet(projetId);

        if (authentication != null) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof UserDetailsImpl) {
                UserDetailsImpl userDetails = (UserDetailsImpl) principal;
                boolean isPilote = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_PILOTE_QUALITE"));
                if (isPilote) {
                    ficheProjetRepository.findById(projetId).ifPresent(ficheProjet -> {
                        if (ficheProjet.getChefProjetId() != null) {
                            userNotificationService.createViewNotification(
                                projetId,
                                "HISTORIQUE_PROJET",
                                ficheProjet.getNomProjet(),
                                userDetails.getId(),
                                ficheProjet.getChefProjetId()
                            );
                        }
                    });
                }
            }
        }

        return ResponseEntity.ok(historique);
    }

    /**
     * Récupère l'historique des modifications d'un utilisateur
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<HistoriqueModification>> getHistoriqueByUser(@PathVariable String userId,
                                                                            Authentication authentication) {
        if (!controleAcces.estSuperviseur(authentication) && !controleAcces.estUtilisateur(userId, authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        List<HistoriqueModification> historique = historiqueService.getHistoriqueByUser(userId);
        return ResponseEntity.ok(historique);
    }

    private boolean peutLireProjet(String projetId, Authentication authentication) {
        return controleAcces.estSuperviseur(authentication) || ficheProjetRepository.findById(projetId)
                .map(projet -> controleAcces.peutLire(projet.getChefProjetId(), authentication))
                .orElse(false);
    }

    private boolean peutLireEntite(String entityType, String entityId, Authentication authentication) {
        if (controleAcces.estSuperviseur(authentication)) {
            return true;
        }
        if ("FICHE_PROJET".equals(entityType)) {
            return peutLireProjet(entityId, authentication);
        }
        return "FICHE_SUIVI".equals(entityType) && ficheSuiviRepository.findById(entityId)
                .map(fiche -> controleAcces.peutLire(fiche.getChefProjetId(), authentication))
                .orElse(false);
    }
}
