package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.example.demo.dto.CalendrierSuiviDTO;
import com.example.demo.dto.EcheanceSuiviDTO;
import com.example.demo.dto.EcheanceSuiviDTO.Statut;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/** Le chef de projet voit la prochaine fiche attendue de chaque projet, les suivantes et celles qu'il a déposées. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CalendrierSuiviServiceTest {

    private static final String CHEF = "chef-1";
    private static final LocalDate AUJOURDHUI = LocalDate.of(2026, 11, 8);

    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private FicheSuiviRepository ficheSuiviRepository;

    @InjectMocks
    private CalendrierSuiviService service;

    @BeforeEach
    void aucuneFicheParDefaut() {
        when(ficheSuiviRepository.findByChefProjetId(CHEF)).thenReturn(List.of());
    }

    private static FicheProjet projet(String id, LocalDate prochaine, Integer periodicite, LocalDate finPrevue) {
        FicheProjet projet = new FicheProjet();
        projet.setId(id);
        projet.setNomProjet("Projet " + id);
        projet.setStatut("EN_COURS");
        projet.setDateProchaineFicheSuivi(prochaine);
        projet.setPeriodiciteSuiviMois(periodicite);
        projet.setDateFinPrevue(finPrevue);
        return projet;
    }

    private static FicheSuivi fiche(String id, String projetId, LocalDateTime creeeLe, LocalDate dateRapport) {
        FicheSuivi fiche = new FicheSuivi();
        fiche.setId(id);
        fiche.setFicheProjetId(projetId);
        fiche.setNumeroRapport("Rapport_" + id);
        fiche.setDateCreation(creeeLe);
        fiche.setDateRapport(dateRapport);
        return fiche;
    }

    private CalendrierSuiviDTO calendrier(FicheProjet... projets) {
        when(ficheProjetRepository.findByChefProjetId(CHEF)).thenReturn(List.of(projets));
        return service.calendrierDe(CHEF, AUJOURDHUI);
    }

    private static List<LocalDate> dates(CalendrierSuiviDTO calendrier, Statut statut) {
        return calendrier.echeances().stream().filter(e -> e.statut() == statut).map(EcheanceSuiviDTO::date).toList();
    }

    private static EcheanceSuiviDTO seule(CalendrierSuiviDTO calendrier, Statut statut) {
        List<EcheanceSuiviDTO> trouvees = calendrier.echeances().stream().filter(e -> e.statut() == statut).toList();
        assertEquals(1, trouvees.size());
        return trouvees.get(0);
    }

    @Test
    void uneDatePasseeEstEnRetardUneSeuleFois() {
        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2026, 9, 1), 1, LocalDate.of(2026, 12, 31)));

        EcheanceSuiviDTO retard = seule(calendrier, Statut.EN_RETARD);
        assertEquals(LocalDate.of(2026, 9, 1), retard.date());
        assertEquals(-68L, retard.joursRestants());
        // Octobre et le 1er novembre sont passés : ils ne deviennent ni des retards ni des dates prévues
        assertEquals(List.of(LocalDate.of(2026, 12, 1)), dates(calendrier, Statut.PREVUE));
    }

    @Test
    void lEcheanceDuJourNEstPasEnRetard() {
        EcheanceSuiviDTO attendue = seule(calendrier(projet("a", AUJOURDHUI, 1, null)), Statut.A_DEPOSER);

        assertEquals(0L, attendue.joursRestants());
    }

    @Test
    void lesDatesPrevuesSArretentALaFinDuProjet() {
        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2026, 12, 1), 3, LocalDate.of(2027, 6, 15)));

        assertEquals(List.of(LocalDate.of(2027, 3, 1), LocalDate.of(2027, 6, 1)), dates(calendrier, Statut.PREVUE));
    }

    @Test
    void sansDateDeFinLesDatesPrevuesTiennentSurUnAn() {
        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2026, 12, 1), 6, null));

        assertEquals(List.of(LocalDate.of(2027, 6, 1)), dates(calendrier, Statut.PREVUE));
    }

    @Test
    void uneDateLointaineDeFinNAllongePasLHorizon() {
        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2026, 12, 1), 6, LocalDate.of(2099, 1, 1)));

        assertEquals(List.of(LocalDate.of(2027, 6, 1)), dates(calendrier, Statut.PREVUE));
    }

    @Test
    void uneFinDeMoisNeGlissePas() {
        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2027, 1, 31), 1, LocalDate.of(2027, 3, 31)));

        assertEquals(List.of(LocalDate.of(2027, 2, 28), LocalDate.of(2027, 3, 31)), dates(calendrier, Statut.PREVUE));
    }

    @Test
    void sansPeriodiciteLaProchaineDateSeRepeteChaqueMois() {
        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2026, 12, 1), null, LocalDate.of(2027, 1, 31)));

        assertNull(seule(calendrier, Statut.A_DEPOSER).periodiciteMois());
        assertEquals(List.of(LocalDate.of(2027, 1, 1)), dates(calendrier, Statut.PREVUE));
    }

    @Test
    void laPremiereFicheEstAttendueUnePeriodiciteApresLeDebut() {
        FicheProjet projet = projet("a", null, 2, null);
        projet.setDateDebut(LocalDate.of(2026, 11, 1));

        assertEquals(LocalDate.of(2027, 1, 1), seule(calendrier(projet), Statut.A_DEPOSER).date());
    }

    @Test
    void sansPeriodiciteNiDateLeProjetEstSignale() {
        FicheProjet projet = projet("a", null, null, null);
        projet.setDateDebut(LocalDate.of(2026, 11, 1));

        CalendrierSuiviDTO calendrier = calendrier(projet);

        assertTrue(calendrier.echeances().isEmpty());
        assertEquals(List.of("Projet a"), calendrier.projetsSansEcheance());
    }

    @Test
    void unProjetClosNAttendPlusDeFicheMaisGardeSesDepots() {
        FicheProjet termine = projet("a", LocalDate.of(2026, 9, 1), 1, null);
        termine.setStatut("TERMINE");
        FicheProjet annule = projet("b", null, null, null);
        annule.setStatut("ANNULE");
        when(ficheSuiviRepository.findByChefProjetId(CHEF))
                .thenReturn(List.of(fiche("f1", "a", LocalDateTime.of(2026, 8, 3, 9, 0), null)));

        CalendrierSuiviDTO calendrier = calendrier(termine, annule);

        assertEquals(1, calendrier.echeances().size());
        assertEquals(Statut.DEPOSEE, calendrier.echeances().get(0).statut());
        assertTrue(calendrier.projetsSansEcheance().isEmpty());
    }

    @Test
    void unDepotEstDateDeSonEnregistrement() {
        when(ficheSuiviRepository.findByChefProjetId(CHEF))
                .thenReturn(List.of(fiche("f1", "a", LocalDateTime.of(2026, 10, 5, 23, 30), LocalDate.of(2026, 9, 20))));

        EcheanceSuiviDTO depot = seule(calendrier(projet("a", LocalDate.of(2026, 12, 1), 3, null)), Statut.DEPOSEE);

        assertEquals(LocalDate.of(2026, 10, 5), depot.date());
        assertEquals("f1", depot.ficheSuiviId());
        assertEquals("Rapport_f1", depot.numeroRapport());
        assertNull(depot.joursRestants());
    }

    @Test
    void uneFicheAncienneSansDateDeCreationGardeSaDateDeRapport() {
        when(ficheSuiviRepository.findByChefProjetId(CHEF))
                .thenReturn(List.of(fiche("f1", "a", null, LocalDate.of(2026, 9, 20))));

        EcheanceSuiviDTO depot = seule(calendrier(projet("a", LocalDate.of(2026, 12, 1), 3, null)), Statut.DEPOSEE);

        assertEquals(LocalDate.of(2026, 9, 20), depot.date());
    }

    @Test
    void uneFicheDUnProjetSupprimeNApparaitPas() {
        when(ficheSuiviRepository.findByChefProjetId(CHEF))
                .thenReturn(List.of(fiche("f1", "disparu", LocalDateTime.of(2026, 10, 5, 9, 0), null)));

        CalendrierSuiviDTO calendrier = calendrier(projet("a", LocalDate.of(2026, 12, 1), 12, null));

        assertFalse(calendrier.echeances().stream().anyMatch(e -> e.statut() == Statut.DEPOSEE));
    }

    @Test
    void lesDatesSontRangeesDuPlusAncienAuPlusLointain() {
        CalendrierSuiviDTO calendrier = calendrier(
                projet("b", LocalDate.of(2026, 12, 1), 12, null),
                projet("a", LocalDate.of(2026, 12, 1), 12, null),
                projet("c", LocalDate.of(2026, 11, 20), 12, null));

        assertEquals(List.of("Projet c", "Projet a", "Projet b"),
                calendrier.echeances().stream().map(EcheanceSuiviDTO::nomProjet).toList().subList(0, 3));
    }
}
