package com.example.demo.service;

import com.example.demo.dto.TeamSuggestionRequest;
import com.example.demo.dto.TeamSuggestionResponse;
import com.example.demo.dto.TeamSuggestionResponse.ProfilRecommande;
import com.example.demo.model.ERole;
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
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class TeamSuggestionService {

    /** Nombre de tentatives quand le modèle répond « surchargé » (503). */
    private static final int MAX_TENTATIVES = 3;

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
            // Large : sur les modèles à raisonnement, les tokens de réflexion s'imputent sur ce budget
            // avant la rédaction du JSON. À 2000, la réponse était coupée au milieu.
            generationConfig.put("maxOutputTokens", 8192);
            generationConfig.put("temperature", 0.3);
            // Contraint le modèle à répondre en JSON pur, sans balises markdown autour.
            generationConfig.put("responseMimeType", "application/json");
            body.set("generationConfig", generationConfig);

            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(body), headers);
            ResponseEntity<String> response = appelerGemini(entity);
            if (response == null) {
                return new TeamSuggestionResponse(
                        "Le modèle d'IA est momentanément surchargé. Réessayez dans quelques instants.");
            }

            JsonNode candidat = objectMapper.readTree(response.getBody()).path("candidates").path(0);
            String finishReason = candidat.path("finishReason").asText("");
            String reply = texteSansRaisonnement(candidat);

            if ("MAX_TOKENS".equals(finishReason)) {
                System.err.println("[TeamSuggestionService] Réponse Gemini tronquée : " + reply);
                return new TeamSuggestionResponse("La réponse de l'IA a été coupée avant la fin. Réessayez dans un instant.");
            }
            if (reply.isBlank()) {
                return new TeamSuggestionResponse("L'IA n'a renvoyé aucune suggestion"
                        + (finishReason.isEmpty() ? "." : " (" + finishReason + ")."));
            }
            return parseGeminiResponse(reply);

        } catch (HttpClientErrorException.TooManyRequests e) {
            return new TeamSuggestionResponse("Le quota d'appels à l'IA est atteint. Réessayez plus tard.");
        } catch (Exception e) {
            e.printStackTrace();
            return new TeamSuggestionResponse("Erreur lors de la suggestion d'équipe : " + e.getMessage());
        }
    }

    /**
     * Appelle Gemini en retentant quand le modèle est saturé (503), comme l'analyse IA des KPI.
     *
     * @return null si le modèle est resté saturé après toutes les tentatives.
     */
    private ResponseEntity<String> appelerGemini(HttpEntity<String> entity) throws InterruptedException {
        for (int tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
            try {
                return restTemplate.exchange(getGeminiUrl(), HttpMethod.POST, entity, String.class);
            } catch (HttpServerErrorException.ServiceUnavailable e) {
                if (tentative < MAX_TENTATIVES) {
                    Thread.sleep(tentative * 1000L);
                }
            }
        }
        return null;
    }

    private String buildPrompt(TeamSuggestionRequest request) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("Tu es un expert en gestion de projets. ");
        prompt.append("Reponds UNIQUEMENT avec un objet JSON valide, rien d'autre, pas de markdown, pas d'explication.\n\n");

        List<FicheProjet> projets = ficheProjetRepository.findAll();

        // Historique des projets
        prompt.append(buildHistoriqueContext(projets));

        // Personnes que l'IA peut proposer
        prompt.append(buildPersonnesContext(projets));

        // Nouveau projet
        prompt.append("NOUVEAU PROJET:\n");
        prompt.append("type=" + (request.getTypeProjet() != null ? request.getTypeProjet() : "Non specifie") + "\n");
        prompt.append("budget=" + (request.getBudgetMDH() != null ? request.getBudgetMDH() + " MDHT" : "Non specifie") + "\n");
        prompt.append("duree=" + (request.getDureeEnMois() != null ? request.getDureeEnMois() + " mois" : "Non specifiee") + "\n");
        prompt.append("complexite=" + (request.getComplexite() != null ? request.getComplexite() : "MOYENNE") + "\n");
        prompt.append("modalite=" + (request.getModaliteDeveloppement() != null ? request.getModaliteDeveloppement() : "Non specifiee") + "\n");
        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            prompt.append("description=" + request.getDescription() + "\n");
        }

        prompt.append("\nREGLES POUR LES MEMBRES :\n");
        prompt.append("- Propose une personne par poste : membresRecommandes contient exactement tailleEquipeRecommandee ")
              .append("entrees, et la somme des nombrePersonnes des profils vaut tailleEquipeRecommandee.\n");
        prompt.append("- Chaque entree est au format \"Prenom Nom - role\". Le chef de projet est choisi parmi les chefs ")
              .append("de projet disponibles, les autres parmi les membres d'equipe connus, de preference ceux qui ont ")
              .append("travaille sur des projets similaires reussis.\n");
        prompt.append("- S'il n'y a personne d'adapte pour un poste, ecris \"A recruter - role\".\n");
        prompt.append("- Les pilotes qualite et les administrateurs supervisent les projets : ne les propose jamais ")
              .append("comme membres et ne cree pas de profil \"Pilote Qualite\".\n");

        prompt.append("\nReponds avec exactement ce JSON (remplace les valeurs entre crochets):\n");
        prompt.append("{\n");
        prompt.append("\"tailleEquipeRecommandee\": 4,\n");
        prompt.append("\"profils\": [{\"role\": \"Chef de Projet\", \"nombrePersonnes\": 1, \"competencesRequises\": \"...\"}],\n");
        prompt.append("\"membresRecommandes\": [\"Prenom Nom - Chef de projet\", \"Prenom Nom - Developpeur back-end\", \"...\"],\n");
        prompt.append("\"justification\": \"...\",\n");
        prompt.append("\"facteursCles\": \"...\",\n");
        prompt.append("\"risquesEquipe\": \"...\",\n");
        prompt.append("\"projetsSimilairesAnalyses\": \"...\"\n");
        prompt.append("}\n");

        return prompt.toString();
    }

    private String buildHistoriqueContext(List<FicheProjet> projets) {
        StringBuilder ctx = new StringBuilder();
        ctx.append("=== HISTORIQUE DES PROJETS ===\n");

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
                ctx.append("  - Budget : ").append(p.getEstimationBudget().getBudgetMDHT()).append(" MDHT\n");
            }
            if (p.getDureeEnMois() != null) {
                ctx.append("  - Durée : ").append(p.getDureeEnMois()).append(" mois\n");
            }

            // Taille et membres de l'équipe
            List<Map<String, String>> equipe = membresEquipe(p.getEquipeProjet());
            ctx.append("  - Taille équipe : ").append(equipe.size()).append(" membres\n");
            if (!equipe.isEmpty()) {
                ctx.append("  - Équipe : ").append(equipe.stream()
                        .map(m -> m.get("nom") + (estVide(m.get("role")) ? "" : " (" + m.get("role") + ")"))
                        .collect(Collectors.joining(", "))).append("\n");
            }

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

    /**
     * Les personnes que l'IA peut proposer : les chefs de projet (comptes de l'application) et les membres
     * des équipes déjà saisies dans les fiches projet. Les pilotes qualité et administrateurs n'en font pas partie.
     */
    private String buildPersonnesContext(List<FicheProjet> projets) {
        StringBuilder ctx = new StringBuilder();

        List<String> chefs = userRepository.findAll().stream()
                .filter(u -> u.getRoles().stream().anyMatch(r -> r.getName() == ERole.ROLE_CHEF_PROJET))
                .map(this::nomComplet)
                .toList();
        ctx.append("=== CHEFS DE PROJET DISPONIBLES ===\n");
        if (chefs.isEmpty()) {
            ctx.append("Aucun chef de projet enregistré.\n");
        }
        chefs.forEach(nom -> ctx.append("- ").append(nom).append("\n"));

        // Un membre peut avoir travaillé sur plusieurs projets : rôles et projets sont regroupés par nom.
        Map<String, Set<String>> roles = new LinkedHashMap<>();
        Map<String, List<String>> projetsParMembre = new LinkedHashMap<>();
        for (FicheProjet p : projets) {
            for (Map<String, String> membre : membresEquipe(p.getEquipeProjet())) {
                String nom = membre.get("nom");
                if (estVide(nom) || chefs.contains(nom.trim())) {
                    continue;
                }
                nom = nom.trim();
                if (!estVide(membre.get("role"))) {
                    roles.computeIfAbsent(nom, k -> new LinkedHashSet<>()).add(membre.get("role").trim());
                }
                projetsParMembre.computeIfAbsent(nom, k -> new ArrayList<>()).add(p.getNomProjet());
            }
        }
        ctx.append("\n=== MEMBRES D'EQUIPE CONNUS ===\n");
        if (projetsParMembre.isEmpty()) {
            ctx.append("Aucun membre d'equipe enregistre dans les fiches projet.\n");
        }
        projetsParMembre.forEach((nom, projetsDuMembre) -> ctx.append("- ").append(nom)
                .append(" : ").append(String.join(", ", roles.getOrDefault(nom, Set.of("role non precise"))))
                .append(" | projets : ").append(String.join(", ", projetsDuMembre)).append("\n"));
        ctx.append("\n");

        return ctx.toString();
    }

    private String nomComplet(User u) {
        String nom = ((u.getFirstName() != null ? u.getFirstName() : "") + " "
                + (u.getLastName() != null ? u.getLastName() : "")).trim();
        return nom.isEmpty() ? u.getUsername() : nom;
    }

    /** Membres saisis dans la fiche projet (liste JSON de {nom, role, email}) ; vide si illisible. */
    private List<Map<String, String>> membresEquipe(String equipeProjet) {
        if (equipeProjet == null || equipeProjet.isEmpty()) return List.of();
        try {
            List<Map<String, String>> equipe = objectMapper.readValue(
                equipeProjet, new TypeReference<List<Map<String, String>>>() {}
            );
            return equipe.stream().filter(m -> !estVide(m.get("nom"))).toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    private static boolean estVide(String texte) {
        return texte == null || texte.isBlank();
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
            // Le détail technique reste dans les journaux du serveur, l'utilisateur reçoit un message lisible.
            System.err.println("[TeamSuggestionService] Réponse Gemini illisible (" + e.getMessage() + ") : " + reply);
            throw new RuntimeException("la réponse de l'IA est incomplète, réessayez.");
        }
    }

    /**
     * Texte de la réponse sans le raisonnement : les modèles à réflexion renvoient des parties
     * marquées « thought » qui ne font pas partie du JSON attendu.
     */
    private String texteSansRaisonnement(JsonNode candidat) {
        StringBuilder texte = new StringBuilder();
        for (JsonNode part : candidat.path("content").path("parts")) {
            if (!part.path("thought").asBoolean(false)) {
                texte.append(part.path("text").asText(""));
            }
        }
        return texte.toString();
    }
}
