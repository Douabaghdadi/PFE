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
        return ficheSuiviRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche suivi not found"));
    }

    public FicheSuivi createFicheSuivi(FicheSuiviRequest request, String chefProjetId) {
        // Vérifier que la fiche projet existe et appartient au chef de projet
        FicheProjet ficheProjet = ficheProjetRepository.findById(request.getFicheProjetId())
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));

        if (!ficheProjet.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only create follow-up for your own projects");
        }

        FicheSuivi ficheSuivi = new FicheSuivi();
        ficheSuivi.setFicheProjetId(request.getFicheProjetId());
        ficheSuivi.setNumeroRapport(request.getNumeroRapport());
        ficheSuivi.setDateRapport(request.getDateRapport());
        ficheSuivi.setFicheSignaletique(request.getFicheSignaletique());
        ficheSuivi.setConstatGlobal(request.getConstatGlobal());
        ficheSuivi.setTachesSuivi(request.getTachesSuivi());
        ficheSuivi.setPlanningActuel(request.getPlanningActuel());
        ficheSuivi.setChefProjetId(chefProjetId);
        ficheSuivi.setDateCreation(LocalDateTime.now());

        return ficheSuiviRepository.save(ficheSuivi);
    }

    public FicheSuivi updateFicheSuivi(String id, FicheSuiviRequest request, String chefProjetId) {
        FicheSuivi ficheSuivi = ficheSuiviRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche suivi not found"));

        // Vérifier que le chef de projet est le propriétaire
        if (!ficheSuivi.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only update your own follow-up files");
        }

        ficheSuivi.setNumeroRapport(request.getNumeroRapport());
        ficheSuivi.setDateRapport(request.getDateRapport());
        ficheSuivi.setFicheSignaletique(request.getFicheSignaletique());
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
}
