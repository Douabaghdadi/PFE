package com.example.demo.service;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.StatutValidation;
import com.example.demo.model.User;
import com.example.demo.model.ValidationFiche;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Décisions du pilote qualité sur les fiches : valider ou demander une correction.
 * Chaque décision est enregistrée dans la fiche, tracée dans l'historique et notifiée au chef de projet.
 */
@Service
public class ValidationFicheService {

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private HistoriqueService historiqueService;

    @Autowired
    private UserNotificationService userNotificationService;

    public FicheSuivi validerFicheSuivi(String id, String piloteId) {
        FicheSuivi fiche = ficheSuiviRepository.findById(id).orElseThrow();
        StatutValidation avant = fiche.getValidation().getStatut();
        fiche.getValidation().valider(piloteId, nomDuPilote(piloteId));
        FicheSuivi enregistree = ficheSuiviRepository.save(fiche);
        suiteDecision(cibleSuivi(enregistree), avant, enregistree.getValidation());
        return enregistree;
    }

    public FicheSuivi demanderCorrectionFicheSuivi(String id, String motif, String piloteId) {
        FicheSuivi fiche = ficheSuiviRepository.findById(id).orElseThrow();
        StatutValidation avant = fiche.getValidation().getStatut();
        fiche.getValidation().demanderCorrection(motif.trim(), piloteId, nomDuPilote(piloteId));
        FicheSuivi enregistree = ficheSuiviRepository.save(fiche);
        suiteDecision(cibleSuivi(enregistree), avant, enregistree.getValidation());
        return enregistree;
    }

    public FicheProjet validerFicheProjet(String id, String piloteId) {
        FicheProjet fiche = ficheProjetRepository.findById(id).orElseThrow();
        StatutValidation avant = fiche.getValidation().getStatut();
        fiche.getValidation().valider(piloteId, nomDuPilote(piloteId));
        FicheProjet enregistree = ficheProjetRepository.save(fiche);
        suiteDecision(cibleProjet(enregistree), avant, enregistree.getValidation());
        return enregistree;
    }

    public FicheProjet demanderCorrectionFicheProjet(String id, String motif, String piloteId) {
        FicheProjet fiche = ficheProjetRepository.findById(id).orElseThrow();
        StatutValidation avant = fiche.getValidation().getStatut();
        fiche.getValidation().demanderCorrection(motif.trim(), piloteId, nomDuPilote(piloteId));
        FicheProjet enregistree = ficheProjetRepository.save(fiche);
        suiteDecision(cibleProjet(enregistree), avant, enregistree.getValidation());
        return enregistree;
    }

    /** Ce qu'il faut savoir d'une fiche, quel que soit son type, pour tracer et notifier la décision. */
    private record Cible(String entityType, String entityId, String projetId, String entityName,
                         String chefProjetId, String nomProjet) {
    }

    private Cible cibleSuivi(FicheSuivi fiche) {
        String nomProjet = ficheProjetRepository.findById(fiche.getFicheProjetId())
                .map(FicheProjet::getNomProjet)
                .orElse("Projet supprimé");
        return new Cible("FICHE_SUIVI", fiche.getId(), fiche.getFicheProjetId(), fiche.getNumeroRapport(),
                fiche.getChefProjetId(), nomProjet);
    }

    private Cible cibleProjet(FicheProjet fiche) {
        return new Cible("FICHE_PROJET", fiche.getId(), fiche.getId(), fiche.getNomProjet(),
                fiche.getChefProjetId(), fiche.getNomProjet());
    }

    private void suiteDecision(Cible cible, StatutValidation avant, ValidationFiche validation) {
        boolean validee = validation.getStatut() == StatutValidation.VALIDEE;

        Map<String, Object> anciennesValeurs = new HashMap<>();
        anciennesValeurs.put("statutValidation", avant.getLibelle());
        Map<String, Object> nouvellesValeurs = new HashMap<>();
        nouvellesValeurs.put("statutValidation", validation.getStatut().getLibelle());
        if (!validee) {
            nouvellesValeurs.put("motif", validation.getMotif());
        }

        historiqueService.enregistrerAction(cible.entityType(), cible.entityId(), validation.getPiloteId(),
                validee ? "VALIDATION" : "DEMANDE_CORRECTION",
                validee ? "Fiche validée" : "Correction demandée : " + validation.getMotif(),
                anciennesValeurs, nouvellesValeurs, cible.projetId(), cible.entityName());

        userNotificationService.createValidationNotification(cible.chefProjetId(), cible.entityId(), cible.entityType(),
                cible.nomProjet(), validation);
    }

    /** Nom d'utilisateur du pilote : celui que l'application affiche dans la barre de navigation et dans l'historique. */
    private String nomDuPilote(String piloteId) {
        return userRepository.findById(piloteId)
                .map(User::getUsername)
                .orElse("Le pilote qualité");
    }
}
