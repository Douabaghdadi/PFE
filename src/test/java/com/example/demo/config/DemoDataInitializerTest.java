package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.StatutValidation;
import com.example.demo.model.User;
import com.example.demo.model.ValidationFiche;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.HistoriqueModificationRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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

/** Les tâches finies du jeu de démonstration ont une fin réelle plausible, pour que le respect des échéances soit mesurable. */
@ExtendWith(MockitoExtension.class)
class DemoDataInitializerTest {

    private static final LocalDate DEBUT = LocalDate.of(2026, 3, 1);
    private static final LocalDate ECHEANCE = LocalDate.of(2026, 3, 20);
    private static final LocalDate DEPOT = ECHEANCE.plusMonths(1);

    @Mock
    private UserRepository userRepository;
    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private FicheSuiviRepository ficheSuiviRepository;
    @Mock
    private MongoTemplate mongoTemplate;
    @Mock
    private HistoriqueModificationRepository historiqueRepository;
    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private DemoDataInitializer demoDataInitializer;

    private static FicheSuivi.TacheSuivi tache(String sujet, int pourcentage) {
        FicheSuivi.TacheSuivi tache = new FicheSuivi.TacheSuivi();
        tache.setSujet(sujet);
        tache.setEstTitre(false);
        tache.setDebut(DEBUT);
        tache.setEcheance(ECHEANCE);
        tache.setPourcentageRealise(pourcentage);
        return tache;
    }

    private static FicheSuivi fiche(LocalDate dateRapport, FicheSuivi.TacheSuivi... taches) {
        FicheSuivi fiche = new FicheSuivi();
        fiche.setId("s-" + dateRapport);
        fiche.setDateRapport(dateRapport);
        fiche.setTachesSuivi(List.of(taches));
        return fiche;
    }

    private static FicheProjet projet(String id, String nom) {
        FicheProjet projet = new FicheProjet();
        projet.setId(id);
        projet.setNomProjet(nom);
        return projet;
    }

    @Test
    void uneTacheSurQuatreFinitApresSonEcheanceEtLesAutresATemps() {
        assertTrue(DemoDataInitializer.finReelle(3, DEBUT, ECHEANCE, DEPOT).isAfter(ECHEANCE));
        assertFalse(DemoDataInitializer.finReelle(0, DEBUT, ECHEANCE, DEPOT).isAfter(ECHEANCE));
        assertFalse(DemoDataInitializer.finReelle(1, DEBUT, ECHEANCE, DEPOT).isAfter(ECHEANCE));
        assertFalse(DemoDataInitializer.finReelle(2, DEBUT, ECHEANCE, DEPOT).isAfter(ECHEANCE));
        assertNotEquals(DemoDataInitializer.finReelle(3, DEBUT, ECHEANCE, DEPOT),
            DemoDataInitializer.finReelle(7, DEBUT, ECHEANCE, DEPOT), "les retards ne sont pas tous identiques");
    }

    @Test
    void laFinReelleResteEntreLeDebutEtLeDepotDeLaFiche() {
        LocalDate depotAvantEcheance = ECHEANCE.minusDays(10);
        assertEquals(depotAvantEcheance, DemoDataInitializer.finReelle(3, DEBUT, ECHEANCE, depotAvantEcheance));

        LocalDate tacheDUnJour = ECHEANCE;
        assertEquals(tacheDUnJour, DemoDataInitializer.finReelle(2, tacheDUnJour, ECHEANCE, ECHEANCE.plusMonths(1)));
    }

    @Test
    void seuleUneTacheTermineeSansDateRecoitUneFinReelle() {
        FicheSuivi.TacheSuivi titre = tache("Action", 100);
        titre.setEstTitre(true);
        FicheSuivi.TacheSuivi finie = tache("Cadrage", 100);
        FicheSuivi.TacheSuivi enCours = tache("Développement", 50);
        FicheSuivi fiche = fiche(DEPOT, titre, finie, enCours);

        // La ligne 1 du tableau : le titre occupe la ligne 0, et la tâche reste la première pour la règle du retard.
        assertEquals(List.of(new DemoDataInitializer.FinAjoutee(fiche.getId(), 1, ECHEANCE)),
            DemoDataInitializer.completerFinsReelles(List.of(fiche)));

        assertEquals(ECHEANCE, finie.getDateFinReelle());
        assertNull(titre.getDateFinReelle());
        assertNull(enCours.getDateFinReelle());
    }

