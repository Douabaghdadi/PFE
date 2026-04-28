package com.example.demo.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "fiches_suivi")
public class FicheSuivi {
    @Id
    private String id;

    @NotBlank
    private String ficheProjetId;
    
    private String numeroRapport;
    private LocalDate dateRapport;

    // Section I: Fiche signalétique
    private FicheSignaletique ficheSignaletique;

    // Section II: Constat global
    private ConstatGlobal constatGlobal;

    // Section III: État d'avancement global du projet
    private List<TacheSuivi> tachesSuivi = new ArrayList<>();

    // Section IV: Planning actuel (Gantt)
    private PlanningActuel planningActuel;

    private String chefProjetId;
    private LocalDateTime dateCreation;
    private LocalDateTime dateModification;

    public FicheSuivi() {
        this.dateCreation = LocalDateTime.now();
        this.dateRapport = LocalDate.now();
        this.ficheSignaletique = new FicheSignaletique();
        this.constatGlobal = new ConstatGlobal();
        this.planningActuel = new PlanningActuel();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFicheProjetId() { return ficheProjetId; }
    public void setFicheProjetId(String ficheProjetId) { this.ficheProjetId = ficheProjetId; }

    public String getNumeroRapport() { return numeroRapport; }
    public void setNumeroRapport(String numeroRapport) { this.numeroRapport = numeroRapport; }

    public LocalDate getDateRapport() { return dateRapport; }
    public void setDateRapport(LocalDate dateRapport) { this.dateRapport = dateRapport; }

    public FicheSignaletique getFicheSignaletique() { return ficheSignaletique; }
    public void setFicheSignaletique(FicheSignaletique ficheSignaletique) { this.ficheSignaletique = ficheSignaletique; }

    public ConstatGlobal getConstatGlobal() { return constatGlobal; }
    public void setConstatGlobal(ConstatGlobal constatGlobal) { this.constatGlobal = constatGlobal; }

    public List<TacheSuivi> getTachesSuivi() { return tachesSuivi; }
    public void setTachesSuivi(List<TacheSuivi> tachesSuivi) { this.tachesSuivi = tachesSuivi; }

    public PlanningActuel getPlanningActuel() { return planningActuel; }
    public void setPlanningActuel(PlanningActuel planningActuel) { this.planningActuel = planningActuel; }

    public String getChefProjetId() { return chefProjetId; }
    public void setChefProjetId(String chefProjetId) { this.chefProjetId = chefProjetId; }

    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }

    public LocalDateTime getDateModification() { return dateModification; }
    public void setDateModification(LocalDateTime dateModification) { this.dateModification = dateModification; }

    // Classes internes pour les sections

    public static class FicheSignaletique {
        private String maitreOuvrage;
        private String maitreOeuvre;
        private ChefProjetInfo chefProjet;
        private String suppleant;
        private String equipe;
        private String experts;
        
        private DelaisInfo delais;
        private FinancierInfo financier;
        
        private String descriptionProjet;
        private List<String> caracteristiquesTechniques = new ArrayList<>();

        public FicheSignaletique() {
            this.chefProjet = new ChefProjetInfo();
            this.delais = new DelaisInfo();
            this.financier = new FinancierInfo();
        }

        // Getters and Setters
        public String getMaitreOuvrage() { return maitreOuvrage; }
        public void setMaitreOuvrage(String maitreOuvrage) { this.maitreOuvrage = maitreOuvrage; }

        public String getMaitreOeuvre() { return maitreOeuvre; }
        public void setMaitreOeuvre(String maitreOeuvre) { this.maitreOeuvre = maitreOeuvre; }

        public ChefProjetInfo getChefProjet() { return chefProjet; }
        public void setChefProjet(ChefProjetInfo chefProjet) { this.chefProjet = chefProjet; }

        public String getSuppleant() { return suppleant; }
        public void setSuppleant(String suppleant) { this.suppleant = suppleant; }

        public String getEquipe() { return equipe; }
        public void setEquipe(String equipe) { this.equipe = equipe; }

