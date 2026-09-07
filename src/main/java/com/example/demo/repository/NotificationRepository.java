package com.example.demo.repository;

import com.example.demo.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Notification> findByUserIdAndReadOrderByCreatedAtDesc(String userId, boolean read);
    long countByUserIdAndRead(String userId, boolean read);
    List<Notification> findByUserIdAndCreatedAtAfterOrderByCreatedAtDesc(String userId, LocalDateTime date);
    void deleteByCreatedAtBefore(LocalDateTime date);
}
