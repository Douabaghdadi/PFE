package com.example.demo.service;

import com.example.demo.dto.AIKPIReportDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class AIKPIService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    @Autowired
    private KPIService kpiService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String getGeminiUrl() {
        return "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;
    }

    public AIKPIReportDTO analyzeKPIsWithAI(String projetId) {
        try {
            ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(projetId);

            String prompt = buildPrompt(kpi);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

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
            generationConfig.put("maxOutputTokens", 1500);
            generationConfig.put("temperature", 0.4);
            body.set("generationConfig", generationConfig);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = restTemplate.exchange(getGeminiUrl(), HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String reply = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

            return parseGeminiResponse(reply);

        } catch (Exception e) {
            return new AIKPIReportDTO("Erreur lors de l'analyse IA : " + e.getMessage());
        }
    }

    private String buildPrompt(ProjetKPIReportDTO kpi) {
        return "Tu es un expert en gestion de projets qualité. Analyse les KPI suivants et réponds UNIQUEMENT dans ce format JSON exact, sans markdown, sans texte avant ou après :\n\n"
                + "{\n"
                + "  \"scorePerformanceIA\": \"[score entre 0 et 100]\",\n"
                + "  \"niveauRisque\": \"[FAIBLE / MOYEN / ÉLEVÉ / CRITIQUE]\",\n"
                + "  \"predictionDateFin\": \"[date prévue ou commentaire court]\",\n"
                + "  \"analyseGlobale\": \"[analyse en 2-3 phrases]\",\n"
                + "  \"recommandationsIA\": \"[3 recommandations séparées par |]\",\n"
                + "  \"alertes\": \"[alertes importantes séparées par | ou 'Aucune alerte']\"\n"
                + "}\n\n"
                + "Données du projet :\n"
                + "- Nom : " + kpi.getNomProjet() + "\n"
                + "- Statut : " + kpi.getStatut() + "\n"
                + "- Taux d'avancement : " + String.format("%.0f", kpi.getTauxAvancement()) + "%\n"
                + "- Jours de retard : " + kpi.getJoursRetard() + "\n"
                + "- Nombre de problèmes : " + kpi.getNombreProblemes() + "\n"
                + "- Nombre de risques : " + kpi.getNombreRisques() + "\n"
                + "- Budget total : " + kpi.getBudgetTotal() + " MDH\n"
                + "- Taille équipe : " + kpi.getTailleEquipe() + " membres\n"
                + "- Date début : " + kpi.getDateDebut() + "\n"
                + "- Date fin prévue : " + kpi.getDateFinPrevue() + "\n"
                + "- Problèmes : " + kpi.getListeProblemes() + "\n"
                + "- Risques : " + kpi.getListeRisques() + "\n";
    }

    private AIKPIReportDTO parseGeminiResponse(String reply) {
        try {
            // Nettoyer la réponse si elle contient du markdown
            String cleaned = reply.trim();
            if (cleaned.startsWith("```")) {
                cleaned = cleaned.replaceAll("```json\\n?", "").replaceAll("```\\n?", "").trim();
            }

            JsonNode json = objectMapper.readTree(cleaned);
            AIKPIReportDTO dto = new AIKPIReportDTO();
            dto.setScorePerformanceIA(json.path("scorePerformanceIA").asText("N/A"));
            dto.setNiveauRisque(json.path("niveauRisque").asText("N/A"));
            dto.setPredictionDateFin(json.path("predictionDateFin").asText("N/A"));
            dto.setAnalyseGlobale(json.path("analyseGlobale").asText("N/A"));
            dto.setRecommandationsIA(json.path("recommandationsIA").asText("N/A"));
            dto.setAlertes(json.path("alertes").asText("Aucune alerte"));
            dto.setSuccess(true);
            return dto;
        } catch (Exception e) {
            // Si le parsing JSON échoue, retourner la réponse brute dans analyseGlobale
            AIKPIReportDTO dto = new AIKPIReportDTO();
            dto.setAnalyseGlobale(reply);
            dto.setSuccess(true);
            return dto;
        }
    }
}