        public String getExperts() { return experts; }
        public void setExperts(String experts) { this.experts = experts; }

        public DelaisInfo getDelais() { return delais; }
        public void setDelais(DelaisInfo delais) { this.delais = delais; }

        public FinancierInfo getFinancier() { return financier; }
        public void setFinancier(FinancierInfo financier) { this.financier = financier; }

        public String getDescriptionProjet() { return descriptionProjet; }
        public void setDescriptionProjet(String descriptionProjet) { this.descriptionProjet = descriptionProjet; }

        public List<String> getCaracteristiquesTechniques() { return caracteristiquesTechniques; }
        public void setCaracteristiquesTechniques(List<String> caracteristiquesTechniques) { this.caracteristiquesTechniques = caracteristiquesTechniques; }
    }

    public static class ChefProjetInfo {
        private String nom;
        private String suppleant;
        private String equipe;

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }

        public String getSuppleant() { return suppleant; }
        public void setSuppleant(String suppleant) { this.suppleant = suppleant; }

        public String getEquipe() { return equipe; }
        public void setEquipe(String equipe) { this.equipe = equipe; }
    }

    public static class DelaisInfo {
        private LocalDate dateDebut;
        private LocalDate dateFin;
        private Integer dureeEnMois;
        private LocalDate dateDebutPrevision;
        private LocalDate dateFinPrevision;
        private LocalDate dateDebutRealisation;
        private LocalDate dateFinRealisation;
        private Integer ecartConventionnel;

        public LocalDate getDateDebut() { return dateDebut; }
        public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }

        public LocalDate getDateFin() { return dateFin; }
        public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }

        public Integer getDureeEnMois() { return dureeEnMois; }
        public void setDureeEnMois(Integer dureeEnMois) { this.dureeEnMois = dureeEnMois; }

        public LocalDate getDateDebutPrevision() { return dateDebutPrevision; }
        public void setDateDebutPrevision(LocalDate dateDebutPrevision) { this.dateDebutPrevision = dateDebutPrevision; }

        public LocalDate getDateFinPrevision() { return dateFinPrevision; }
        public void setDateFinPrevision(LocalDate dateFinPrevision) { this.dateFinPrevision = dateFinPrevision; }

        public LocalDate getDateDebutRealisation() { return dateDebutRealisation; }
        public void setDateDebutRealisation(LocalDate dateDebutRealisation) { this.dateDebutRealisation = dateDebutRealisation; }

        public LocalDate getDateFinRealisation() { return dateFinRealisation; }
        public void setDateFinRealisation(LocalDate dateFinRealisation) { this.dateFinRealisation = dateFinRealisation; }

        public Integer getEcartConventionnel() { return ecartConventionnel; }
        public void setEcartConventionnel(Integer ecartConventionnel) { this.ecartConventionnel = ecartConventionnel; }
    }

    public static class FinancierInfo {
        private Double budgetPrevision;
        private Double budgetRealisation;
        private Double ecart;

        public Double getBudgetPrevision() { return budgetPrevision; }
        public void setBudgetPrevision(Double budgetPrevision) { this.budgetPrevision = budgetPrevision; }

        public Double getBudgetRealisation() { return budgetRealisation; }
        public void setBudgetRealisation(Double budgetRealisation) { this.budgetRealisation = budgetRealisation; }

        public Double getEcart() { return ecart; }
        public void setEcart(Double ecart) { this.ecart = ecart; }
    }

    public static class ConstatGlobal {
        private String etatAvancement;
        private String objectifPrincipal;
        private List<String> problemesRencontres = new ArrayList<>();
        private List<String> principauxRisques = new ArrayList<>();
        private List<String> recommandations = new ArrayList<>();

        public String getEtatAvancement() { return etatAvancement; }
        public void setEtatAvancement(String etatAvancement) { this.etatAvancement = etatAvancement; }

        public String getObjectifPrincipal() { return objectifPrincipal; }
        public void setObjectifPrincipal(String objectifPrincipal) { this.objectifPrincipal = objectifPrincipal; }

        public List<String> getProblemesRencontres() { return problemesRencontres; }
        public void setProblemesRencontres(List<String> problemesRencontres) { this.problemesRencontres = problemesRencontres; }

        public List<String> getPrincipauxRisques() { return principauxRisques; }
        public void setPrincipauxRisques(List<String> principauxRisques) { this.principauxRisques = principauxRisques; }

        public List<String> getRecommandations() { return recommandations; }
        public void setRecommandations(List<String> recommandations) { this.recommandations = recommandations; }
    }

    public static class TacheSuivi {
        private String code;
        private String sujet;
        private String livrable;
        private String assigneA;
        private LocalDate debut;
        private LocalDate echeance;
        private Integer tempsEstime;
        private LocalDate dateDebutReelle;
        private LocalDate dateFinReelle;
        private Integer tempsPasse;
        private Integer pourcentageRealise;
        private String statut;
        private String remarque;

        // Getters and Setters
        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }

        public String getSujet() { return sujet; }
        public void setSujet(String sujet) { this.sujet = sujet; }

        public String getLivrable() { return livrable; }
        public void setLivrable(String livrable) { this.livrable = livrable; }

        public String getAssigneA() { return assigneA; }
        public void setAssigneA(String assigneA) { this.assigneA = assigneA; }

        public LocalDate getDebut() { return debut; }
        public void setDebut(LocalDate debut) { this.debut = debut; }

        public LocalDate getEcheance() { return echeance; }
        public void setEcheance(LocalDate echeance) { this.echeance = echeance; }

        public Integer getTempsEstime() { return tempsEstime; }
        public void setTempsEstime(Integer tempsEstime) { this.tempsEstime = tempsEstime; }

        public LocalDate getDateDebutReelle() { return dateDebutReelle; }
        public void setDateDebutReelle(LocalDate dateDebutReelle) { this.dateDebutReelle = dateDebutReelle; }

        public LocalDate getDateFinReelle() { return dateFinReelle; }
        public void setDateFinReelle(LocalDate dateFinReelle) { this.dateFinReelle = dateFinReelle; }

        public Integer getTempsPasse() { return tempsPasse; }
        public void setTempsPasse(Integer tempsPasse) { this.tempsPasse = tempsPasse; }

        public Integer getPourcentageRealise() { return pourcentageRealise; }
        public void setPourcentageRealise(Integer pourcentageRealise) { this.pourcentageRealise = pourcentageRealise; }

        public String getStatut() { return statut; }
        public void setStatut(String statut) { this.statut = statut; }

        public String getRemarque() { return remarque; }
        public void setRemarque(String remarque) { this.remarque = remarque; }
    }

    public static class PlanningActuel {
        private List<TacheGantt> taches = new ArrayList<>();

        public List<TacheGantt> getTaches() { return taches; }
        public void setTaches(List<TacheGantt> taches) { this.taches = taches; }
    }

    public static class TacheGantt {
        private String nom;
        private LocalDate dateDebut;
        private LocalDate dateFin;
        private Integer tauxAvancement;
        private String statut;
        private List<TacheGantt> sousTaches = new ArrayList<>();

        public String getNom() { return nom; }
        public void setNom(String nom) { this.nom = nom; }

        public LocalDate getDateDebut() { return dateDebut; }
        public void setDateDebut(LocalDate dateDebut) { this.dateDebut = dateDebut; }

        public LocalDate getDateFin() { return dateFin; }
        public void setDateFin(LocalDate dateFin) { this.dateFin = dateFin; }

        public Integer getTauxAvancement() { return tauxAvancement; }
        public void setTauxAvancement(Integer tauxAvancement) { this.tauxAvancement = tauxAvancement; }

        public String getStatut() { return statut; }
        public void setStatut(String statut) { this.statut = statut; }

        public List<TacheGantt> getSousTaches() { return sousTaches; }
        public void setSousTaches(List<TacheGantt> sousTaches) { this.sousTaches = sousTaches; }
    }
}
