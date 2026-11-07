package com.example.demo.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.dto.MessageResponse;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.HistoriqueModification;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.FicheProjetService;
import com.example.demo.service.FicheSuiviService;
import com.example.demo.service.HistoriqueService;
import com.example.demo.service.UserNotificationService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Un chef de projet ne lit que ses fiches ; le pilote qualité et l'administrateur lisent tout. */
@ExtendWith(MockitoExtension.class)
class ControleAccesFichesTest {

    private static final String CHEF = "chef-1";
    private static final String AUTRE_CHEF = "chef-2";

    @Mock
    private FicheProjetService ficheProjetService;
    @Mock
    private FicheSuiviService ficheSuiviService;
    @Mock
    private HistoriqueService historiqueService;
    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private FicheSuiviRepository ficheSuiviRepository;
    @Mock
    private UserNotificationService userNotificationService;
    @Spy
    private ControleAcces controleAcces = new ControleAcces();

    @InjectMocks
    private FicheProjetController ficheProjetController;
    @InjectMocks
    private FicheSuiviController ficheSuiviController;
    @InjectMocks
    private HistoriqueController historiqueController;

    private static Authentication connecte(String id, String role) {
        UserDetailsImpl utilisateur = new UserDetailsImpl(id, id, id + "@qualinet.com", "",
                List.of(new SimpleGrantedAuthority(role)));
        return new UsernamePasswordAuthenticationToken(utilisateur, null, utilisateur.getAuthorities());
    }

    private static Authentication chef() {
        return connecte(CHEF, "ROLE_CHEF_PROJET");
    }

    private static FicheProjet projetDe(String chefProjetId) {
        FicheProjet projet = new FicheProjet();
        projet.setChefProjetId(chefProjetId);
        return projet;
    }

    private static FicheSuivi suiviDe(String chefProjetId) {
        FicheSuivi suivi = new FicheSuivi();
        suivi.setChefProjetId(chefProjetId);
        return suivi;
    }

    private static final String FICHE_VALIDEE = "Cette fiche a été validée par le pilote qualité : elle ne peut plus être supprimée.";

    @Test
    void uneSuppressionRefuseeRepond409SansRienAnnoncerAuxPilotes() {
        when(ficheProjetService.verifierSuppression("p1", CHEF)).thenThrow(new IllegalStateException(FICHE_VALIDEE));
        when(ficheSuiviService.verifierSuppression("s1", CHEF)).thenThrow(new IllegalStateException(FICHE_VALIDEE));

        ResponseEntity<?> projet = ficheProjetController.deleteFicheProjet("p1", chef());
        ResponseEntity<?> suivi = ficheSuiviController.deleteFicheSuivi("s1", chef());

        assertEquals(HttpStatus.CONFLICT, projet.getStatusCode());
        assertEquals(HttpStatus.CONFLICT, suivi.getStatusCode());
        assertEquals(FICHE_VALIDEE, ((MessageResponse) projet.getBody()).getMessage());
        verify(ficheProjetService, never()).deleteFicheProjet(anyString(), anyString());
        verify(ficheSuiviService, never()).deleteFicheSuivi(anyString(), anyString());
        verify(userNotificationService, never()).createFicheProjetNotification(anyString(), anyString(), anyString());
        verify(userNotificationService, never()).createFicheSuiviNotification(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void unChefLitSaFicheProjetMaisPasCelleDUnAutre() {
        when(ficheProjetService.getFicheProjetById("p1")).thenReturn(projetDe(CHEF));
        when(ficheProjetService.getFicheProjetById("p2")).thenReturn(projetDe(AUTRE_CHEF));

        assertEquals(HttpStatus.OK, ficheProjetController.getFicheProjetById("p1", chef()).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, ficheProjetController.getFicheProjetById("p2", chef()).getStatusCode());
    }

    @Test
    void lAdministrateurLitToutesLesFichesProjet() {
        when(ficheProjetService.getFicheProjetById("p2")).thenReturn(projetDe(AUTRE_CHEF));

        ResponseEntity<FicheProjet> reponse =
                ficheProjetController.getFicheProjetById("p2", connecte("admin-1", "ROLE_ADMIN"));

        assertEquals(HttpStatus.OK, reponse.getStatusCode());
    }

    @Test
    void laListeParStatutNeRenvoieQueLesFichesDuChef() {
        List<FicheProjet> fiches = List.of(projetDe(CHEF), projetDe(AUTRE_CHEF));
        when(ficheProjetService.getFichesProjetByStatut("EN_COURS")).thenReturn(fiches);

        assertEquals(1, ficheProjetController.getFichesProjetByStatut("EN_COURS", chef()).getBody().size());
    }

    @Test
    void unChefNeLitPasLaFicheDeSuiviDUnAutre() {
        when(ficheSuiviService.getFicheSuiviById("s1")).thenReturn(suiviDe(AUTRE_CHEF));

        assertEquals(HttpStatus.FORBIDDEN, ficheSuiviController.getFicheSuiviById("s1", chef()).getStatusCode());
    }

    @Test
    void lesFichesDeSuiviDUnProjetSontLimiteesAuChef() {
        when(ficheSuiviService.getFichesSuiviByProjet("p1")).thenReturn(List.of(suiviDe(CHEF), suiviDe(AUTRE_CHEF)));

        assertEquals(1, ficheSuiviController.getFichesSuiviByProjet("p1", chef()).getBody().size());
    }

    @Test
    void leNomDuProjetDUnAutreChefEstRefuse() {
        when(ficheProjetRepository.findById("p2")).thenReturn(Optional.of(projetDe(AUTRE_CHEF)));

        assertEquals(HttpStatus.FORBIDDEN, ficheSuiviController.getProjetName("p2", chef()).getStatusCode());
        verify(ficheSuiviService, never()).getProjetName(anyString());
    }

    @Test
    void lHistoriqueDUnProjetEstReserveASonChef() {
        when(ficheProjetRepository.findById("p2")).thenReturn(Optional.of(projetDe(AUTRE_CHEF)));

        assertEquals(HttpStatus.FORBIDDEN,
                historiqueController.getHistoriqueCompletProjet("p2", chef()).getStatusCode());
        verify(historiqueService, never()).getHistoriqueCompletProjet(anyString());
    }

    @Test
    void lePiloteQualiteGardeLHistoriqueDeTousLesProjets() {
        when(historiqueService.getHistoriqueCompletProjet("p2")).thenReturn(List.of(new HistoriqueModification()));

        ResponseEntity<List<HistoriqueModification>> reponse = historiqueController
                .getHistoriqueCompletProjet("p2", connecte("pilote-1", "ROLE_PILOTE_QUALITE"));

        assertEquals(HttpStatus.OK, reponse.getStatusCode());
    }

    @Test
    void lHistoriqueDUneFicheSuitLeProprietaireDeLaFiche() {
        when(ficheProjetRepository.findById("p1")).thenReturn(Optional.of(projetDe(CHEF)));
        when(ficheSuiviRepository.findById("s2")).thenReturn(Optional.of(suiviDe(AUTRE_CHEF)));

        assertEquals(HttpStatus.OK,
                historiqueController.getHistoriqueByEntity("FICHE_PROJET", "p1", chef()).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN,
                historiqueController.getHistoriqueByEntity("FICHE_SUIVI", "s2", chef()).getStatusCode());
    }

    @Test
    void unChefNeConsulteQueSonPropreJournal() {
        assertEquals(HttpStatus.OK, historiqueController.getHistoriqueByUser(CHEF, chef()).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN,
                historiqueController.getHistoriqueByUser(AUTRE_CHEF, chef()).getStatusCode());
    }
}
