package com.example.demo.service;

import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.ChargeMembreDTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.PointHistoriqueKPIDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calcule les indicateurs de pilotage d'un projet à partir de sa fiche projet
 * et de l'historique de ses fiches de suivi.
 *
 * Principes de calcul :
 * - l'avancement réel est pondéré par la charge estimée de chaque tâche (et non un simple
 *   ratio de tâches terminées), ce qui reflète les avancements partiels ;
 * - les lignes de titre (estTitre) sont exclues : ce sont des regroupements, pas du travail ;
 * - l'avancement est confronté à l'avancement planifié à date pour produire un SPI ;
 * - la charge consommée est confrontée à la valeur acquise pour produire un indice d'efficacité.
 */
@Service
public class KPIService {

    /** Fenêtre (en jours) au-delà de laquelle une échéance n'est plus considérée comme imminente. */
    private static final int HORIZON_ECHEANCE_JOURS = 14;
    /** Nombre maximum de tâches remontées dans les listes de détail. */
    private static final int MAX_TACHES_LISTEES = 8;
    /** Points retirés par risque déclaré selon qu'il est couvert, ou non, par un plan d'action. */
    private static final double PENALITE_RISQUE_TRAITE = 1.0;
    private static final double PENALITE_RISQUE_NON_TRAITE = 2.5;
    /** Borne haute de la projection de fin, pour éviter des extrapolations absurdes. */
    private static final long PROJECTION_MAX_JOURS = 3650;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    public ProjetKPIReportDTO calculateProjetKPIs(String projetId) {
        FicheProjet projet = ficheProjetRepository.findById(projetId)
            .orElseThrow(() -> new RuntimeException("Projet non trouvé"));

        List<FicheSuivi> suivis = new ArrayList<>(ficheSuiviRepository.findByFicheProjetId(projetId));
        suivis.sort(Comparator.comparing(KPIService::dateReference,
            Comparator.nullsFirst(Comparator.naturalOrder())));

        FicheSuivi derniereSuivi = suivis.isEmpty() ? null : suivis.get(suivis.size() - 1);
        List<FicheSuivi.TacheSuivi> taches = tachesEffectives(derniereSuivi);
        LocalDate aujourdhui = LocalDate.now();

        ProjetKPIReportDTO kpi = new ProjetKPIReportDTO();

        remplirIdentite(kpi, projet, suivis, derniereSuivi);
        remplirAvancement(kpi, projet, taches, suivis, aujourdhui);
        remplirTaches(kpi, taches, aujourdhui);
        remplirCharge(kpi, taches);
        remplirQualite(kpi, suivis, derniereSuivi);
        remplirBudget(kpi, projet, derniereSuivi);
        remplirEquipe(kpi, projet, taches, aujourdhui);
        remplirHistorique(kpi, suivis);
        remplirScoreSante(kpi);
        remplirAlertes(kpi, projet, aujourdhui);

        return kpi;
    }

    /* ------------------------------------------------------------------ */
    /* Identité du projet et couverture du suivi                           */
    /* ------------------------------------------------------------------ */

    private void remplirIdentite(ProjetKPIReportDTO kpi, FicheProjet projet,
                                 List<FicheSuivi> suivis, FicheSuivi derniereSuivi) {
        kpi.setProjetId(projet.getId());
        kpi.setNomProjet(projet.getNomProjet());
        kpi.setStatut(projet.getStatut());
        kpi.setDateDebut(texteDate(projet.getDateDebut()));
        kpi.setDateFinPrevue(texteDate(projet.getDateFinPrevue()));
        kpi.setDateFinReelle(texteDate(projet.getDateFinRealisation()));
        kpi.setNombreFichesSuivi(suivis.size());

        if (derniereSuivi != null) {
            kpi.setDateDerniereFiche(texteDate(dateReference(derniereSuivi)));
            kpi.setNumeroDerniereFiche(derniereSuivi.getNumeroRapport());
        }
    }

    /* ------------------------------------------------------------------ */
    /* Avancement réel, avancement planifié, SPI et projection de fin       */
    /* ------------------------------------------------------------------ */