    @Test
    void uneTacheGardeLaMemeFinReelleDUneFicheALaSuivante() {
        LocalDate premierDepot = ECHEANCE.minusDays(5);
        FicheSuivi.TacheSuivi avant = tache("Cadrage", 100);
        FicheSuivi.TacheSuivi apres = tache("Cadrage", 100);

        // Les fiches arrivent dans n'importe quel ordre : c'est la plus ancienne qui fixe la date.
        DemoDataInitializer.completerFinsReelles(List.of(fiche(premierDepot.plusMonths(1), apres), fiche(premierDepot, avant)));

        assertEquals(premierDepot, avant.getDateFinReelle());
        assertEquals(premierDepot, apres.getDateFinReelle());
    }

    @Test
    void uneDateDejaSaisieEstGardeeEtReprise() {
        LocalDate saisie = ECHEANCE.minusDays(7);
        FicheSuivi.TacheSuivi avant = tache("Cadrage", 100);
        avant.setDateFinReelle(saisie);
        FicheSuivi.TacheSuivi apres = tache("Cadrage", 100);
        FicheSuivi premiere = fiche(DEPOT, avant);
        FicheSuivi seconde = fiche(DEPOT.plusMonths(1), apres);

        assertEquals(List.of(new DemoDataInitializer.FinAjoutee(seconde.getId(), 0, saisie)),
            DemoDataInitializer.completerFinsReelles(List.of(premiere, seconde)));

        assertEquals(saisie, avant.getDateFinReelle());
        assertEquals(saisie, apres.getDateFinReelle());
    }

    @Test
    void uneTacheSansDatesPrevuesResteSansFinReelle() {
        FicheSuivi.TacheSuivi finie = tache("Cadrage", 100);
        finie.setEcheance(null);

        assertTrue(DemoDataInitializer.completerFinsReelles(List.of(fiche(DEPOT, finie))).isEmpty());
        assertNull(finie.getDateFinReelle());
    }

    @Test
    void relancerLeComplementNeChangeRien() {
        FicheSuivi fiche = fiche(DEPOT, tache("Cadrage", 100));
        DemoDataInitializer.completerFinsReelles(List.of(fiche));

        assertTrue(DemoDataInitializer.completerFinsReelles(List.of(fiche)).isEmpty());
    }

    @Test
    void auDemarrageSeulsLesProjetsDeDemoSontCompletes() {
        User sami = new User("sami.trabelsi", "sami.trabelsi@qualinet.com", "");
        sami.setId("chef-1");
        FicheSuivi.TacheSuivi finie = tache("Cadrage", 100);
        FicheSuivi fiche = fiche(DEPOT, finie);
        when(userRepository.existsByEmail(anyString())).thenReturn(true);
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByUsername("sami.trabelsi")).thenReturn(Optional.of(sami));
        when(ficheProjetRepository.findByChefProjetId("chef-1"))
            .thenReturn(List.of(projet("p1", "GED Courrier"), projet("p2", "Projet personnel")));
        when(ficheSuiviRepository.findByFicheProjetId("p1")).thenReturn(List.of(fiche));

        demoDataInitializer.run();

