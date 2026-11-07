package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.dto.FicheProjetRequest;
import com.example.demo.dto.FicheSuiviRequest;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.StatutValidation;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.UserRepository;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/** Une décision est enregistrée, tracée et notifiée ; une modification du chef de projet l'annule. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ValidationFicheServiceTest {

    private static final String PILOTE = "pilote-1";
    private static final String CHEF = "chef-1";

    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private FicheSuiviRepository ficheSuiviRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HistoriqueService historiqueService;
    @Mock
    private UserNotificationService userNotificationService;

    @InjectMocks
    private ValidationFicheService validationFicheService;
    @InjectMocks
    private FicheSuiviService ficheSuiviService;
    @InjectMocks
    private FicheProjetService ficheProjetService;

    private FicheProjet projet;
    private FicheSuivi suivi;

    @BeforeEach
    void preparerLesFiches() {
        User pilote = new User("amel.bensalah", "amel.bensalah@qualinet.com", "");
        pilote.setFirstName("Amel");
        pilote.setLastName("Ben Salah");
        when(userRepository.findById(PILOTE)).thenReturn(Optional.of(pilote));

        projet = new FicheProjet();
        projet.setId("projet-1");
        projet.setNomProjet("e-Bourse");
        projet.setChefProjetId(CHEF);
        when(ficheProjetRepository.findById("projet-1")).thenReturn(Optional.of(projet));
        when(ficheProjetRepository.save(any(FicheProjet.class))).thenAnswer(appel -> appel.getArgument(0));

        suivi = new FicheSuivi();
        suivi.setId("suivi-1");
        suivi.setFicheProjetId("projet-1");
        suivi.setNumeroRapport("Rapport_1");
        suivi.setChefProjetId(CHEF);
        when(ficheSuiviRepository.findById("suivi-1")).thenReturn(Optional.of(suivi));
        when(ficheSuiviRepository.save(any(FicheSuivi.class))).thenAnswer(appel -> appel.getArgument(0));
    }

    @Test
    void validerUneFicheDeSuiviLEnregistreLaTraceEtPrevientLeChef() {
        FicheSuivi resultat = validationFicheService.validerFicheSuivi("suivi-1", PILOTE);

        assertEquals(StatutValidation.VALIDEE, resultat.getValidation().getStatut());
        // Le compte a un prénom et un nom, mais la décision affiche son nom d'utilisateur
        assertEquals("amel.bensalah", resultat.getValidation().getPiloteNom());
        verify(ficheSuiviRepository).save(suivi);
        verify(historiqueService).enregistrerAction(eq("FICHE_SUIVI"), eq("suivi-1"), eq(PILOTE),
                eq("VALIDATION"), anyString(), any(), any(), eq("projet-1"), eq("Rapport_1"));
        verify(userNotificationService).createValidationNotification(CHEF, "suivi-1", "FICHE_SUIVI", "e-Bourse",
                resultat.getValidation());
    }

    @Test
    void uneDemandeDeCorrectionGardeLeMotifDansLaFicheEtDansLHistorique() {
        FicheProjet resultat = validationFicheService.demanderCorrectionFicheProjet("projet-1", "  Budget manquant ", PILOTE);

        assertEquals(StatutValidation.A_CORRIGER, resultat.getValidation().getStatut());
        assertEquals("Budget manquant", resultat.getValidation().getMotif());
        verify(historiqueService).enregistrerAction(eq("FICHE_PROJET"), eq("projet-1"), eq(PILOTE),
                eq("DEMANDE_CORRECTION"), eq("Correction demandée : Budget manquant"),
                eq(Map.of("statutValidation", "À valider")),
                eq(Map.of("statutValidation", "À corriger", "motif", "Budget manquant")),
                eq("projet-1"), eq("e-Bourse"));
        verify(userNotificationService).createValidationNotification(CHEF, "projet-1", "FICHE_PROJET", "e-Bourse",
                resultat.getValidation());
    }

    @Test
    void uneFicheIntrouvableNeProduitNiTraceNiNotification() {
        when(ficheSuiviRepository.findById("inconnue")).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> validationFicheService.validerFicheSuivi("inconnue", PILOTE));

        verify(userNotificationService, never()).createValidationNotification(any(), any(), any(), any(), any());
    }

    @Test
    void uneDecisionRefuseeNEnregistreRien() {
        validationFicheService.validerFicheProjet("projet-1", PILOTE);

        assertThrows(IllegalStateException.class, () -> validationFicheService.validerFicheProjet("projet-1", PILOTE));

        // Une seule décision enregistrée : celle de l'appel qui a réussi
        verify(ficheProjetRepository).save(projet);
    }

    @Test
    void laCorrectionDuChefRenvoieLaFicheDeSuiviAuPilote() {
        validationFicheService.demanderCorrectionFicheSuivi("suivi-1", "Budget manquant", PILOTE);

        FicheSuiviRequest correction = new FicheSuiviRequest();
        correction.setFicheProjetId("projet-1");
        FicheSuivi resultat = ficheSuiviService.updateFicheSuivi("suivi-1", correction, CHEF);

        assertEquals(StatutValidation.A_VALIDER, resultat.getValidation().getStatut());
        assertNull(resultat.getValidation().getMotif());
        verify(historiqueService).enregistrerModification(eq("FICHE_SUIVI"), eq("suivi-1"), eq(CHEF),
                argThat(avant -> "À corriger".equals(avant.get("statutValidation"))),
                argThat(apres -> "À valider".equals(apres.get("statutValidation"))),
                eq("projet-1"), any());
    }

    @Test
    void modifierUneFicheProjetValideeDemandeUneNouvelleValidation() {
        validationFicheService.validerFicheProjet("projet-1", PILOTE);

        FicheProjet resultat = ficheProjetService.updateFicheProjet("projet-1", new FicheProjetRequest(), CHEF);

        assertEquals(StatutValidation.A_VALIDER, resultat.getValidation().getStatut());
    }

    @Test
    void definirLaPeriodiciteNAnnulePasLaValidation() {
        validationFicheService.validerFicheProjet("projet-1", PILOTE);

        FicheProjet resultat = ficheProjetService.configurerPeriodicite("projet-1", 3);

        assertEquals(StatutValidation.VALIDEE, resultat.getValidation().getStatut());
    }
}
