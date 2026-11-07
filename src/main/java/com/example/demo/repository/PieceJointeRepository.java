package com.example.demo.repository;

import com.example.demo.model.PieceJointe;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface PieceJointeRepository extends MongoRepository<PieceJointe, String> {
    List<PieceJointe> findByEntityTypeAndEntityIdOrderByDateDepotDesc(String entityType, String entityId);
    long countByEntityTypeAndEntityId(String entityType, String entityId);
    List<PieceJointe> findByProjetIdIn(Collection<String> projetIds);
}
