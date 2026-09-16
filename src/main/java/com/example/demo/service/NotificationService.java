package com.example.demo.service;

import com.example.demo.dto.ProjetSuiviStatusDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private FicheProjetService ficheProjetService;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    /**
     * Envoie des notifications par email à tous les chefs de projet en retard
     */
    public NotificationResult sendRemindersToAllLateChefs() {
        List<ProjetSuiviStatusDTO> lateProjects = ficheProjetService.getProjetsSuiviStatus();
        int emailsSent = 0;

        for (ProjetSuiviStatusDTO status : lateProjects) {
            try {
                NotificationResult result = sendReminderForProjet(status.getProjetId());
                emailsSent += result.getEmailsSent();
            } catch (Exception e) {
                System.err.println("Erreur lors de l'envoi de la notification pour le projet " + 
                    status.getProjetId() + ": " + e.getMessage());
            }
        }

        return new NotificationResult(emailsSent);
    }

    /**
     * Envoie une notification par email pour un projet spécifique
     */
    public NotificationResult sendReminderForProjet(String projetId) {
        FicheProjet projet = ficheProjetRepository.findById(projetId)
            .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        User chefProjet = userRepository.findById(projet.getChefProjetId())
            .orElseThrow(() -> new RuntimeException("Chef de projet non trouvé"));

        // Calculer le nombre de jours de retard
        List<ProjetSuiviStatusDTO> statusList = ficheProjetService.getProjetsSuiviStatus();
        ProjetSuiviStatusDTO status = statusList.stream()
            .filter(s -> s.getProjetId().equals(projetId))
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Statut du projet non trouvé"));

        int emailsSent = 0;

        // Vérifier qu'un moyen de contact existe
        if (chefProjet.getEmail() == null || chefProjet.getEmail().isEmpty()) {
            throw new RuntimeException("Le chef de projet n'a pas d'adresse email");
        }

        // Envoyer l'email
        try {
            emailService.sendFicheSuiviReminderEmail(
                chefProjet.getEmail(),
                chefProjet.getUsername(),
                projet.getNomProjet(),
                status.getJoursRetard()
            );
            emailsSent = 1;
            System.out.println("Email envoyé avec succès pour le projet: " + projet.getNomProjet());
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email: " + e.getMessage());
            // Ne pas lancer d'exception
        }

        return new NotificationResult(emailsSent);
    }

    /**
     * Récupère la liste des projets en retard avec les informations des chefs de projet
     */
    public List<NotificationInfo> getLateProjectsWithChefInfo() {
        List<ProjetSuiviStatusDTO> lateProjects = ficheProjetService.getProjetsSuiviStatus();
        List<NotificationInfo> notifications = new ArrayList<>();

        for (ProjetSuiviStatusDTO status : lateProjects) {
            try {
                FicheProjet projet = ficheProjetRepository.findById(status.getProjetId()).orElse(null);
                if (projet == null) continue;

                User chefProjet = userRepository.findById(projet.getChefProjetId()).orElse(null);
                if (chefProjet == null) continue;

                NotificationInfo info = new NotificationInfo();
                info.setProjetId(projet.getId());
                info.setProjetName(projet.getNomProjet());
                info.setChefProjetId(chefProjet.getId());
                info.setChefProjetName(chefProjet.getUsername());
                info.setChefProjetEmail(chefProjet.getEmail());
                info.setJoursRetard(status.getJoursRetard());
                info.setDateProchaineFicheSuivi(status.getDateProchaineFicheSuivi());

                notifications.add(info);
            } catch (Exception e) {
                System.err.println("Erreur lors de la récupération des infos pour le projet " + 
                    status.getProjetId() + ": " + e.getMessage());
            }
        }

        return notifications;
    }

    public static class NotificationInfo {
        private String projetId;
        private String projetName;
        private String chefProjetId;
        private String chefProjetName;
        private String chefProjetEmail;
        private int joursRetard;
        private java.time.LocalDate dateProchaineFicheSuivi;

        // Getters and Setters
        public String getProjetId() { return projetId; }
        public void setProjetId(String projetId) { this.projetId = projetId; }

        public String getProjetName() { return projetName; }
        public void setProjetName(String projetName) { this.projetName = projetName; }

        public String getChefProjetId() { return chefProjetId; }
        public void setChefProjetId(String chefProjetId) { this.chefProjetId = chefProjetId; }

        public String getChefProjetName() { return chefProjetName; }
        public void setChefProjetName(String chefProjetName) { this.chefProjetName = chefProjetName; }

        public String getChefProjetEmail() { return chefProjetEmail; }
        public void setChefProjetEmail(String chefProjetEmail) { this.chefProjetEmail = chefProjetEmail; }

        public int getJoursRetard() { return joursRetard; }
        public void setJoursRetard(int joursRetard) { this.joursRetard = joursRetard; }

        public java.time.LocalDate getDateProchaineFicheSuivi() { return dateProchaineFicheSuivi; }
        public void setDateProchaineFicheSuivi(java.time.LocalDate dateProchaineFicheSuivi) { 
            this.dateProchaineFicheSuivi = dateProchaineFicheSuivi; 
        }
    }

    public static class NotificationResult {
        private int emailsSent;

        public NotificationResult(int emailsSent) {
            this.emailsSent = emailsSent;
        }

        public int getEmailsSent() { return emailsSent; }
        public void setEmailsSent(int emailsSent) { this.emailsSent = emailsSent; }
    }
}
