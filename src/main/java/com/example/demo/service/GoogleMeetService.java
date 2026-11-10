package com.example.demo.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Réunions Google Meet, créées par l'API Google Calendar avec un seul compte Google pour toute la plateforme.
 * Ce compte organise les réunions ; Google envoie lui-même les invitations, les rappels et les annulations.
 * Comme pour Brevo, quelques appels HTTPS suffisent : aucune bibliothèque Google n'est embarquée.
 */
@Service
public class GoogleMeetService {

    /** Les heures saisies sont celles de Tunis, quel que soit le fuseau du serveur. */
    private static final String FUSEAU = "Africa/Tunis";

    /** Google peut répondre avant d'avoir préparé la salle : l'événement est alors relu quelques fois. */
    private static final int LECTURES_MAX = 4;

    @Value("${app.google.client-id:}")
    private String clientId;

    @Value("${app.google.client-secret:}")
    private String clientSecret;

    @Value("${app.google.refresh-token:}")
    private String refreshToken;

    @Value("${app.google.calendar-id:primary}")
    private String calendrierId;

    @Value("${app.google.token-url:https://oauth2.googleapis.com/token}")
    private String tokenUrl;

    @Value("${app.google.calendar-url:https://www.googleapis.com/calendar/v3}")
    private String calendarUrl;

    private long pauseEntreLecturesMillis = 1000;

    private final RestClient restClient = creerClientHttp();

    private String jetonAcces;
    private Instant expirationJeton = Instant.EPOCH;

    /** L'événement créé dans l'agenda et le lien que les participants ouvrent. */
    public record EvenementMeet(String evenementId, String lienMeet) {
    }

    /** Google n'a pas répondu ou a refusé : la cause est dans les journaux, le message est destiné à l'utilisateur. */
    public static class Indisponible extends RuntimeException {
        public Indisponible(String message, Throwable cause) {
            super(message, cause);
        }
    }

    private static RestClient creerClientHttp() {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(15));
        return RestClient.builder().requestFactory(factory).build();
    }

    /** Sans ces trois valeurs, la planification reste désactivée : le reste de l'application n'en dépend pas. */
    public boolean estActif() {
        return !clientId.isBlank() && !clientSecret.isBlank() && !refreshToken.isBlank();
    }

    public EvenementMeet creer(String titre, String description, LocalDateTime debut, int dureeMinutes, List<String> emails) {
        Map<String, Object> evenement = new HashMap<>();
        evenement.put("summary", titre);
        evenement.put("description", description);
        evenement.put("start", moment(debut));
        evenement.put("end", moment(debut.plusMinutes(dureeMinutes)));
        evenement.put("attendees", emails.stream().map(email -> Map.of("email", email)).toList());
        evenement.put("conferenceData", Map.of("createRequest", Map.of(
                "requestId", UUID.randomUUID().toString(),
                "conferenceSolutionKey", Map.of("type", "hangoutsMeet"))));

        try {
            JsonNode cree = restClient.post()
                    .uri(calendarUrl + "/calendars/{calendrier}/events?conferenceDataVersion=1&sendUpdates=all", calendrierId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(evenement)
                    .retrieve()
                    .body(JsonNode.class);

            String evenementId = cree.path("id").asText();
            String lien = lienAttendu(cree, evenementId);
            if (lien.isEmpty()) {
                // Sans lien, l'invitation déjà partie ne mène nulle part : elle est retirée aussitôt
                annuler(evenementId);
                throw new Indisponible("Google n'a pas fourni de lien Meet. Réessayez.", null);
            }
            return new EvenementMeet(evenementId, lien);
        } catch (RestClientException e) {
            throw echec("la création de la réunion", "Google n'a pas pu créer la réunion. Réessayez.", e);
        }
    }

    /** Une réunion déjà retirée de l'agenda n'a plus rien à annuler. */
    public void annuler(String evenementId) {
        try {
            restClient.delete()
                    .uri(calendarUrl + "/calendars/{calendrier}/events/{evenement}?sendUpdates=all", calendrierId, evenementId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton())
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException e) {
            int statut = e.getStatusCode().value();
            if (statut != 404 && statut != 410) {
                throw echec("l'annulation de la réunion", "Google n'a pas pu annuler la réunion. Réessayez.", e);
            }
        } catch (RestClientException e) {
            throw echec("l'annulation de la réunion", "Google n'a pas pu annuler la réunion. Réessayez.", e);
        }
    }

    private String lienAttendu(JsonNode evenement, String evenementId) {
        JsonNode courant = evenement;
        for (int lecture = 1; lecture < LECTURES_MAX && lienDe(courant).isEmpty(); lecture++) {
            pause();
            courant = restClient.get()
                    .uri(calendarUrl + "/calendars/{calendrier}/events/{evenement}", calendrierId, evenementId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + jeton())
                    .retrieve()
                    .body(JsonNode.class);
        }
        return lienDe(courant);
    }

    private static String lienDe(JsonNode evenement) {
        for (JsonNode acces : evenement.at("/conferenceData/entryPoints")) {
            if ("video".equals(acces.path("entryPointType").asText())) {
                return acces.path("uri").asText();
            }
        }
        return evenement.path("hangoutLink").asText();
    }

    /** Le jeton d'accès dure environ une heure : il est gardé en mémoire et renouvelé peu avant son expiration. */
    private synchronized String jeton() {
        if (jetonAcces != null && Instant.now().isBefore(expirationJeton)) {
            return jetonAcces;
        }
        MultiValueMap<String, String> formulaire = new LinkedMultiValueMap<>();
        formulaire.add("client_id", clientId);
        formulaire.add("client_secret", clientSecret);
        formulaire.add("refresh_token", refreshToken);
        formulaire.add("grant_type", "refresh_token");

        JsonNode reponse = restClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(formulaire)
                .retrieve()
                .body(JsonNode.class);

        jetonAcces = reponse.path("access_token").asText();
        expirationJeton = Instant.now().plusSeconds(reponse.path("expires_in").asLong(3600) - 60);
        return jetonAcces;
    }

    private static Map<String, String> moment(LocalDateTime date) {
        return Map.of("dateTime", date.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME), "timeZone", FUSEAU);
    }

    private void pause() {
        try {
            Thread.sleep(pauseEntreLecturesMillis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static Indisponible echec(String action, String message, RestClientException e) {
        // La réponse de Google donne la cause : jeton révoqué, quota, agenda introuvable, etc.
        String cause = e instanceof RestClientResponseException reponse
                ? reponse.getStatusCode() + " " + reponse.getResponseBodyAsString()
                : e.getMessage();
        System.err.println("Erreur Google lors de " + action + " : " + cause);
        return new Indisponible(message, e);
    }
}
