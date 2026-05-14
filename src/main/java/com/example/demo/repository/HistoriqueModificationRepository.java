package com.example.demo.repository;

import com.example.demo.model.HistoriqueModification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HistoriqueModificationRepository extends MongoRepository<HistoriqueModification, String> {
    List<HistoriqueModification> findByEntityIdOrderByDateModificationDesc(String entityId);
    List<HistoriqueModification> findByEntityTypeAndEntityIdOrderByDateModificationDesc(String entityType, String entityId);
    List<HistoriqueModification> findByUserIdOrderByDateModificationDesc(String userId);
    List<HistoriqueModification> findByProjetIdOrderByDateModificationDesc(String projetId);
}
