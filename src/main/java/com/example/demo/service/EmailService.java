package com.example.demo.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class EmailService {

    /** Identifiant du logo Qualinet dans les emails HTML : utiliser {@code <img src='cid:qualinet-logo'>}. */
    public static final String LOGO_CID = "qualinet-logo";

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    // Render (plan gratuit) bloque le SMTP : avec une clé Brevo, les emails partent par son API HTTPS
    @Value("${app.email.brevo.api-key:}")
    private String brevoApiKey;

    @Value("${app.email.brevo.sender:}")
    private String brevoSender;

    @Value("${app.email.brevo.url:https://api.brevo.com/v3/smtp/email}")
    private String brevoUrl;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private final RestClient restClient = creerClientHttp();

    private static RestClient creerClientHttp() {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(factory).build();
    }

    private boolean brevoActif() {
        return brevoApiKey != null && !brevoApiKey.isBlank();
    }

    public void sendSimpleEmail(String to, String subject, String text) {
        if (brevoActif()) {
            envoyerViaBrevo(to, subject, Map.of("textContent", text));
            return;
        }
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

    public void sendEmail(String to, String subject, String htmlContent) {
        if (brevoActif()) {
            // Pas d'image intégrée (cid) via l'API : le logo est chargé depuis le frontend public
            String html = htmlContent.replace("cid:" + LOGO_CID,
                    frontendUrl + "/assets/images/branding/qualinet-logo.png");
            envoyerViaBrevo(to, subject, Map.of("htmlContent", html));
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true); // true = HTML
            // Logo joint en pièce intégrée : les images hébergées sur localhost ne s'affichent pas chez le destinataire
            if (htmlContent.contains("cid:" + LOGO_CID)) {
                helper.addInline(LOGO_CID, new ClassPathResource("branding/qualinet-logo.png"), "image/png");
            }

            mailSender.send(message);
            System.out.println("Email HTML envoyé avec succès à: " + to);
        } catch (MessagingException e) {
            System.err.println("Erreur lors de l'envoi de l'email HTML à " + to + ": " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email HTML", e);
        }
    }

    private void envoyerViaBrevo(String to, String subject, Map<String, String> contenu) {
        Map<String, Object> body = new HashMap<>(contenu);
        body.put("sender", Map.of("name", "Qualinet", "email", brevoSender));
        body.put("to", List.of(Map.of("email", to)));
        body.put("subject", subject);
        try {
            restClient.post()
                    .uri(brevoUrl)
                    .header("api-key", brevoApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
            System.out.println("Email envoyé avec succès (Brevo) à: " + to);
        } catch (RestClientResponseException e) {
            // La réponse de Brevo donne la cause : clé invalide, expéditeur non validé, etc.
            System.err.println("Erreur Brevo lors de l'envoi de l'email à " + to + ": "
                    + e.getStatusCode() + " " + e.getResponseBodyAsString());
            throw new RuntimeException("Erreur lors de l'envoi de l'email", e);
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi de l'email à " + to + " (Brevo): " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email", e);
        }
    }

    public void sendFicheSuiviReminderEmail(String to, String chefProjetName, String projetName, int joursRetard) {
        String subject = "Rappel: Fiche de suivi en retard - " + projetName;
        
        String text = String.format(
            "Bonjour %s,\n\n" +
            "Nous vous informons que la fiche de suivi mensuelle pour le projet \"%s\" est en retard de %d jour(s).\n\n" +
            "Veuillez remplir la fiche de suivi dans les plus brefs délais via la plateforme Qualinet.\n\n" +
            "Détails:\n" +
            "- Projet: %s\n" +
            "- Retard: %d jour(s)\n\n" +
            "Pour remplir votre fiche de suivi, connectez-vous à Qualinet et accédez à la section \"Mes Fiches de Suivi\".\n\n" +
            "Cordialement,\n" +
            "L'équipe Qualinet",
            chefProjetName,
            projetName,
            joursRetard,
            projetName,
            joursRetard
        );
        
        sendSimpleEmail(to, subject, text);
    }
}