    private void remplirAvancement(ProjetKPIReportDTO kpi, FicheProjet projet,
                                   List<FicheSuivi.TacheSuivi> taches,
                                   List<FicheSuivi> suivis, LocalDate aujourdhui) {
        double reel = avancementPondere(taches);
        kpi.setTauxAvancement(arrondi(reel, 1));

        double planifie = avancementPlanifie(taches, projet.getDateDebut(), aujourdhui);
        if (planifie < 0) {
            planifie = avancementPlanifieProjet(projet.getDateDebut(), projet.getDateFinPrevue(), aujourdhui);
        }
        kpi.setTauxAvancementPlanifie(arrondi(Math.max(planifie, 0), 1));
        kpi.setEcartPlanning(arrondi(reel - Math.max(planifie, 0), 1));
        kpi.setSpi(planifie > 0 ? arrondi(reel / planifie, 2) : 0);

        // Retard constaté sur la date de fin prévue (uniquement si le projet n'est pas clôturé).
        int joursRetard = 0;
        if (projet.getDateFinPrevue() != null && !estClos(projet.getStatut())
            && projet.getDateFinPrevue().isBefore(aujourdhui)) {
            joursRetard = (int) ChronoUnit.DAYS.between(projet.getDateFinPrevue(), aujourdhui);
        }
        kpi.setJoursRetard(joursRetard);

        projeterDateDeFin(kpi, projet, reel, aujourdhui);

        // Progression depuis la fiche de suivi précédente.
        if (suivis.size() >= 2) {
            double precedent = avancementPondere(tachesEffectives(suivis.get(suivis.size() - 2)));
            kpi.setDeltaAvancement(arrondi(reel - precedent, 1));
        }
    }

    /**
     * Extrapole la date de fin à partir de la vélocité observée :
     * si X % ont demandé N jours, 100 % en demanderont N / (X / 100).
     */
    private void projeterDateDeFin(ProjetKPIReportDTO kpi, FicheProjet projet,
                                   double avancement, LocalDate aujourdhui) {
        LocalDate debut = projet.getDateDebut();
        if (debut == null || !debut.isBefore(aujourdhui)) {
            return;
        }
        // Un projet clôturé a une date de fin constatée (affichée telle quelle) : rien à extrapoler.
        if (estClos(projet.getStatut())) {
            return;
        }
        if (avancement >= 100) {
            kpi.setDateFinProjetee(texteDate(aujourdhui));
            if (projet.getDateFinPrevue() != null) {
                kpi.setJoursDerapageProjete((int) ChronoUnit.DAYS.between(projet.getDateFinPrevue(), aujourdhui));
            }
            return;
        }
        if (avancement <= 0) {
            return;
        }

        long joursEcoules = ChronoUnit.DAYS.between(debut, aujourdhui);
        long dureeProjetee = Math.min(Math.round(joursEcoules / (avancement / 100.0)), PROJECTION_MAX_JOURS);
        LocalDate finProjetee = debut.plusDays(dureeProjetee);
        kpi.setDateFinProjetee(texteDate(finProjetee));

        if (projet.getDateFinPrevue() != null) {
            kpi.setJoursDerapageProjete((int) ChronoUnit.DAYS.between(projet.getDateFinPrevue(), finProjetee));
        }
    }

    /* ------------------------------------------------------------------ */
    /* Tâches : répartition, retards, échéances imminentes                  */
    /* ------------------------------------------------------------------ */

    private void remplirTaches(ProjetKPIReportDTO kpi, List<FicheSuivi.TacheSuivi> taches, LocalDate aujourdhui) {
        int terminees = 0;
        int enCours = 0;
        int nonDemarrees = 0;
        int evaluables = 0;
        int respectees = 0;

        List<TacheKPIDTO> enRetard = new ArrayList<>();
        List<TacheKPIDTO> echeanceProche = new ArrayList<>();

        for (FicheSuivi.TacheSuivi tache : taches) {
            double pourcentage = pourcentageTache(tache);
            boolean terminee = pourcentage >= 100;

            if (terminee) {
                terminees++;
            } else if (pourcentage > 0 || estDemarree(tache)) {
                enCours++;
            } else {
                nonDemarrees++;
            }

            LocalDate echeance = tache.getEcheance();
            if (echeance != null) {
                if (terminee) {
                    // Sans date de fin réelle, le respect de l'échéance n'est pas démontrable :
                    // la tâche sort du calcul plutôt que d'être présumée dans les temps.
                    LocalDate finReelle = tache.getDateFinReelle();
                    if (finReelle != null) {
                        evaluables++;
                        if (!finReelle.isAfter(echeance)) {
                            respectees++;
                        }
                    }
                } else if (echeance.isBefore(aujourdhui)) {
                    evaluables++;
                    enRetard.add(versTacheKPI(tache, pourcentage,
                        (int) ChronoUnit.DAYS.between(echeance, aujourdhui)));
                } else if (!echeance.isAfter(aujourdhui.plusDays(HORIZON_ECHEANCE_JOURS))) {
                    echeanceProche.add(versTacheKPI(tache, pourcentage,
                        (int) -ChronoUnit.DAYS.between(aujourdhui, echeance)));
                }
            } else if (!terminee && estEnRetardDeclare(tache)) {
                enRetard.add(versTacheKPI(tache, pourcentage, 0));
            }
        }

        enRetard.sort(Comparator.comparingInt(TacheKPIDTO::getJoursEcart).reversed());
        echeanceProche.sort(Comparator.comparingInt(TacheKPIDTO::getJoursEcart).reversed());

        kpi.setTotalTaches(taches.size());
        kpi.setTachesTerminees(terminees);
        kpi.setTachesEnCours(enCours);
        kpi.setTachesNonDemarrees(nonDemarrees);
        kpi.setTachesEnRetard(enRetard.size());
        kpi.setTachesEcheanceProche(echeanceProche.size());
        // -1 signale au client qu'aucune échéance n'est exploitable : il affiche "–" au lieu de 0 %.
        kpi.setTauxRespectEcheances(evaluables > 0 ? arrondi((double) respectees / evaluables * 100, 0) : -1);
        kpi.setListeTachesEnRetard(limiter(enRetard));
        kpi.setListeTachesEcheanceProche(limiter(echeanceProche));
    }

