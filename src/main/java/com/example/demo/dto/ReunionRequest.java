package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.List;

/** Réunion à planifier, telle que le formulaire l'envoie. L'heure est celle de Tunis. */
public record ReunionRequest(String titre, String description, LocalDateTime debut, int dureeMinutes,
                             List<String> participantEmails) {
}
