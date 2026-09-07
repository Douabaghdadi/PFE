package com.example.demo.service;

import com.example.demo.dto.TeamSuggestionRequest;
import com.example.demo.dto.TeamSuggestionResponse;
import com.example.demo.dto.TeamSuggestionResponse.ProfilRecommande;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class TeamSuggestionService {

    @Value("${gemini.api.key}")
    private String geminiApiKey;

    @Value("${gemini.api.model:gemini-2.0-flash}")
    private String model;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private KPIService kpiService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String getGeminiUrl() {
        return "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + geminiApiKey;
    }

    public TeamSuggestionResponse suggestTeam(TeamSuggestionRequest request) {
        try {
            String prompt = buildPrompt(request);

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
            generationConfig.put("maxOutputTokens", 2000);
            generationConfig.put("temperature", 0.3);
            body.set("generationConfig", generationConfig);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = restTemplate.exchange(getGeminiUrl(), HttpMethod.POST, entity, String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String reply = root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

            return parseGeminiResponse(reply);

        } catch (Exception e) {
            e.printStackTrace();
            return new TeamSuggestionResponse("Erreur lors de la suggestion d'équipe : " + e.getMessage());
        }
    }

    private String buildPrompt(TeamSuggestionRequest request) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Tu es un expert en gestion de projets. ");
        prompt.append("Reponds UNIQUEMENT avec un objet JSON valide, rien d'autre, pas de markdown, pas d'explication.\n\n");

        // Historique des projets
        prompt.append(buildHistoriqueContext());

        // Utilisateurs disponibles
        prompt.append(buildUsersContext());

        // Nouveau projet
        prompt.append("NOUVEAU PROJET:\n");
        prompt.append("type=" + (request.getTypeProjet() != null ? request.getTypeProjet() : "Non specifie") + "\n");
        prompt.append("budget=" + (request.getBudgetMDH() != null ? request.getBudgetMDH() + " MDH" : "Non specifie") + "\n");
        prompt.append("duree=" + (request.getDureeEnMois() != null ? request.getDureeEnMois() + " mois" : "Non specifiee") + "\n");
        prompt.append("complexite=" + (request.getComplexite() != null ? request.getComplexite() : "MOYENNE") + "\n");
        prompt.append("modalite=" + (request.getModaliteDeveloppement() != null ? request.getModaliteDeveloppement() : "Non specifiee") + "\n");
        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            prompt.append("description=" + request.getDescription() + "\n");
        }

        prompt.append("\nReponds avec exactement ce JSON (remplace les valeurs entre crochets):\n");
        prompt.append("{\n");
        prompt.append("\"tailleEquipeRecommandee\": 5,\n");
        prompt.append("\"profils\": [{\"role\": \"Chef de Projet\", \"nombrePersonnes\": 1, \"competencesRequises\": \"...\"}],\n");
        prompt.append("\"membresRecommandes\": [\"nom1\", \"nom2\"],\n");
        prompt.append("\"justification\": \"...\",\n");
        prompt.append("\"facteursCles\": \"...\",\n");
        prompt.append("\"risquesEquipe\": \"...\",\n");
        prompt.append("\"projetsSimilairesAnalyses\": \"...\"\n");
        prompt.append("}\n");

        return prompt.toString();
    }

    private String buildHistoriqueContext() {
        StringBuilder ctx = new StringBuilder();
        ctx.append("=== HISTORIQUE DES PROJETS ===\n");

        List<FicheProjet> projets = ficheProjetRepository.findAll();

        if (projets.isEmpty()) {
            ctx.append("Aucun projet historique disponible.\n\n");
            return ctx.toString();
        }

        for (FicheProjet p : projets) {
            ctx.append("Projet : ").append(p.getNomProjet()).append("\n");
            ctx.append("  - Type : ").append(p.getTypeProjet() != null ? p.getTypeProjet() : "N/A").append("\n");
            ctx.append("  - Statut : ").append(p.getStatut() != null ? p.getStatut() : "N/A").append("\n");
            ctx.append("  - Modalité : ").append(p.getModaliteDeveloppement() != null ? p.getModaliteDeveloppement() : "N/A").append("\n");

            if (p.getEstimationBudget() != null && p.getEstimationBudget().getBudgetMDHT() != null) {
                ctx.append("  - Budget : ").append(p.getEstimationBudget().getBudgetMDHT()).append(" MDH\n");
            }
            if (p.getDureeEnMois() != null) {
                ctx.append("  - Durée : ").append(p.getDureeEnMois()).append(" mois\n");
            }

            // Taille et membres de l'équipe
            int tailleEquipe = extractTailleEquipe(p.getEquipeProjet());
            ctx.append("  - Taille équipe : ").append(tailleEquipe).append(" membres\n");

            if (p.getResponsable() != null) {
                ctx.append("  - Responsable : ").append(p.getResponsable()).append("\n");
            }

            // KPI du projet
            try {
                var kpi = kpiService.calculateProjetKPIs(p.getId());
                ctx.append("  - Taux avancement : ").append(String.format("%.0f", kpi.getTauxAvancement())).append("%\n");
                ctx.append("  - Jours de retard : ").append(kpi.getJoursRetard()).append("\n");
                ctx.append("  - Nombre de problèmes : ").append(kpi.getNombreProblemes()).append("\n");
                ctx.append("  - Résultat : ").append(kpi.getJoursRetard() == 0 && kpi.getTauxAvancement() >= 80 ? "SUCCÈS" : "EN DIFFICULTÉ").append("\n");
            } catch (Exception e) {
                ctx.append("  - KPI : non disponible\n");
            }
            ctx.append("\n");
        }

        return ctx.toString();
    }

    private String buildUsersContext() {
        StringBuilder ctx = new StringBuilder();
        ctx.append("=== UTILISATEURS DISPONIBLES ===\n");

        List<User> users = userRepository.findAll();

        if (users.isEmpty()) {
            ctx.append("Aucun utilisateur disponible.\n\n");
            return ctx.toString();
        }

        for (User u : users) {
            String nomComplet = ((u.getFirstName() != null ? u.getFirstName() : "") + " " +
                    (u.getLastName() != null ? u.getLastName() : "")).trim();
            if (nomComplet.isEmpty()) nomComplet = u.getUsername();

            String roles = u.getRoles().stream()
                    .map(r -> r.getName().name())
                    .collect(Collectors.joining(", "));

            ctx.append("- ").append(nomComplet)
               .append(" (").append(roles).append(")\n");
        }
        ctx.append("\n");

        return ctx.toString();
    }

    private int extractTailleEquipe(String equipeProjet) {
        if (equipeProjet == null || equipeProjet.isEmpty()) return 0;
        try {
            List<Map<String, String>> equipe = objectMapper.readValue(
                equipeProjet, new TypeReference<List<Map<String, String>>>() {}
            );
            return equipe.size();
        } catch (Exception e) {
            return 0;
        }
    }

    private TeamSuggestionResponse parseGeminiResponse(String reply) {
        try {
            String cleaned = reply.trim();
            // Nettoyer tout type de markdown
            cleaned = cleaned.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            // Extraire uniquement le JSON entre { et }
            int start = cleaned.indexOf('{');
            int end = cleaned.lastIndexOf('}');
            if (start != -1 && end != -1 && end > start) {
                cleaned = cleaned.substring(start, end + 1);
            }

            JsonNode json = objectMapper.readTree(cleaned);
            TeamSuggestionResponse response = new TeamSuggestionResponse();

            // Gérer tailleEquipeRecommandee en string ou int
            JsonNode tailleNode = json.path("tailleEquipeRecommandee");
            if (tailleNode.isTextual()) {
                try { response.setTailleEquipeRecommandee(Integer.parseInt(tailleNode.asText())); }
                catch (Exception e) { response.setTailleEquipeRecommandee(0); }
            } else {
                response.setTailleEquipeRecommandee(tailleNode.asInt(0));
            }
            response.setJustification(json.path("justification").asText("N/A"));
            response.setFacteursCles(json.path("facteursCles").asText("N/A"));
            response.setRisquesEquipe(json.path("risquesEquipe").asText("N/A"));
            response.setProjetsSimilairesAnalyses(json.path("projetsSimilairesAnalyses").asText("N/A"));

            // Membres recommandés
            List<String> membres = new ArrayList<>();
            JsonNode membresNode = json.path("membresRecommandes");
            if (membresNode.isArray()) {
                membresNode.forEach(m -> membres.add(m.asText()));
            }
            response.setMembresRecommandes(membres);

            // Profils recommandés
            List<ProfilRecommande> profils = new ArrayList<>();
            JsonNode profilsNode = json.path("profils");
            if (profilsNode.isArray()) {
                profilsNode.forEach(p -> {
                    ProfilRecommande profil = new ProfilRecommande();
                    profil.setRole(p.path("role").asText());
                    profil.setNombrePersonnes(p.path("nombrePersonnes").asInt(1));
                    profil.setCompetencesRequises(p.path("competencesRequises").asText());
                    profils.add(profil);
                });
            }
            response.setProfils(profils);
            response.setSuccess(true);

            return response;

        } catch (Exception e) {
            throw new RuntimeException("Impossible de parser la réponse Gemini : " + e.getMessage());
        }
    }
}