    private TacheKPIDTO versTacheKPI(FicheSuivi.TacheSuivi tache, double pourcentage, int joursEcart) {
        TacheKPIDTO dto = new TacheKPIDTO();
        dto.setCode(tache.getCode());
        dto.setSujet(libelleTache(tache));
        dto.setAssigneA(tache.getAssigneA());
        dto.setEcheance(texteDate(tache.getEcheance()));
        dto.setPourcentageRealise((int) Math.round(pourcentage));
        dto.setStatut(tache.getStatut());
        dto.setJoursEcart(joursEcart);
        return dto;
    }

    /* ------------------------------------------------------------------ */
    /* Charge : consommation et valeur acquise                              */
    /* ------------------------------------------------------------------ */

    private void remplirCharge(ProjetKPIReportDTO kpi, List<FicheSuivi.TacheSuivi> taches) {
        double estimee = 0;
        double consommee = 0;
        double valeurAcquise = 0;

        for (FicheSuivi.TacheSuivi tache : taches) {
            double tempsEstime = valeur(tache.getTempsEstime());
            estimee += tempsEstime;
            consommee += valeur(tache.getTempsPasse());
            valeurAcquise += tempsEstime * pourcentageTache(tache) / 100.0;
        }

        kpi.setChargeEstimee(arrondi(estimee, 1));
        kpi.setChargeConsommee(arrondi(consommee, 1));
        kpi.setChargeRestanteEstimee(arrondi(Math.max(0, estimee - valeurAcquise), 1));
        kpi.setTauxConsommationCharge(estimee > 0 ? arrondi(consommee / estimee * 100, 1) : 0);
        // Indice d'efficacité (CPI) : > 1 le travail coûte moins que prévu, < 1 il dérive.
        kpi.setIndiceEfficacite(consommee > 0 ? arrondi(valeurAcquise / consommee, 2) : 0);
    }

    /* ------------------------------------------------------------------ */
    /* Qualité : problèmes, risques, recommandations                        */
    /* ------------------------------------------------------------------ */

    private void remplirQualite(ProjetKPIReportDTO kpi, List<FicheSuivi> suivis, FicheSuivi derniereSuivi) {
        List<String> problemes = new ArrayList<>();
        List<String> risques = new ArrayList<>();
        List<String> recommandations = new ArrayList<>();

        if (derniereSuivi != null && derniereSuivi.getConstatGlobal() != null) {
            FicheSuivi.ConstatGlobal constat = derniereSuivi.getConstatGlobal();
            ajouterNonVides(problemes, constat.getProblemesRencontres());
            ajouterNonVides(risques, constat.getPrincipauxRisques());
            ajouterNonVides(recommandations, constat.getRecommandations());
        }

        kpi.setListeProblemes(problemes);
        kpi.setListeRisques(risques);
        kpi.setListeRecommandations(recommandations);
        kpi.setNombreProblemes(problemes.size());
        kpi.setNombreRisques(risques.size());
        kpi.setNombreRecommandations(recommandations.size());
        kpi.setNombreProblemesPersistants(compterProblemesPersistants(problemes, suivis));
    }

    /**
     * Problèmes déjà signalés dans la fiche précédente et toujours ouverts : ce sont eux
     * qui traduisent un défaut de traitement, pas le simple fait de déclarer un problème.
     */
    private int compterProblemesPersistants(List<String> problemes, List<FicheSuivi> suivis) {
        if (problemes.isEmpty() || suivis.size() < 2) {
            return 0;
        }
        FicheSuivi precedente = suivis.get(suivis.size() - 2);
        if (precedente.getConstatGlobal() == null) {
            return 0;
        }
        List<String> anterieurs = new ArrayList<>();
        ajouterNonVides(anterieurs, precedente.getConstatGlobal().getProblemesRencontres());

        int persistants = 0;
        for (String probleme : problemes) {
            String reference = normaliser(probleme);
            for (String anterieur : anterieurs) {
                if (!reference.isEmpty() && reference.equals(normaliser(anterieur))) {
                    persistants++;
                    break;
                }
            }
        }
        return persistants;
    }

    /* ------------------------------------------------------------------ */
    /* Budget : cadrage, prévision et consommation                          */
    /* ------------------------------------------------------------------ */

