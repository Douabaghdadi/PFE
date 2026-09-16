package com.example.demo.service;

import com.example.demo.dto.ActionIADTO;
import com.example.demo.dto.AIKPIReportDTO;
import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.AxeAnalyseIADTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.PointHistoriqueKPIDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.text.Normalizer;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Analyse des KPI d'un projet par le modèle Gemini.
 *
 * L'analyse est bâtie sur l'intégralité des indicateurs calculés par {@link KPIService}
 * (avancement vs planning, SPI, charge, CPI, tâches hors délai, budget, alertes, historique)
 * et non sur un simple résumé : le modèle dispose ainsi de quoi justifier chaque constat.
 *
 * Le résultat est mis en cache tant que les KPI du projet n'ont pas changé, pour éviter
 * de relancer un appel distant coûteux sur des données identiques.
 */
@Service
public class AIKPIService {

    /** Nombre de tentatives quand le modèle répond « surchargé » (503). */
    private static final int MAX_ATTEMPTS = 3;
    /** Durée de validité d'une analyse en cache, à données KPI constantes. */
    private static final Duration DUREE_CACHE = Duration.ofMinutes(30);
    /** Nombre de tâches en retard détaillées dans le prompt. */
    private static final int MAX_TACHES_PROMPT = 5;

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    @Autowired
    private KPIService kpiService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Analyses déjà produites, indexées par projet et invalidées dès que les KPI bougent. */
    private final Map<String, AnalyseEnCache> cache = new ConcurrentHashMap<>();

    private static final class AnalyseEnCache {
        private final String empreinte;
        private final AIKPIReportDTO rapport;
        private final Instant genereA;

        private AnalyseEnCache(String empreinte, AIKPIReportDTO rapport) {
            this.empreinte = empreinte;
            this.rapport = rapport;
            this.genereA = Instant.now();
        }

        private boolean estValide(String empreinteActuelle) {
            return empreinte.equals(empreinteActuelle)
                && Duration.between(genereA, Instant.now()).compareTo(DUREE_CACHE) < 0;
        }
    }

    private String getGeminiUrl() {
        return "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;
    }

    public AIKPIReportDTO analyzeKPIsWithAI(String projetId) {
        return analyzeKPIsWithAI(projetId, false);
    }

    /**
     * @param forceRefresh ignore le cache et redemande une analyse au modèle.
     */
    public AIKPIReportDTO analyzeKPIsWithAI(String projetId, boolean forceRefresh) {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            return new AIKPIReportDTO("L'analyse IA n'est pas configurée : aucune clé d'API Gemini n'est renseignée.");
        }

        ProjetKPIReportDTO kpi;
        try {
            kpi = kpiService.calculateProjetKPIs(projetId);
        } catch (RuntimeException e) {
            return new AIKPIReportDTO("Projet introuvable ou KPI non calculables.");
        }

        if (kpi.getNombreFichesSuivi() == 0) {
            return new AIKPIReportDTO(
                "Aucune fiche de suivi n'est disponible pour ce projet : il n'y a pas de données à analyser.");
        }

        String empreinte = empreinteKPI(kpi);
        if (!forceRefresh) {
            AnalyseEnCache enCache = cache.get(projetId);
            if (enCache != null && enCache.estValide(empreinte)) {
                // Copie : l'instance en cache est partagée, la marquer directement altérerait
                // les rapports déjà remis aux appelants précédents.
                AIKPIReportDTO copie = copier(enCache.rapport);
                if (copie != null) {
                    copie.setDepuisCache(true);
                    return copie;
                }
                // Copie impossible : on repart sur une analyse fraîche.
            }
        }

        AIKPIReportDTO rapport = interrogerGemini(buildPrompt(kpi));
        if (rapport.isSuccess()) {
            rapport.setGenereLe(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm")));
            rapport.setModele(model);
            rapport.setDepuisCache(false);
            cache.put(projetId, new AnalyseEnCache(empreinte, rapport));
        }
        return rapport;
    }

    /* ------------------------------------------------------------------ */
    /* Appel du modèle                                                      */
    /* ------------------------------------------------------------------ */

