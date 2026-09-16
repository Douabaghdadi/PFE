package com.example.demo.service;

import com.example.demo.dto.AIKPIReportDTO;
import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.AxeAnalyseIADTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.ExpectedCount;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Vérifie le service d'analyse IA sans appeler Gemini : le transport est simulé.
 * Couvre la lecture de la réponse, la reprise sur surcharge, le cache et les cas d'erreur.
 */
@ExtendWith(MockitoExtension.class)
class AIKPIServiceTest {

    private static final String PROJET_ID = "p1";

    @Mock
    private KPIService kpiService;

    private AIKPIService aiKpiService;
    private MockRestServiceServer serveurSimule;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        aiKpiService = new AIKPIService();
        ReflectionTestUtils.setField(aiKpiService, "kpiService", kpiService);
        ReflectionTestUtils.setField(aiKpiService, "geminiApiKey", "cle-de-test");
        ReflectionTestUtils.setField(aiKpiService, "model", "gemini-1.5-flash");

        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(aiKpiService, "restTemplate");
        serveurSimule = MockRestServiceServer.bindTo(restTemplate).build();
    }

    /* ---------------- Jeux de données ---------------- */

    private ProjetKPIReportDTO kpiExploitable() {
        ProjetKPIReportDTO kpi = new ProjetKPIReportDTO();
        kpi.setProjetId(PROJET_ID);
        kpi.setNomProjet("Refonte portail");
        kpi.setStatut("EN_COURS");
        kpi.setNombreFichesSuivi(3);
        kpi.setTauxAvancement(50);
        kpi.setTauxAvancementPlanifie(99);
        kpi.setEcartPlanning(-49);
        kpi.setSpi(0.51);
        kpi.setJoursRetard(12);
        kpi.setTotalTaches(3);
        kpi.setTachesEnRetard(1);
        kpi.setChargeEstimee(50);
        kpi.setChargeConsommee(29);
        kpi.setIndiceEfficacite(0.86);
        kpi.setNombreProblemes(2);
        kpi.setNombreProblemesPersistants(1);
        kpi.setScoreSante(47);
        kpi.setNiveauSante("ATTENTION");

        TacheKPIDTO tache = new TacheKPIDTO();
        tache.setSujet("Développement");
        tache.setAssigneA("Bob");
        tache.setEcheance("2026-09-06");
        tache.setPourcentageRealise(50);
        tache.setJoursEcart(10);
        kpi.setListeTachesEnRetard(List.of(tache));

        kpi.setAlertes(List.of(new AlerteKPIDTO(
            AlerteKPIDTO.CRITIQUE, "Délais", "Avancement en retrait du planning", "SPI de 0,51.")));
        return kpi;
    }

    /** Réponse type du modèle : un JSON d'analyse complet. */
    private String analyseJson() {
        return "{"
            + "\"scorePerformance\": 42,"
            + "\"niveauRisque\": \"Élevé\","
            + "\"niveauConfiance\": \"moyenne\","
            + "\"syntheseExecutive\": \"Le projet accuse un retard de 49 points sur son planning.\","
            + "\"predictionDateFin\": \"04/07/2026\","
            + "\"justificationPrediction\": \"Au rythme de 50 % en 100 jours.\","
            + "\"axes\": ["
            + "  {\"axe\": \"Délai\", \"constat\": \"SPI de 0,51.\", \"tendance\": \"négative\"},"
            + "  {\"axe\": \"Charge\", \"constat\": \"CPI de 0,86.\", \"tendance\": \"stable\"},"
            + "  {\"axe\": \"Qualité\", \"constat\": \"1 problème persistant.\", \"tendance\": \"amélioration\"},"
            + "  {\"axe\": \"Budget\", \"constat\": \"Non suivi.\", \"tendance\": \"STABLE\"}"
            + "],"
            + "\"forces\": [\"Équipe stable\", \"Cadrage livré dans les délais\"],"
            + "\"pointsDeVigilance\": [\"Recette non démarrée\"],"
            + "\"actions\": ["
            + "  {\"priorite\": 3, \"titre\": \"Instrumenter le budget\", \"description\": \"Saisir le réalisé.\","
            + "   \"impactAttendu\": \"Mesure des coûts\", \"delai\": \"sous 30 jours\"},"
            + "  {\"priorite\": 1, \"titre\": \"Replanifier le développement\", \"description\": \"Arbitrer avec Bob.\","
            + "   \"impactAttendu\": \"SPI ramené à 0,8\", \"delai\": \"sous 15 jours\"}"
            + "],"
            + "\"alertes\": [\"La recette risque de démarrer sans environnement\"]"
            + "}";
    }

    /** Emballe le texte du modèle dans l'enveloppe de réponse de l'API Gemini. */
    private String reponseGemini(String texte) throws Exception {
        ObjectNode racine = objectMapper.createObjectNode();
        ArrayNode candidats = objectMapper.createArrayNode();
        ObjectNode candidat = objectMapper.createObjectNode();
        ObjectNode content = objectMapper.createObjectNode();
        ArrayNode parts = objectMapper.createArrayNode();
        ObjectNode part = objectMapper.createObjectNode();
        part.put("text", texte);
        parts.add(part);
        content.set("parts", parts);
        candidat.set("content", content);
        candidats.add(candidat);
        racine.set("candidates", candidats);
        return objectMapper.writeValueAsString(racine);
    }

    /* ---------------- Lecture de la réponse ---------------- */

    @Test
    void litUneAnalyseStructureeEtNormaliseLesNiveaux() {
        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse(analyseJson());

        assertTrue(rapport.isSuccess());
        assertEquals(42, rapport.getScorePerformance());
        // « Élevé » et « moyenne » sont ramenés au vocabulaire normalisé, accents compris.
        assertEquals(AIKPIReportDTO.ELEVE, rapport.getNiveauRisque());
        assertEquals(AIKPIReportDTO.MOYEN, rapport.getNiveauConfiance());
        assertEquals("04/07/2026", rapport.getPredictionDateFin());
        assertEquals(2, rapport.getForces().size());
        assertEquals(1, rapport.getPointsDeVigilance().size());
        assertEquals(1, rapport.getAlertes().size());
    }

    @Test
    void normaliseLesTendancesEtTrieLesActionsParPriorite() {
        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse(analyseJson());

        assertEquals(4, rapport.getAxes().size());
        assertEquals(AxeAnalyseIADTO.NEGATIVE, rapport.getAxes().get(0).getTendance());
        assertEquals(AxeAnalyseIADTO.STABLE, rapport.getAxes().get(1).getTendance());
        assertEquals(AxeAnalyseIADTO.POSITIVE, rapport.getAxes().get(2).getTendance());

        assertEquals(2, rapport.getActions().size());
        assertEquals(1, rapport.getActions().get(0).getPriorite());
        assertEquals("Replanifier le développement", rapport.getActions().get(0).getTitre());
    }

    @Test
    void isoleLeJsonMemeEntoureDeMarkdownOuDeTexte() {
        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse(
            "Voici mon analyse :\n```json\n" + analyseJson() + "\n```\nJ'espère que cela convient.");

        assertTrue(rapport.isSuccess());
        assertEquals(42, rapport.getScorePerformance());
    }

    @Test
    void accepteUneListeEnvoyeeSousFormeDeChaineSeparee() {
        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse(
            "{\"syntheseExecutive\": \"Projet sous contrôle.\","
                + " \"forces\": \"Équipe stable | Budget maîtrisé\","
                + " \"alertes\": \"Aucune alerte\"}");

        assertEquals(List.of("Équipe stable", "Budget maîtrisé"), rapport.getForces());
        // « Aucune alerte » est un remplissage, pas une alerte : il ne doit pas polluer la liste.
        assertTrue(rapport.getAlertes().isEmpty());
    }

    @Test
    void ignoreLesPartiesDeRaisonnementDesModelesThinking() throws Exception {
        // Un modèle à raisonnement place son cheminement dans une partie « thought » :
        // la lire au lieu de la réponse rendait l'analyse inexploitable.
        ObjectNode racine = objectMapper.createObjectNode();
        ArrayNode candidats = objectMapper.createArrayNode();
        ObjectNode candidat = objectMapper.createObjectNode();
        ObjectNode content = objectMapper.createObjectNode();
        ArrayNode parts = objectMapper.createArrayNode();

        ObjectNode pensee = objectMapper.createObjectNode();
        pensee.put("thought", true);
        pensee.put("text", "Je dois d'abord regarder le SPI puis le CPI...");
        parts.add(pensee);

        ObjectNode reponse = objectMapper.createObjectNode();
        reponse.put("text", analyseJson());
        parts.add(reponse);

        content.set("parts", parts);
        candidat.set("content", content);
        candidat.put("finishReason", "STOP");
        candidats.add(candidat);
        racine.set("candidates", candidats);

        AIKPIService.ReponseModele lue = aiKpiService.texteDeLaReponse(objectMapper.writeValueAsString(racine));

        assertFalse(lue.texte.contains("Je dois d'abord"), "le raisonnement ne doit pas être retenu");
        assertEquals(42, aiKpiService.parseGeminiResponse(lue.texte).getScorePerformance());
    }

    @Test
    void expliqueQueLeBudgetDeReponseEstEpuise() throws Exception {
        when(kpiService.calculateProjetKPIs(PROJET_ID)).thenReturn(kpiExploitable());
        ObjectNode racine = objectMapper.createObjectNode();
        ArrayNode candidats = objectMapper.createArrayNode();
        ObjectNode candidat = objectMapper.createObjectNode();
        candidat.put("finishReason", "MAX_TOKENS");
        candidat.set("content", objectMapper.createObjectNode());
        candidats.add(candidat);
        racine.set("candidates", candidats);

        serveurSimule.expect(ExpectedCount.once(), anything())
            .andRespond(withSuccess(objectMapper.writeValueAsString(racine), MediaType.APPLICATION_JSON));

        AIKPIReportDTO rapport = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        assertFalse(rapport.isSuccess());
        assertTrue(rapport.getErrorMessage().contains("budget de réponse"),
            "le message doit nommer la cause réelle, pas rester générique : " + rapport.getErrorMessage());
    }

    @Test
    void sauveUneAnalyseCoupeeEnPleineRedaction() {
        // Réponse tronquée en plein milieu d'une chaîne : les champs déjà rédigés restent utiles.
        String tronquee = "{\"scorePerformance\": 42, \"niveauRisque\": \"ELEVE\","
            + " \"syntheseExecutive\": \"Le projet accuse un retard de 49 points sur son pl";

        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse(tronquee);

        assertTrue(rapport.isSuccess(), "une analyse partielle vaut mieux qu'un rejet complet");
        assertEquals(42, rapport.getScorePerformance());
        assertEquals(AIKPIReportDTO.ELEVE, rapport.getNiveauRisque());
        assertTrue(rapport.getSyntheseExecutive().startsWith("Le projet accuse"));
    }

    @Test
    void repareUneTroncatureSurUneCleSansValeur() {
        String tronquee = "{\"syntheseExecutive\": \"Projet sous contrôle.\","
            + " \"forces\": [\"Équipe stable\"], \"predictionDateFin\":";

        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse(tronquee);

        assertTrue(rapport.isSuccess());
        assertEquals(List.of("Équipe stable"), rapport.getForces());
    }

    @Test
    void signaleUneReponseInexploitableAuLieuDeLaFairePasserPourUneAnalyse() {
        AIKPIReportDTO rapport = aiKpiService.parseGeminiResponse("Désolé, je ne peux pas répondre.");

        assertFalse(rapport.isSuccess());
        assertTrue(rapport.getErrorMessage().contains("n'a pas pu être interprétée"));
    }

    /* ---------------- Contenu du prompt ---------------- */

    @Test
    void lePromptPorteLesIndicateursDetaillesEtLesAlertesDejaLevees() {
        String prompt = aiKpiService.buildPrompt(kpiExploitable());

        assertTrue(prompt.contains("SPI"), "le SPI doit être transmis");
        assertTrue(prompt.contains("CPI"), "l'indice d'efficacité doit être transmis");
        assertTrue(prompt.contains("Développement"), "les tâches hors délai doivent être nommées");
        assertTrue(prompt.contains("Bob"), "l'assignataire doit être transmis");
        assertTrue(prompt.contains("Avancement en retrait du planning"),
            "les alertes déterministes doivent être transmises pour éviter les doublons");
        assertTrue(prompt.contains("Aucun suivi budgétaire renseigné"),
            "l'absence de donnée doit être dite explicitement plutôt que tue");
    }

    /* ---------------- Transport : reprise, quota, cache ---------------- */

    @Test
    void retenteQuandLeModeleEstSurcharge() throws Exception {
        when(kpiService.calculateProjetKPIs(PROJET_ID)).thenReturn(kpiExploitable());
        serveurSimule.expect(ExpectedCount.once(), anything())
            .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        serveurSimule.expect(ExpectedCount.once(), anything())
            .andRespond(withSuccess(reponseGemini(analyseJson()), MediaType.APPLICATION_JSON));

        AIKPIReportDTO rapport = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        assertTrue(rapport.isSuccess());
        assertEquals(42, rapport.getScorePerformance());
        serveurSimule.verify();
    }

    @Test
    void renvoieUnMessageExpliciteQuandLeQuotaEstAtteint() {
        when(kpiService.calculateProjetKPIs(PROJET_ID)).thenReturn(kpiExploitable());
        serveurSimule.expect(ExpectedCount.once(), anything())
            .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        AIKPIReportDTO rapport = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        assertFalse(rapport.isSuccess());
        assertTrue(rapport.getErrorMessage().contains("quota"));
    }

    @Test
    void reutiliseLAnalyseTantQueLesKpiNOntPasChange() throws Exception {
        when(kpiService.calculateProjetKPIs(PROJET_ID)).thenReturn(kpiExploitable());
        // Une seule requête autorisée : le second appel doit être servi par le cache.
        serveurSimule.expect(ExpectedCount.once(), anything())
            .andRespond(withSuccess(reponseGemini(analyseJson()), MediaType.APPLICATION_JSON));

        AIKPIReportDTO premier = aiKpiService.analyzeKPIsWithAI(PROJET_ID);
        AIKPIReportDTO second = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        assertFalse(premier.isDepuisCache());
        assertTrue(second.isDepuisCache());
        assertEquals(premier.getScorePerformance(), second.getScorePerformance());
        serveurSimule.verify();
    }

    @Test
    void relanceLeModeleQuandLAnalyseEstForcee() throws Exception {
        when(kpiService.calculateProjetKPIs(PROJET_ID)).thenReturn(kpiExploitable());
        serveurSimule.expect(ExpectedCount.times(2), anything())
            .andRespond(withSuccess(reponseGemini(analyseJson()), MediaType.APPLICATION_JSON));

        aiKpiService.analyzeKPIsWithAI(PROJET_ID);
        AIKPIReportDTO force = aiKpiService.analyzeKPIsWithAI(PROJET_ID, true);

        assertFalse(force.isDepuisCache());
        serveurSimule.verify();
    }

    @Test
    void recalculeQuandLesKpiOntChange() throws Exception {
        ProjetKPIReportDTO evolue = kpiExploitable();
        evolue.setTauxAvancement(70);
        when(kpiService.calculateProjetKPIs(PROJET_ID))
            .thenReturn(kpiExploitable())
            .thenReturn(evolue);
        serveurSimule.expect(ExpectedCount.times(2), anything())
            .andRespond(withSuccess(reponseGemini(analyseJson()), MediaType.APPLICATION_JSON));

        aiKpiService.analyzeKPIsWithAI(PROJET_ID);
        AIKPIReportDTO second = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        // L'empreinte des KPI a changé : le cache est invalidé sans qu'on ait à le demander.
        assertFalse(second.isDepuisCache());
        serveurSimule.verify();
    }

    /* ---------------- Garde-fous en amont de l'appel ---------------- */

    @Test
    void nAppellePasLeModeleSansFicheDeSuivi() {
        ProjetKPIReportDTO vide = new ProjetKPIReportDTO();
        vide.setNomProjet("Projet neuf");
        vide.setNombreFichesSuivi(0);
        when(kpiService.calculateProjetKPIs(PROJET_ID)).thenReturn(vide);

        AIKPIReportDTO rapport = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        assertFalse(rapport.isSuccess());
        assertTrue(rapport.getErrorMessage().contains("Aucune fiche de suivi"));
        serveurSimule.verify(); // aucune requête attendue, aucune émise
    }

    @Test
    void nAppellePasLeModeleSansCleDApi() {
        ReflectionTestUtils.setField(aiKpiService, "geminiApiKey", "  ");

        AIKPIReportDTO rapport = aiKpiService.analyzeKPIsWithAI(PROJET_ID);

        assertFalse(rapport.isSuccess());
        assertTrue(rapport.getErrorMessage().contains("clé d'API"));
        verify(kpiService, never()).calculateProjetKPIs(anyString());
    }
}