    private void remplirBudget(ProjetKPIReportDTO kpi, FicheProjet projet, FicheSuivi derniereSuivi) {
        double budgetTotal = 0;
        if (projet.getEstimationBudget() != null) {
            budgetTotal = nombre(projet.getEstimationBudget().getBudgetMDHT());
        }

        double prevision = 0;
        double realisation = 0;
        if (derniereSuivi != null && derniereSuivi.getFicheSignaletique() != null
            && derniereSuivi.getFicheSignaletique().getFinancier() != null) {
            FicheSuivi.FinancierInfo financier = derniereSuivi.getFicheSignaletique().getFinancier();
            prevision = valeur(financier.getBudgetPrevision());
            realisation = valeur(financier.getBudgetRealisation());
        }
        if (prevision <= 0) {
            prevision = budgetTotal;
        }

        kpi.setBudgetTotal(arrondi(budgetTotal, 2));
        kpi.setBudgetPrevision(arrondi(prevision, 2));
        kpi.setBudgetRealisation(arrondi(realisation, 2));
        kpi.setEcartBudget(arrondi(prevision - realisation, 2));
        kpi.setTauxConsommationBudget(prevision > 0 ? arrondi(realisation / prevision * 100, 1) : 0);
    }

    /* ------------------------------------------------------------------ */
    /* Équipe : composition et charge par membre                            */
    /* ------------------------------------------------------------------ */

    private void remplirEquipe(ProjetKPIReportDTO kpi, FicheProjet projet,
                               List<FicheSuivi.TacheSuivi> taches, LocalDate aujourdhui) {
        List<MembreEquipeDTO> membres = new ArrayList<>();
        if (projet.getEquipeProjet() != null && !projet.getEquipeProjet().isBlank()) {
            try {
                List<Map<String, String>> equipe = new ObjectMapper().readValue(
                    projet.getEquipeProjet(), new TypeReference<List<Map<String, String>>>() {});
                for (Map<String, String> membre : equipe) {
                    String nom = membre.get("nom");
                    if (nom != null && !nom.isBlank()) {
                        membres.add(new MembreEquipeDTO(nom, membre.get("role")));
                    }
                }
            } catch (Exception e) {
                // Équipe non exploitable (format libre) : les KPI restent calculables sans elle.
            }
        }
        kpi.setListeMembresEquipe(membres);
        kpi.setTailleEquipe(membres.size());

        // Agrégation de la charge réelle par assignataire, dans l'ordre d'apparition des tâches.
        Map<String, ChargeMembreDTO> parMembre = new LinkedHashMap<>();
        Map<String, Double> avancementCumule = new LinkedHashMap<>();

        for (FicheSuivi.TacheSuivi tache : taches) {
            String assigne = tache.getAssigneA();
            if (assigne == null || assigne.isBlank()) {
                continue;
            }
            String cle = assigne.trim();
            ChargeMembreDTO charge = parMembre.computeIfAbsent(cle, ChargeMembreDTO::new);
            double pourcentage = pourcentageTache(tache);

            charge.setNombreTaches(charge.getNombreTaches() + 1);
            charge.setChargeEstimee(charge.getChargeEstimee() + valeur(tache.getTempsEstime()));
            charge.setChargeConsommee(charge.getChargeConsommee() + valeur(tache.getTempsPasse()));
            avancementCumule.merge(cle, pourcentage, Double::sum);

            if (pourcentage >= 100) {
                charge.setTachesTerminees(charge.getTachesTerminees() + 1);
            } else if (tache.getEcheance() != null && tache.getEcheance().isBefore(aujourdhui)) {
                charge.setTachesEnRetard(charge.getTachesEnRetard() + 1);
            }
        }

        List<ChargeMembreDTO> chargeParMembre = new ArrayList<>(parMembre.values());
        for (ChargeMembreDTO charge : chargeParMembre) {
            double cumul = avancementCumule.getOrDefault(charge.getNom(), 0.0);
            charge.setAvancementMoyen(arrondi(cumul / charge.getNombreTaches(), 0));
            charge.setChargeEstimee(arrondi(charge.getChargeEstimee(), 1));
            charge.setChargeConsommee(arrondi(charge.getChargeConsommee(), 1));
        }
        chargeParMembre.sort(Comparator.comparingInt(ChargeMembreDTO::getNombreTaches).reversed());
        kpi.setChargeParMembre(chargeParMembre);
    }

    /* ------------------------------------------------------------------ */
    /* Historique : une mesure par fiche de suivi                           */
    /* ------------------------------------------------------------------ */

    private void remplirHistorique(ProjetKPIReportDTO kpi, List<FicheSuivi> suivis) {
        List<PointHistoriqueKPIDTO> historique = new ArrayList<>();

        for (FicheSuivi suivi : suivis) {
            PointHistoriqueKPIDTO point = new PointHistoriqueKPIDTO();
            point.setDate(texteDate(dateReference(suivi)));
            point.setNumeroRapport(suivi.getNumeroRapport());
            point.setTauxAvancement(arrondi(avancementPondere(tachesEffectives(suivi)), 1));

            if (suivi.getConstatGlobal() != null) {
                point.setNombreProblemes(taille(suivi.getConstatGlobal().getProblemesRencontres()));
                point.setNombreRisques(taille(suivi.getConstatGlobal().getPrincipauxRisques()));
            }
            historique.add(point);
        }
        kpi.setHistorique(historique);
    }

