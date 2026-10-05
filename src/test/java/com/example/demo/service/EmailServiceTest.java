package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Vérifie l'envoi par l'API Brevo (utilisé sur Render, qui bloque le SMTP)
 * contre un faux serveur local : aucun email réel n'est envoyé.
 */
class EmailServiceTest {

    private HttpServer serveur;
    private EmailService emailService;

    private int statutReponse;
    private String cleRecue;
    private JsonNode requeteRecue;

    @BeforeEach
    void setUp() throws IOException {
        statutReponse = 201;
        serveur = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        serveur.createContext("/v3/smtp/email", echange -> {
            cleRecue = echange.getRequestHeaders().getFirst("api-key");
            requeteRecue = new ObjectMapper().readTree(echange.getRequestBody());
            byte[] reponse = (statutReponse == 201
                    ? "{\"messageId\":\"<test@brevo>\"}"
                    : "{\"code\":\"unauthorized\",\"message\":\"Key not found\"}").getBytes(StandardCharsets.UTF_8);
            echange.sendResponseHeaders(statutReponse, reponse.length);
            echange.getResponseBody().write(reponse);
            echange.close();
        });
        serveur.start();

        emailService = new EmailService();
        ReflectionTestUtils.setField(emailService, "brevoApiKey", "cle-test");
        ReflectionTestUtils.setField(emailService, "brevoSender", "expediteur@exemple.com");
        ReflectionTestUtils.setField(emailService, "brevoUrl",
                "http://localhost:" + serveur.getAddress().getPort() + "/v3/smtp/email");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "https://douabaghdadi.github.io/PFE");
    }

    @AfterEach
    void tearDown() {
        serveur.stop(0);
    }

    @Test
    void emailHtmlEnvoyeParBrevoAvecLogoPublic() {
        emailService.sendEmail("chef@exemple.com", "Sujet",
                "<img src='cid:" + EmailService.LOGO_CID + "'><p>Bonjour</p>");

        assertEquals("cle-test", cleRecue);
        assertEquals("expediteur@exemple.com", requeteRecue.at("/sender/email").asText());
        assertEquals("chef@exemple.com", requeteRecue.at("/to/0/email").asText());
        assertEquals("Sujet", requeteRecue.get("subject").asText());
        String html = requeteRecue.get("htmlContent").asText();
        assertTrue(html.contains("https://douabaghdadi.github.io/PFE/assets/images/branding/qualinet-logo.png"));
        assertFalse(html.contains("cid:"));
    }

    @Test
    void emailTexteEnvoyeParBrevo() {
        emailService.sendSimpleEmail("chef@exemple.com", "Rappel", "Fiche de suivi en retard");

        assertEquals("Fiche de suivi en retard", requeteRecue.get("textContent").asText());
        assertFalse(requeteRecue.has("htmlContent"));
    }

    @Test
    void refusDeBrevoRemonteUneErreur() {
        statutReponse = 401;

        RuntimeException erreur = assertThrows(RuntimeException.class,
                () -> emailService.sendSimpleEmail("chef@exemple.com", "Sujet", "Message"));
        assertEquals("Erreur lors de l'envoi de l'email", erreur.getMessage());
    }
}
