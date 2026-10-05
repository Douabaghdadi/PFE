package com.example.demo.service;

import com.example.demo.dto.ChatRequest;
import com.example.demo.dto.ChatResponse;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.ProjetSuiviStatusDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Service
public class ChatService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-3.6-flash}")
    private String model;

    @Autowired
    private FicheProjetService ficheProjetService;

    @Autowired
    private KPIService kpiService;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String getGeminiUrl() {
        return "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;
    }

    private String buildDataContext() {
        List<FicheProjet> projets = ficheProjetRepository.findAll();
        List<FicheSuivi> suivis = ficheSuiviRepository.findAll();
        List<ProjetSuiviStatusDTO> projetsEnRetard = ficheProjetService.getProjetsSuiviStatus();

        StringBuilder ctx = new StringBuilder();
        ctx.append("=== DONNÉES RÉELLES DE L'APPLICATION ===\n\n");

        // Projets en retard de fiche de suivi
        ctx.append("PROJETS EN RETARD DE FICHE DE SUIVI PÉRIODIQUE (").append(projetsEnRetard.size()).append(") :\n");
        if (projetsEnRetard.isEmpty()) {
            ctx.append("- Aucun projet en retard de fiche de suivi.\n");
        } else {
            for (ProjetSuiviStatusDTO s : projetsEnRetard) {
                ctx.append("- Projet: ").append(s.getNomProjet());
                ctx.append(", Jours de retard: ").append(s.getJoursRetard());
                ctx.append(", Dernière fiche: ").append(s.getDateDerniereFicheSuivi());
                ctx.append(", Prochaine fiche attendue: ").append(s.getDateProchaineFicheSuivi());
                ctx.append(", Périodicité: ").append(s.getPeriodiciteSuiviMois()).append(" mois\n");
            }
        }

        // Tous les projets
        ctx.append("\nTOUS LES PROJETS (").append(projets.size()).append(") :\n");
        for (FicheProjet p : projets) {
            ctx.append("- Projet: ").append(p.getNomProjet());
            ctx.append(", Statut: ").append(p.getStatut());
            ctx.append(", Responsable: ").append(p.getResponsable());
            if (p.getDateDebut() != null) ctx.append(", Début: ").append(p.getDateDebut());
            if (p.getDateFinPrevue() != null) ctx.append(", Fin prévue: ").append(p.getDateFinPrevue());
            if (p.getDateProchaineFicheSuivi() != null) ctx.append(", Prochaine fiche suivi: ").append(p.getDateProchaineFicheSuivi());
            if (p.getPeriodiciteSuiviMois() != null) ctx.append(", Périodicité: ").append(p.getPeriodiciteSuiviMois()).append(" mois");
            if (p.getRisquesPotentiels() != null) ctx.append(", Risques: ").append(p.getRisquesPotentiels());
            if (p.getEquipeProjet() != null) ctx.append(", Équipe: ").append(p.getEquipeProjet());
            if (p.getResponsable() != null) ctx.append(", Responsable: ").append(p.getResponsable());
            if (p.getMaitreOuvrage() != null) ctx.append(", Maître ouvrage: ").append(p.getMaitreOuvrage());
            if (p.getMaitreOeuvre() != null) ctx.append(", Maître oeuvre: ").append(p.getMaitreOeuvre());
            ctx.append("\n");
        }

        // Fiches de suivi
        ctx.append("\nFICHES DE SUIVI (").append(suivis.size()).append(") :\n");
        for (FicheSuivi s : suivis) {
            ctx.append("- Rapport: ").append(s.getNumeroRapport());
            ctx.append(", Date: ").append(s.getDateRapport());
            if (s.getConstatGlobal() != null) {
                ctx.append(", Avancement: ").append(s.getConstatGlobal().getEtatAvancement());
                if (s.getConstatGlobal().getPrincipauxRisques() != null && !s.getConstatGlobal().getPrincipauxRisques().isEmpty())
                    ctx.append(", Risques: ").append(s.getConstatGlobal().getPrincipauxRisques());
                if (s.getConstatGlobal().getProblemesRencontres() != null && !s.getConstatGlobal().getProblemesRencontres().isEmpty())
                    ctx.append(", Problèmes: ").append(s.getConstatGlobal().getProblemesRencontres());
            }
            ctx.append("\n");
        }

        // KPI de chaque projet
        ctx.append("\nKPI PAR PROJET :\n");
        for (FicheProjet p : projets) {
            try {
                ProjetKPIReportDTO kpi = kpiService.calculateProjetKPIs(p.getId());
                ctx.append("- Projet: ").append(kpi.getNomProjet());
                ctx.append(", Avancement: ").append(String.format("%.0f", kpi.getTauxAvancement())).append("%");
                ctx.append(", Problèmes: ").append(kpi.getNombreProblemes());
                ctx.append(", Risques: ").append(kpi.getNombreRisques());
                ctx.append(", Jours retard: ").append(kpi.getJoursRetard());
                ctx.append(", Budget: ").append(kpi.getBudgetTotal()).append(" MDH");
                ctx.append(", Équipe: ").append(kpi.getTailleEquipe()).append(" membres");
                if (kpi.getListeProblemes() != null && !kpi.getListeProblemes().isEmpty())
                    ctx.append(", Liste problèmes: ").append(kpi.getListeProblemes());
                if (kpi.getListeRisques() != null && !kpi.getListeRisques().isEmpty())
                    ctx.append(", Liste risques: ").append(kpi.getListeRisques());
                ctx.append("\n");
            } catch (Exception e) {
                ctx.append("- Projet: ").append(p.getNomProjet()).append(" (KPI non disponible)\n");
            }
        }

        ctx.append("\n=== FIN DES DONNÉES ===\n");
        return ctx.toString();
    }

    private String getSystemPrompt(String context) {
        String base = "Tu es un assistant IA intégré dans une application de gestion de projets qualité (Qualinet). "
                + "Tu réponds toujours en français, de manière concise et professionnelle. "
                + "Tu analyses UNIQUEMENT les données réelles fournies ci-dessous. "
                + "Ne génère JAMAIS de données fictives. Si une information n'est pas disponible, dis-le clairement. "
                + "IMPORTANT : Réponds UNIQUEMENT à ce qui est demandé, sans ajouter d'informations supplémentaires non demandées.\n\n"
                + buildDataContext() + "\n";

        if ("chef_projet".equals(context)) {
            return base + "Tu assistes les Chefs de Projet.";
        } else if ("pilote_qualite".equals(context)) {
            return base + "Tu assistes les Pilotes Qualité.";
        }
        return base;
    }

    private static final int MAX_ATTEMPTS = 3;

    public ChatResponse chat(ChatRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String fullPrompt = getSystemPrompt(request.getContext()) + "\n\nUtilisateur: " + request.getMessage();

        ObjectNode body = objectMapper.createObjectNode();
        ArrayNode contents = objectMapper.createArrayNode();
        ObjectNode content = objectMapper.createObjectNode();
        ArrayNode parts = objectMapper.createArrayNode();
        ObjectNode part = objectMapper.createObjectNode();
        part.put("text", fullPrompt);
        parts.add(part);
        content.set("parts", parts);
        contents.add(content);
        body.set("contents", contents);

        ObjectNode generationConfig = objectMapper.createObjectNode();
        generationConfig.put("maxOutputTokens", 2000);
        generationConfig.put("temperature", 0.7);
        body.set("generationConfig", generationConfig);

        String requestJson;
        try {
            requestJson = objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            return new ChatResponse("Erreur interne lors de la préparation de la requête.", false);
        }
        HttpEntity<String> entity = new HttpEntity<>(requestJson, headers);

        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                ResponseEntity<String> response = restTemplate.exchange(getGeminiUrl(), HttpMethod.POST, entity, String.class);

                JsonNode root = objectMapper.readTree(response.getBody());
                String reply = root.path("candidates").get(0)
                        .path("content").path("parts").get(0)
                        .path("text").asText();

                return new ChatResponse(reply);

            } catch (HttpServerErrorException.ServiceUnavailable e) {
                // Le modèle Gemini est temporairement surchargé côté Google : on retente avec un backoff court.
                if (attempt == MAX_ATTEMPTS) {
                    e.printStackTrace();
                    return new ChatResponse(
                        "🤖 L'assistant IA est momentanément surchargé (forte demande côté Google). Réessayez dans quelques instants.",
                        false);
                }
                sleepQuietly(attempt * 1000L);

            } catch (RestClientResponseException e) {
                e.printStackTrace();
                return new ChatResponse(
                    "🤖 L'assistant IA est momentanément indisponible. Réessayez dans quelques instants.", false);

            } catch (Exception e) {
                e.printStackTrace();
                return new ChatResponse(
                    "🤖 Impossible de contacter l'assistant IA pour le moment. Réessayez dans quelques instants.", false);
            }
        }

        return new ChatResponse("🤖 L'assistant IA est momentanément indisponible. Réessayez dans quelques instants.", false);
    }

    private void sleepQuietly(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }
}
