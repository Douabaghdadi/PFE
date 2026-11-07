package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.demo.dto.PiecesJointesFicheDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.PieceJointe;
import com.example.demo.model.StatutValidation;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.PieceJointeRepository;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import java.io.InputStream;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Seul le chef de la fiche gère ses documents ; chaque changement la renvoie au pilote qualité et laisse une trace. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PieceJointeServiceTest {

    private static final String CHEF = "chef-1";
    private static final String FICHES_PROJET = "fiches-projet";
    private static final String FICHES_SUIVI = "fiches-suivi";
    private static final String CONTENU_ID = new ObjectId().toHexString();

    @Mock
    private PieceJointeRepository pieceJointeRepository;
    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private FicheSuiviRepository ficheSuiviRepository;
    @Mock
    private GridFsTemplate gridFsTemplate;
    @Mock
    private HistoriqueService historiqueService;
    @Mock
    private UserNotificationService userNotificationService;
    @Spy
    private ControleAcces controleAcces = new ControleAcces();

    @InjectMocks
    private PieceJointeService pieceJointeService;

    private FicheProjet projet;
    private FicheSuivi suivi;

    private static Authentication connecte(String id, String role) {
        UserDetailsImpl utilisateur = new UserDetailsImpl(id, id, id + "@qualinet.com", "",
                List.of(new SimpleGrantedAuthority(role)));
        return new UsernamePasswordAuthenticationToken(utilisateur, null, utilisateur.getAuthorities());
    }

    private static Authentication chef() {
        return connecte(CHEF, "ROLE_CHEF_PROJET");
    }

    private static Authentication autreChef() {
        return connecte("chef-2", "ROLE_CHEF_PROJET");
    }

    private static Authentication pilote() {
        return connecte("pilote-1", "ROLE_PILOTE_QUALITE");
    }

    private static MockMultipartFile fichier(String nom, byte[] contenu) {
        return new MockMultipartFile("fichier", nom, "text/html", contenu);
    }

    private static MockMultipartFile compteRendu() {
        return fichier("compte-rendu.pdf", new byte[] {1, 2, 3});
    }

    private PieceJointe pieceDuProjet() {
        PieceJointe piece = new PieceJointe();
        piece.setId("piece-1");
        piece.setEntityType(PieceJointeService.TYPE_FICHE_PROJET);
        piece.setEntityId("projet-1");
        piece.setProjetId("projet-1");
        piece.setNomFichier("compte-rendu.pdf");
        piece.setFichierId(CONTENU_ID);
        when(pieceJointeRepository.findById("piece-1")).thenReturn(Optional.of(piece));
        return piece;
    }

    @BeforeEach
    void preparerLesFiches() {
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

        when(gridFsTemplate.store(any(InputStream.class), anyString(), anyString())).thenReturn(new ObjectId(CONTENU_ID));
    }

    @Test
    void leChefDeLaFicheAjouteUnDocumentStockeDansGridFs() {
        pieceJointeService.ajouter(FICHES_SUIVI, "suivi-1", compteRendu(), chef());

        verify(gridFsTemplate).store(any(InputStream.class), eq("compte-rendu.pdf"), eq("application/pdf"));
        verify(pieceJointeRepository).save(argThat(piece -> piece.getEntityType().equals("FICHE_SUIVI")
                && piece.getEntityId().equals("suivi-1")
                && piece.getProjetId().equals("projet-1")
                && piece.getFichierId().equals(CONTENU_ID)
                && piece.getTaille() == 3
                && piece.getDeposeParNom().equals(CHEF)
                && piece.getDateDepot() != null));
    }

    @Test
    void leTypeDuDocumentVientDeSonExtensionPasDuNavigateur() {
        // Le fichier de test se déclare « text/html » : ce type ne doit jamais être conservé
        pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("PV-Reunion.DOCX", new byte[] {1}), chef());

        verify(pieceJointeRepository).save(argThat(piece -> piece.getTypeMime()
                .equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document")));
    }

    @Test
    void leNomDuFichierPerdSonCheminEtSesCaracteresDeControle() {
        pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("C:\\temp\\../pv\r\n.pdf", new byte[] {1}), chef());

        verify(pieceJointeRepository).save(argThat(piece -> piece.getNomFichier().equals("pv.pdf")));
    }

    @Test
    void ajouterUnDocumentRenvoieUneFicheValideeAuPiloteQualite() {
        projet.getValidation().valider("pilote-1", "amel.bensalah");

        PiecesJointesFicheDTO etat = pieceJointeService.ajouter(FICHES_PROJET, "projet-1", compteRendu(), chef());

        assertEquals(StatutValidation.A_VALIDER, etat.validation().getStatut());
        verify(ficheProjetRepository).save(projet);
    }

    @Test
    void ajouterUnDocumentLeTraceDansLHistoriqueEtPrevientLesPilotes() {
        projet.getValidation().valider("pilote-1", "amel.bensalah");

        pieceJointeService.ajouter(FICHES_PROJET, "projet-1", compteRendu(), chef());

        verify(historiqueService).enregistrerAction(eq("FICHE_PROJET"), eq("projet-1"), eq(CHEF), eq("AJOUT_DOCUMENT"),
                eq("Document ajouté : compte-rendu.pdf"),
                eq(Map.of("statutValidation", "Validée")),
                eq(Map.of("statutValidation", "À valider", "document", "compte-rendu.pdf")),
                eq("projet-1"), eq("e-Bourse"));
        verify(userNotificationService).createPieceJointeNotification("projet-1", "FICHE_PROJET", "e-Bourse",
                "compte-rendu.pdf", true, CHEF);
    }

    @Test
    void unAutreChefNeTouchePasAuxDocumentsDUneFiche() {
        assertThrows(AccessDeniedException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", compteRendu(), autreChef()));

        verifyNoInteractions(gridFsTemplate);
    }

    @Test
    void lePiloteQualiteLitLesDocumentsMaisNeLesGerePas() {
        assertThrows(AccessDeniedException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", compteRendu(), pilote()));

        pieceDuProjet();
        assertThrows(AccessDeniedException.class, () -> pieceJointeService.retirer("piece-1", pilote()));

        assertFalse(pieceJointeService.lister(FICHES_PROJET, "projet-1", pilote()).peutGerer());
        verify(pieceJointeRepository, never()).delete(any());
    }

    @Test
    void unFormatNonPrevuEstRefuse() {
        IllegalArgumentException refus = assertThrows(IllegalArgumentException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("outil.exe", new byte[] {1}), chef()));

        assertTrue(refus.getMessage().startsWith("Format refusé"));
        verifyNoInteractions(gridFsTemplate);
    }

    @Test
    void unFichierSansExtensionEstRefuse() {
        assertThrows(IllegalArgumentException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("pdf", new byte[] {1}), chef()));
    }

    @Test
    void unFichierVideEstRefuse() {
        assertThrows(IllegalArgumentException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("vide.pdf", new byte[0]), chef()));

        verifyNoInteractions(gridFsTemplate);
    }

    @Test
    void unFichierDeDixMegaOctetsPasseEtPasAuDela() {
        byte[] aLaLimite = new byte[(int) PieceJointeService.TAILLE_MAX_OCTETS];
        pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("limite.pdf", aLaLimite), chef());
        verify(gridFsTemplate).store(any(InputStream.class), eq("limite.pdf"), anyString());

        byte[] tropLourd = new byte[(int) PieceJointeService.TAILLE_MAX_OCTETS + 1];
        assertThrows(IllegalArgumentException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", fichier("lourd.pdf", tropLourd), chef()));
        verify(gridFsTemplate, never()).store(any(InputStream.class), eq("lourd.pdf"), anyString());
    }

    @Test
    void uneFicheNaccepteQueDixDocuments() {
        when(pieceJointeRepository.countByEntityTypeAndEntityId("FICHE_PROJET", "projet-1"))
                .thenReturn((long) PieceJointeService.NOMBRE_MAX_PAR_FICHE);

        assertThrows(IllegalStateException.class,
                () -> pieceJointeService.ajouter(FICHES_PROJET, "projet-1", compteRendu(), chef()));

        verifyNoInteractions(gridFsTemplate);
    }

    @Test
    void unChefNeLitQueLesDocumentsDeSesFiches() {
        assertTrue(pieceJointeService.lister(FICHES_PROJET, "projet-1", chef()).peutGerer());
        assertThrows(AccessDeniedException.class,
                () -> pieceJointeService.lister(FICHES_PROJET, "projet-1", autreChef()));

        pieceDuProjet();
        assertThrows(AccessDeniedException.class, () -> pieceJointeService.ouvrir("piece-1", autreChef()));
        verifyNoInteractions(gridFsTemplate);
    }

    @Test
    void unDocumentSansContenuEstSignaleCommeIntrouvable() {
        pieceDuProjet();
        when(gridFsTemplate.findOne(any(Query.class))).thenReturn(null);

        assertThrows(NoSuchElementException.class, () -> pieceJointeService.ouvrir("piece-1", pilote()));
    }

    @Test
    void unTypeDeFicheInconnuEstIntrouvable() {
        assertThrows(NoSuchElementException.class,
                () -> pieceJointeService.lister("fiches-inconnues", "projet-1", chef()));
    }

    @Test
    void retirerUnDocumentEffaceSonContenuEtRenvoieLaFicheAuPilote() {
        PieceJointe piece = pieceDuProjet();
        projet.getValidation().demanderCorrection("Joindre le PV", "pilote-1", "amel.bensalah");

        PiecesJointesFicheDTO etat = pieceJointeService.retirer("piece-1", chef());

        verify(pieceJointeRepository).delete(piece);
        verify(gridFsTemplate).delete(any(Query.class));
        assertEquals(StatutValidation.A_VALIDER, etat.validation().getStatut());
        verify(historiqueService).enregistrerAction(eq("FICHE_PROJET"), eq("projet-1"), eq(CHEF), eq("RETRAIT_DOCUMENT"),
                eq("Document retiré : compte-rendu.pdf"),
                eq(Map.of("statutValidation", "À corriger", "document", "compte-rendu.pdf")),
                eq(Map.of("statutValidation", "À valider")),
                eq("projet-1"), eq("e-Bourse"));
        verify(userNotificationService).createPieceJointeNotification("projet-1", "FICHE_PROJET", "e-Bourse",
                "compte-rendu.pdf", false, CHEF);
    }

    @Test
    void lesDocumentsDisparaissentAvecLeurFiche() {
        PieceJointe piece = pieceDuProjet();
        when(pieceJointeRepository.findByEntityTypeAndEntityIdOrderByDateDepotDesc("FICHE_PROJET", "projet-1"))
                .thenReturn(List.of(piece));

        pieceJointeService.supprimerDeLaFiche("FICHE_PROJET", "projet-1");

        verify(pieceJointeRepository).delete(piece);
        verify(gridFsTemplate).delete(any(Query.class));
    }

    @Test
    void laListeEstRenvoyeeAvecLaValidationDeLaFiche() {
        PieceJointe piece = pieceDuProjet();
        when(pieceJointeRepository.findByEntityTypeAndEntityIdOrderByDateDepotDesc("FICHE_PROJET", "projet-1"))
                .thenReturn(List.of(piece));

        PiecesJointesFicheDTO etat = pieceJointeService.lister(FICHES_PROJET, "projet-1", pilote());

        assertEquals(List.of(piece), etat.pieces());
        assertSame(projet.getValidation(), etat.validation());
    }
}
