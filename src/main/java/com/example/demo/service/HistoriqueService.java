package com.example.demo.service;

import com.example.demo.model.HistoriqueModification;
import com.example.demo.repository.HistoriqueModificationRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HistoriqueService {
    
    @Autowired
    private HistoriqueModificationRepository historiqueRepository;
    
    @Autowired
    private UserRepository userRepository;

    public void enregistrerCreation(String entityType, String entityId, String userId, Object entity) {
        enregistrerCreation(entityType, entityId, userId, entity, null, null);
    }

    public void enregistrerCreation(String entityType, String entityId, String userId, Object entity, String projetId) {
        enregistrerCreation(entityType, entityId, userId, entity, projetId, null);
    }

    public void enregistrerCreation(String entityType, String entityId, String userId, Object entity, String projetId, String entityName) {
        HistoriqueModification historique = new HistoriqueModification();
        historique.setEntityType(entityType);
        historique.setEntityId(entityId);
        historique.setProjetId(projetId);
        historique.setAction("CREATION");
        historique.setUserId(userId);
        
        userRepository.findById(userId).ifPresent(user -> {
            historique.setUsername(user.getUsername());
            historique.setUserRole(user.getRoles().stream()
                .findFirst()
                .map(role -> role.getName().name())
                .orElse("UNKNOWN"));
        });
        
        historique.setDescription("Création de la " + entityType.toLowerCase().replace("_", " "));
        historique.setEntityName(entityName);
        historique.setDateModification(LocalDateTime.now());
        
        historiqueRepository.save(historique);
    }

    public void enregistrerModification(String entityType, String entityId, String userId, 
                                       Map<String, Object> anciennesValeurs, Map<String, Object> nouvellesValeurs) {
        enregistrerModification(entityType, entityId, userId, anciennesValeurs, nouvellesValeurs, null, null);
    }

    public void enregistrerModification(String entityType, String entityId, String userId, 
                                       Map<String, Object> anciennesValeurs, Map<String, Object> nouvellesValeurs, String projetId) {
        enregistrerModification(entityType, entityId, userId, anciennesValeurs, nouvellesValeurs, projetId, null);
    }

    public void enregistrerModification(String entityType, String entityId, String userId, 
                                       Map<String, Object> anciennesValeurs, Map<String, Object> nouvellesValeurs, String projetId, String entityName) {
        HistoriqueModification historique = new HistoriqueModification();
        historique.setEntityType(entityType);
        historique.setEntityId(entityId);
        historique.setProjetId(projetId);
        historique.setAction("MODIFICATION");
        historique.setUserId(userId);
        
        userRepository.findById(userId).ifPresent(user -> {
            historique.setUsername(user.getUsername());
            historique.setUserRole(user.getRoles().stream()
                .findFirst()
                .map(role -> role.getName().name())
                .orElse("UNKNOWN"));
        });
        
        historique.setAnciennesValeurs(anciennesValeurs);
        historique.setNouvellesValeurs(nouvellesValeurs);
        historique.setDescription(genererDescriptionModification(anciennesValeurs, nouvellesValeurs));
        historique.setEntityName(entityName);
        historique.setDateModification(LocalDateTime.now());
        
        historiqueRepository.save(historique);
    }

    public void enregistrerSuppression(String entityType, String entityId, String userId) {
        enregistrerSuppression(entityType, entityId, userId, null, null);
    }

    public void enregistrerSuppression(String entityType, String entityId, String userId, String projetId) {
        enregistrerSuppression(entityType, entityId, userId, projetId, null);
    }

    public void enregistrerSuppression(String entityType, String entityId, String userId, String projetId, String entityName) {
        HistoriqueModification historique = new HistoriqueModification();
        historique.setEntityType(entityType);
        historique.setEntityId(entityId);
        historique.setProjetId(projetId);
        historique.setAction("SUPPRESSION");
        historique.setUserId(userId);
        
        userRepository.findById(userId).ifPresent(user -> {
            historique.setUsername(user.getUsername());
            historique.setUserRole(user.getRoles().stream()
                .findFirst()
                .map(role -> role.getName().name())
                .orElse("UNKNOWN"));
        });
        
        historique.setDescription("Suppression de la " + entityType.toLowerCase().replace("_", " "));
        historique.setEntityName(entityName);
        historique.setDateModification(LocalDateTime.now());
        
        historiqueRepository.save(historique);
    }

    public List<HistoriqueModification> getHistoriqueByEntity(String entityType, String entityId) {
        return historiqueRepository.findByEntityTypeAndEntityIdOrderByDateModificationDesc(entityType, entityId);
    }

    public List<HistoriqueModification> getHistoriqueCompletProjet(String projetId) {
        List<HistoriqueModification> historique = new ArrayList<>();
        
        // 1. Récupérer l'historique de la fiche projet
        List<HistoriqueModification> histoProjet = historiqueRepository.findByEntityTypeAndEntityIdOrderByDateModificationDesc("FICHE_PROJET", projetId);
        historique.addAll(histoProjet);
        
        // 2. Récupérer l'historique de toutes les fiches de suivi liées à ce projet
        List<HistoriqueModification> histoFichesSuivi = historiqueRepository.findByProjetIdOrderByDateModificationDesc(projetId);
        historique.addAll(histoFichesSuivi);
        
        // Tri par date décroissante (plus récent en premier)
        historique.sort((a, b) -> b.getDateModification().compareTo(a.getDateModification()));
        
        return historique;
    }

    public List<HistoriqueModification> getHistoriqueByUser(String userId) {
        return historiqueRepository.findByUserIdOrderByDateModificationDesc(userId);
    }

    private String genererDescriptionModification(Map<String, Object> anciennesValeurs, Map<String, Object> nouvellesValeurs) {
        StringBuilder description = new StringBuilder("Modification de ");
        int count = 0;
        
        for (String key : nouvellesValeurs.keySet()) {
            if (!anciennesValeurs.containsKey(key) || 
                !String.valueOf(anciennesValeurs.get(key)).equals(String.valueOf(nouvellesValeurs.get(key)))) {
                if (count > 0) description.append(", ");
                description.append(formatFieldName(key));
                count++;
            }
        }
        
        return count > 0 ? description.toString() : "Modification";
    }

    private String formatFieldName(String fieldName) {
        // Mapping des noms de champs en français
        Map<String, String> fieldNames = new HashMap<>();
        fieldNames.put("nomProjet", "Nom du projet");
        fieldNames.put("designationProjet", "Désignation du projet");
        fieldNames.put("designationClient", "Désignation du client");
        fieldNames.put("statut", "Statut");
        fieldNames.put("dateDebut", "Date de début");
        fieldNames.put("dateFinPrevue", "Date de fin prévue");
        fieldNames.put("cadreContractuelProjet", "Cadre contractuel");
        fieldNames.put("caractereProjet", "Caractère du projet");
        fieldNames.put("typeProjet", "Type de projet");
        fieldNames.put("maitreOuvrage", "Maître d'ouvrage");
        fieldNames.put("maitreOeuvre", "Maître d'œuvre");
        fieldNames.put("modaliteDeveloppement", "Modalité de développement");
        fieldNames.put("numeroRapport", "Numéro de rapport");
        fieldNames.put("dateRapport", "Date du rapport");
        fieldNames.put("etatAvancement", "État d'avancement");
        
        return fieldNames.getOrDefault(fieldName, 
            fieldName.replaceAll("([A-Z])", " $1").toLowerCase().trim());
    }

    public Map<String, Object> extraireValeursImportantes(Object entity) {
        Map<String, Object> valeurs = new HashMap<>();
        
        if (entity instanceof com.example.demo.model.FicheProjet) {
            com.example.demo.model.FicheProjet fiche = (com.example.demo.model.FicheProjet) entity;
            valeurs.put("nomProjet", fiche.getNomProjet());
            valeurs.put("designationProjet", fiche.getDesignationProjet());
            valeurs.put("designationClient", fiche.getDesignationClient());
            valeurs.put("statut", fiche.getStatut());
            valeurs.put("dateDebut", fiche.getDateDebut());
            valeurs.put("dateFinPrevue", fiche.getDateFinPrevue());
            valeurs.put("cadreContractuelProjet", fiche.getCadreContractuelProjet());
            valeurs.put("caractereProjet", fiche.getCaractereProjet());
            valeurs.put("typeProjet", fiche.getTypeProjet());
            valeurs.put("maitreOuvrage", fiche.getMaitreOuvrage());
            valeurs.put("maitreOeuvre", fiche.getMaitreOeuvre());
            valeurs.put("modaliteDeveloppement", fiche.getModaliteDeveloppement());
        } else if (entity instanceof com.example.demo.model.FicheSuivi) {
            com.example.demo.model.FicheSuivi fiche = (com.example.demo.model.FicheSuivi) entity;
            valeurs.put("numeroRapport", fiche.getNumeroRapport());
            valeurs.put("dateRapport", fiche.getDateRapport());
            if (fiche.getConstatGlobal() != null) {
                valeurs.put("etatAvancement", fiche.getConstatGlobal().getEtatAvancement());
            }
        }
        
        return valeurs;
    }
}
