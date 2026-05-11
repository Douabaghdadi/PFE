package com.example.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    public void sendSimpleEmail(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            
            mailSender.send(message);
            System.out.println("Email envoyé avec succès à: " + to);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email à " + to + ": " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email", e);
        }
    }

    public void sendFicheSuiviReminderEmail(String to, String chefProjetName, String projetName, int joursRetard) {
        String subject = "Rappel: Fiche de suivi en retard - " + projetName;
        
        String text = String.format(
            "Bonjour %s,\n\n" +
            "Nous vous informons que la fiche de suivi mensuelle pour le projet \"%s\" est en retard de %d jour(s).\n\n" +
            "Veuillez remplir la fiche de suivi dans les plus brefs délais via la plateforme QualityHub.\n\n" +
            "Détails:\n" +
            "- Projet: %s\n" +
            "- Retard: %d jour(s)\n\n" +
            "Pour remplir votre fiche de suivi, connectez-vous à QualityHub et accédez à la section \"Mes Fiches de Suivi\".\n\n" +
            "Cordialement,\n" +
            "L'équipe QualityHub",
            chefProjetName,
            projetName,
            joursRetard,
            projetName,
            joursRetard
        );
        
        sendSimpleEmail(to, subject, text);
    }
}
