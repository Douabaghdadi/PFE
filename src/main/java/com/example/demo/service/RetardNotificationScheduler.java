package com.example.demo.service;

import com.example.demo.dto.ProjetSuiviStatusDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;

import java.util.List;

@Service
public class RetardNotificationScheduler {

    @Autowired
    private FicheProjetService ficheProjetService;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private SmsService smsService;

    /**
     * Vérification au démarrage de l'application
     */
    @PostConstruct
    public void checkRetardsAuDemarrage() {
        System.out.println("=== [SCHEDULER] Vérification des retards au démarrage ===");
        checkRetardsEtNotifier();
    }

    /**
     * Vérifie chaque jour à 8h00 les retards et envoie Email + SMS automatiquement
     */
    @Scheduled(cron = "0 0 8 * * *")
    public void checkRetardsEtNotifier() {
        System.out.println("=== [SCHEDULER] Vérification des retards de fiches de suivi ===");

        List<ProjetSuiviStatusDTO> projetsEnRetard = ficheProjetService.getProjetsSuiviStatus();

        if (projetsEnRetard.isEmpty()) {
            System.out.println("[SCHEDULER] Aucun retard détecté.");
            return;
        }

        System.out.println("[SCHEDULER] " + projetsEnRetard.size() + " projet(s) en retard détecté(s).");

        for (ProjetSuiviStatusDTO status : projetsEnRetard) {
            try {
                FicheProjet projet = ficheProjetRepository.findById(status.getProjetId()).orElse(null);
                if (projet == null || projet.getChefProjetId() == null) continue;

                User chef = userRepository.findById(projet.getChefProjetId()).orElse(null);
                if (chef == null) continue;

                String nomProjet = projet.getNomProjet();
                String nomChef = chef.getUsername();
                int joursRetard = status.getJoursRetard();

                // Envoi Email
                if (chef.getEmail() != null && !chef.getEmail().isBlank()) {
                    try {
                        emailService.sendFicheSuiviReminderEmail(
                            chef.getEmail(), nomChef, nomProjet, joursRetard
                        );
                        System.out.println("[SCHEDULER] Email envoyé à " + chef.getEmail() + " pour le projet: " + nomProjet);
                    } catch (Exception e) {
                        System.err.println("[SCHEDULER] Échec email pour " + nomProjet + ": " + e.getMessage());
                    }
                }

                // Envoi SMS
                if (chef.getPhoneNumber() != null && !chef.getPhoneNumber().isBlank()) {
                    try {
                        smsService.sendFicheSuiviReminderSms(
                            chef.getPhoneNumber(), nomChef, nomProjet, joursRetard
                        );
                        System.out.println("[SCHEDULER] SMS envoyé à " + chef.getPhoneNumber() + " pour le projet: " + nomProjet);
                    } catch (Exception e) {
                        System.err.println("[SCHEDULER] Échec SMS pour " + nomProjet + ": " + e.getMessage());
                    }
                }

            } catch (Exception e) {
                System.err.println("[SCHEDULER] Erreur pour le projet " + status.getProjetId() + ": " + e.getMessage());
            }
        }

        System.out.println("=== [SCHEDULER] Fin de la vérification ===");
    }
}
