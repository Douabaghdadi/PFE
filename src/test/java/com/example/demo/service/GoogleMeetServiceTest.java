package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Vérifie les appels à Google contre un faux serveur local : aucun événement réel n'est créé. */
class GoogleMeetServiceTest {

    private static final String LIEN = "https://meet.google.com/abc-defg-hij";
    private static final String AVEC_LIEN = """
            {"id":"ev1","hangoutLink":"https://meet.google.com/ancien","conferenceData":{"entryPoints":[
            {"entryPointType":"phone","uri":"tel:+33"},{"entryPointType":"video","uri":"%s"}]}}""".formatted(LIEN);
    private static final String EN_ATTENTE = """
            {"id":"ev1","conferenceData":{"createRequest":{"status":{"statusCode":"pending"}}}}""";

    private static final LocalDateTime DEBUT = LocalDateTime.of(2026, 11, 12, 10, 0);

    private HttpServer serveur;
    private GoogleMeetService service;

    private int demandesDeJeton;
    private String formulaireJeton;
    private String autorisation;
    private String adresseCreation;
    private JsonNode evenementRecu;
    private int statutCreation;
    private String reponseCreation;
    private String reponseLecture;
    private int lectures;
    private int statutSuppression;
    private final List<String> suppressions = new ArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        statutCreation = 200;
        reponseCreation = AVEC_LIEN;
        reponseLecture = EN_ATTENTE;
        statutSuppression = 204;

        serveur = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        serveur.createContext("/token", echange -> {
            demandesDeJeton++;
            formulaireJeton = new String(echange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            repondre(echange, 200, "{\"access_token\":\"jeton-test\",\"expires_in\":3600}");
        });
        serveur.createContext("/calendar", this::agenda);
        serveur.start();

        String racine = "http://localhost:" + serveur.getAddress().getPort();
        service = new GoogleMeetService();
        ReflectionTestUtils.setField(service, "clientId", "client");
        ReflectionTestUtils.setField(service, "clientSecret", "secret");
        ReflectionTestUtils.setField(service, "refreshToken", "jeton-longue-duree");
        ReflectionTestUtils.setField(service, "calendrierId", "primary");
        ReflectionTestUtils.setField(service, "tokenUrl", racine + "/token");
        ReflectionTestUtils.setField(service, "calendarUrl", racine + "/calendar");
        ReflectionTestUtils.setField(service, "pauseEntreLecturesMillis", 0L);
    }

    @AfterEach
    void tearDown() {
        serveur.stop(0);
    }

    private void agenda(HttpExchange echange) throws IOException {
        autorisation = echange.getRequestHeaders().getFirst("Authorization");
        switch (echange.getRequestMethod()) {
            case "POST" -> {
                adresseCreation = echange.getRequestURI().toString();
                evenementRecu = new ObjectMapper().readTree(echange.getRequestBody());
                repondre(echange, statutCreation, reponseCreation);
            }
            case "GET" -> {
                lectures++;
                repondre(echange, 200, reponseLecture);
            }
            default -> {
                suppressions.add(echange.getRequestURI().toString());
                echange.sendResponseHeaders(statutSuppression, -1);
                echange.close();
            }
        }
    }

    private static void repondre(HttpExchange echange, int statut, String corps) throws IOException {
        byte[] octets = corps.getBytes(StandardCharsets.UTF_8);
        echange.getResponseHeaders().add("Content-Type", "application/json");
        echange.sendResponseHeaders(statut, octets.length);
        echange.getResponseBody().write(octets);
        echange.close();
    }

    private GoogleMeetService.EvenementMeet creer() {
        return service.creer("Revue", "Projet : Atlas", DEBUT, 30, List.of("chef@exemple.com", "pilote@exemple.com"));
    }

