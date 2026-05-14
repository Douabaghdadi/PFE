package com.example.demo.service;

import com.example.demo.dto.FicheSuiviRequest;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class FicheSuiviService {
    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;
    
    @Autowired
    private HistoriqueService historiqueService;

    public List<FicheSuivi> getAllFichesSuivi() {
        return ficheSuiviRepository.findAll();
    }

    public List<FicheSuivi> getFichesSuiviByProjet(String ficheProjetId) {
        return ficheSuiviRepository.findByFicheProjetId(ficheProjetId);
    }

    public List<FicheSuivi> getFichesSuiviByChefProjet(String chefProjetId) {
        return ficheSuiviRepository.findByChefProjetId(chefProjetId);
    }

    public String getProjetName(String ficheProjetId) {
        return ficheProjetRepository.findById(ficheProjetId)
                .map(FicheProjet::getNomProjet)
                .orElse("Projet supprimé");
    }

    public FicheSuivi getFicheSuiviById(String id) {
        FicheSuivi ficheSuivi = ficheSuiviRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche suivi not found"));
        
        // Synchroniser automatiquement les dates avec la fiche projet si elles sont null
        try {
            FicheProjet ficheProjet = ficheProjetRepository.findById(ficheSuivi.getFicheProjetId())
                    .orElse(null);

            if (ficheProjet != null && ficheSuivi.getFicheSignaletique() != null) {
                // S'assurer que l'objet delais existe
                if (ficheSuivi.getFicheSignaletique().getDelais() == null) {
                    ficheSuivi.getFicheSignaletique().setDelais(new FicheSuivi.DelaisInfo());
                }
                
                boolean updated = false;
                
                // Mettre à jour dateDebut si elle est null
                if (ficheSuivi.getFicheSignaletique().getDelais().getDateDebut() == null 
                    && ficheProjet.getDateDebut() != null) {
                    ficheSuivi.getFicheSignaletique().getDelais().setDateDebut(ficheProjet.getDateDebut());
                    updated = true;
                }
                
                // Mettre à jour dateFin si elle est null
                if (ficheSuivi.getFicheSignaletique().getDelais().getDateFin() == null 
                    && ficheProjet.getDateFinPrevue() != null) {
                    ficheSuivi.getFicheSignaletique().getDelais().setDateFin(ficheProjet.getDateFinPrevue());
                    updated = true;
                }
                
                if (updated) {
                    ficheSuivi.setDateModification(LocalDateTime.now());
                    ficheSuivi = ficheSuiviRepository.save(ficheSuivi);
                }
            }
        } catch (Exception e) {
            // En cas d'erreur, retourner la fiche suivi sans synchronisation
            System.err.println("Error synchronizing dates for fiche suivi " + id + ": " + e.getMessage());
        }
        
        return ficheSuivi;
    }

    public FicheSuivi createFicheSuivi(FicheSuiviRequest request, String chefProjetId) {
        // Vérifier que la fiche projet existe et appartient au chef de projet
        FicheProjet ficheProjet = ficheProjetRepository.findById(request.getFicheProjetId())
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));

        if (!ficheProjet.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only create follow-up for your own projects");
        }

        System.out.println("=== DEBUG: Creating FicheSuivi ===");
        System.out.println("FicheProjet ID: " + ficheProjet.getId());
        System.out.println("FicheProjet dateDebut: " + ficheProjet.getDateDebut());
        System.out.println("FicheProjet dateFinPrevue: " + ficheProjet.getDateFinPrevue());

        FicheSuivi ficheSuivi = new FicheSuivi();
        ficheSuivi.setFicheProjetId(request.getFicheProjetId());
        ficheSuivi.setNumeroRapport(request.getNumeroRapport());
        ficheSuivi.setDateRapport(request.getDateRapport());
        ficheSuivi.setFicheSignaletique(request.getFicheSignaletique());
        
        System.out.println("FicheSignaletique is null? " + (ficheSuivi.getFicheSignaletique() == null));
        
        // Initialiser les dates de début et de fin à partir de la fiche projet si elles ne sont pas définies
        if (ficheSuivi.getFicheSignaletique() != null) {
            System.out.println("Delais is null? " + (ficheSuivi.getFicheSignaletique().getDelais() == null));
            
            // S'assurer que l'objet delais existe
            if (ficheSuivi.getFicheSignaletique().getDelais() == null) {
                System.out.println("Creating new DelaisInfo object");
                ficheSuivi.getFicheSignaletique().setDelais(new FicheSuivi.DelaisInfo());
            }
            
            System.out.println("Before setting - dateDebut: " + ficheSuivi.getFicheSignaletique().getDelais().getDateDebut());
            System.out.println("Before setting - dateFin: " + ficheSuivi.getFicheSignaletique().getDelais().getDateFin());
            
            // Initialiser les dates
            if (ficheSuivi.getFicheSignaletique().getDelais().getDateDebut() == null) {
                ficheSuivi.getFicheSignaletique().getDelais().setDateDebut(ficheProjet.getDateDebut());
                System.out.println("Set dateDebut to: " + ficheProjet.getDateDebut());
            }
            if (ficheSuivi.getFicheSignaletique().getDelais().getDateFin() == null) {
                ficheSuivi.getFicheSignaletique().getDelais().setDateFin(ficheProjet.getDateFinPrevue());
                System.out.println("Set dateFin to: " + ficheProjet.getDateFinPrevue());
            }
            
            System.out.println("After setting - dateDebut: " + ficheSuivi.getFicheSignaletique().getDelais().getDateDebut());
            System.out.println("After setting - dateFin: " + ficheSuivi.getFicheSignaletique().getDelais().getDateFin());
        }
        
        ficheSuivi.setConstatGlobal(request.getConstatGlobal());
        ficheSuivi.setTachesSuivi(request.getTachesSuivi());
        ficheSuivi.setPlanningActuel(request.getPlanningActuel());
        ficheSuivi.setChefProjetId(chefProjetId);
        ficheSuivi.setDateCreation(LocalDateTime.now());
        ficheSuivi.setDateRemplissage(LocalDateTime.now());

        FicheSuivi saved = ficheSuiviRepository.save(ficheSuivi);
        
        // Enregistrer dans l'historique avec le projetId
        historiqueService.enregistrerCreation("FICHE_SUIVI", saved.getId(), chefProjetId, saved, request.getFicheProjetId(), saved.getNumeroRapport());
        
        // Mettre à jour les dates de suivi dans la fiche projet
        LocalDate today = LocalDate.now();
        ficheProjet.setDateDerniereFicheSuivi(today);
        ficheProjet.setDateProchaineFicheSuivi(today.plusMonths(1));
        ficheProjet.setDateModification(LocalDateTime.now());
        ficheProjetRepository.save(ficheProjet);
        
        System.out.println("Saved FicheSuivi - dateDebut: " + saved.getFicheSignaletique().getDelais().getDateDebut());
        System.out.println("Saved FicheSuivi - dateFin: " + saved.getFicheSignaletique().getDelais().getDateFin());
        System.out.println("=== END DEBUG ===");
        
        return saved;
    }

    public FicheSuivi updateFicheSuivi(String id, FicheSuiviRequest request, String chefProjetId) {
        FicheSuivi ficheSuivi = ficheSuiviRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche suivi not found"));

        // Vérifier que le chef de projet est le propriétaire
        if (!ficheSuivi.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only update your own follow-up files");
        }
        
        // IMPORTANT: Sauvegarder les anciennes valeurs AVANT toute modification
        java.util.Map<String, Object> anciennesValeurs = new java.util.HashMap<>();
        anciennesValeurs.put("numeroRapport", ficheSuivi.getNumeroRapport());
        anciennesValeurs.put("dateRapport", ficheSuivi.getDateRapport());
        
        // Fiche Signalétique
        if (ficheSuivi.getFicheSignaletique() != null) {
            if (ficheSuivi.getFicheSignaletique().getChefProjet() != null) {
                anciennesValeurs.put("chefProjet", ficheSuivi.getFicheSignaletique().getChefProjet().getNom());
            }
            anciennesValeurs.put("descriptionProjet", ficheSuivi.getFicheSignaletique().getDescriptionProjet());
            anciennesValeurs.put("experts", ficheSuivi.getFicheSignaletique().getExperts());
            anciennesValeurs.put("caracteristiquesTechniques", ficheSuivi.getFicheSignaletique().getCaracteristiquesTechniques());
        }
        
        // Constat Global
        if (ficheSuivi.getConstatGlobal() != null) {
            anciennesValeurs.put("etatAvancement", ficheSuivi.getConstatGlobal().getEtatAvancement());
            anciennesValeurs.put("objectifPrincipal", ficheSuivi.getConstatGlobal().getObjectifPrincipal());
            anciennesValeurs.put("problemesRencontres", ficheSuivi.getConstatGlobal().getProblemesRencontres());
            anciennesValeurs.put("principauxRisques", ficheSuivi.getConstatGlobal().getPrincipauxRisques());
            anciennesValeurs.put("recommandations", ficheSuivi.getConstatGlobal().getRecommandations());
        }
        
        // Tâches de suivi
        if (ficheSuivi.getTachesSuivi() != null) {
            anciennesValeurs.put("nombreTaches", ficheSuivi.getTachesSuivi().size());
        }
        
        // Planning actuel
        if (ficheSuivi.getPlanningActuel() != null && ficheSuivi.getPlanningActuel().getTaches() != null) {
            anciennesValeurs.put("nombreTachesPlanning", ficheSuivi.getPlanningActuel().getTaches().size());
        }
        
        System.out.println("=== DEBUG UPDATE FICHE SUIVI ===");
        System.out.println("Anciennes valeurs capturées: " + anciennesValeurs.size() + " champs");

        // Récupérer la fiche projet pour les dates
        FicheProjet ficheProjet = ficheProjetRepository.findById(ficheSuivi.getFicheProjetId())
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));

        // Maintenant on peut modifier
        ficheSuivi.setNumeroRapport(request.getNumeroRapport());
        ficheSuivi.setDateRapport(request.getDateRapport());
        ficheSuivi.setFicheSignaletique(request.getFicheSignaletique());
        
        // Initialiser les dates de début et de fin à partir de la fiche projet si elles ne sont pas définies
        if (ficheSuivi.getFicheSignaletique() != null) {
            // S'assurer que l'objet delais existe
            if (ficheSuivi.getFicheSignaletique().getDelais() == null) {
                ficheSuivi.getFicheSignaletique().setDelais(new FicheSuivi.DelaisInfo());
            }
            
            // Initialiser les dates
            if (ficheSuivi.getFicheSignaletique().getDelais().getDateDebut() == null) {
                ficheSuivi.getFicheSignaletique().getDelais().setDateDebut(ficheProjet.getDateDebut());
            }
            if (ficheSuivi.getFicheSignaletique().getDelais().getDateFin() == null) {
                ficheSuivi.getFicheSignaletique().getDelais().setDateFin(ficheProjet.getDateFinPrevue());
            }
        }
        
        ficheSuivi.setConstatGlobal(request.getConstatGlobal());
        ficheSuivi.setTachesSuivi(request.getTachesSuivi());
        ficheSuivi.setPlanningActuel(request.getPlanningActuel());
        ficheSuivi.setDateModification(LocalDateTime.now());

        FicheSuivi updated = ficheSuiviRepository.save(ficheSuivi);
        
        // Capturer les nouvelles valeurs APRÈS modification
        java.util.Map<String, Object> nouvellesValeurs = new java.util.HashMap<>();
        nouvellesValeurs.put("numeroRapport", updated.getNumeroRapport());
        nouvellesValeurs.put("dateRapport", updated.getDateRapport());
        
        // Fiche Signalétique
        if (updated.getFicheSignaletique() != null) {
            if (updated.getFicheSignaletique().getChefProjet() != null) {
                nouvellesValeurs.put("chefProjet", updated.getFicheSignaletique().getChefProjet().getNom());
            }
            nouvellesValeurs.put("descriptionProjet", updated.getFicheSignaletique().getDescriptionProjet());
            nouvellesValeurs.put("experts", updated.getFicheSignaletique().getExperts());
            nouvellesValeurs.put("caracteristiquesTechniques", updated.getFicheSignaletique().getCaracteristiquesTechniques());
        }
        
        // Constat Global
        if (updated.getConstatGlobal() != null) {
            nouvellesValeurs.put("etatAvancement", updated.getConstatGlobal().getEtatAvancement());
            nouvellesValeurs.put("objectifPrincipal", updated.getConstatGlobal().getObjectifPrincipal());
            nouvellesValeurs.put("problemesRencontres", updated.getConstatGlobal().getProblemesRencontres());
            nouvellesValeurs.put("principauxRisques", updated.getConstatGlobal().getPrincipauxRisques());
            nouvellesValeurs.put("recommandations", updated.getConstatGlobal().getRecommandations());
        }
        
        // Tâches de suivi
        if (updated.getTachesSuivi() != null) {
            nouvellesValeurs.put("nombreTaches", updated.getTachesSuivi().size());
        }
        
        // Planning actuel
        if (updated.getPlanningActuel() != null && updated.getPlanningActuel().getTaches() != null) {
            nouvellesValeurs.put("nombreTachesPlanning", updated.getPlanningActuel().getTaches().size());
        }
        
        System.out.println("Nouvelles valeurs capturées: " + nouvellesValeurs.size() + " champs");
        System.out.println("=== END DEBUG ===");
        
        // Enregistrer dans l'historique avec le projetId
        historiqueService.enregistrerModification("FICHE_SUIVI", id, chefProjetId, anciennesValeurs, nouvellesValeurs, ficheSuivi.getFicheProjetId(), updated.getNumeroRapport());
        
        return updated;
    }

    public void deleteFicheSuivi(String id, String chefProjetId) {
        FicheSuivi ficheSuivi = ficheSuiviRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche suivi not found"));

        // Vérifier que le chef de projet est le propriétaire
        if (!ficheSuivi.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only delete your own follow-up files");
        }
        
        // Enregistrer dans l'historique avant suppression avec le projetId
        historiqueService.enregistrerSuppression("FICHE_SUIVI", id, chefProjetId, ficheSuivi.getFicheProjetId(), ficheSuivi.getNumeroRapport());

        ficheSuiviRepository.deleteById(id);
    }

    /**
     * Synchronise les dates de début et de fin de toutes les fiches de suivi
     * avec les dates de leur fiche projet associée
     */
    public int synchronizeDatesFromFicheProjet() {
        List<FicheSuivi> allFichesSuivi = ficheSuiviRepository.findAll();
        int updatedCount = 0;

        for (FicheSuivi ficheSuivi : allFichesSuivi) {
            try {
                FicheProjet ficheProjet = ficheProjetRepository.findById(ficheSuivi.getFicheProjetId())
                        .orElse(null);

                if (ficheProjet != null && ficheSuivi.getFicheSignaletique() != null) {
                    // S'assurer que l'objet delais existe
                    if (ficheSuivi.getFicheSignaletique().getDelais() == null) {
                        ficheSuivi.getFicheSignaletique().setDelais(new FicheSuivi.DelaisInfo());
                    }
                    
                    boolean updated = false;
                    
                    // Mettre à jour dateDebut si elle est null
                    if (ficheSuivi.getFicheSignaletique().getDelais().getDateDebut() == null 
                        && ficheProjet.getDateDebut() != null) {
                        ficheSuivi.getFicheSignaletique().getDelais().setDateDebut(ficheProjet.getDateDebut());
                        updated = true;
                    }
                    
                    // Mettre à jour dateFin si elle est null
                    if (ficheSuivi.getFicheSignaletique().getDelais().getDateFin() == null 
                        && ficheProjet.getDateFinPrevue() != null) {
                        ficheSuivi.getFicheSignaletique().getDelais().setDateFin(ficheProjet.getDateFinPrevue());
                        updated = true;
                    }
                    
                    if (updated) {
                        ficheSuivi.setDateModification(LocalDateTime.now());
                        ficheSuiviRepository.save(ficheSuivi);
                        updatedCount++;
                    }
                }
            } catch (Exception e) {
                // Continuer avec la prochaine fiche en cas d'erreur
                System.err.println("Error synchronizing fiche suivi " + ficheSuivi.getId() + ": " + e.getMessage());
            }
        }

        return updatedCount;
    }
}
