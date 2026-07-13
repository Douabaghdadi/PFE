package com.example.demo.service;

import com.example.demo.model.EstimationBudget;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Arrays;

/**
 * Service pour initialiser les données de test au démarrage
 * Utile pour le développement et les tests Power BI
 */
@Service
public class DataInitializationService implements CommandLineRunner {
    
    @Autowired
    private FicheProjetRepository ficheProjetRepository;
    
    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;
    
    @Override
    public void run(String... args) throws Exception {
        // Vérifier si des données existent déjà
        if (ficheProjetRepository.count() > 0) {
            System.out.println("✅ Des données existent déjà. Initialisation ignorée.");
            return;
        }
        
        System.out.println("🔄 Initialisation des données de test...");
        
        // Créer les projets de test
        createTestProjects();
        
        // Créer les fiches de suivi de test
        createTestFichesSuivi();
        
        System.out.println("✅ Données de test initialisées avec succès !");
        System.out.println("   - " + ficheProjetRepository.count() + " projets créés");
        System.out.println("   - " + ficheSuiviRepository.count() + " fiches de suivi créées");
    }
    
    private void createTestProjects() {
        // Projet 1 : Système de Gestion RH
        FicheProjet projet1 = new FicheProjet();
        projet1.setId("proj001");
        projet1.setNomProjet("Système de Gestion RH");
        projet1.setDesignationProjet("Application web pour la gestion des ressources humaines");
        projet1.setDesignationClient("Ministère de la Fonction Publique");
        projet1.setStatut("EN_COURS");
        projet1.setDateDebut(LocalDate.of(2024, 1, 15));
        projet1.setDateFinPrevue(LocalDate.of(2024, 12, 31));
        projet1.setCadreContractuelProjet("Marché public");
        projet1.setCaractereProjet("NATIONAL");
        projet1.setTypeProjet("NOUVEAU");
        projet1.setMaitreOuvrage("Direction des Systèmes d'Information");
        projet1.setMaitreOeuvre("Équipe interne");
        projet1.setModaliteDeveloppement("I");
        
        EstimationBudget budget1 = new EstimationBudget();
        budget1.setCp("50");
        budget1.setId("150");
        budget1.setTotal("200000");
        budget1.setBudgetMDHT("200");
        projet1.setEstimationBudget(budget1);
        
        // Projet 2 : Plateforme E-Learning
        FicheProjet projet2 = new FicheProjet();
        projet2.setId("proj002");
        projet2.setNomProjet("Plateforme E-Learning");
        projet2.setDesignationProjet("Plateforme de formation en ligne");
        projet2.setDesignationClient("Ministère de l'Éducation");
        projet2.setStatut("EN_COURS");
        projet2.setDateDebut(LocalDate.of(2024, 2, 1));
        projet2.setDateFinPrevue(LocalDate.of(2024, 11, 30));
        projet2.setCadreContractuelProjet("Convention");
        projet2.setCaractereProjet("NATIONAL");
        projet2.setTypeProjet("NOUVEAU");
        projet2.setMaitreOuvrage("Direction de la Formation");
        projet2.setMaitreOeuvre("Équipe mixte");
        projet2.setModaliteDeveloppement("I+ST");
        
        EstimationBudget budget2 = new EstimationBudget();
        budget2.setCp("40");
        budget2.setId("120");
        budget2.setTotal("160000");
        budget2.setBudgetMDHT("160");
        projet2.setEstimationBudget(budget2);
        
        // Projet 3 : Portail Citoyen
        FicheProjet projet3 = new FicheProjet();
        projet3.setId("proj003");
        projet3.setNomProjet("Portail Citoyen");
        projet3.setDesignationProjet("Portail de services en ligne pour les citoyens");
        projet3.setDesignationClient("Municipalité de Tunis");
        projet3.setStatut("TERMINE");
        projet3.setDateDebut(LocalDate.of(2023, 6, 1));
        projet3.setDateFinPrevue(LocalDate.of(2024, 1, 31));
        projet3.setCadreContractuelProjet("Marché public");
        projet3.setCaractereProjet("COMMUNE_ADMINISTRATION");
        projet3.setTypeProjet("EVOLUTION");
        projet3.setMaitreOuvrage("Direction des Services Numériques");
        projet3.setMaitreOeuvre("Prestataire externe");
        projet3.setModaliteDeveloppement("ST");
        
        EstimationBudget budget3 = new EstimationBudget();
        budget3.setCp("30");
        budget3.setId("90");
        budget3.setTotal("120000");
        budget3.setBudgetMDHT("120");
        projet3.setEstimationBudget(budget3);
        
        // Projet 4 : Application Mobile Santé
        FicheProjet projet4 = new FicheProjet();
        projet4.setId("proj004");
        projet4.setNomProjet("Application Mobile Santé");
        projet4.setDesignationProjet("Application de suivi médical");
        projet4.setDesignationClient("Ministère de la Santé");
        projet4.setStatut("EN_ATTENTE");
        projet4.setDateDebut(LocalDate.of(2024, 3, 1));
        projet4.setDateFinPrevue(LocalDate.of(2024, 10, 31));
        projet4.setCadreContractuelProjet("Appel d'offres");
        projet4.setCaractereProjet("NATIONAL");
        projet4.setTypeProjet("NOUVEAU");
        projet4.setMaitreOuvrage("Direction de l'Innovation");
        projet4.setMaitreOeuvre("À définir");
        projet4.setModaliteDeveloppement("I+CO");
        
        EstimationBudget budget4 = new EstimationBudget();
        budget4.setCp("35");
        budget4.setId("105");
        budget4.setTotal("140000");
        budget4.setBudgetMDHT("140");
        projet4.setEstimationBudget(budget4);
        
        // Projet 5 : Refonte Intranet
        FicheProjet projet5 = new FicheProjet();
        projet5.setId("proj005");
        projet5.setNomProjet("Refonte Intranet");
        projet5.setDesignationProjet("Modernisation de l'intranet institutionnel");
        projet5.setDesignationClient("Administration Centrale");
        projet5.setStatut("TERMINE");
        projet5.setDateDebut(LocalDate.of(2023, 9, 1));
        projet5.setDateFinPrevue(LocalDate.of(2024, 2, 28));
        projet5.setCadreContractuelProjet("Régie");
        projet5.setCaractereProjet("CNI");
        projet5.setTypeProjet("REFONTE");
        projet5.setMaitreOuvrage("DSI");
        projet5.setMaitreOeuvre("Équipe interne");
        projet5.setModaliteDeveloppement("I");
        
        EstimationBudget budget5 = new EstimationBudget();
        budget5.setCp("25");
        budget5.setId("75");
        budget5.setTotal("100000");
        budget5.setBudgetMDHT("100");
        projet5.setEstimationBudget(budget5);
        
        // Sauvegarder tous les projets
        ficheProjetRepository.saveAll(Arrays.asList(projet1, projet2, projet3, projet4, projet5));
    }
    
