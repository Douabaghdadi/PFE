package com.example.demo.service;

import com.example.demo.dto.ChargeMembreDTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.model.EstimationBudget;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

/**
 * Vérifie le moteur de calcul des KPI sur un projet type :
 * une ligne de titre, une tâche terminée, une tâche en retard et une tâche à venir.
 */
@ExtendWith(MockitoExtension.class)
class KPIServiceTest {

    private static final String PROJET_ID = "p1";

    @Mock
    private FicheProjetRepository ficheProjetRepository;

    @Mock
    private FicheSuiviRepository ficheSuiviRepository;

    @InjectMocks
    private KPIService kpiService;

    private LocalDate aujourdhui;

    @BeforeEach
    void setUp() {
        aujourdhui = LocalDate.now();
    }

    private FicheProjet projet() {
        FicheProjet projet = new FicheProjet();
        projet.setId(PROJET_ID);
        projet.setNomProjet("Refonte portail");
        projet.setStatut("EN_COURS");
        projet.setDateDebut(aujourdhui.minusDays(100));
        projet.setDateFinPrevue(aujourdhui.plusDays(100));

        EstimationBudget budget = new EstimationBudget();
        budget.setBudgetMDHT("2.5");
        projet.setEstimationBudget(budget);
        return projet;
    }

    private FicheSuivi.TacheSuivi tache(String sujet, String assigneA, Integer tempsEstime, Integer tempsPasse,
                                        Integer pourcentage, LocalDate echeance, LocalDate dateFinReelle) {
        FicheSuivi.TacheSuivi tache = new FicheSuivi.TacheSuivi();
        tache.setSujet(sujet);
        tache.setAssigneA(assigneA);
        tache.setTempsEstime(tempsEstime);
        tache.setTempsPasse(tempsPasse);
        tache.setPourcentageRealise(pourcentage);
        tache.setEcheance(echeance);
        tache.setDateFinReelle(dateFinReelle);
        return tache;
    }

    private FicheSuivi suivi(LocalDate dateRapport, List<FicheSuivi.TacheSuivi> taches,
                             List<String> problemes, List<String> risques) {
        FicheSuivi suivi = new FicheSuivi();
        suivi.setFicheProjetId(PROJET_ID);
        suivi.setDateRapport(dateRapport);
        suivi.setDateCreation(dateRapport.atStartOfDay());
        suivi.setTachesSuivi(taches);
        suivi.getConstatGlobal().setProblemesRencontres(problemes);
        suivi.getConstatGlobal().setPrincipauxRisques(risques);
        return suivi;
    }

    /** Fiche courante : 1 ligne de titre + 3 tâches réelles pour 50 jours de charge estimée. */
    private FicheSuivi ficheCourante() {
        FicheSuivi.TacheSuivi titre = new FicheSuivi.TacheSuivi();
        titre.setSujet("Phase 1 - Cadrage");
        titre.setEstTitre(true);

        return suivi(aujourdhui.minusDays(2), Arrays.asList(
            titre,
            // terminée, livrée avant son échéance
            tache("Cadrage", "Alice", 10, 9, 100, aujourdhui.minusDays(50), aujourdhui.minusDays(55)),
            // à 50 %, échéance dépassée
            tache("Développement", "Bob", 30, 20, 50, aujourdhui.minusDays(10), null),
            // non démarrée, échéance imminente
            tache("Recette", "Alice", 10, 0, 0, aujourdhui.plusDays(5), null)
        ), Arrays.asList("Environnement de test indisponible"), Arrays.asList("Dépendance prestataire"));
    }

