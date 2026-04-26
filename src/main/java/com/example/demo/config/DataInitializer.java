package com.example.demo.config;

import com.example.demo.model.ERole;
import com.example.demo.model.Nomenclature;
import com.example.demo.model.Role;
import com.example.demo.repository.NomenclatureRepository;
import com.example.demo.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private NomenclatureRepository nomenclatureRepository;

    @Override
    public void run(String... args) throws Exception {
        // Initialiser les rôles s'ils n'existent pas
        if (roleRepository.count() == 0) {
            roleRepository.save(new Role(ERole.ROLE_ADMIN));
            roleRepository.save(new Role(ERole.ROLE_CHEF_PROJET));
            roleRepository.save(new Role(ERole.ROLE_PILOTE_QUALITE));
            System.out.println("✓ Rôles initialisés avec succès!");
        }

        // Initialiser les nomenclatures par défaut
        if (nomenclatureRepository.count() == 0) {
            // Types de fiches
            nomenclatureRepository.save(new Nomenclature("TYPE_FICHE", "FICHE_PROJET", "Fiche Projet"));
            nomenclatureRepository.save(new Nomenclature("TYPE_FICHE", "FICHE_SUIVI", "Fiche de Suivi"));

            // Statuts
            nomenclatureRepository.save(new Nomenclature("STATUT", "EN_COURS", "En Cours"));
            nomenclatureRepository.save(new Nomenclature("STATUT", "TERMINE", "Terminé"));
            nomenclatureRepository.save(new Nomenclature("STATUT", "EN_ATTENTE", "En Attente"));
            nomenclatureRepository.save(new Nomenclature("STATUT", "ANNULE", "Annulé"));

            // Catégories de projets
            nomenclatureRepository.save(new Nomenclature("CATEGORIE_PROJET", "QUALITE", "Qualité"));
            nomenclatureRepository.save(new Nomenclature("CATEGORIE_PROJET", "DEVELOPPEMENT", "Développement"));
            nomenclatureRepository.save(new Nomenclature("CATEGORIE_PROJET", "INFRASTRUCTURE", "Infrastructure"));

            System.out.println("✓ Nomenclatures initialisées avec succès!");
        }
    }
}