    private void createTestFichesSuivi() {
        // Fiche de suivi 1
        FicheSuivi suivi1 = new FicheSuivi();
        suivi1.setId("suivi001");
        suivi1.setFicheProjetId("proj001");
        suivi1.setNumeroRapport("RAP-2024-001");
        suivi1.setDateRapport(LocalDate.of(2024, 1, 31));
        // Adapter selon votre modèle de conformité
        
        // Fiche de suivi 2
        FicheSuivi suivi2 = new FicheSuivi();
        suivi2.setId("suivi002");
        suivi2.setFicheProjetId("proj001");
        suivi2.setNumeroRapport("RAP-2024-002");
        suivi2.setDateRapport(LocalDate.of(2024, 2, 29));
        
        // Fiche de suivi 3
        FicheSuivi suivi3 = new FicheSuivi();
        suivi3.setId("suivi003");
        suivi3.setFicheProjetId("proj002");
        suivi3.setNumeroRapport("RAP-2024-003");
        suivi3.setDateRapport(LocalDate.of(2024, 2, 28));
        
        // Fiche de suivi 4
        FicheSuivi suivi4 = new FicheSuivi();
        suivi4.setId("suivi004");
        suivi4.setFicheProjetId("proj003");
        suivi4.setNumeroRapport("RAP-2024-004");
        suivi4.setDateRapport(LocalDate.of(2024, 1, 15));
        
        // Sauvegarder toutes les fiches de suivi
        ficheSuiviRepository.saveAll(Arrays.asList(suivi1, suivi2, suivi3, suivi4));
    }
}
