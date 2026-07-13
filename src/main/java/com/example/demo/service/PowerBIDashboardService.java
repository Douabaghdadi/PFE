package com.example.demo.service;

import com.example.demo.dto.PowerBIDashboardDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PowerBIDashboardService {
    
    @Autowired
    private FicheProjetRepository ficheProjetRepository;
    
    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;
    
    /**
     * Génère toutes les données pour le dashboard Power BI
     */
    public PowerBIDashboardDTO getDashboardData() {
        PowerBIDashboardDTO dashboard = new PowerBIDashboardDTO();
        
        List<FicheProjet> projets = ficheProjetRepository.findAll();
        List<FicheSuivi> fichesSuivi = ficheSuiviRepository.findAll();
        
        // Statistiques globales
        dashboard.setTotalProjets(projets.size());
        dashboard.setProjetsEnCours((int) projets.stream()
            .filter(p -> "EN_COURS".equals(p.getStatut())).count());
        dashboard.setProjetsTermines((int) projets.stream()
            .filter(p -> "TERMINE".equals(p.getStatut())).count());
        dashboard.setProjetsEnAttente((int) projets.stream()
            .filter(p -> "EN_ATTENTE".equals(p.getStatut())).count());
        dashboard.setProjetsAnnules((int) projets.stream()
            .filter(p -> "ANNULE".equals(p.getStatut())).count());
        
        // Budget total
        double budgetTotal = projets.stream()
            .filter(p -> p.getEstimationBudget() != null && p.getEstimationBudget().getTotal() != null)
            .mapToDouble(p -> {
                try {
                    return Double.parseDouble(p.getEstimationBudget().getTotal());
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            })
            .sum();
        dashboard.setBudgetTotal(budgetTotal);
        
        // Taux d'avancement moyen (si vous avez ce champ)
        dashboard.setTauxAvancementMoyen(0.0); // À calculer selon votre logique
        
        // Projets par statut
        Map<String, Long> statutMap = projets.stream()
            .collect(Collectors.groupingBy(
                p -> p.getStatut() != null ? p.getStatut() : "INCONNU",
                Collectors.counting()
            ));
        List<PowerBIDashboardDTO.ProjetParStatut> projetsByStatut = statutMap.entrySet().stream()
            .map(e -> new PowerBIDashboardDTO.ProjetParStatut(e.getKey(), e.getValue()))
            .collect(Collectors.toList());
        dashboard.setProjetsByStatut(projetsByStatut);
        
        // Projets par mois
        Map<String, Long> moisMap = projets.stream()
            .filter(p -> p.getDateDebut() != null)
            .collect(Collectors.groupingBy(
                p -> {
                    LocalDate date = p.getDateDebut();
                    return date.getMonth().getDisplayName(TextStyle.FULL, Locale.FRENCH) + " " + date.getYear();
                },
                Collectors.counting()
            ));
        List<PowerBIDashboardDTO.ProjetParMois> projetsByMois = moisMap.entrySet().stream()
            .map(e -> {
                String[] parts = e.getKey().split(" ");
                return new PowerBIDashboardDTO.ProjetParMois(parts[0], Integer.parseInt(parts[1]), e.getValue());
            })
            .collect(Collectors.toList());
        dashboard.setProjetsByMois(projetsByMois);
        
        // Projets par type
        Map<String, Long> typeMap = projets.stream()
            .filter(p -> p.getTypeProjet() != null)
            .collect(Collectors.groupingBy(
                FicheProjet::getTypeProjet,
                Collectors.counting()
            ));
        List<PowerBIDashboardDTO.ProjetParType> projetsByType = typeMap.entrySet().stream()
            .map(e -> new PowerBIDashboardDTO.ProjetParType(e.getKey(), e.getValue()))
            .collect(Collectors.toList());
        dashboard.setProjetsByType(projetsByType);
        
        // Projets par caractère
        Map<String, Long> caractereMap = projets.stream()
            .filter(p -> p.getCaractereProjet() != null)
            .collect(Collectors.groupingBy(
                FicheProjet::getCaractereProjet,
                Collectors.counting()
            ));
        List<PowerBIDashboardDTO.ProjetParCaractere> projetsByCaractere = caractereMap.entrySet().stream()
            .map(e -> new PowerBIDashboardDTO.ProjetParCaractere(e.getKey(), e.getValue()))
            .collect(Collectors.toList());
        dashboard.setProjetsByCaractere(projetsByCaractere);
        
        // Budget par projet
        List<PowerBIDashboardDTO.BudgetParProjet> budgetByProjet = projets.stream()
            .filter(p -> p.getEstimationBudget() != null && p.getEstimationBudget().getTotal() != null)
            .map(p -> {
                double budget = 0.0;
                try {
                    budget = Double.parseDouble(p.getEstimationBudget().getTotal());
                } catch (NumberFormatException e) {
                    budget = 0.0;
                }
                return new PowerBIDashboardDTO.BudgetParProjet(
                    p.getNomProjet() != null ? p.getNomProjet() : p.getDesignationProjet(),
                    budget,
                    p.getStatut()
                );
            })
            .collect(Collectors.toList());
        dashboard.setBudgetByProjet(budgetByProjet);
        
        // Charge par membre (exemple simplifié)
        // Vous devrez adapter selon votre structure de données
        List<PowerBIDashboardDTO.ChargeParMembre> chargeByMembre = new ArrayList<>();
        dashboard.setChargeByMembre(chargeByMembre);
        
        // KPIs Qualité
        dashboard.setTotalFichesSuivi(fichesSuivi.size());
        // Adapter selon votre modèle de conformité
        dashboard.setFichesConformes(0);
        dashboard.setFichesNonConformes(0);
        dashboard.setTauxConformite(0.0);
        
        return dashboard;
    }
    
    /**
     * Génère les données spécifiques pour le chef de projet
     */
    public PowerBIDashboardDTO getChefProjetDashboard(String userId) {
        // Filtrer les projets du chef de projet
        List<FicheProjet> projets = ficheProjetRepository.findByChefProjetId(userId);
        
        // Générer le dashboard avec ces projets uniquement
        // (Logique similaire à getDashboardData mais filtrée)
        
        return getDashboardData(); // Simplification pour l'exemple
    }
    
    /**
     * Génère les données spécifiques pour le pilote qualité
     */
    public PowerBIDashboardDTO getPiloteQualiteDashboard() {
        // Le pilote qualité voit tous les projets
        return getDashboardData();
    }
}
