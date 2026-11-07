package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.controller.PublicUserController;
import com.example.demo.model.ERole;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.Notification;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

/** Partout où l'application nomme un compte, elle donne son nom d'utilisateur, pas son prénom et son nom. */
@ExtendWith(MockitoExtension.class)
class NomUtilisateurAfficheTest {

    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private UserNotificationService userNotificationService;
    @InjectMocks
    private PublicUserController publicUserController;

    private static User compte(String id, String username, String prenom, String nom, ERole role) {
        User compte = new User(username, username + "@qualinet.com", "");
        compte.setId(id);
        compte.setFirstName(prenom);
        compte.setLastName(nom);
        compte.setRoles(new HashSet<>(Set.of(new Role(role))));
        return compte;
    }

    private static User pilote() {
        return compte("pilote-1", "amel.bensalah", "Amel", "Ben Salah", ERole.ROLE_PILOTE_QUALITE);
    }

    private static User chef() {
        return compte("chef-1", "sami.trabelsi", "Sami", "Trabelsi", ERole.ROLE_CHEF_PROJET);
    }

    private Notification notificationEnregistree() {
        ArgumentCaptor<Notification> notification = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(notification.capture());
        return notification.getValue();
    }

    @Test
    void laConsultationDUneFicheNommeLePiloteParSonNomDUtilisateur() {
        when(userRepository.findById("pilote-1")).thenReturn(Optional.of(pilote()));
        when(userRepository.findById("chef-1")).thenReturn(Optional.of(chef()));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(appel -> appel.getArgument(0));

        userNotificationService.createViewNotification("p1", "FICHE_PROJET", "e-Bourse", "pilote-1", "chef-1");

        Notification notification = notificationEnregistree();
        assertEquals("amel.bensalah a consulté la fiche de projet \"e-Bourse\"", notification.getMessage());
        assertEquals("amel.bensalah", notification.getActorName());
    }

    @Test
    void uneRelanceNommeLePiloteParSonNomDUtilisateur() {
        when(userRepository.findById("pilote-1")).thenReturn(Optional.of(pilote()));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(appel -> appel.getArgument(0));
        FicheProjet projet = new FicheProjet();
        projet.setNomProjet("e-Bourse");
        projet.setChefProjetId("chef-1");

        userNotificationService.createRelanceNotification(projet, 3, "pilote-1");

        Notification notification = notificationEnregistree();
        assertEquals("amel.bensalah vous a relancé : la fiche de suivi du projet \"e-Bourse\" est en retard de 3 jours",
                notification.getMessage());
    }

    @Test
    void uneFicheDeposeeNommeLeChefParSonNomDUtilisateur() {
        when(userRepository.findById("chef-1")).thenReturn(Optional.of(chef()));
        when(userRepository.findAll()).thenReturn(List.of(pilote()));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(appel -> appel.getArgument(0));

        userNotificationService.createFicheSuiviNotification("s1", "e-Bourse", "CREATED", "chef-1");

        Notification notification = notificationEnregistree();
        assertEquals("sami.trabelsi a créé une fiche de suivi pour le projet \"e-Bourse\"", notification.getMessage());
        assertEquals("sami.trabelsi", notification.getActorName());
    }

    @Test
    void laListeDesProjetsDuPiloteRecoitLeNomDUtilisateurDuChef() {
        when(userRepository.findById("chef-1")).thenReturn(Optional.of(chef()));

        assertEquals("sami.trabelsi", publicUserController.getUserNameById("chef-1").getBody());
    }
}