    /* ------------------------------------------------------------------ */
    /* Score de santé : 4 composantes auditables sur 100 points             */
    /* ------------------------------------------------------------------ */

    private void remplirScoreSante(ProjetKPIReportDTO kpi) {
        List<ComposanteScoreDTO> composantes = new ArrayList<>();

        composantes.add(scoreAvancement(kpi));
        composantes.add(scoreDelais(kpi));
        composantes.add(scoreQualite(kpi));
        composantes.add(scoreMaitrise(kpi));

        double total = 0;
        for (ComposanteScoreDTO composante : composantes) {
            composante.setPoints(arrondi(composante.getPoints(), 1));
            total += composante.getPoints();
        }
        double score = Math.round(Math.max(0, Math.min(100, total)));

        kpi.setDetailScore(composantes);
        kpi.setScoreSante(score);
        kpi.setNiveauSante(niveauSante(score));
    }

    private ComposanteScoreDTO scoreAvancement(ProjetKPIReportDTO kpi) {
        double max = 30;
        if (kpi.getTauxAvancementPlanifie() > 0) {
            double points = Math.min(kpi.getSpi(), 1.0) * max;
            String commentaire = String.format("Avancement %.0f%% vs %.0f%% planifié (SPI %.2f)",
                kpi.getTauxAvancement(), kpi.getTauxAvancementPlanifie(), kpi.getSpi());
            return new ComposanteScoreDTO("Avancement vs planning", points, max, commentaire);
        }
        // Sans planning exploitable, on note l'avancement brut.
        return new ComposanteScoreDTO("Avancement vs planning", kpi.getTauxAvancement() / 100 * max, max,
            String.format("Planning non exploitable : avancement brut de %.0f%%", kpi.getTauxAvancement()));
    }

    private ComposanteScoreDTO scoreDelais(ProjetKPIReportDTO kpi) {
        double max = 25;
        double points = max;
        points -= Math.min(15, kpi.getJoursRetard() / 2.0);
        points -= Math.min(10, kpi.getTachesEnRetard() * 2.5);
        points = Math.max(0, points);

        String commentaire;
        if (kpi.getJoursRetard() > 0 && kpi.getTachesEnRetard() > 0) {
            commentaire = kpi.getJoursRetard() + " j de retard projet et "
                + kpi.getTachesEnRetard() + " tâche(s) hors délai";
        } else if (kpi.getJoursRetard() > 0) {
            commentaire = kpi.getJoursRetard() + " jour(s) de retard sur la date de fin prévue";
        } else if (kpi.getTachesEnRetard() > 0) {
            commentaire = kpi.getTachesEnRetard() + " tâche(s) dont l'échéance est dépassée";
        } else {
            commentaire = "Aucun dépassement d'échéance constaté";
        }
        return new ComposanteScoreDTO("Respect des délais", points, max, commentaire);
    }

    /**
     * Note la maîtrise de la qualité sans pénaliser la transparence : ce qui coûte des points,
     * c'est un problème qui traîne d'une fiche à l'autre ou un risque laissé sans plan d'action,
     * pas le fait de déclarer honnêtement ses difficultés.
     */
    private ComposanteScoreDTO scoreQualite(ProjetKPIReportDTO kpi) {
        double max = 25;
        double points = max;

        int persistants = Math.min(kpi.getNombreProblemesPersistants(), kpi.getNombreProblemes());
        int nouveaux = kpi.getNombreProblemes() - persistants;
        points -= Math.min(15, persistants * 3.0 + nouveaux * 1.0);

        // Un risque documenté et accompagné de recommandations pèse moins qu'un risque sans réponse.
        double poidsRisque = kpi.getNombreRecommandations() > 0 ? PENALITE_RISQUE_TRAITE : PENALITE_RISQUE_NON_TRAITE;
        points -= Math.min(10, kpi.getNombreRisques() * poidsRisque);
        points = Math.max(0, points);

        StringBuilder commentaire = new StringBuilder();
        commentaire.append(kpi.getNombreProblemes()).append(" problème(s)");
        if (persistants > 0) {
            commentaire.append(" dont ").append(persistants).append(" non résolu(s) depuis la fiche précédente");
        }
        commentaire.append(" et ").append(kpi.getNombreRisques()).append(" risque(s)");
        commentaire.append(kpi.getNombreRecommandations() > 0
            ? " couverts par un plan d'action" : " sans plan d'action formalisé");

        return new ComposanteScoreDTO("Qualité et maîtrise des risques", points, max, commentaire.toString());
    }