        // Un seul champ écrit, jamais la fiche entière : un save() perdrait les champs sortis du modèle.
        ArgumentCaptor<Update> ecriture = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(any(Query.class), ecriture.capture(), eq(FicheSuivi.class));
        assertEquals(new Document("tachesSuivi.0.dateFinReelle", ECHEANCE), ecriture.getValue().getUpdateObject().get("$set"));
        verify(ficheSuiviRepository, never()).save(any());
        verify(ficheSuiviRepository, never()).saveAll(any());
        verify(ficheSuiviRepository, never()).findByFicheProjetId("p2");
    }

    /** Un projet de démo, son chef et le pilote qui décide ; le complément ne trouve que ces fiches sans décision. */
    private void projetDeDemo(FicheProjet projet, FicheSuivi... fichesSansDecision) {
        User sami = new User("sami.trabelsi", "sami.trabelsi@qualinet.com", "");
        sami.setId("chef-1");
        User amel = new User("amel.bensalah", "amel.bensalah@qualinet.com", "");
        amel.setId("pilote-1");
        when(userRepository.existsByEmail(anyString())).thenReturn(true);
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(userRepository.findByUsername("sami.trabelsi")).thenReturn(Optional.of(sami));
        when(userRepository.findByUsername("amel.bensalah")).thenReturn(Optional.of(amel));
        when(ficheProjetRepository.findByChefProjetId("chef-1")).thenReturn(List.of(projet));
        when(mongoTemplate.find(any(Query.class), eq(FicheSuivi.class))).thenReturn(List.of(fichesSansDecision));
    }

    private static FicheSuivi ficheDeposee(String id, LocalDateTime le, String... recommandations) {
        FicheSuivi fiche = new FicheSuivi();
        fiche.setId(id);
        fiche.setNumeroRapport("Rapport_" + id);
        fiche.setDateCreation(le);
        fiche.getConstatGlobal().setRecommandations(List.of(recommandations));
        return fiche;
    }

    @Test
    void uneFicheAncienneSansDecisionEstValideeDeuxJoursApresSonDepot() {
        LocalDateTime deposeLe = LocalDateTime.now().minusMonths(3);
        FicheSuivi fiche = ficheDeposee("s1", deposeLe, "Une recommandation");
        projetDeDemo(projet("p1", "GED Courrier"), fiche);

        demoDataInitializer.run();

        ValidationFiche decision = fiche.getValidation();
        assertEquals(StatutValidation.VALIDEE, decision.getStatut());
        assertEquals("amel.bensalah", decision.getPiloteNom());
        assertEquals(deposeLe.plusDays(2), decision.getDateDecision());
        verify(historiqueRepository).save(any());
        verify(notificationRepository).save(any());

        // Seule la décision est écrite, jamais la fiche entière
        ArgumentCaptor<Update> ecriture = ArgumentCaptor.forClass(Update.class);
        verify(mongoTemplate).updateFirst(any(Query.class), ecriture.capture(), eq(FicheSuivi.class));
        assertEquals(new Document("validation", decision), ecriture.getValue().getUpdateObject().get("$set"));
    }

    @Test
    void uneFicheRecenteResteAValiderEtNeSeraPlusReexaminee() {
        FicheSuivi fiche = ficheDeposee("s1", LocalDateTime.now().minusDays(5), "Une recommandation");
        projetDeDemo(projet("p1", "GED Courrier"), fiche);

        demoDataInitializer.run();

        assertEquals(StatutValidation.A_VALIDER, fiche.getValidation().getStatut());
        verify(historiqueRepository, never()).save(any());
        verify(notificationRepository, never()).save(any());
        // L'état « À valider » est écrit : au prochain démarrage, elle ne sera plus une fiche sans décision
        verify(mongoTemplate).updateFirst(any(Query.class), any(Update.class), eq(FicheSuivi.class));
    }

    @Test
    void laFicheSansRecommandationDuParcAutomobileEstRenvoyeeASonChef() {
        LocalDateTime deposeLe = LocalDateTime.now().minusMonths(3);
        FicheSuivi sansRecommandation = ficheDeposee("s1", deposeLe);
        FicheSuivi complete = ficheDeposee("s2", deposeLe, "Une recommandation");
        projetDeDemo(projet("p1", "Parc Automobile"), sansRecommandation, complete);

        demoDataInitializer.run();

        assertEquals(StatutValidation.A_CORRIGER, sansRecommandation.getValidation().getStatut());
        assertTrue(sansRecommandation.getValidation().getMotif().contains("recommandation"));
        assertEquals(StatutValidation.VALIDEE, complete.getValidation().getStatut());
    }

    @Test
    void seulesLesFichesSansDecisionEnBaseSontExaminees() {
        projetDeDemo(projet("p1", "GED Courrier"));

        demoDataInitializer.run();

        ArgumentCaptor<Query> recherche = ArgumentCaptor.forClass(Query.class);
        verify(mongoTemplate).find(recherche.capture(), eq(FicheSuivi.class));
        assertEquals(new Document("$exists", false), recherche.getValue().getQueryObject().get("validation"));
    }

    @Test
    void uneFicheProjetAncienneSansDecisionEstValidee() {
        FicheProjet projet = projet("p1", "GED Courrier");
        projet.setDateCreation(LocalDateTime.now().minusMonths(6));
        projetDeDemo(projet);
        when(mongoTemplate.exists(any(Query.class), eq(FicheProjet.class))).thenReturn(true);

        demoDataInitializer.run();

        assertEquals(StatutValidation.VALIDEE, projet.getValidation().getStatut());
        verify(mongoTemplate).updateFirst(any(Query.class), any(Update.class), eq(FicheProjet.class));
    }

    @Test
    void sansCompteDeDemoLeDemarrageNeTouchePasAuxFiches() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);

        demoDataInitializer.run();

        verifyNoInteractions(ficheProjetRepository, ficheSuiviRepository, mongoTemplate);
    }
}
