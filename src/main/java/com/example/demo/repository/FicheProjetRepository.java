package com.example.demo.repository;

import com.example.demo.model.FicheProjet;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FicheProjetRepository extends MongoRepository<FicheProjet, String> {
    List<FicheProjet> findByChefProjetId(String chefProjetId);
    List<FicheProjet> findByStatut(String statut);
    List<FicheProjet> findByCategorie(String categorie);
}
