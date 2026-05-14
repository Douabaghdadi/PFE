package com.example.demo.controller;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.HistoriqueModification;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.HistoriqueModificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/migration")
@PreAuthorize("hasRole('ADMIN') or hasRole('CHEF_PROJET')")
public class MigrationController {
    
    @Autowired
    private HistoriqueModificationRepository historiqueRepository;
    
    @Autowired
    private FicheProjetRepository ficheProjetRepository;
    
    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    /**
     * Migrer les entityName pour les entrées d'historique existantes
     */
    @PostMapping("/historique-entity-names")
    public ResponseEntity<String> migrateHistoriqueEntityNames() {
        List<HistoriqueModification> historique = historiqueRepository.findAll();
        int updated = 0;
        int notFound = 0;
        
        for (HistoriqueModification item : historique) {
            // Ne mettre à jour que si entityName est null
            if (item.getEntityName() == null) {
                try {
                    if ("FICHE_PROJET".equals(item.getEntityType())) {
                        FicheProjet projet = ficheProjetRepository.findById(item.getEntityId()).orElse(null);
                        if (projet != null) {
                            item.setEntityName(projet.getNomProjet());
                            historiqueRepository.save(item);
                            updated++;
                        } else {
                            notFound++;
                        }
                    } else if ("FICHE_SUIVI".equals(item.getEntityType())) {
                        FicheSuivi fiche = ficheSuiviRepository.findById(item.getEntityId()).orElse(null);
                        if (fiche != null) {
                            item.setEntityName(fiche.getNumeroRapport());
                            historiqueRepository.save(item);
                            updated++;
                        } else {
                            notFound++;
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Erreur lors de la migration de l'item " + item.getId() + ": " + e.getMessage());
                }
            }
        }
        
        String message = String.format("Migration terminée: %d entrées mises à jour, %d entités non trouvées", updated, notFound);
        return ResponseEntity.ok(message);
    }
}
