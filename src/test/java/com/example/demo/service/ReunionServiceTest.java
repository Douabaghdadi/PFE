package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.demo.dto.EquipeReunionDTO;
import com.example.demo.dto.ParticipantReunionDTO;
import com.example.demo.dto.ReunionRequest;
import com.example.demo.dto.ReunionsDTO;
import com.example.demo.model.ERole;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.Reunion;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.ReunionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/**
 * Seul le chef d'un projet y planifie une réunion, seul l'organisateur l'annule, et chacun ne voit que ce qui le
 * concerne ; Google n'est appelé qu'une fois toutes les règles vérifiées.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReunionServiceTest {

    private static final String CHEF = "chef-1";
    private static final String PROJET = "projet-1";
    private static final String PILOTE = "pilote-1";
    private static final String AUTRE_CHEF = "chef-2";
    private static final String ADMIN = "admin-1";
    private static final String EMAIL_PILOTE = "pilote-1@exemple.com";
    private static final String EMAIL_RIM = "rim@exemple.com";
    private static final String EMAIL_AUTRE_CHEF = "chef-2@exemple.com";

    /** Un membre sans compte, un membre qui a un compte, un doublon, le chef, un pilote, et deux membres inutilisables. */
    private static final String EQUIPE = """
            [{"nom":"Rim Mansouri","role":"Développeuse","email":"rim@exemple.com"},
             {"nom":"Collègue","role":"Testeur","email":"chef-2@exemple.com"},
             {"nom":"Rim en double","role":"Développeuse","email":"RIM@exemple.com"},
             {"nom":"Le chef","role":"Chef","email":"chef-1@exemple.com"},
             {"nom":"La pilote","role":"Qualité","email":"pilote-1@exemple.com"},
             {"nom":"Sans adresse","role":"Testeur","email":""},
             {"nom":"Adresse fausse","role":"Testeur","email":"pas-un-email"},
             {"nom":"","role":"","email":""}]""";

    @Mock
    private ReunionRepository reunionRepository;
    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private GoogleMeetService googleMeetService;
    @Mock
    private HistoriqueService historiqueService;
    @Mock
    private UserNotificationService userNotificationService;
    @Spy
    private ControleAcces controleAcces = new ControleAcces();

    @InjectMocks
    private ReunionService reunionService;

    private FicheProjet projet;

    private static Authentication connecte(String id, String role) {
        UserDetailsImpl utilisateur = new UserDetailsImpl(id, id, id + "@exemple.com", "",
                List.of(new SimpleGrantedAuthority(role)));
        return new UsernamePasswordAuthenticationToken(utilisateur, null, utilisateur.getAuthorities());
    }

    private static Authentication chef() {
        return connecte(CHEF, "ROLE_CHEF_PROJET");
    }

    private static Authentication autreChef() {
        return connecte(AUTRE_CHEF, "ROLE_CHEF_PROJET");
    }

    private static Authentication pilote() {
        return connecte(PILOTE, "ROLE_PILOTE_QUALITE");
    }

    private static User utilisateur(String id, ERole role) {
        User utilisateur = new User(id, id + "@exemple.com", "");
        utilisateur.setId(id);
        utilisateur.setRoles(Set.of(new Role(role)));
        return utilisateur;
    }

    private static ReunionRequest demande(String titre, LocalDateTime debut, int duree, List<String> participants) {
        return new ReunionRequest(titre, "Point sur les risques", debut, duree, participants);
    }

    private static ReunionRequest demandeValide() {
        return demande("  Revue d'avancement  ", LocalDateTime.now().plusDays(2), 30, List.of(EMAIL_PILOTE, EMAIL_RIM, EMAIL_AUTRE_CHEF));
    }

    private static Reunion reunion(LocalDateTime debut) {
        Reunion reunion = new Reunion();
        reunion.setId("r1");
        reunion.setProjetId(PROJET);
        reunion.setTitre("Revue");
        reunion.setDebut(debut);
        reunion.setDureeMinutes(30);
        reunion.setParticipantIds(List.of(PILOTE));
        reunion.setParticipantNoms(List.of(PILOTE));
        reunion.setEvenementGoogleId("ev1");
        reunion.setOrganisateurId(CHEF);
        reunion.setOrganisateurNom(CHEF);
        return reunion;
    }

    @BeforeEach
    void setUp() {
        projet = new FicheProjet();
        projet.setId(PROJET);
        projet.setChefProjetId(CHEF);
        projet.setNomProjet("Atlas");
        projet.setEquipeProjet(EQUIPE);
        when(ficheProjetRepository.findById(PROJET)).thenReturn(Optional.of(projet));
        when(ficheProjetRepository.findAllById(any())).thenReturn(List.of(projet));
        when(userRepository.findAll()).thenReturn(List.of(utilisateur(CHEF, ERole.ROLE_CHEF_PROJET),
                utilisateur(PILOTE, ERole.ROLE_PILOTE_QUALITE), utilisateur(AUTRE_CHEF, ERole.ROLE_CHEF_PROJET),
                utilisateur("chef-3", ERole.ROLE_CHEF_PROJET), utilisateur(ADMIN, ERole.ROLE_ADMIN)));
        when(googleMeetService.estActif()).thenReturn(true);
        when(googleMeetService.creer(anyString(), anyString(), any(), anyInt(), any()))
                .thenReturn(new GoogleMeetService.EvenementMeet("ev1", "https://meet.google.com/abc-defg-hij"));
    }

    private void verifierAucunAppelGoogle() {
        verify(googleMeetService, never()).creer(any(), any(), any(), anyInt(), any());
        verify(reunionRepository, never()).save(any());
    }

    @Test
    void laReunionPlanifieeGardeLeLienMeetEtInviteAussiLeChef() {
        reunionService.planifier(PROJET, demandeValide(), chef());

        verify(googleMeetService).creer(eq("Revue d'avancement"),
                argThat(texte -> texte.contains("Atlas") && texte.contains("Point sur les risques")), any(), eq(30),
                eq(List.of("chef-1@exemple.com", EMAIL_PILOTE, EMAIL_RIM, EMAIL_AUTRE_CHEF)));
        verify(reunionRepository).save(argThat(reunion -> reunion.getLienMeet().equals("https://meet.google.com/abc-defg-hij")
                && reunion.getEvenementGoogleId().equals("ev1")
                && reunion.getTitre().equals("Revue d'avancement")
                && reunion.getOrganisateurId().equals(CHEF)
                && reunion.getParticipantNoms().equals(List.of(PILOTE, "Rim Mansouri", AUTRE_CHEF))
                && reunion.getParticipantIds().equals(List.of(PILOTE, AUTRE_CHEF))));
    }

    @Test
    void laPlanificationEstTraceeEtNotifieeSansToucherALaValidationDeLaFiche() {
        reunionService.planifier(PROJET, demandeValide(), chef());

        verify(historiqueService).enregistrerAction(eq("FICHE_PROJET"), eq(PROJET), eq(CHEF), eq("PLANIFICATION_REUNION"),
                eq("Réunion planifiée : Revue d'avancement"), any(), any(), eq(PROJET), eq("Atlas"));
        verify(userNotificationService).createReunionNotification(any(), eq("Atlas"), eq(true));
        verify(ficheProjetRepository, never()).save(any());
    }

    @Test
    void seulLeChefDuProjetYPlanifieUneReunion() {
        assertThrows(AccessDeniedException.class, () -> reunionService.planifier(PROJET, demandeValide(), autreChef()));
        assertThrows(AccessDeniedException.class, () -> reunionService.planifier(PROJET, demandeValide(), pilote()));
        assertThrows(AccessDeniedException.class,
                () -> reunionService.planifier(PROJET, demandeValide(), connecte(ADMIN, "ROLE_ADMIN")));

        verifierAucunAppelGoogle();
    }

    @Test
    void unProjetInconnuDonneUneErreurDeRessourceAbsente() {
        assertThrows(NoSuchElementException.class, () -> reunionService.planifier("absent", demandeValide(), chef()));
        verifierAucunAppelGoogle();
    }

    @Test
    void sansCompteGoogleConfigureLaPlanificationEstRefusee() {
        when(googleMeetService.estActif()).thenReturn(false);

        IllegalStateException erreur = assertThrows(IllegalStateException.class,
                () -> reunionService.planifier(PROJET, demandeValide(), chef()));

        assertEquals("Les réunions Google Meet ne sont pas activées sur ce serveur.", erreur.getMessage());
        verifierAucunAppelGoogle();
    }

    @Test
    void uneDemandeIncompleteEstRefuseeAvantToutAppelAGoogle() {
        LocalDateTime demain = LocalDateTime.now().plusDays(1);
        Map<String, ReunionRequest> refus = Map.of(
                "Donnez un titre à la réunion.", demande("   ", demain, 30, List.of(EMAIL_PILOTE)),
                "Le titre ne doit pas dépasser 120 caractères.", demande("x".repeat(121), demain, 30, List.of(EMAIL_PILOTE)),
                "Choisissez une date et une heure à venir.", demande("Revue", LocalDateTime.now().minusMinutes(1), 30, List.of(EMAIL_PILOTE)),
                "Choisissez au moins un participant.", demande("Revue", demain, 30, List.of()));

        refus.forEach((message, demande) -> {
            IllegalArgumentException erreur = assertThrows(IllegalArgumentException.class,
                    () -> reunionService.planifier(PROJET, demande, chef()));
            assertEquals(message, erreur.getMessage());
        });
        verifierAucunAppelGoogle();
    }

    @Test
    void laDureeResteDansLaLimiteDUnCompteGoogleGratuit() {
        LocalDateTime demain = LocalDateTime.now().plusDays(1);

        assertThrows(IllegalArgumentException.class,
                () -> reunionService.planifier(PROJET, demande("Revue", demain, 61, List.of(EMAIL_PILOTE)), chef()));
        assertThrows(IllegalArgumentException.class,
                () -> reunionService.planifier(PROJET, demande("Revue", demain, 10, List.of(EMAIL_PILOTE)), chef()));
        verifierAucunAppelGoogle();

        reunionService.planifier(PROJET, demande("Revue", demain, 60, List.of(EMAIL_PILOTE)), chef());
        verify(reunionRepository).save(any());
    }

    @Test
    void seulsLesPilotesEtLEquipeDuProjetPeuventEtreInvites() {
        LocalDateTime demain = LocalDateTime.now().plusDays(1);

        for (String email : List.of("admin-1@exemple.com", "chef-1@exemple.com", "chef-3@exemple.com", "inconnu@exemple.com")) {
            assertThrows(IllegalArgumentException.class,
                    () -> reunionService.planifier(PROJET, demande("Revue", demain, 30, List.of(email)), chef()));
        }
        verifierAucunAppelGoogle();
    }

    @Test
    void lesPilotesQualiteSontProposesPourToutProjet() {
        assertEquals(List.of(new ParticipantReunionDTO(EMAIL_PILOTE, PILOTE)), reunionService.participantsPossibles(chef()));
    }

    @Test
    void lEquipeDonneSesEmailsSansDoublonNiLeChefNiLesPilotes() {
        EquipeReunionDTO equipe = reunionService.equipeDuProjet(PROJET, chef());

        assertEquals(List.of(new ParticipantReunionDTO(EMAIL_AUTRE_CHEF, "Collègue"),
                new ParticipantReunionDTO(EMAIL_RIM, "Rim Mansouri")), equipe.membres());
        assertEquals(2, equipe.sansEmail());
    }

    @Test
    void uneEquipeEnTexteLibreNaAucunMembreInvitable() {
        projet.setEquipeProjet("Rim et Yassine");

        EquipeReunionDTO equipe = reunionService.equipeDuProjet(PROJET, chef());

        assertTrue(equipe.membres().isEmpty());
        assertEquals(0, equipe.sansEmail());
    }

    @Test
    void lEquipeNestLisibleQueParLeChefDuProjet() {
        assertThrows(AccessDeniedException.class, () -> reunionService.equipeDuProjet(PROJET, autreChef()));
        assertThrows(AccessDeniedException.class, () -> reunionService.equipeDuProjet(PROJET, pilote()));
    }

    @Test
    void unPiloteSeVoitProposerLesChefsDeProjetEtLAdministrateurPersonne() {
        assertEquals(List.of(new ParticipantReunionDTO("chef-1@exemple.com", CHEF),
                new ParticipantReunionDTO(EMAIL_AUTRE_CHEF, AUTRE_CHEF),
                new ParticipantReunionDTO("chef-3@exemple.com", "chef-3")), reunionService.participantsPossibles(pilote()));
        assertThrows(AccessDeniedException.class, () -> reunionService.participantsPossibles(connecte(ADMIN, "ROLE_ADMIN")));
    }

    @Test
    void lePiloteNeVoitQueLesReunionsQuIlOrganiseEtCellesOuIlEstInvite() {
        Reunion organisee = reunion(LocalDateTime.now().plusDays(1));
        organisee.setProjetId(null);
        organisee.setOrganisateurId(PILOTE);
        Reunion invitation = reunion(LocalDateTime.now().plusDays(2));
        when(reunionRepository.findConcernant(PILOTE)).thenReturn(List.of(organisee, invitation));

        ReunionsDTO vue = reunionService.lister(pilote());

        assertEquals(2, vue.reunions().size());
        assertNull(organisee.getNomProjet());
        assertTrue(organisee.isPeutAnnuler());
        assertEquals("Atlas", invitation.getNomProjet());
        assertFalse(invitation.isPeutAnnuler());
        assertTrue(vue.peutPlanifier());
        assertTrue(vue.planificationActive());
        verify(reunionRepository, never()).findAll(any(Sort.class));
    }

    @Test
    void lAdministrateurVoitToutesLesReunionsSansPlanifier() {
        when(reunionRepository.findAll(any(Sort.class))).thenReturn(List.of(reunion(LocalDateTime.now().plusDays(1))));

        ReunionsDTO vue = reunionService.lister(connecte(ADMIN, "ROLE_ADMIN"));

        assertEquals(1, vue.reunions().size());
        assertFalse(vue.reunions().get(0).isPeutAnnuler());
        assertFalse(vue.peutPlanifier());
        verify(reunionRepository, never()).findConcernant(any());
    }

    @Test
    void lePilotePlanifieUneReunionAvecDesChefsSansProjet() {
        reunionService.planifierSansProjet(
                demande("Revue qualité", LocalDateTime.now().plusDays(1), 30, List.of(EMAIL_AUTRE_CHEF, "chef-1@exemple.com")), pilote());

        verify(googleMeetService).creer(eq("Revue qualité"), argThat(texte -> texte.startsWith("Réunion organisée par pilote-1")),
                any(), eq(30), eq(List.of(EMAIL_PILOTE, EMAIL_AUTRE_CHEF, "chef-1@exemple.com")));
        verify(reunionRepository).save(argThat(reunion -> reunion.getProjetId() == null
                && reunion.getOrganisateurId().equals(PILOTE)
                && reunion.getParticipantIds().equals(List.of(AUTRE_CHEF, CHEF))
                && reunion.getParticipantNoms().equals(List.of(AUTRE_CHEF, CHEF))));
        verifyNoInteractions(historiqueService);
        verify(userNotificationService).createReunionNotification(any(), isNull(), eq(true));
    }

    @Test
    void lePiloteNInviteQueDesChefsDeProjet() {
        LocalDateTime demain = LocalDateTime.now().plusDays(1);

        for (String email : List.of("admin-1@exemple.com", EMAIL_PILOTE, EMAIL_RIM, "inconnu@exemple.com")) {
            assertThrows(IllegalArgumentException.class,
                    () -> reunionService.planifierSansProjet(demande("Revue", demain, 30, List.of(email)), pilote()));
        }
        verifierAucunAppelGoogle();
    }

    @Test
    void seulUnPilotePlanifieSansProjet() {
        assertThrows(AccessDeniedException.class, () -> reunionService.planifierSansProjet(demandeValide(), chef()));
        assertThrows(AccessDeniedException.class,
                () -> reunionService.planifierSansProjet(demandeValide(), connecte(ADMIN, "ROLE_ADMIN")));
        verifierAucunAppelGoogle();
    }

    @Test
    void lAnnulationDUneReunionSansProjetPrevientSansTraceDansUnHistorique() {
        Reunion reunion = reunion(LocalDateTime.now().plusDays(1));
        reunion.setProjetId(null);
        reunion.setOrganisateurId(PILOTE);
        when(reunionRepository.findById("r1")).thenReturn(Optional.of(reunion));

        reunionService.annuler("r1", pilote());

        verify(googleMeetService).annuler("ev1");
        verify(reunionRepository).delete(reunion);
        verifyNoInteractions(historiqueService);
        verify(userNotificationService).createReunionNotification(reunion, null, false);
    }

    @Test
    void unChefVoitCellesQuIlOrganiseEtCellesOuIlEstInvite() {
        Reunion organisee = reunion(LocalDateTime.now().plusDays(1));
        Reunion passee = reunion(LocalDateTime.now().minusDays(1));
        when(reunionRepository.findConcernant(CHEF)).thenReturn(List.of(organisee, passee));
        when(reunionRepository.findConcernant(AUTRE_CHEF)).thenReturn(List.of(reunion(LocalDateTime.now().plusDays(1))));

        ReunionsDTO vueOrganisateur = reunionService.lister(chef());
        ReunionsDTO vueInvite = reunionService.lister(autreChef());

        assertTrue(vueOrganisateur.peutPlanifier());
        assertTrue(vueOrganisateur.reunions().get(0).isPeutAnnuler());
        assertFalse(vueOrganisateur.reunions().get(1).isPeutAnnuler(), "une réunion terminée ne s'annule plus");
        assertEquals("Atlas", vueInvite.reunions().get(0).getNomProjet());
        assertFalse(vueInvite.reunions().get(0).isPeutAnnuler(), "un invité n'annule pas la réunion d'un autre");
        verify(reunionRepository, never()).findAll(any(Sort.class));
    }

    @Test
    void leNomDuProjetEtLeDroitDAnnulerNeSontPasEnregistres() {
        reunionService.planifier(PROJET, demandeValide(), chef());

        verify(reunionRepository).save(argThat(reunion -> reunion.getNomProjet() == null && !reunion.isPeutAnnuler()));
        assertNull(new Reunion().getNomProjet());
    }

    @Test
    void lAnnulationPasseParGooglePuisRetireLaReunionEtPrevientLesParticipants() {
        Reunion reunion = reunion(LocalDateTime.now().plusDays(1));
        when(reunionRepository.findById("r1")).thenReturn(Optional.of(reunion));

        reunionService.annuler("r1", chef());

        verify(googleMeetService).annuler("ev1");
        verify(reunionRepository).delete(reunion);
        verify(historiqueService).enregistrerAction(eq("FICHE_PROJET"), eq(PROJET), eq(CHEF), eq("ANNULATION_REUNION"),
                eq("Réunion annulée : Revue"), any(), any(), eq(PROJET), eq("Atlas"));
        verify(userNotificationService).createReunionNotification(reunion, "Atlas", false);
    }

    @Test
    void seulLOrganisateurAnnule() {
        when(reunionRepository.findById("r1")).thenReturn(Optional.of(reunion(LocalDateTime.now().plusDays(1))));

        assertThrows(AccessDeniedException.class, () -> reunionService.annuler("r1", pilote()));
        assertThrows(AccessDeniedException.class, () -> reunionService.annuler("r1", autreChef()));

        verify(googleMeetService, never()).annuler(any());
        verify(reunionRepository, never()).delete(any());
    }

    @Test
    void uneReunionTermineeNePeutPlusEtreAnnulee() {
        when(reunionRepository.findById("r1")).thenReturn(Optional.of(reunion(LocalDateTime.now().minusDays(1))));

        assertThrows(IllegalStateException.class, () -> reunionService.annuler("r1", chef()));

        verify(googleMeetService, never()).annuler(any());
    }

    @Test
    void siGoogleEchoueLaReunionResteDansLaListe() {
        when(reunionRepository.findById("r1")).thenReturn(Optional.of(reunion(LocalDateTime.now().plusDays(1))));
        doThrow(new GoogleMeetService.Indisponible("Google n'a pas pu annuler la réunion. Réessayez.", null))
                .when(googleMeetService).annuler("ev1");

        assertThrows(GoogleMeetService.Indisponible.class, () -> reunionService.annuler("r1", chef()));

        verify(reunionRepository, never()).delete(any());
        verifyNoInteractions(userNotificationService);
    }

    @Test
    void siGoogleEchoueALaCreationRienNEstEnregistre() {
        when(googleMeetService.creer(anyString(), anyString(), any(), anyInt(), any()))
                .thenThrow(new GoogleMeetService.Indisponible("Google n'a pas pu créer la réunion. Réessayez.", null));

        assertThrows(GoogleMeetService.Indisponible.class, () -> reunionService.planifier(PROJET, demandeValide(), chef()));

        verify(reunionRepository, never()).save(any());
        verifyNoInteractions(userNotificationService);
    }

    @Test
    void laSuppressionDuProjetAnnuleLesReunionsAVenirSeulement() {
        Reunion passee = reunion(LocalDateTime.now().minusDays(3));
        passee.setEvenementGoogleId("ev-passe");
        Reunion aVenir = reunion(LocalDateTime.now().plusDays(3));
        List<Reunion> reunions = List.of(aVenir, passee);
        when(reunionRepository.findByProjetIdOrderByDebutDesc(PROJET)).thenReturn(reunions);

        reunionService.supprimerDuProjet(PROJET);

        verify(googleMeetService).annuler("ev1");
        verify(googleMeetService, never()).annuler("ev-passe");
        verify(reunionRepository).deleteAll(reunions);
    }

    @Test
    void unEchecDeGoogleNEmpechePasDeSupprimerLeProjet() {
        List<Reunion> reunions = List.of(reunion(LocalDateTime.now().plusDays(3)));
        when(reunionRepository.findByProjetIdOrderByDebutDesc(PROJET)).thenReturn(reunions);
        doThrow(new GoogleMeetService.Indisponible("Google n'a pas pu annuler la réunion. Réessayez.", null))
                .when(googleMeetService).annuler("ev1");

        reunionService.supprimerDuProjet(PROJET);

        verify(reunionRepository).deleteAll(reunions);
    }
}
