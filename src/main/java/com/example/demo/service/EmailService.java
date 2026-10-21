package com.example.demo.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Envoi des emails de la plateforme (réinitialisation du mot de passe, rappels) par l'API HTTPS de Brevo. */
@Service
public class EmailService {

    @Value("${app.email.brevo.api-key:}")
    private String brevoApiKey;

    @Value("${app.email.brevo.sender:}")
    private String brevoSender;

    @Value("${app.email.brevo.url:https://api.brevo.com/v3/smtp/email}")
    private String brevoUrl;

    private final RestClient restClient = creerClientHttp();

    private static RestClient creerClientHttp() {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(10));
        return RestClient.builder().requestFactory(factory).build();
    }

    public void sendSimpleEmail(String to, String subject, String text) {
        envoyerViaBrevo(to, subject, Map.of("textContent", text));
    }

    public void sendEmail(String to, String subject, String htmlContent) {
        envoyerViaBrevo(to, subject, Map.of("htmlContent", htmlContent));
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