    private ComposanteScoreDTO scoreMaitrise(ProjetKPIReportDTO kpi) {
        double max = 20;
        double points = 0;
        List<String> details = new ArrayList<>();

        // Volet charge (12 pts) : l'efficacité mesure ce qui est produit par unité consommée.
        if (kpi.getChargeConsommee() > 0) {
            points += Math.min(1.0, kpi.getIndiceEfficacite()) * 12;
            details.add(String.format("efficacité %.2f", kpi.getIndiceEfficacite()));
        } else {
            points += 12 * 0.6; // charge non renseignée : note neutre, ni bonus ni sanction
            details.add("charge non renseignée");
        }

        // Volet budget (8 pts) : une consommation qui dépasse l'avancement signale une dérive.
        if (kpi.getBudgetPrevision() > 0 && kpi.getBudgetRealisation() > 0) {
            double derive = kpi.getTauxConsommationBudget() - kpi.getTauxAvancement();
            points += derive <= 0 ? 8 : Math.max(0, 8 - derive / 5);
            details.add(String.format("budget consommé à %.0f%%", kpi.getTauxConsommationBudget()));
        } else {
            points += 8 * 0.6;
            details.add("budget non suivi");
        }

        return new ComposanteScoreDTO("Maîtrise charge et budget", points, max, String.join(", ", details));
    }

    private String niveauSante(double score) {
        if (score >= 80) return "EXCELLENT";
        if (score >= 60) return "BON";
        if (score >= 40) return "ATTENTION";
        return "CRITIQUE";
    }

    /* ------------------------------------------------------------------ */
    /* Alertes déterministes                                                */
    /* ------------------------------------------------------------------ */

