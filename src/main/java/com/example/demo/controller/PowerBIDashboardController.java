package com.example.demo.controller;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/public/powerbi")
public class PowerBIDashboardController {

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private UserRepository userRepository;

    // Projets : id, nom, statut, categorie, typeProjet, dateDebut, dateFinPrevue, dureeEnMois
    @GetMapping("/projets")
    public List<Map<String, Object>> getProjets() {
        return ficheProjetRepository.findAll().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("nomProjet", p.getNomProjet());
            m.put("statut", p.getStatut());
            m.put("categorie", p.getCategorie());
            m.put("typeProjet", p.getTypeProjet());
            m.put("dateDebut", p.getDateDebut());
            m.put("dateFinPrevue", p.getDateFinPrevue());
            m.put("dureeEnMois", p.getDureeEnMois());
            m.put("dateCreation", p.getDateCreation());
            return m;
        }).collect(Collectors.toList());
    }

    // Fiches suivi : id, ficheProjetId, dateRapport, etatAvancement
    @GetMapping("/fiches-suivi")
    public List<Map<String, Object>> getFichesSuivi() {
        return ficheSuiviRepository.findAll().stream().map(f -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", f.getId());
            m.put("ficheProjetId", f.getFicheProjetId());
            m.put("dateRapport", f.getDateRapport());
            m.put("numeroRapport", f.getNumeroRapport());
            if (f.getConstatGlobal() != null) {
                m.put("etatAvancement", f.getConstatGlobal().getEtatAvancement());
            }
            return m;
        }).collect(Collectors.toList());
    }

    // Utilisateurs : id, username, roles, createdAt
    @GetMapping("/utilisateurs")
    public List<Map<String, Object>> getUtilisateurs() {
        return userRepository.findAll().stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("createdAt", u.getCreatedAt());
            m.put("roles", u.getRoles().stream()
                    .map(r -> r.getName().name())
                    .collect(Collectors.toList()));
            return m;
        }).collect(Collectors.toList());
    }

    // Stats globales agrégées
    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        List<FicheProjet> projets = ficheProjetRepository.findAll();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalProjets", projets.size());
        stats.put("totalUtilisateurs", userRepository.count());
        stats.put("totalFichesSuivi", ficheSuiviRepository.count());

        Map<String, Long> parStatut = projets.stream()
                .collect(Collectors.groupingBy(
                        p -> p.getStatut() != null ? p.getStatut() : "INCONNU",
                        Collectors.counting()));
        stats.put("projetsParStatut", parStatut);

        Map<String, Long> parCategorie = projets.stream()
                .filter(p -> p.getCategorie() != null)
                .collect(Collectors.groupingBy(FicheProjet::getCategorie, Collectors.counting()));
        stats.put("projetsParCategorie", parCategorie);

        Map<String, Long> parType = projets.stream()
                .filter(p -> p.getTypeProjet() != null)
                .collect(Collectors.groupingBy(FicheProjet::getTypeProjet, Collectors.counting()));
        stats.put("projetsParType", parType);

        return stats;
    }
}