    @Test
    void avancementPondereParLaChargeEtHorsLignesDeTitre() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        // (10x100 + 30x50 + 10x0) / 50 jours = 50 % — la ligne de titre n'entre pas dans le calcul.
        assertEquals(50.0, kpi.getTauxAvancement(), 0.01);
        assertEquals(3, kpi.getTotalTaches());
        assertEquals(1, kpi.getTachesTerminees());
        assertEquals(1, kpi.getTachesEnCours());
        assertEquals(1, kpi.getTachesNonDemarrees());
    }

    @Test
    void detecteLesRetardsEtLesEcheancesImminentes() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(1, kpi.getTachesEnRetard());
        assertEquals("Développement", kpi.getListeTachesEnRetard().get(0).getSujet());
        assertEquals(10, kpi.getListeTachesEnRetard().get(0).getJoursEcart());

        assertEquals(1, kpi.getTachesEcheanceProche());
        assertEquals("Recette", kpi.getListeTachesEcheanceProche().get(0).getSujet());

        // 2 échéances évaluables (une tenue, une dépassée) -> 50 %
        assertEquals(50.0, kpi.getTauxRespectEcheances(), 0.01);
        // Le projet lui-même n'a pas dépassé sa date de fin prévue.
        assertEquals(0, kpi.getJoursRetard());
    }

    @Test
    void confronteAvancementReelEtPlanifiePourProduireLeSpi() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        // Deux tâches sur trois auraient dû être achevées : le planifié est très au-dessus du réel.
        assertTrue(kpi.getTauxAvancementPlanifie() > 90,
            "planifié attendu > 90 %, obtenu " + kpi.getTauxAvancementPlanifie());
        assertTrue(kpi.getSpi() < 0.6, "SPI attendu < 0,6, obtenu " + kpi.getSpi());
        assertTrue(kpi.getEcartPlanning() < 0, "l'écart au planning doit être négatif");
        assertTrue(kpi.getDateFinProjetee() != null, "une date de fin doit être extrapolée");
        // 100 jours écoulés pour 50 % réalisés -> 200 jours de durée totale projetée.
        assertEquals(aujourdhui.minusDays(100).plusDays(200).toString(), kpi.getDateFinProjetee());
    }

    @Test
    void mesureLaChargeConsommeeEtLEfficacite() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(50.0, kpi.getChargeEstimee(), 0.01);
        assertEquals(29.0, kpi.getChargeConsommee(), 0.01);
        // Valeur acquise = 10 + 15 = 25 jours produits pour 29 consommés.
        assertEquals(25.0, kpi.getChargeRestanteEstimee(), 0.01);
        assertEquals(0.86, kpi.getIndiceEfficacite(), 0.01);
        assertEquals(58.0, kpi.getTauxConsommationCharge(), 0.01);
    }

    @Test
    void agregeLaChargeParIntervenant() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(2, kpi.getChargeParMembre().size());
        ChargeMembreDTO alice = kpi.getChargeParMembre().stream()
            .filter(membre -> "Alice".equals(membre.getNom())).findFirst().orElseThrow();
        assertEquals(2, alice.getNombreTaches());
        assertEquals(1, alice.getTachesTerminees());
        assertEquals(20.0, alice.getChargeEstimee(), 0.01);
        assertEquals(50.0, alice.getAvancementMoyen(), 0.01);

        ChargeMembreDTO bob = kpi.getChargeParMembre().stream()
            .filter(membre -> "Bob".equals(membre.getNom())).findFirst().orElseThrow();
        assertEquals(1, bob.getTachesEnRetard());
    }

    @Test
    void traceLHistoriqueEtLaProgressionEntreDeuxFiches() {
        FicheSuivi ancienne = suivi(aujourdhui.minusDays(40), List.of(
            tache("Cadrage", "Alice", 10, 5, 100, aujourdhui.minusDays(50), aujourdhui.minusDays(55)),
            tache("Développement", "Bob", 30, 5, 10, aujourdhui.minusDays(10), null),
            tache("Recette", "Alice", 10, 0, 0, aujourdhui.plusDays(5), null)
        ), List.of(), List.of());

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        // Volontairement dans le désordre : le service doit les réordonner chronologiquement.
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID))
            .thenReturn(List.of(ficheCourante(), ancienne));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(2, kpi.getNombreFichesSuivi());
        assertEquals(2, kpi.getHistorique().size());
        assertEquals(aujourdhui.minusDays(40).toString(), kpi.getHistorique().get(0).getDate());
        // Ancienne fiche : (10x100 + 30x10) / 50 = 26 %
        assertEquals(26.0, kpi.getHistorique().get(0).getTauxAvancement(), 0.01);
        assertEquals(50.0, kpi.getHistorique().get(1).getTauxAvancement(), 0.01);
        assertEquals(24.0, kpi.getDeltaAvancement(), 0.01);
    }

    @Test
    void produitUnScoreDeSanteDetailleEtDesAlertes() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(4, kpi.getDetailScore().size());
        double somme = kpi.getDetailScore().stream().mapToDouble(c -> c.getPoints()).sum();
        assertEquals(Math.round(somme), kpi.getScoreSante(), 1.0);
        assertTrue(kpi.getScoreSante() >= 0 && kpi.getScoreSante() <= 100);
        assertTrue(kpi.getNiveauSante() != null);

        // Le retrait de planning et la tâche hors délai doivent remonter en alertes.
        assertTrue(kpi.getAlertes().stream().anyMatch(a -> a.getTitre().contains("retrait du planning")),
            "une alerte de retrait de planning est attendue");
        assertTrue(kpi.getAlertes().stream().anyMatch(a -> a.getCategorie().equals("Tâches")),
            "une alerte sur les tâches est attendue");
        // Les alertes sont triées par gravité décroissante.
        assertEquals("CRITIQUE", kpi.getAlertes().get(0).getNiveau());
    }

    @Test
    void resteCalculableSansAucuneFicheDeSuivi() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of());

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(0.0, kpi.getTauxAvancement(), 0.01);
        assertEquals(0, kpi.getTotalTaches());
        assertEquals(2.5, kpi.getBudgetTotal(), 0.01);
        assertTrue(kpi.getAlertes().stream().anyMatch(a -> a.getTitre().equals("Aucune fiche de suivi")));
        // Sans tâche, on retombe sur le planning projet : 100 jours écoulés sur 200.
        assertEquals(50.0, kpi.getTauxAvancementPlanifie(), 1.0);
    }

    @Test
    void marqueLeRetardQuandLaDateDeFinEstDepassee() {
        FicheProjet enRetard = projet();
        enRetard.setDateFinPrevue(aujourdhui.minusDays(20));

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(enRetard));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(20, kpi.getJoursRetard());
        assertTrue(kpi.getJoursDerapageProjete() > 0);
        assertTrue(kpi.getAlertes().stream().anyMatch(a -> a.getTitre().equals("Date de fin dépassée")));
    }

    @Test
    void ignoreUneFicheDeSuiviSansDateDeRapport() {
        FicheSuivi sansDate = ficheCourante();
        sansDate.setDateRapport(null);
        sansDate.setDateCreation(LocalDateTime.now());

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(sansDate));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(50.0, kpi.getTauxAvancement(), 0.01);
        assertEquals(1, kpi.getNombreFichesSuivi());
    }

    @Test
    void neDeclencheAucuneAlerteDExecutionSurUnProjetClos() {
        FicheProjet clos = projet();
        clos.setStatut("TERMINE");
        clos.setDateFinPrevue(aujourdhui.minusDays(20));

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(clos));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(0, kpi.getJoursRetard(), "un projet clôturé n'accumule plus de retard");
        assertNull(kpi.getDateFinProjetee(), "la fin d'un projet clos est constatée, pas extrapolée");
        assertTrue(kpi.getAlertes().stream().noneMatch(a -> a.getTitre().equals("Date de fin dépassée")));
        assertTrue(kpi.getAlertes().stream().noneMatch(a -> a.getCategorie().equals("Tâches")),
            "aucune alerte d'exécution n'est attendue sur un projet clos");
        assertTrue(kpi.getAlertes().stream().noneMatch(a -> a.getCategorie().equals("Délais")));
    }

    @Test
    void neSignalePasUnArretDeProgressionQuandToutEstTermine() {
        List<FicheSuivi.TacheSuivi> achevees = Arrays.asList(
            tache("Cadrage", "Alice", 10, 9, 100, aujourdhui.minusDays(50), aujourdhui.minusDays(55)),
            tache("Développement", "Bob", 30, 28, 100, aujourdhui.minusDays(10), aujourdhui.minusDays(12)));

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(
            suivi(aujourdhui.minusDays(30), achevees, List.of(), List.of()),
            suivi(aujourdhui.minusDays(2), achevees, List.of(), List.of())));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(100.0, kpi.getTauxAvancement(), 0.01);
        assertEquals(0.0, kpi.getDeltaAvancement(), 0.01);
        assertTrue(kpi.getAlertes().stream().noneMatch(a -> a.getTitre().equals("Progression à l'arrêt")),
            "un projet achevé à 100 % ne stagne pas");
    }

    @Test
    void ecarteDuRespectDesEcheancesLesTachesTermineesSansDateDeFinReelle() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(
            suivi(aujourdhui.minusDays(2), Arrays.asList(
                // terminée mais sans date de fin réelle : le respect de l'échéance n'est pas démontrable
                tache("Cadrage", "Alice", 10, 9, 100, aujourdhui.minusDays(50), null),
                tache("Développement", "Bob", 30, 20, 50, aujourdhui.minusDays(10), null)),
                List.of(), List.of())));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        // Seule la tâche hors délai reste évaluable : 0 échéance tenue sur 1.
        assertEquals(0.0, kpi.getTauxRespectEcheances(), 0.01);
    }

    @Test
    void renvoieUnRespectDesEcheancesNonCalculableFauteDeDonnees() {
        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(
            suivi(aujourdhui.minusDays(2), Arrays.asList(
                tache("Cadrage", "Alice", 10, 9, 100, aujourdhui.minusDays(50), null),
                tache("Recette", "Alice", 10, 0, 0, aujourdhui.plusDays(5), null)),
                List.of(), List.of())));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(-1.0, kpi.getTauxRespectEcheances(), 0.01, "-1 signale au client un taux non calculable");
    }

    @Test
    void penalisePlusLesProblemesQuiPersistentQueCeuxQuiSontNouveaux() {
        FicheSuivi ancienne = suivi(aujourdhui.minusDays(30), Arrays.asList(
            tache("Développement", "Bob", 30, 10, 20, aujourdhui.minusDays(10), null)),
            Arrays.asList("Environnement de test indisponible"), List.of());

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(ancienne, ficheCourante()));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(1, kpi.getNombreProblemesPersistants());
        // 25 - 3 (problème non résolu) - 2,5 (risque sans plan d'action) = 19,5
        assertEquals(19.5, composante(kpi, "Qualité").getPoints(), 0.01);
    }

    @Test
    void neSanctionnePasLaSimpleDeclarationDUnRisqueCouvertParUnPlanDAction() {
        FicheSuivi fiche = ficheCourante();
        fiche.getConstatGlobal().setRecommandations(Arrays.asList("Commander un second environnement de test"));

        when(ficheProjetRepository.findById(PROJET_ID)).thenReturn(Optional.of(projet()));
        when(ficheSuiviRepository.findByFicheProjetId(PROJET_ID)).thenReturn(List.of(fiche));

        ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(PROJET_ID);

        assertEquals(0, kpi.getNombreProblemesPersistants());
        // 25 - 1 (problème nouvellement signalé) - 1 (risque avec plan d'action) = 23
        assertEquals(23.0, composante(kpi, "Qualité").getPoints(), 0.01);
    }

    private ComposanteScoreDTO composante(ProjetKPIReportDTO kpi, String prefixeLibelle) {
        return kpi.getDetailScore().stream()
            .filter(c -> c.getLibelle().startsWith(prefixeLibelle))
            .findFirst().orElseThrow();
    }
}
