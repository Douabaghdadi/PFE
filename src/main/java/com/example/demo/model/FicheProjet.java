package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "fiches_projet")
public class FicheProjet {
    @Id
    private String id;

    @NotBlank
    private String nomProjet;

    private String designationProjet;
    private String designationClient;

    // Section 1: Identification
    private String cadreContractuelProjet; // convention en cours
    private String caractereProjet; // national, Commune à l'Administration, CNI
    private String typeProjet; // Nouveau, Evolution, Refonte

    // Section 2: Présentation
    private String presentation;

    // Section 3: Historique
    private String historique; // En cas de refonte ou amélioration

    // Section 4: Périmètre
    private String perimetre;

    // Section 5: Organisation et conduite de projet
    private String maitreOuvrage;
    private String maitreOeuvre;
    private String equipeProjet;

    // Section 6: Estimation des charges
    private List<EstimationCharge> estimationsCharges;
    private String modaliteDeveloppement; // interne, ST, CO, Co-traitance

    // Section 7: Estimation du budget
    private EstimationBudget estimationBudget;

    // Section 8: Délais prévisionnels
    private String delaisPrevisionnels;

    // Section 9: Risques potentiels
    private String risquesPotentiels;

    // Section 10: Pré-requis
    private String preRequis;

    // Planning du projet
    private List<PlanningAction> planning;

    // Champs existants
    private String description;
    private String objectifs;
    private String responsable;
    private String chefProjetId;
    private LocalDate dateDebut;
    private LocalDate dateFinPrevue;
    private String statut; // Code nomenclature STATUT
    private String categorie; // Code nomenclature CATEGORIE_PROJET
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;
    private LocalDate dateDerniereFicheSuivi; // Date de la dernière fiche de suivi remplie
    private LocalDate dateProchaineFicheSuivi; // Date attendue pour la prochaine fiche de suivi

    // Métadonnées du document
    private String reference; // Réf proj
    private LocalDate dateDocument;

    public FicheProjet() {
        this.dateCreation = LocalDateTime.now();
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getNomProjet() {
        return nomProjet;
    }

    public void setNomProjet(String nomProjet) {
        this.nomProjet = nomProjet;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getObjectifs() {
        return objectifs;
    }

    public void setObjectifs(String objectifs) {
        this.objectifs = objectifs;
    }

    public String getResponsable() {
        return responsable;
    }

    public void setResponsable(String responsable) {
        this.responsable = responsable;
    }

    public String getChefProjetId() {
        return chefProjetId;
    }

    public void setChefProjetId(String chefProjetId) {
        this.chefProjetId = chefProjetId;
    }

    public LocalDate getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(LocalDate dateDebut) {
        this.dateDebut = dateDebut;
    }

    public LocalDate getDateFinPrevue() {
        return dateFinPrevue;
    }

    public void setDateFinPrevue(LocalDate dateFinPrevue) {
        this.dateFinPrevue = dateFinPrevue;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public String getCategorie() {
        return categorie;
    }

    public void setCategorie(String categorie) {
        this.categorie = categorie;
    }

    public LocalDateTime getDateCreation() {
        return dateCreation;
    }

    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }

    public LocalDateTime getDateModification() {
        return dateModification;
    }

    public void setDateModification(LocalDateTime dateModification) {
        this.dateModification = dateModification;
    }

    public String getDesignationProjet() {
        return designationProjet;
    }

    public void setDesignationProjet(String designationProjet) {
        this.designationProjet = designationProjet;
    }

    public String getDesignationClient() {
        return designationClient;
    }

    public void setDesignationClient(String designationClient) {
        this.designationClient = designationClient;
    }

    public String getCadreContractuelProjet() {
        return cadreContractuelProjet;
    }

    public void setCadreContractuelProjet(String cadreContractuelProjet) {
        this.cadreContractuelProjet = cadreContractuelProjet;
    }

    public String getCaractereProjet() {
        return caractereProjet;
    }

    public void setCaractereProjet(String caractereProjet) {
        this.caractereProjet = caractereProjet;
    }

    public String getTypeProjet() {
        return typeProjet;
    }

    public void setTypeProjet(String typeProjet) {
        this.typeProjet = typeProjet;
    }

    public String getPresentation() {
        return presentation;
    }

    public void setPresentation(String presentation) {
        this.presentation = presentation;
    }

    public String getHistorique() {
        return historique;
    }

    public void setHistorique(String historique) {
        this.historique = historique;
    }

    public String getPerimetre() {
        return perimetre;
    }

    public void setPerimetre(String perimetre) {
        this.perimetre = perimetre;
    }

    public String getMaitreOuvrage() {
        return maitreOuvrage;
    }

    public void setMaitreOuvrage(String maitreOuvrage) {
        this.maitreOuvrage = maitreOuvrage;
    }

    public String getMaitreOeuvre() {
        return maitreOeuvre;
    }

    public void setMaitreOeuvre(String maitreOeuvre) {
        this.maitreOeuvre = maitreOeuvre;
    }

    public String getEquipeProjet() {
        return equipeProjet;
    }

    public void setEquipeProjet(String equipeProjet) {
        this.equipeProjet = equipeProjet;
    }

    public List<EstimationCharge> getEstimationsCharges() {
        return estimationsCharges;
    }

    public void setEstimationsCharges(List<EstimationCharge> estimationsCharges) {
        this.estimationsCharges = estimationsCharges;
    }

    public String getModaliteDeveloppement() {
        return modaliteDeveloppement;
    }

    public void setModaliteDeveloppement(String modaliteDeveloppement) {
        this.modaliteDeveloppement = modaliteDeveloppement;
    }

    public EstimationBudget getEstimationBudget() {
        return estimationBudget;
    }

    public void setEstimationBudget(EstimationBudget estimationBudget) {
        this.estimationBudget = estimationBudget;
    }

    public String getDelaisPrevisionnels() {
        return delaisPrevisionnels;
    }

    public void setDelaisPrevisionnels(String delaisPrevisionnels) {
        this.delaisPrevisionnels = delaisPrevisionnels;
    }

    public String getRisquesPotentiels() {
        return risquesPotentiels;
    }

    public void setRisquesPotentiels(String risquesPotentiels) {
        this.risquesPotentiels = risquesPotentiels;
    }

    public String getPreRequis() {
        return preRequis;
    }

    public void setPreRequis(String preRequis) {
        this.preRequis = preRequis;
    }

    public List<PlanningAction> getPlanning() {
        return planning;
    }

    public void setPlanning(List<PlanningAction> planning) {
        this.planning = planning;
    }

    public String getReference() {
        return reference;
    }

    public void setReference(String reference) {
        this.reference = reference;
    }

    public LocalDate getDateDocument() {
        return dateDocument;
    }

    public void setDateDocument(LocalDate dateDocument) {
        this.dateDocument = dateDocument;
    }

    public LocalDate getDateDerniereFicheSuivi() {
        return dateDerniereFicheSuivi;
    }

    public void setDateDerniereFicheSuivi(LocalDate dateDerniereFicheSuivi) {
        this.dateDerniereFicheSuivi = dateDerniereFicheSuivi;
    }

    public LocalDate getDateProchaineFicheSuivi() {
        return dateProchaineFicheSuivi;
    }

    public void setDateProchaineFicheSuivi(LocalDate dateProchaineFicheSuivi) {
        this.dateProchaineFicheSuivi = dateProchaineFicheSuivi;
    }
}
