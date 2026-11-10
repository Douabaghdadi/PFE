package com.example.demo.repository;

import com.example.demo.model.Reunion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.util.List;

public interface ReunionRepository extends MongoRepository<Reunion, String> {
    List<Reunion> findByProjetIdOrderByDebutDesc(String projetId);

    /** Les réunions qu'un utilisateur organise et celles où il est invité. */
    @Query(value = "{ $or: [ { organisateurId: ?0 }, { participantIds: ?0 } ] }", sort = "{ debut: -1 }")
    List<Reunion> findConcernant(String utilisateurId);
}
