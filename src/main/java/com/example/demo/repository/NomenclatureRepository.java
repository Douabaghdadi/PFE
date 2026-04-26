package com.example.demo.repository;

import com.example.demo.model.Nomenclature;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface NomenclatureRepository extends MongoRepository<Nomenclature, String> {
    List<Nomenclature> findByType(String type);
    List<Nomenclature> findByActif(Boolean actif);
    Optional<Nomenclature> findByTypeAndCode(String type, String code);
    Boolean existsByTypeAndCode(String type, String code);
}