    private void remplirAlertes(ProjetKPIReportDTO kpi, FicheProjet projet, LocalDate aujourdhui) {
        List<AlerteKPIDTO> alertes = new ArrayList<>();
        // Sur un projet clôturé (terminé ou annulé), les alertes d'exécution n'ont plus d'objet :
        // elles décriraient un pilotage à conduire sur un projet qui n'avance plus.
        boolean projetClos = estClos(projet.getStatut());

        if (kpi.getNombreFichesSuivi() == 0) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MAJEUR, "Suivi", "Aucune fiche de suivi",
                "Aucun indicateur d'exécution ne peut être calculé tant qu'aucune fiche de suivi n'est remplie."));
        }

        if (!projetClos && projet.getDateProchaineFicheSuivi() != null
            && projet.getDateProchaineFicheSuivi().isBefore(aujourdhui)) {
            long jours = ChronoUnit.DAYS.between(projet.getDateProchaineFicheSuivi(), aujourdhui);
            alertes.add(new AlerteKPIDTO(jours > 30 ? AlerteKPIDTO.MAJEUR : AlerteKPIDTO.MINEUR, "Suivi",
                "Fiche de suivi en attente",
                "La prochaine fiche de suivi était attendue depuis " + jours + " jour(s)."));
        }

        if (kpi.getJoursRetard() > 0) {
            alertes.add(new AlerteKPIDTO(kpi.getJoursRetard() > 30 ? AlerteKPIDTO.CRITIQUE : AlerteKPIDTO.MAJEUR,
                "Délais", "Date de fin dépassée",
                "Le projet dépasse sa date de fin prévue de " + kpi.getJoursRetard() + " jour(s)."));
        }

        if (!projetClos && kpi.getTauxAvancementPlanifie() > 0 && kpi.getSpi() < 0.8) {
            alertes.add(new AlerteKPIDTO(kpi.getSpi() < 0.6 ? AlerteKPIDTO.CRITIQUE : AlerteKPIDTO.MAJEUR,
                "Délais", "Avancement en retrait du planning",
                String.format("SPI de %.2f : %.0f%% réalisés contre %.0f%% attendus à ce jour.",
                    kpi.getSpi(), kpi.getTauxAvancement(), kpi.getTauxAvancementPlanifie())));
        }

        if (!projetClos && kpi.getJoursDerapageProjete() > 15) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MAJEUR, "Délais", "Dérapage projeté",
                "Au rythme actuel, la fin est projetée au " + kpi.getDateFinProjetee()
                    + ", soit " + kpi.getJoursDerapageProjete() + " jour(s) après la date prévue."));
        }

        if (!projetClos && kpi.getTachesEnRetard() > 0) {
            alertes.add(new AlerteKPIDTO(kpi.getTachesEnRetard() > 3 ? AlerteKPIDTO.MAJEUR : AlerteKPIDTO.MINEUR,
                "Tâches", kpi.getTachesEnRetard() + " tâche(s) hors délai",
                "Ces tâches ont dépassé leur échéance sans être terminées."));
        }

        if (!projetClos && kpi.getTachesEcheanceProche() > 0) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MINEUR, "Tâches",
                kpi.getTachesEcheanceProche() + " échéance(s) imminente(s)",
                "Échéances à moins de " + HORIZON_ECHEANCE_JOURS + " jours sur des tâches non terminées."));
        }

        if (kpi.getChargeConsommee() > 0 && kpi.getIndiceEfficacite() < 0.8) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MAJEUR, "Charge", "Dérive de la charge",
                String.format("Indice d'efficacité de %.2f : la charge consommée dépasse la valeur produite.",
                    kpi.getIndiceEfficacite())));
        }

        if (kpi.getBudgetRealisation() > 0
            && kpi.getTauxConsommationBudget() > kpi.getTauxAvancement() + 15) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MAJEUR, "Budget", "Consommation budgétaire en avance",
                String.format("%.0f%% du budget consommé pour %.0f%% d'avancement.",
                    kpi.getTauxConsommationBudget(), kpi.getTauxAvancement())));
        }

        if (kpi.getNombreProblemes() > 5) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MAJEUR, "Qualité",
                kpi.getNombreProblemes() + " problèmes ouverts",
                "Le volume de problèmes déclarés appelle un plan de traitement priorisé."));
        }

        if (kpi.getNombreRisques() > 3) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MINEUR, "Qualité",
                kpi.getNombreRisques() + " risques identifiés",
                "Un plan de mitigation devrait être formalisé pour chaque risque."));
        }

        // Un projet achevé ou clôturé ne "stagne" pas : il n'a plus rien à avancer.
        if (!projetClos && kpi.getTauxAvancement() < 100
            && kpi.getNombreFichesSuivi() >= 2 && kpi.getDeltaAvancement() <= 0) {
            alertes.add(new AlerteKPIDTO(AlerteKPIDTO.MAJEUR, "Avancement", "Progression à l'arrêt",
                "Aucune progression enregistrée depuis la fiche de suivi précédente."));
        }

        alertes.sort(Comparator.comparingInt(alerte -> ordreNiveau(alerte.getNiveau())));
        kpi.setAlertes(alertes);
    }

    private int ordreNiveau(String niveau) {
        if (AlerteKPIDTO.CRITIQUE.equals(niveau)) return 0;
        if (AlerteKPIDTO.MAJEUR.equals(niveau)) return 1;
        return 2;
    }

    /* ------------------------------------------------------------------ */
    /* Calculs élémentaires sur les tâches                                  */
    /* ------------------------------------------------------------------ */

    /** Tâches réellement productives : les lignes de titre sont des regroupements et sont exclues. */
    private static List<FicheSuivi.TacheSuivi> tachesEffectives(FicheSuivi suivi) {
        List<FicheSuivi.TacheSuivi> effectives = new ArrayList<>();
        if (suivi == null || suivi.getTachesSuivi() == null) {
            return effectives;
        }
        for (FicheSuivi.TacheSuivi tache : suivi.getTachesSuivi()) {
            if (Boolean.TRUE.equals(tache.getEstTitre())) {
                continue;
            }
            boolean vide = estVide(tache.getSujet()) && estVide(tache.getCode()) && estVide(tache.getLivrable());
            if (!vide) {
                effectives.add(tache);
            }
        }
        return effectives;
    }

    /**
     * Avancement pondéré par la charge estimée : une tâche de 20 jours pèse
     * dix fois plus qu'une tâche de 2 jours. Sans charge saisie, le poids est uniforme.
     */
    private double avancementPondere(List<FicheSuivi.TacheSuivi> taches) {
        double poidsTotal = 0;
        double cumul = 0;
        for (FicheSuivi.TacheSuivi tache : taches) {
            double poids = poidsTache(tache);
            poidsTotal += poids;
            cumul += poids * pourcentageTache(tache);
        }
        return poidsTotal > 0 ? cumul / poidsTotal : 0;
    }

    /** Avancement attendu à ce jour, déduit des fenêtres début/échéance de chaque tâche. */
    private double avancementPlanifie(List<FicheSuivi.TacheSuivi> taches, LocalDate debutProjet, LocalDate aujourdhui) {
        double poidsTotal = 0;
        double cumul = 0;
        for (FicheSuivi.TacheSuivi tache : taches) {
            Double attendu = avancementPlanifieTache(tache, debutProjet, aujourdhui);
            if (attendu == null) {
                continue;
            }
            double poids = poidsTache(tache);
            poidsTotal += poids;
            cumul += poids * attendu;
        }
        return poidsTotal > 0 ? cumul / poidsTotal : -1; // -1 : planning non exploitable
    }

    private Double avancementPlanifieTache(FicheSuivi.TacheSuivi tache, LocalDate debutProjet, LocalDate aujourdhui) {
        LocalDate echeance = tache.getEcheance();
        if (echeance == null) {
            return null;
        }
        LocalDate debut = tache.getDebut() != null ? tache.getDebut() : debutProjet;
        if (debut == null || !debut.isBefore(echeance)) {
            return aujourdhui.isBefore(echeance) ? 0.0 : 100.0;
        }
        if (!aujourdhui.isAfter(debut)) {
            return 0.0;
        }
        if (!aujourdhui.isBefore(echeance)) {
            return 100.0;
        }
        double ecoule = ChronoUnit.DAYS.between(debut, aujourdhui);
        double duree = ChronoUnit.DAYS.between(debut, echeance);
        return ecoule / duree * 100.0;
    }

    /** Repli au niveau projet quand les tâches ne portent pas d'échéance. */
    private double avancementPlanifieProjet(LocalDate debut, LocalDate fin, LocalDate aujourdhui) {
        if (debut == null || fin == null || !debut.isBefore(fin)) {
            return 0;
        }
        if (!aujourdhui.isAfter(debut)) {
            return 0;
        }
        if (!aujourdhui.isBefore(fin)) {
            return 100;
        }
        double ecoule = ChronoUnit.DAYS.between(debut, aujourdhui);
        double duree = ChronoUnit.DAYS.between(debut, fin);
        return ecoule / duree * 100.0;
    }

    private double poidsTache(FicheSuivi.TacheSuivi tache) {
        double estime = valeur(tache.getTempsEstime());
        return estime > 0 ? estime : 1;
    }

    /** Avancement d'une tâche : le pourcentage saisi prime, le statut sert de repli. */
    private double pourcentageTache(FicheSuivi.TacheSuivi tache) {
        if (tache.getPourcentageRealise() != null) {
            return Math.max(0, Math.min(100, tache.getPourcentageRealise()));
        }
        String statut = normaliser(tache.getStatut());
        if (statut.contains("termin") || statut.contains("clotur") || statut.contains("acheve")) {
            return 100;
        }
        if (statut.contains("en cours")) {
            return 50;
        }
        return 0;
    }

    private boolean estDemarree(FicheSuivi.TacheSuivi tache) {
        if (tache.getDateDebutReelle() != null || valeur(tache.getTempsPasse()) > 0) {
            return true;
        }
        String statut = normaliser(tache.getStatut());
        return statut.contains("en cours") || statut.contains("retard") || statut.contains("bloqu");
    }

    private boolean estEnRetardDeclare(FicheSuivi.TacheSuivi tache) {
        String statut = normaliser(tache.getStatut());
        return statut.contains("retard") || statut.contains("bloqu");
    }

    /** Projet clos : plus aucune exécution n'est attendue (terminé, clôturé ou annulé). */
    private boolean estClos(String statut) {
        String normalise = normaliser(statut);
        return normalise.contains("termin") || normalise.contains("clotur") || normalise.contains("annul");
    }

    private String libelleTache(FicheSuivi.TacheSuivi tache) {
        if (!estVide(tache.getSujet())) return tache.getSujet();
        if (!estVide(tache.getLivrable())) return tache.getLivrable();
        if (!estVide(tache.getCode())) return tache.getCode();
        return "Tâche sans libellé";
    }

    /* ------------------------------------------------------------------ */
    /* Utilitaires                                                          */
    /* ------------------------------------------------------------------ */

    /** Date représentative d'une fiche : la date de rapport, à défaut la date de création. */
    private static LocalDate dateReference(FicheSuivi suivi) {
        if (suivi.getDateRapport() != null) {
            return suivi.getDateRapport();
        }
        return suivi.getDateCreation() != null ? suivi.getDateCreation().toLocalDate() : null;
    }

    private static String normaliser(String texte) {
        if (texte == null) {
            return "";
        }
        return Normalizer.normalize(texte, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase()
            .replace('_', ' ')
            .replaceAll("\\s+", " ")
            .trim();
    }

    private static boolean estVide(String texte) {
        return texte == null || texte.isBlank();
    }

    /** Les dates transitent en ISO (yyyy-MM-dd) : le formatage d'affichage reste au client. */
    private static String texteDate(LocalDate date) {
        return date == null ? null : date.toString();
    }

    private static double valeur(Number nombre) {
        return nombre == null ? 0 : nombre.doubleValue();
    }

    private static double nombre(String texte) {
        if (estVide(texte)) {
            return 0;
        }
        try {
            return Double.parseDouble(texte.replace(',', '.').replaceAll("[^0-9.\\-]", ""));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static double arrondi(double valeur, int decimales) {
        double facteur = Math.pow(10, decimales);
        return Math.round(valeur * facteur) / facteur;
    }

    private static int taille(List<?> liste) {
        return liste == null ? 0 : liste.size();
    }

    private static void ajouterNonVides(List<String> cible, List<String> source) {
        if (source == null) {
            return;
        }
        for (String element : source) {
            if (element != null && !element.isBlank()) {
                cible.add(element.trim());
            }
        }
    }

    private static List<TacheKPIDTO> limiter(List<TacheKPIDTO> taches) {
        return taches.size() <= MAX_TACHES_LISTEES
            ? taches
            : new ArrayList<>(taches.subList(0, MAX_TACHES_LISTEES));
    }
}
