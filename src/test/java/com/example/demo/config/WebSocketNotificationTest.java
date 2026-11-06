package com.example.demo.config;

import com.example.demo.dto.NotificationEvent;
import com.example.demo.model.Notification;
import com.example.demo.security.WebSecurityConfig;
import com.example.demo.security.jwt.AuthEntryPointJwt;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration;
import org.springframework.boot.autoconfigure.data.mongo.MongoRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Vérifie les notifications en temps réel de bout en bout, sur un vrai serveur WebSocket
 * (port aléatoire) avec la vraie sécurité HTTP et sans base de données : le handshake, le jeton,
 * le routage vers le bon compte et les interdictions faites au navigateur (publier, s'abonner ailleurs).
 */
@SpringBootTest(
        classes = WebSocketNotificationTest.TestApp.class,
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.cors.allowed-origins=http://localhost:4200")
class WebSocketNotificationTest {

    // Pas de balayage des composants : WebSocketConfig et la vraie sécurité HTTP, sans base de données
    @Configuration
    @EnableAutoConfiguration(exclude = {
            MongoAutoConfiguration.class, MongoDataAutoConfiguration.class, MongoRepositoriesAutoConfiguration.class})
    @Import({WebSocketConfig.class, WebSecurityConfig.class, AuthEntryPointJwt.class})
    static class TestApp {
    }

    private static final String QUEUE = "/user/queue/notifications";

    @LocalServerPort
    private int port;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    private WebSocketStompClient stompClient;

    @BeforeEach
    void preparerClientEtJetons() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());
        // Nécessaire au suivi des accusés de réception (receipts) côté client
        ThreadPoolTaskScheduler planificateur = new ThreadPoolTaskScheduler();
        planificateur.initialize();
        stompClient.setTaskScheduler(planificateur);

        declarerUtilisateur("jeton-alice", "alice@qualinet.com", "id-alice");
        declarerUtilisateur("jeton-bob", "bob@qualinet.com", "id-bob");
        when(jwtUtils.validateJwtToken("jeton-faux")).thenReturn(false);
    }

    private void declarerUtilisateur(String jeton, String email, String id) {
        when(jwtUtils.validateJwtToken(jeton)).thenReturn(true);
        when(jwtUtils.getEmailFromJwtToken(jeton)).thenReturn(email);
        when(userDetailsService.loadUserByEmail(email))
                .thenReturn(new UserDetailsImpl(id, id, email, "x", List.of()));
    }

    /** Session qui note les erreurs du serveur et la perte de connexion. */
    private static class Ecouteur extends StompSessionHandlerAdapter {
        final CountDownLatch connecte = new CountDownLatch(1);
        final CountDownLatch refuse = new CountDownLatch(1);

        @Override
        public void afterConnected(StompSession session, StompHeaders connectedHeaders) {
            connecte.countDown();
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            refuse.countDown(); // seule une trame ERROR arrive ici
        }

        @Override
        public void handleException(StompSession session, StompCommand command, StompHeaders headers,
                                    byte[] payload, Throwable exception) {
            refuse.countDown();
        }

        @Override
        public void handleTransportError(StompSession session, Throwable exception) {
            refuse.countDown();
        }
    }

    private static final String ORIGINE_AUTORISEE = "http://localhost:4200";

    private Ecouteur connecter(String jeton, StompSession[] sessionOut) throws Exception {
        StompHeaders connectHeaders = new StompHeaders();
        if (jeton != null) {
            connectHeaders.add("Authorization", "Bearer " + jeton);
        }
        Ecouteur ecouteur = new Ecouteur();
        stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake(ORIGINE_AUTORISEE), connectHeaders, ecouteur)
                .thenAccept(s -> sessionOut[0] = s);
        return ecouteur;
    }

    private WebSocketHttpHeaders handshake(String origine) {
        WebSocketHttpHeaders headers = new WebSocketHttpHeaders();
        headers.setOrigin(origine);
        return headers;
    }

    private BlockingQueue<Map<String, Object>> abonner(StompSession session) {
        BlockingQueue<Map<String, Object>> recus = new LinkedBlockingQueue<>();
        session.subscribe(QUEUE, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            @SuppressWarnings("unchecked")
            public void handleFrame(StompHeaders headers, Object payload) {
                recus.add((Map<String, Object>) payload);
            }
        });
        return recus;
    }

    /**
     * Le broker simple n'envoie pas d'accusé de réception d'abonnement : on renvoie donc la
     * notification tant que l'abonnement n'est pas actif (jusqu'à 5 s), sans dépendre d'un délai fixe.
     */
    private Map<String, Object> envoyerJusquaReception(String userId, Notification notification,
                                                       BlockingQueue<Map<String, Object>> recus)
            throws InterruptedException {
        for (int i = 0; i < 25; i++) {
            messagingTemplate.convertAndSendToUser(userId, WebSocketConfig.USER_QUEUE_NOTIFICATIONS,
                    new NotificationEvent(notification, 3));
            Map<String, Object> recu = recus.poll(200, TimeUnit.MILLISECONDS);
            if (recu != null) {
                return recu;
            }
        }
        return null;
    }

    private StompSession sessionConnectee(String jeton) throws Exception {
        StompSession[] session = new StompSession[1];
        Ecouteur ecouteur = connecter(jeton, session);
        assertTrue(ecouteur.connecte.await(5, TimeUnit.SECONDS), "connexion refusée pour " + jeton);
        assertNotNull(session[0]);
        return session[0];
    }

    @Test
    @SuppressWarnings("unchecked")
    void notificationPousseeUniquementAuDestinataire() throws Exception {
        StompSession alice = sessionConnectee("jeton-alice");
        StompSession bob = sessionConnectee("jeton-bob");
        BlockingQueue<Map<String, Object>> recusParAlice = abonner(alice);
        BlockingQueue<Map<String, Object>> recusParBob = abonner(bob);

        Map<String, Object> eventAlice = envoyerJusquaReception("id-alice", new Notification("id-alice",
                "FICHE_PROJET_CREATED", "Bob a créé la fiche de projet \"Refonte\"", "p1", "FICHE_PROJET",
                "id-bob", "Bob"), recusParAlice);
        assertNotNull(eventAlice, "Alice n'a rien reçu");
        assertEquals(3, eventAlice.get("unreadCount"));
        Map<String, Object> notificationAlice = (Map<String, Object>) eventAlice.get("notification");
        assertEquals("Bob a créé la fiche de projet \"Refonte\"", notificationAlice.get("message"));
        assertEquals("FICHE_PROJET_CREATED", notificationAlice.get("type"));
        assertEquals(false, notificationAlice.get("read"));
        // Même format de date qu'en REST : texte ISO, pas un tableau de nombres
        assertInstanceOf(String.class, notificationAlice.get("createdAt"));

        // Bob, abonné lui aussi, ne reçoit que ses propres notifications, jamais celles d'Alice
        Map<String, Object> eventBob = envoyerJusquaReception("id-bob", new Notification("id-bob",
                "FICHE_SUIVI_UPDATED", "Alice a modifié une fiche de suivi", "s1", "FICHE_SUIVI",
                "id-alice", "Alice"), recusParBob);
        assertNotNull(eventBob, "Bob n'a rien reçu");
        recusParBob.add(eventBob);
        recusParBob.forEach(recu -> assertEquals("Alice a modifié une fiche de suivi",
                ((Map<String, Object>) recu.get("notification")).get("message"),
                "Bob a reçu une notification qui n'est pas la sienne"));
    }

    @Test
    void origineInconnueRefuseeAuHandshake() {
        StompHeaders connectHeaders = new StompHeaders();
        connectHeaders.add("Authorization", "Bearer jeton-alice");
        Ecouteur ecouteur = new Ecouteur();
        assertThrows(ExecutionException.class, () -> stompClient
                .connectAsync("ws://localhost:" + port + "/ws", handshake("https://pirate.example"), connectHeaders, ecouteur)
                .get(5, TimeUnit.SECONDS));
        assertEquals(1, ecouteur.connecte.getCount(), "la session ne doit pas être ouverte");
    }

    @Test
    void connexionSansJetonRefusee() throws Exception {
        Ecouteur ecouteur = connecter(null, new StompSession[1]);
        assertTrue(ecouteur.refuse.await(5, TimeUnit.SECONDS));
        assertEquals(1, ecouteur.connecte.getCount(), "la session ne doit pas être ouverte");
    }

    @Test
    void connexionAvecJetonInvalideRefusee() throws Exception {
        Ecouteur ecouteur = connecter("jeton-faux", new StompSession[1]);
        assertTrue(ecouteur.refuse.await(5, TimeUnit.SECONDS));
        assertEquals(1, ecouteur.connecte.getCount(), "la session ne doit pas être ouverte");
    }

    @Test
    void navigateurNePeutNiPublierNiSabonnerAilleurs() throws Exception {
        StompSession[] session = new StompSession[1];
        Ecouteur publication = connecter("jeton-alice", session);
        assertTrue(publication.connecte.await(5, TimeUnit.SECONDS));
        session[0].send("/queue/notifications", "intrus");
        assertTrue(publication.refuse.await(5, TimeUnit.SECONDS), "un envoi du navigateur doit être refusé");

        Ecouteur abonnement = connecter("jeton-alice", session);
        assertTrue(abonnement.connecte.await(5, TimeUnit.SECONDS));
        session[0].subscribe("/queue/autre", new StompSessionHandlerAdapter() {
        });
        assertTrue(abonnement.refuse.await(5, TimeUnit.SECONDS), "un abonnement hors de sa file doit être refusé");
    }
}
