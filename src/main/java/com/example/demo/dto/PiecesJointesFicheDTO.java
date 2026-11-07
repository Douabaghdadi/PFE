package com.example.demo.dto;

import com.example.demo.model.PieceJointe;
import com.example.demo.model.ValidationFiche;

import java.util.List;

/**
 * Documents d'une fiche vus par le lecteur connecté. La validation accompagne la liste :
 * un ajout ou un retrait renvoie la fiche au pilote qualité, et la page doit l'afficher aussitôt.
 */
public record PiecesJointesFicheDTO(List<PieceJointe> pieces, boolean peutGerer, ValidationFiche validation) {
}
