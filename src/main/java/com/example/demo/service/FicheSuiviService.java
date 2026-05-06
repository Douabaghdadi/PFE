package com.example.demo.service;

import com.example.demo.dto.FicheSuiviRequest;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class FicheSuiviService {
    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    public List<FicheSuivi> getAllFichesSuivi() {
        return ficheSuiviRepository.findAll();
    }

    public List<FicheSuivi> getFichesSuiviByProjet(String ficheProjetId) {
        return ficheSuiviRepository.findByFicheProjetId(ficheProjetId);
    }

    public List<FicheSuivi> getFichesSuiviByChefProjet(String chefProjetId) {
        return ficheSuiviRepository.findByChefProjetId(chefProjetId);
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

        FicheSuivi saved = ficheSuiviRepository.save(ficheSuivi);
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

        // Récupérer la fiche projet pour les dates
        FicheProjet ficheProjet = ficheProjetRepository.findById(ficheSuivi.getFicheProjetId())
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));

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

        return ficheSuiviRepository.save(ficheSuivi);
    }

    public void deleteFicheSuivi(String id, String chefProjetId) {
        FicheSuivi ficheSuivi = ficheSuiviRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche suivi not found"));

        // Vérifier que le chef de projet est le propriétaire
        if (!ficheSuivi.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only delete your own follow-up files");
        }

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