    @Test
    void laReunionDemandeUnLienMeetEtFaitEnvoyerLesInvitationsParGoogle() {
        GoogleMeetService.EvenementMeet evenement = creer();

        assertEquals("ev1", evenement.evenementId());
        assertEquals(LIEN, evenement.lienMeet());
        assertEquals("Bearer jeton-test", autorisation);
        assertEquals("/calendar/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", adresseCreation);
        assertEquals("Revue", evenementRecu.get("summary").asText());
        assertEquals("hangoutsMeet", evenementRecu.at("/conferenceData/createRequest/conferenceSolutionKey/type").asText());
        assertFalse(evenementRecu.at("/conferenceData/createRequest/requestId").asText().isEmpty());
        assertEquals("chef@exemple.com", evenementRecu.at("/attendees/0/email").asText());
        assertEquals("pilote@exemple.com", evenementRecu.at("/attendees/1/email").asText());
    }

    @Test
    void lHeureEnvoyeeEstCelleDeTunisQuelQueSoitLeFuseauDuServeur() {
        creer();

        assertEquals("2026-11-12T10:00:00", evenementRecu.at("/start/dateTime").asText());
        assertEquals("Africa/Tunis", evenementRecu.at("/start/timeZone").asText());
        assertEquals("2026-11-12T10:30:00", evenementRecu.at("/end/dateTime").asText());
        assertEquals("Africa/Tunis", evenementRecu.at("/end/timeZone").asText());
    }

    @Test
    void leJetonDAccesEstDemandeUneSeuleFoisPuisReutilise() {
        creer();
        creer();

        assertEquals(1, demandesDeJeton);
        assertTrue(formulaireJeton.contains("grant_type=refresh_token"));
        assertTrue(formulaireJeton.contains("refresh_token=jeton-longue-duree"));
    }

    @Test
    void uneSalleEncorePrepareeParGoogleEstRelueJusquAuLien() {
        reponseCreation = EN_ATTENTE;
        reponseLecture = AVEC_LIEN;

        assertEquals(LIEN, creer().lienMeet());
        assertEquals(1, lectures);
        assertTrue(suppressions.isEmpty());
    }

    @Test
    void sansLienFinalLInvitationDejaPartieEstRetiree() {
        reponseCreation = EN_ATTENTE;

        GoogleMeetService.Indisponible erreur = assertThrows(GoogleMeetService.Indisponible.class, this::creer);

        assertEquals("Google n'a pas fourni de lien Meet. Réessayez.", erreur.getMessage());
        assertEquals(List.of("/calendar/calendars/primary/events/ev1?sendUpdates=all"), suppressions);
    }

    @Test
    void unRefusDeGoogleDonneUnMessagePourLUtilisateur() {
        statutCreation = 403;
        reponseCreation = "{\"error\":{\"message\":\"Forbidden\"}}";

        GoogleMeetService.Indisponible erreur = assertThrows(GoogleMeetService.Indisponible.class, this::creer);

        assertEquals("Google n'a pas pu créer la réunion. Réessayez.", erreur.getMessage());
    }

    @Test
    void lAnnulationPrevientLesInvites() {
        service.annuler("ev1");

        assertEquals(List.of("/calendar/calendars/primary/events/ev1?sendUpdates=all"), suppressions);
    }

    @Test
    void uneReunionDejaRetireeDeLAgendaNEstPasUneErreur() {
        statutSuppression = 410;
        assertDoesNotThrow(() -> service.annuler("ev1"));

        statutSuppression = 404;
        assertDoesNotThrow(() -> service.annuler("ev1"));
    }

    @Test
    void unEchecDAnnulationEstRemonte() {
        statutSuppression = 500;

        assertThrows(GoogleMeetService.Indisponible.class, () -> service.annuler("ev1"));
    }

    @Test
    void laPlanificationEstDesactiveeTantQuUneValeurManque() {
        assertTrue(service.estActif());

        ReflectionTestUtils.setField(service, "refreshToken", "");

        assertFalse(service.estActif());
    }
}
