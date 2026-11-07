package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.model.Notification;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import java.util.List;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/** Les notifications déjà enregistrées passent au nom d'utilisateur, sans rien changer d'autre. */
@ExtendWith(MockitoExtension.class)
class NomsNotificationsTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private MongoTemplate mongoTemplate;

    @InjectMocks
    private NomsNotificationsInitializer nomsNotificationsInitializer;

    private static User compte(String username, String prenom, String nom) {
        User compte = new User(username, username + "@qualinet.com", "");
        compte.setId("id-" + username);
        compte.setFirstName(prenom);
        compte.setLastName(nom);
        return compte;
    }

    @Test
    void leNomCompletDeLAuteurDevientSonNomDUtilisateur() {
        Notification notification = new Notification("chef-1", "FICHE_PROJET_VIEWED",
            "Amel Ben Salah a consulté la fiche de projet \"e-Bourse\"", "p1", "FICHE_PROJET", "id-amel.bensalah", "Amel Ben Salah");
        notification.setId("n1");
        when(userRepository.findAll()).thenReturn(List.of(compte("amel.bensalah", "Amel", "Ben Salah")));
        when(mongoTemplate.find(any(Query.class), eq(Notification.class))).thenReturn(List.of(notification));

        nomsNotificationsInitializer.run();

        ArgumentCaptor<Update> ecriture = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(any(Query.class), ecriture.capture(), eq(Notification.class));
        assertEquals(new Document("actorName", "amel.bensalah")
                .append("message", "amel.bensalah a consulté la fiche de projet \"e-Bourse\""),
            ecriture.getValue().getUpdateObject().get("$set"));
    }

    @Test
    void seulesLesNotificationsDeCeCompteSousSonNomCompletSontCherchees() {
        when(userRepository.findAll()).thenReturn(List.of(compte("amel.bensalah", "Amel", "Ben Salah")));

        nomsNotificationsInitializer.run();

        ArgumentCaptor<Query> recherche = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(recherche.capture(), eq(Notification.class));
        assertEquals(new Document("actorId", "id-amel.bensalah").append("actorName", "Amel Ben Salah"),
            recherche.getValue().getQueryObject());
        verify(mongoTemplate, never()).updateFirst(any(Query.class), any(Update.class), eq(Notification.class));
    }

    @Test
    void unCompteSansPrenomNiNomEstIgnore() {
        when(userRepository.findAll()).thenReturn(List.of(compte("pilote", null, null)));

        nomsNotificationsInitializer.run();

        verify(mongoTemplate, never()).find(any(Query.class), eq(Notification.class));
    }
}
