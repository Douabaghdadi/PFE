package com.example.demo.service;

import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class KPIService {

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    /**
     * Calcule les KPI pour un projet spécifique basé sur la dernière fiche de suivi
     */
    public ProjetKPIReportDTO calculateProjetKPIs(String projetId) {
        ProjetKPIReportDTO kpi = new ProjetKPIReportDTO();
        
        // Récupérer le projet
        FicheProjet projet = ficheProjetRepository.findById(projetId)
            .orElseThrow(() -> new RuntimeException("Projet non trouvé"));
        
        // Récupérer toutes les fiches de suivi pour ce projet
        List<FicheSuivi> suivis = ficheSuiviRepository.findByFicheProjetId(projetId);
        
        // Trouver la dernière fiche de suivi (la plus récente)
        FicheSuivi derniereSuivi = null;
        if (!suivis.isEmpty()) {
            derniereSuivi = suivis.stream()
                .max((s1, s2) -> {
                    if (s1.getDateCreation() == null) return -1;
                    if (s2.getDateCreation() == null) return 1;
                    return s1.getDateCreation().compareTo(s2.getDateCreation());
                })
                .orElse(null);
        }
        
        // Informations du projet
        kpi.setProjetId(projet.getId());
        kpi.setNomProjet(projet.getNomProjet());
        kpi.setStatut(projet.getStatut());
        
        // Dates
        if (projet.getDateDebut() != null) {
            kpi.setDateDebut(projet.getDateDebut().toString());
        }
        if (projet.getDateFinPrevue() != null) {
            kpi.setDateFinPrevue(projet.getDateFinPrevue().toString());
        }
        // dateFinReelle n'existe pas dans FicheProjet
        
        // KPI de performance basés sur la dernière fiche de suivi
        int totalTaches = 0;
        int tachesTerminees = 0;
        int totalProblemes = 0;
        int totalRisques = 0;
        List<String> listeProblemes = new ArrayList<>();
        List<String> listeRisques = new ArrayList<>();
        
        if (derniereSuivi != null) {
            if (derniereSuivi.getTachesSuivi() != null) {
                totalTaches = derniereSuivi.getTachesSuivi().size();
                
                // Compter les tâches terminées
                for (FicheSuivi.TacheSuivi tache : derniereSuivi.getTachesSuivi()) {
                    if ("termine".equalsIgnoreCase(tache.getStatut()) || 
                        "terminé".equalsIgnoreCase(tache.getStatut()) ||
                        (tache.getPourcentageRealise() != null && tache.getPourcentageRealise() >= 100)) {
                        tachesTerminees++;
                    }
                }
            }
            
            if (derniereSuivi.getConstatGlobal() != null) {
                if (derniereSuivi.getConstatGlobal().getProblemesRencontres() != null) {
                    List<String> problemes = derniereSuivi.getConstatGlobal().getProblemesRencontres();
                    totalProblemes = problemes.size();
                    listeProblemes.addAll(problemes);
                }
                if (derniereSuivi.getConstatGlobal().getPrincipauxRisques() != null) {
                    List<String> risques = derniereSuivi.getConstatGlobal().getPrincipauxRisques();
                    totalRisques = risques.size();
                    listeRisques.addAll(risques);
                }
            }
        }
        
        // Taux d'avancement
        if (totalTaches > 0) {
            kpi.setTauxAvancement((double) tachesTerminees / totalTaches * 100);
        } else {
            kpi.setTauxAvancement(0.0);
        }
        
        // Vérifier si le projet est en retard
        int joursRetard = 0;
        if (projet.getDateFinPrevue() != null && !"TERMINE".equalsIgnoreCase(projet.getStatut())) {
            try {
                LocalDate dateFinPrevue = LocalDate.parse(projet.getDateFinPrevue().toString().substring(0, 10));
                LocalDate aujourdhui = LocalDate.now();
                if (dateFinPrevue.isBefore(aujourdhui)) {
                    joursRetard = (int) ChronoUnit.DAYS.between(dateFinPrevue, aujourdhui);
                }
            } catch (Exception e) {
                // Ignorer les erreurs de parsing
            }
        }
        kpi.setJoursRetard(joursRetard);
        
        // KPI de qualité
        kpi.setNombreProblemes(totalProblemes);
        kpi.setNombreRisques(totalRisques);
        kpi.setListeProblemes(listeProblemes != null ? listeProblemes : new ArrayList<>());
        kpi.setListeRisques(listeRisques != null ? listeRisques : new ArrayList<>());
        
        // KPI budgétaires
        double budgetTotal = 0.0;
        double budgetMateriel = 0.0;
        double budgetLogiciel = 0.0;
        double budgetRH = 0.0;
        
        if (projet.getEstimationBudget() != null) {
            try {
                if (projet.getEstimationBudget().getBudgetMDHT() != null) {
                    budgetTotal = Double.parseDouble(projet.getEstimationBudget().getBudgetMDHT());
                }
                // Les champs materiel, logiciel, ressourcesHumaines n'existent pas dans EstimationBudget
                // On utilise seulement le budget total
            } catch (NumberFormatException e) {
                // Ignorer les erreurs de parsing
            }
        }
        
        kpi.setBudgetTotal(budgetTotal);
        kpi.setBudgetMateriel(budgetMateriel);
        kpi.setBudgetLogiciel(budgetLogiciel);
        kpi.setBudgetRessourcesHumaines(budgetRH);
        
        System.out.println("=== KPI Calculés ===");
        System.out.println("Projet: " + kpi.getNomProjet());
        System.out.println("Taux avancement: " + kpi.getTauxAvancement());
        System.out.println("Problèmes: " + kpi.getNombreProblemes());
        System.out.println("Risques: " + kpi.getNombreRisques());
        System.out.println("Budget total: " + kpi.getBudgetTotal());
        System.out.println("====================");
        
        // KPI d'équipe
        int tailleEquipe = 0;
        List<MembreEquipeDTO> membresEquipe = new ArrayList<>();
        if (projet.getEquipeProjet() != null) {
            try {
                ObjectMapper mapper = new ObjectMapper();
                List<Map<String, String>> equipe = mapper.readValue(
                    projet.getEquipeProjet(),
                    new TypeReference<List<Map<String, String>>>(){}
                );
                tailleEquipe = equipe.size();
                for (Map<String, String> membre : equipe) {
                    String nom = membre.get("nom");
                    if (nom != null && !nom.isBlank()) {
                        membresEquipe.add(new MembreEquipeDTO(nom, membre.get("role")));
                    }
                }
            } catch (Exception e) {
                // Ignorer les erreurs
            }
        }
        kpi.setTailleEquipe(tailleEquipe);
        kpi.setListeMembresEquipe(membresEquipe);

        return kpi;
    }
}
