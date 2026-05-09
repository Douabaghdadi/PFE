package com.example.demo.service;

import com.example.demo.dto.FicheProjetRequest;
import com.example.demo.dto.ProjetSuiviStatusDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.repository.FicheProjetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class FicheProjetService {
    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    public List<FicheProjet> getAllFichesProjet() {
        return ficheProjetRepository.findAll();
    }

    public List<FicheProjet> getFichesProjetByChefProjet(String chefProjetId) {
        return ficheProjetRepository.findByChefProjetId(chefProjetId);
    }

    public FicheProjet getFicheProjetById(String id) {
        return ficheProjetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));
    }

    public FicheProjet createFicheProjet(FicheProjetRequest request, String chefProjetId) {
        FicheProjet ficheProjet = new FicheProjet();
        
        // Champs de base
        ficheProjet.setNomProjet(request.getNomProjet());
        ficheProjet.setDesignationProjet(request.getDesignationProjet());
        ficheProjet.setDesignationClient(request.getDesignationClient());
        
        // Section 1: Identification
        ficheProjet.setCadreContractuelProjet(request.getCadreContractuelProjet());
        ficheProjet.setCaractereProjet(request.getCaractereProjet());
        ficheProjet.setTypeProjet(request.getTypeProjet());
        
        // Section 2: Présentation
        ficheProjet.setPresentation(request.getPresentation());
        
        // Section 3: Historique
        ficheProjet.setHistorique(request.getHistorique());
        
        // Section 4: Périmètre
        ficheProjet.setPerimetre(request.getPerimetre());
        
        // Section 5: Organisation et conduite de projet
        ficheProjet.setMaitreOuvrage(request.getMaitreOuvrage());
        ficheProjet.setMaitreOeuvre(request.getMaitreOeuvre());
        ficheProjet.setEquipeProjet(request.getEquipeProjet());
        
        // Section 6: Estimation des charges
        ficheProjet.setEstimationsCharges(request.getEstimationsCharges());
        ficheProjet.setModaliteDeveloppement(request.getModaliteDeveloppement());
        
        // Section 7: Estimation du budget
        ficheProjet.setEstimationBudget(request.getEstimationBudget());
        
        // Section 8: Délais prévisionnels
        ficheProjet.setDelaisPrevisionnels(request.getDelaisPrevisionnels());
        
        // Section 9: Risques potentiels
        ficheProjet.setRisquesPotentiels(request.getRisquesPotentiels());
        
        // Section 10: Pré-requis
        ficheProjet.setPreRequis(request.getPreRequis());
        
        // Planning
        ficheProjet.setPlanning(request.getPlanning());
        
        // Champs existants
        ficheProjet.setDescription(request.getDescription());
        ficheProjet.setObjectifs(request.getObjectifs());
        ficheProjet.setResponsable(request.getResponsable());
        ficheProjet.setDateDebut(request.getDateDebut());
        ficheProjet.setDateFinPrevue(request.getDateFinPrevue());
        ficheProjet.setStatut(request.getStatut() != null ? request.getStatut() : "EN_COURS");
        ficheProjet.setCategorie(request.getCategorie());
        ficheProjet.setChefProjetId(chefProjetId);
        
        // Métadonnées
        ficheProjet.setReference(request.getReference());
        ficheProjet.setDateDocument(request.getDateDocument());
        ficheProjet.setDateCreation(LocalDateTime.now());

        return ficheProjetRepository.save(ficheProjet);
    }

    public FicheProjet updateFicheProjet(String id, FicheProjetRequest request, String chefProjetId) {
        FicheProjet ficheProjet = ficheProjetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));

        // Vérifier que le chef de projet est le propriétaire
        if (!ficheProjet.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only update your own project files");
        }

        // Champs de base
        ficheProjet.setNomProjet(request.getNomProjet());
        ficheProjet.setDesignationProjet(request.getDesignationProjet());
        ficheProjet.setDesignationClient(request.getDesignationClient());
        
        // Section 1: Identification
        ficheProjet.setCadreContractuelProjet(request.getCadreContractuelProjet());
        ficheProjet.setCaractereProjet(request.getCaractereProjet());
        ficheProjet.setTypeProjet(request.getTypeProjet());
        
        // Section 2: Présentation
        ficheProjet.setPresentation(request.getPresentation());
        
        // Section 3: Historique
        ficheProjet.setHistorique(request.getHistorique());
        
        // Section 4: Périmètre
        ficheProjet.setPerimetre(request.getPerimetre());
        
        // Section 5: Organisation et conduite de projet
        ficheProjet.setMaitreOuvrage(request.getMaitreOuvrage());
        ficheProjet.setMaitreOeuvre(request.getMaitreOeuvre());
        ficheProjet.setEquipeProjet(request.getEquipeProjet());
        
        // Section 6: Estimation des charges
        ficheProjet.setEstimationsCharges(request.getEstimationsCharges());
        ficheProjet.setModaliteDeveloppement(request.getModaliteDeveloppement());
        
        // Section 7: Estimation du budget
        ficheProjet.setEstimationBudget(request.getEstimationBudget());
        
        // Section 8: Délais prévisionnels
        ficheProjet.setDelaisPrevisionnels(request.getDelaisPrevisionnels());
        
        // Section 9: Risques potentiels
        ficheProjet.setRisquesPotentiels(request.getRisquesPotentiels());
        
        // Section 10: Pré-requis
        ficheProjet.setPreRequis(request.getPreRequis());
        
        // Planning
        ficheProjet.setPlanning(request.getPlanning());
        
        // Champs existants
        ficheProjet.setDescription(request.getDescription());
        ficheProjet.setObjectifs(request.getObjectifs());
        ficheProjet.setResponsable(request.getResponsable());
        ficheProjet.setDateDebut(request.getDateDebut());
        ficheProjet.setDateFinPrevue(request.getDateFinPrevue());
        ficheProjet.setStatut(request.getStatut());
        ficheProjet.setCategorie(request.getCategorie());
        
        // Métadonnées
        ficheProjet.setReference(request.getReference());
        ficheProjet.setDateDocument(request.getDateDocument());
        ficheProjet.setDateModification(LocalDateTime.now());

        return ficheProjetRepository.save(ficheProjet);
    }

    public void deleteFicheProjet(String id, String chefProjetId) {
        FicheProjet ficheProjet = ficheProjetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche projet not found"));

        // Vérifier que le chef de projet est le propriétaire
        if (!ficheProjet.getChefProjetId().equals(chefProjetId)) {
            throw new RuntimeException("Unauthorized: You can only delete your own project files");
        }

        ficheProjetRepository.deleteById(id);
    }

    public List<FicheProjet> getFichesProjetByStatut(String statut) {
        return ficheProjetRepository.findByStatut(statut);
    }

    public List<FicheProjet> getFichesProjetByCategorie(String categorie) {
        return ficheProjetRepository.findByCategorie(categorie);
    }

    public List<ProjetSuiviStatusDTO> getProjetsSuiviStatus() {
        List<FicheProjet> projets = ficheProjetRepository.findAll();
        List<ProjetSuiviStatusDTO> statusList = new ArrayList<>();
        LocalDate today = LocalDate.now();

        for (FicheProjet projet : projets) {
            // Ignorer les projets terminés ou annulés
            if (projet.getStatut() != null && 
                (projet.getStatut().equals("TERMINE") || projet.getStatut().equals("ANNULE"))) {
                continue;
            }

            ProjetSuiviStatusDTO status = new ProjetSuiviStatusDTO();
            status.setProjetId(projet.getId());
            status.setNomProjet(projet.getNomProjet());
            status.setDateDerniereFicheSuivi(projet.getDateDerniereFicheSuivi());
            status.setDateProchaineFicheSuivi(projet.getDateProchaineFicheSuivi());

            // Vérifier si la fiche de suivi est en retard
            if (projet.getDateProchaineFicheSuivi() != null && 
                today.isAfter(projet.getDateProchaineFicheSuivi())) {
                status.setFicheSuiviEnRetard(true);
                status.setJoursRetard((int) ChronoUnit.DAYS.between(projet.getDateProchaineFicheSuivi(), today));
                statusList.add(status);
            }
        }

        return statusList;
    }

    public int initializeSuiviDates() {
        List<FicheProjet> projets = ficheProjetRepository.findAll();
        int count = 0;

        for (FicheProjet projet : projets) {
            // Ignorer les projets terminés ou annulés
            if (projet.getStatut() != null && 
                (projet.getStatut().equals("TERMINE") || projet.getStatut().equals("ANNULE"))) {
                continue;
            }

            // Si les dates ne sont pas déjà définies
            if (projet.getDateDerniereFicheSuivi() == null || projet.getDateProchaineFicheSuivi() == null) {
                // Utiliser la date de début du projet comme date de dernière fiche
                LocalDate dateRef = projet.getDateDebut() != null ? projet.getDateDebut() : LocalDate.now();
                projet.setDateDerniereFicheSuivi(dateRef);
                projet.setDateProchaineFicheSuivi(dateRef.plusMonths(1));
                projet.setDateModification(LocalDateTime.now());
                ficheProjetRepository.save(projet);
                count++;
            }
        }

        return count;
    }
}
