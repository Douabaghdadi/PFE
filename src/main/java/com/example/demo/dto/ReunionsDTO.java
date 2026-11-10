package com.example.demo.dto;

import com.example.demo.model.Reunion;

import java.util.List;

/**
 * Réunions vues par le lecteur connecté. {@code peutPlanifier} dit s'il est chef de projet,
 * {@code planificationActive} si le compte Google est configuré sur ce serveur.
 */
public record ReunionsDTO(List<Reunion> reunions, boolean peutPlanifier, boolean planificationActive) {
}
