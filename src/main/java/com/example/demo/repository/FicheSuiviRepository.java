package com.example.demo.repository;

import com.example.demo.model.FicheSuivi;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface FicheSuiviRepository extends MongoRepository<FicheSuivi, String> {
    List<FicheSuivi> findByFicheProjetId(String ficheProjetId);
    List<FicheSuivi> findByChefProjetId(String chefProjetId);
}