    private AIKPIReportDTO interrogerGemini(String prompt) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(corpsRequete(prompt));
        } catch (Exception e) {
            return new AIKPIReportDTO("Erreur interne lors de la préparation de l'analyse.");
        }
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                ResponseEntity<String> response =
                    restTemplate.exchange(getGeminiUrl(), HttpMethod.POST, entity, String.class);
                ReponseModele reponse = texteDeLaReponse(response.getBody());

                AIKPIReportDTO diagnostic = diagnostiquer(reponse);
                if (diagnostic != null) {
                    tracerReponseIllisible(response.getBody());
                    return diagnostic;
                }

                AIKPIReportDTO rapport = parseGeminiResponse(reponse.texte);
                if (!rapport.isSuccess()) {
                    tracerReponseIllisible(response.getBody());
                }
                return rapport;

            } catch (HttpServerErrorException.ServiceUnavailable e) {
                // Modèle temporairement saturé côté Google : on retente avec un backoff court.
                if (attempt == MAX_ATTEMPTS) {
                    return new AIKPIReportDTO(
                        "Le modèle d'analyse est momentanément surchargé. Réessayez dans quelques instants.");
                }
                sleepQuietly(attempt * 1000L);

            } catch (HttpClientErrorException.TooManyRequests e) {
                return new AIKPIReportDTO(
                    "Le quota d'appels à l'IA est atteint. Réessayez plus tard ou relancez l'analyse demain.");

            } catch (RestClientResponseException e) {
                e.printStackTrace();
                return new AIKPIReportDTO(
                    "Le service d'analyse IA a refusé la requête (code " + e.getRawStatusCode() + ").");

            } catch (Exception e) {
                e.printStackTrace();
                return new AIKPIReportDTO(
                    "Impossible de contacter le service d'analyse IA pour le moment.");
            }
        }
        return new AIKPIReportDTO("Le modèle d'analyse est momentanément surchargé. Réessayez dans quelques instants.");
    }

    /**
     * Traduit un arrêt anormal du modèle en message actionnable.
     *
     * @return null si la réponse est exploitable.
     */
    private AIKPIReportDTO diagnostiquer(ReponseModele reponse) {
        if (!reponse.blockReason.isEmpty()) {
            return new AIKPIReportDTO(
                "La requête a été bloquée par les filtres du modèle (" + reponse.blockReason + ").");
        }
        if (reponse.texte.isBlank()) {
            if ("MAX_TOKENS".equals(reponse.finishReason)) {
                return new AIKPIReportDTO(
                    "Le modèle a épuisé son budget de réponse avant de rédiger l'analyse. "
                        + "Relancez l'analyse ; si cela persiste, réduisez le périmètre demandé.");
            }
            if ("SAFETY".equals(reponse.finishReason) || "RECITATION".equals(reponse.finishReason)) {
                return new AIKPIReportDTO(
                    "Le modèle a interrompu sa réponse (" + reponse.finishReason + ").");
            }
            return new AIKPIReportDTO("Le modèle n'a renvoyé aucune analyse"
                + (reponse.finishReason.isEmpty() ? "." : " (" + reponse.finishReason + ")."));
        }
        return null;
    }

    /** Trace la réponse brute côté serveur : sans elle, un échec de lecture n'est pas diagnosticable. */
    private void tracerReponseIllisible(String corps) {
        String extrait = corps == null ? "(vide)"
            : corps.substring(0, Math.min(corps.length(), 2000));
        System.err.println("[AIKPIService] Réponse Gemini inexploitable : " + extrait);
    }

    private ObjectNode corpsRequete(String prompt) {
        ObjectNode body = objectMapper.createObjectNode();

        ArrayNode contents = objectMapper.createArrayNode();
        ObjectNode content = objectMapper.createObjectNode();
        ArrayNode parts = objectMapper.createArrayNode();
        ObjectNode part = objectMapper.createObjectNode();
        part.put("text", prompt);
        parts.add(part);
        content.set("parts", parts);
        contents.add(content);
        body.set("contents", contents);

        ObjectNode generationConfig = objectMapper.createObjectNode();
        // Large : sur les modèles à raisonnement, les tokens de réflexion s'imputent sur ce budget
        // avant même que la rédaction du JSON ne commence.
        generationConfig.put("maxOutputTokens", 8192);
        // Température basse : on veut une analyse reproductible et ancrée sur les chiffres.
        generationConfig.put("temperature", 0.25);
        // Contraint le modèle à répondre en JSON pur, sans balises markdown autour.
        generationConfig.put("responseMimeType", "application/json");
        body.set("generationConfig", generationConfig);

        return body;
    }

    /** Ce que le modèle a renvoyé : le texte utile et la raison pour laquelle il s'est arrêté. */
    static final class ReponseModele {
        final String texte;
        final String finishReason;
        final String blockReason;

        ReponseModele(String texte, String finishReason, String blockReason) {
            this.texte = texte;
            this.finishReason = finishReason;
            this.blockReason = blockReason;
        }
    }

    /**
     * Extrait le texte utile de l'enveloppe Gemini.
     *
     * Les modèles à raisonnement renvoient plusieurs parties : celles marquées « thought »
     * portent le raisonnement, pas la réponse. Les lire donnerait un contenu inexploitable,
     * on ne concatène donc que les parties de réponse.
     */
    ReponseModele texteDeLaReponse(String corps) throws Exception {
        JsonNode racine = objectMapper.readTree(corps);
        String blockReason = racine.path("promptFeedback").path("blockReason").asText("");

        JsonNode candidats = racine.path("candidates");
        if (!candidats.isArray() || candidats.isEmpty()) {
            return new ReponseModele("", "", blockReason);
        }

        JsonNode candidat = candidats.get(0);
        String finishReason = candidat.path("finishReason").asText("");

        StringBuilder texte = new StringBuilder();
        for (JsonNode part : candidat.path("content").path("parts")) {
            if (part.path("thought").asBoolean(false)) {
                continue;
            }
            texte.append(part.path("text").asText(""));
        }
        return new ReponseModele(texte.toString(), finishReason, blockReason);
    }

    /* ------------------------------------------------------------------ */
    /* Construction du prompt                                              */
    /* ------------------------------------------------------------------ */

    String buildPrompt(ProjetKPIReportDTO kpi) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Tu es un directeur de projet expérimenté (certifié PMP). Tu rédiges la note ")
              .append("d'analyse destinée au comité de pilotage qualité d'une DSI.\n\n")
              .append("RÈGLES IMPÉRATIVES :\n")
              .append("1. Appuie chaque constat sur les chiffres fournis et cite-les explicitement.\n")
              .append("2. N'invente aucune donnée : si un indicateur est marqué « non renseigné », signale-le ")
              .append("comme un manque de pilotage plutôt que de le supposer.\n")
              .append("3. Les actions doivent être concrètes, réalisables sous 30 jours, et nommer la tâche ")
              .append("ou l'intervenant concerné quand l'information est disponible.\n")
              .append("4. Distingue le score de santé déjà calculé (règles déterministes) de ta propre ")
              .append("évaluation : si tu diverges, explique pourquoi.\n")
              .append("5. Réponds en français, uniquement par un objet JSON conforme au schéma ci-dessous.\n\n");

        prompt.append("SCHÉMA DE RÉPONSE :\n")
              .append("{\n")
              .append("  \"scorePerformance\": <entier 0-100>,\n")
              .append("  \"niveauRisque\": \"FAIBLE|MOYEN|ELEVE|CRITIQUE\",\n")
              .append("  \"niveauConfiance\": \"FAIBLE|MOYEN|ELEVE\",\n")
              .append("  \"syntheseExecutive\": \"<3 à 4 phrases pour le comité>\",\n")
              .append("  \"predictionDateFin\": \"<JJ/MM/AAAA ou fourchette>\",\n")
              .append("  \"justificationPrediction\": \"<1 à 2 phrases chiffrées>\",\n")
              .append("  \"axes\": [{\"axe\": \"Délai|Charge|Qualité|Budget\", ")
              .append("\"constat\": \"<1 à 2 phrases chiffrées>\", \"tendance\": \"POSITIVE|STABLE|NEGATIVE\"}],\n")
              .append("  \"forces\": [\"<2 à 3 points d'appui réels>\"],\n")
              .append("  \"pointsDeVigilance\": [\"<2 à 4 points>\"],\n")
              .append("  \"actions\": [{\"priorite\": <1..5>, \"titre\": \"<action courte>\", ")
              .append("\"description\": \"<comment faire>\", \"impactAttendu\": \"<effet mesurable>\", ")
              .append("\"delai\": \"<horizon, ex: sous 15 jours>\"}],\n")
              .append("  \"alertes\": [\"<alertes que les règles automatiques n'ont pas vues>\"]\n")
              .append("}\n\n");

        prompt.append("Fournis exactement 4 axes (Délai, Charge, Qualité, Budget) et 3 à 5 actions ")
              .append("triées par priorité croissante (1 = la plus urgente).\n\n");

        prompt.append("=== DONNÉES DU PROJET ===\n");
        prompt.append("Nom : ").append(orNc(kpi.getNomProjet())).append('\n');
        prompt.append("Statut : ").append(orNc(kpi.getStatut())).append('\n');
        prompt.append("Début : ").append(orNc(kpi.getDateDebut()))
              .append(" | Fin prévue : ").append(orNc(kpi.getDateFinPrevue())).append('\n');
        prompt.append("Fiches de suivi exploitées : ").append(kpi.getNombreFichesSuivi())
              .append(" (dernière : ").append(orNc(kpi.getDateDerniereFiche())).append(")\n\n");

        prompt.append("-- Avancement --\n");
        prompt.append("Réel (pondéré par la charge) : ").append(pct(kpi.getTauxAvancement())).append('\n');
        if (kpi.getTauxAvancementPlanifie() > 0) {
            prompt.append("Planifié à ce jour : ").append(pct(kpi.getTauxAvancementPlanifie()))
                  .append(" -> écart ").append(signe(kpi.getEcartPlanning())).append(" points, SPI ")
                  .append(dec(kpi.getSpi())).append(" (1,00 = conforme au planning)\n");
        } else {
            prompt.append("Planifié à ce jour : non calculable (aucune échéance exploitable)\n");
        }
        prompt.append("Progression depuis la fiche précédente : ").append(signe(kpi.getDeltaAvancement()))
              .append(" points\n");
        prompt.append("Retard sur la date de fin prévue : ").append(kpi.getJoursRetard()).append(" jour(s)\n");
        if (kpi.getDateFinProjetee() != null) {
            prompt.append("Fin extrapolée au rythme actuel : ").append(kpi.getDateFinProjetee())
                  .append(" (dérapage de ").append(kpi.getJoursDerapageProjete()).append(" jour(s))\n");
        }

        prompt.append("\n-- Tâches --\n");
        prompt.append("Total ").append(kpi.getTotalTaches())
              .append(" : ").append(kpi.getTachesTerminees()).append(" terminées, ")
              .append(kpi.getTachesEnCours()).append(" en cours, ")
              .append(kpi.getTachesNonDemarrees()).append(" non démarrées\n");
        prompt.append("Hors délai : ").append(kpi.getTachesEnRetard())
              .append(" | échéances à moins de 14 jours : ").append(kpi.getTachesEcheanceProche()).append('\n');
        prompt.append("Taux de respect des échéances : ")
              .append(kpi.getTauxRespectEcheances() >= 0 ? pct(kpi.getTauxRespectEcheances()) : "non mesurable")
              .append('\n');
        ajouterTaches(prompt, "Détail des tâches hors délai", kpi.getListeTachesEnRetard(), true);
        ajouterTaches(prompt, "Détail des échéances imminentes", kpi.getListeTachesEcheanceProche(), false);

        prompt.append("\n-- Charge --\n");
        if (kpi.getChargeEstimee() > 0 || kpi.getChargeConsommee() > 0) {
            prompt.append("Estimée ").append(dec(kpi.getChargeEstimee())).append(" j | consommée ")
                  .append(dec(kpi.getChargeConsommee())).append(" j | reste à faire ")
                  .append(dec(kpi.getChargeRestanteEstimee())).append(" j\n");
            prompt.append("Consommation : ").append(pct(kpi.getTauxConsommationCharge()))
                  .append(" de la charge estimée\n");
            if (kpi.getChargeConsommee() > 0) {
                prompt.append("Indice d'efficacité CPI : ").append(dec(kpi.getIndiceEfficacite()))
                      .append(" (>1 = produit plus que ce qu'il consomme)\n");
            }
        } else {
            prompt.append("Non renseignée (ni charge estimée ni charge consommée dans les fiches)\n");
        }

        prompt.append("\n-- Qualité --\n");
        prompt.append("Problèmes déclarés : ").append(kpi.getNombreProblemes())
              .append(" dont ").append(kpi.getNombreProblemesPersistants())
              .append(" déjà présents dans la fiche précédente\n");
        prompt.append("Risques : ").append(kpi.getNombreRisques())
              .append(" | recommandations du chef de projet : ").append(kpi.getNombreRecommandations()).append('\n');
        ajouterListe(prompt, "Problèmes", kpi.getListeProblemes());
        ajouterListe(prompt, "Risques", kpi.getListeRisques());
        ajouterListe(prompt, "Recommandations déjà formulées par le chef de projet", kpi.getListeRecommandations());

        prompt.append("\n-- Budget (en MD) --\n");
        if (kpi.getBudgetPrevision() > 0 || kpi.getBudgetRealisation() > 0) {
            prompt.append("Cadré ").append(dec(kpi.getBudgetTotal())).append(" | prévu ")
                  .append(dec(kpi.getBudgetPrevision())).append(" | consommé ")
                  .append(dec(kpi.getBudgetRealisation())).append(" | écart disponible ")
                  .append(dec(kpi.getEcartBudget())).append('\n');
            prompt.append("Taux de consommation : ").append(pct(kpi.getTauxConsommationBudget()))
                  .append(" (à comparer aux ").append(pct(kpi.getTauxAvancement())).append(" d'avancement)\n");
        } else {
            prompt.append("Aucun suivi budgétaire renseigné dans les fiches de suivi\n");
        }

        prompt.append("\n-- Équipe --\n");
        prompt.append(kpi.getTailleEquipe()).append(" membre(s) affecté(s)\n");

        prompt.append("\n-- Score de santé calculé automatiquement --\n");
        prompt.append(dec(kpi.getScoreSante())).append("/100 (").append(orNc(kpi.getNiveauSante())).append(")\n");
        if (kpi.getDetailScore() != null) {
            for (ComposanteScoreDTO composante : kpi.getDetailScore()) {
                prompt.append("  . ").append(composante.getLibelle()).append(" : ")
                      .append(dec(composante.getPoints())).append('/').append(dec(composante.getPointsMax()))
                      .append(" — ").append(orNc(composante.getCommentaire())).append('\n');
            }
        }

        if (kpi.getAlertes() != null && !kpi.getAlertes().isEmpty()) {
            prompt.append("\n-- Alertes déjà levées par les règles automatiques --\n");
            for (AlerteKPIDTO alerte : kpi.getAlertes()) {
                prompt.append("  . [").append(alerte.getNiveau()).append("] ")
                      .append(alerte.getTitre()).append(" — ").append(alerte.getMessage()).append('\n');
            }
            prompt.append("Ne les répète pas dans \"alertes\" : n'y mets que ce qu'elles n'ont pas vu.\n");
        }

        if (kpi.getHistorique() != null && kpi.getHistorique().size() >= 2) {
            prompt.append("\n-- Historique (une ligne par fiche de suivi) --\n");
            for (PointHistoriqueKPIDTO point : kpi.getHistorique()) {
                prompt.append("  . ").append(orNc(point.getDate())).append(" : avancement ")
                      .append(pct(point.getTauxAvancement())).append(", ")
                      .append(point.getNombreProblemes()).append(" problème(s), ")
                      .append(point.getNombreRisques()).append(" risque(s)\n");
            }
        }

        return prompt.toString();
    }

    private void ajouterTaches(StringBuilder prompt, String titre, List<TacheKPIDTO> taches, boolean retard) {
        if (taches == null || taches.isEmpty()) {
            return;
        }
        prompt.append(titre).append(" :\n");
        int limite = Math.min(taches.size(), MAX_TACHES_PROMPT);
        for (int i = 0; i < limite; i++) {
            TacheKPIDTO tache = taches.get(i);
            prompt.append("  . ").append(orNc(tache.getSujet()))
                  .append(" (assignée à ").append(orNc(tache.getAssigneA()))
                  .append(", échéance ").append(orNc(tache.getEcheance()))
                  .append(", réalisé ").append(tache.getPourcentageRealise()).append(" %, ")
                  .append(retard ? tache.getJoursEcart() + " j de retard" : (-tache.getJoursEcart()) + " j restants")
                  .append(")\n");
        }
        if (taches.size() > limite) {
            prompt.append("  . ... et ").append(taches.size() - limite).append(" autre(s)\n");
        }
    }

    private void ajouterListe(StringBuilder prompt, String titre, List<String> elements) {
        if (elements == null || elements.isEmpty()) {
            return;
        }
        prompt.append(titre).append(" :\n");
        for (String element : elements) {
            prompt.append("  . ").append(element).append('\n');
        }
    }

    /* ------------------------------------------------------------------ */
    /* Lecture de la réponse                                               */
    /* ------------------------------------------------------------------ */

    AIKPIReportDTO parseGeminiResponse(String reply) {
        String json = extraireJson(reply);
        if (json == null) {
            return new AIKPIReportDTO(
                "La réponse de l'IA n'a pas pu être interprétée. Relancez l'analyse.");
        }

        try {
            JsonNode racine = lireJson(json);
            AIKPIReportDTO dto = new AIKPIReportDTO();

            dto.setScorePerformance(borne(racine.path("scorePerformance").asInt(0), 0, 100));
            dto.setNiveauRisque(normaliserNiveau(racine.path("niveauRisque").asText(""), AIKPIReportDTO.MOYEN));
            dto.setNiveauConfiance(normaliserNiveau(racine.path("niveauConfiance").asText(""), AIKPIReportDTO.MOYEN));
            dto.setSyntheseExecutive(texte(racine, "syntheseExecutive"));
            dto.setPredictionDateFin(texte(racine, "predictionDateFin"));
            dto.setJustificationPrediction(texte(racine, "justificationPrediction"));

            dto.setAxes(lireAxes(racine.path("axes")));
            dto.setForces(lireListeTexte(racine.path("forces")));
            dto.setPointsDeVigilance(lireListeTexte(racine.path("pointsDeVigilance")));
            dto.setActions(lireActions(racine.path("actions")));
            dto.setAlertes(lireListeTexte(racine.path("alertes")));

            // Une analyse sans synthèse ni action n'est pas exploitable : mieux vaut le dire.
            if (dto.getSyntheseExecutive().isBlank() && dto.getActions().isEmpty()) {
                return new AIKPIReportDTO("L'IA n'a pas produit d'analyse exploitable. Relancez l'analyse.");
            }
            return dto;

        } catch (Exception e) {
            return new AIKPIReportDTO("La réponse de l'IA n'a pas pu être interprétée. Relancez l'analyse.");
        }
    }

    /**
     * Isole l'objet JSON même si le modèle l'entoure de balises markdown ou de texte libre.
     */
    private String extraireJson(String reply) {
        if (reply == null || reply.isBlank()) {
            return null;
        }
        String nettoye = reply.trim();
        if (nettoye.startsWith("```")) {
            nettoye = nettoye.replaceAll("(?s)^```[a-zA-Z]*\\s*", "").replaceAll("(?s)```\\s*$", "").trim();
        }
        int debut = nettoye.indexOf('{');
        if (debut < 0) {
            return null;
        }
        int fin = nettoye.lastIndexOf('}');
        // Sans accolade fermante, la réponse est tronquée : on prend la suite telle quelle
        // et la réparation se chargera de refermer les structures ouvertes.
        return fin > debut ? nettoye.substring(debut, fin + 1) : nettoye.substring(debut);
    }

    /**
     * Lit le JSON, en réparant une éventuelle troncature : une analyse coupée en route
     * reste exploitable pour les champs déjà rédigés, plutôt que d'être entièrement perdue.
     */
    private JsonNode lireJson(String json) throws Exception {
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return objectMapper.readTree(reparerJsonTronque(json));
        }
    }

    private String reparerJsonTronque(String json) {
        Deque<Character> ouvertures = new ArrayDeque<>();
        boolean dansChaine = false;
        boolean echappe = false;

        for (char c : json.toCharArray()) {
            if (echappe) {
                echappe = false;
            } else if (c == '\\') {
                echappe = true;
            } else if (c == '"') {
                dansChaine = !dansChaine;
            } else if (!dansChaine) {
                if (c == '{' || c == '[') {
                    ouvertures.push(c);
                } else if ((c == '}' || c == ']') && !ouvertures.isEmpty()) {
                    ouvertures.pop();
                }
            }
        }

        StringBuilder repare = new StringBuilder(json);
        if (dansChaine) {
            repare.append('"'); // chaîne coupée en plein milieu
        }
        elaguerFinIncomplete(repare);
        while (!ouvertures.isEmpty()) {
            repare.append(ouvertures.pop() == '{' ? '}' : ']');
        }
        return repare.toString();
    }

    /** Retire une virgule en suspens ou une clé sans valeur, qui rendraient le JSON invalide. */
    private void elaguerFinIncomplete(StringBuilder texte) {
        boolean modifie = true;
        while (modifie) {
            modifie = false;
            while (texte.length() > 0 && Character.isWhitespace(texte.charAt(texte.length() - 1))) {
                texte.setLength(texte.length() - 1);
                modifie = true;
            }
            if (texte.length() > 0 && texte.charAt(texte.length() - 1) == ',') {
                texte.setLength(texte.length() - 1);
                modifie = true;
            }
            if (texte.length() > 0 && texte.charAt(texte.length() - 1) == ':') {
                texte.setLength(texte.length() - 1);
                // La clé orpheline qui précède les deux-points doit partir avec eux.
                while (texte.length() > 0 && Character.isWhitespace(texte.charAt(texte.length() - 1))) {
                    texte.setLength(texte.length() - 1);
                }
                if (texte.length() > 0 && texte.charAt(texte.length() - 1) == '"') {
                    texte.setLength(texte.length() - 1);
                    int debutCle = texte.lastIndexOf("\"");
                    if (debutCle >= 0) {
                        texte.setLength(debutCle);
                    }
                }
                modifie = true;
            }
        }
    }

    private List<AxeAnalyseIADTO> lireAxes(JsonNode noeud) {
        List<AxeAnalyseIADTO> axes = new ArrayList<>();
        if (!noeud.isArray()) {
            return axes;
        }
        for (JsonNode element : noeud) {
            String axe = element.path("axe").asText("").trim();
            String constat = element.path("constat").asText("").trim();
            if (axe.isEmpty() && constat.isEmpty()) {
                continue;
            }
            axes.add(new AxeAnalyseIADTO(axe, constat, normaliserTendance(element.path("tendance").asText(""))));
        }
        return axes;
    }

    private List<ActionIADTO> lireActions(JsonNode noeud) {
        List<ActionIADTO> actions = new ArrayList<>();
        if (!noeud.isArray()) {
            return actions;
        }
        int rang = 1;
        for (JsonNode element : noeud) {
            String titre = element.path("titre").asText("").trim();
            if (titre.isEmpty()) {
                continue;
            }
            ActionIADTO action = new ActionIADTO();
            int priorite = element.path("priorite").asInt(0);
            action.setPriorite(priorite > 0 ? priorite : rang);
            action.setTitre(titre);
            action.setDescription(element.path("description").asText("").trim());
            action.setImpactAttendu(element.path("impactAttendu").asText("").trim());
            action.setDelai(element.path("delai").asText("").trim());
            actions.add(action);
            rang++;
        }
        actions.sort((a, b) -> Integer.compare(a.getPriorite(), b.getPriorite()));
        return actions;
    }

    /** Accepte un tableau JSON ou, par tolérance, une chaîne dont les entrées sont séparées par « | ». */
    private List<String> lireListeTexte(JsonNode noeud) {
        List<String> valeurs = new ArrayList<>();
        if (noeud.isArray()) {
            for (JsonNode element : noeud) {
                ajouterSiUtile(valeurs, element.asText(""));
            }
        } else if (noeud.isTextual()) {
            for (String morceau : noeud.asText().split("\\|")) {
                ajouterSiUtile(valeurs, morceau);
            }
        }
        return valeurs;
    }

    private void ajouterSiUtile(List<String> cible, String valeur) {
        if (valeur == null) {
            return;
        }
        String propre = valeur.trim();
        if (!propre.isEmpty() && !"aucune alerte".equalsIgnoreCase(propre) && !"N/A".equalsIgnoreCase(propre)) {
            cible.add(propre);
        }
    }

    private String normaliserNiveau(String valeur, String defaut) {
        String normalise = sansAccent(valeur);
        if (normalise.contains("CRITIQUE")) return AIKPIReportDTO.CRITIQUE;
        if (normalise.contains("ELEVE") || normalise.contains("HAUT")) return AIKPIReportDTO.ELEVE;
        if (normalise.contains("MOYEN") || normalise.contains("MODERE")) return AIKPIReportDTO.MOYEN;
        if (normalise.contains("FAIBLE") || normalise.contains("BAS")) return AIKPIReportDTO.FAIBLE;
        return defaut;
    }

    private String normaliserTendance(String valeur) {
        String normalise = sansAccent(valeur);
        if (normalise.contains("POSITIV") || normalise.contains("AMELIOR")) return AxeAnalyseIADTO.POSITIVE;
        if (normalise.contains("NEGATIV") || normalise.contains("DEGRAD")) return AxeAnalyseIADTO.NEGATIVE;
        return AxeAnalyseIADTO.STABLE;
    }

    private String sansAccent(String valeur) {
        if (valeur == null) {
            return "";
        }
        return Normalizer.normalize(valeur, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toUpperCase(Locale.ROOT)
            .trim();
    }

    private String texte(JsonNode racine, String champ) {
        return racine.path(champ).asText("").trim();
    }

    private int borne(int valeur, int min, int max) {
        return Math.max(min, Math.min(max, valeur));
    }

    /** Copie défensive du rapport mis en cache, pour ne jamais exposer l'instance partagée. */
    private AIKPIReportDTO copier(AIKPIReportDTO rapport) {
        try {
            return objectMapper.convertValue(rapport, AIKPIReportDTO.class);
        } catch (Exception e) {
            // Copie impossible : mieux vaut refaire une analyse que de rendre l'instance partagée.
            return null;
        }
    }

    /**
     * Empreinte des KPI : tant qu'elle ne change pas, l'analyse en cache reste valable.
     */
    private String empreinteKPI(ProjetKPIReportDTO kpi) {
        try {
            return Integer.toHexString(objectMapper.writeValueAsString(kpi).hashCode());
        } catch (Exception e) {
            // Empreinte indisponible : on force une analyse fraîche plutôt que de servir un cache douteux.
            return String.valueOf(System.nanoTime());
        }
    }

    private String orNc(String valeur) {
        return valeur != null && !valeur.isBlank() ? valeur : "non renseigné";
    }

    private String pct(double valeur) {
        return String.format(Locale.FRANCE, "%.0f %%", valeur);
    }

    private String dec(double valeur) {
        return String.format(Locale.FRANCE, "%.2f", valeur);
    }

    private String signe(double valeur) {
        return String.format(Locale.FRANCE, "%+.1f", valeur);
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
