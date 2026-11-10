package com.example.demo.service;

import com.example.demo.dto.CalendrierSuiviDTO;
import com.example.demo.dto.EcheanceSuiviDTO;
import com.example.demo.dto.EcheanceSuiviDTO.Statut;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Les fiches de suivi d'un chef de projet sur un calendrier : celles qu'il a déposées, puis, pour chaque projet en
 * cours, la prochaine attendue et les suivantes selon la périodicité. Un projet en retard n'a qu'une fiche en retard,
 * comme pour le pilote qualité : la date attendue n'avance qu'avec un dépôt.
 */
@Service
public class CalendrierSuiviService {

    /** Au-delà, une date projetée n'aide plus le chef de projet : les dépôts d'ici là l'auront déplacée. */
    private static final int HORIZON_MOIS = 12;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    public CalendrierSuiviDTO calendrierDe(String chefProjetId) {
        return calendrierDe(chefProjetId, LocalDate.now());
    }

    CalendrierSuiviDTO calendrierDe(String chefProjetId, LocalDate aujourdhui) {
        List<FicheProjet> projets = ficheProjetRepository.findByChefProjetId(chefProjetId);
        List<EcheanceSuiviDTO> echeances = new ArrayList<>();
        List<String> projetsSansEcheance = new ArrayList<>();

        for (FicheProjet projet : projets) {
            if (estClos(projet)) {
                continue;
            }
            LocalDate prochaine = prochaineDate(projet);
            if (prochaine == null) {
                projetsSansEcheance.add(projet.getNomProjet());
            } else {
                ajouterDatesAttendues(echeances, projet, prochaine, aujourdhui);
            }
        }

        Map<String, FicheProjet> projetsParId = projets.stream()
                .collect(Collectors.toMap(FicheProjet::getId, Function.identity()));
        for (FicheSuivi fiche : ficheSuiviRepository.findByChefProjetId(chefProjetId)) {
            FicheProjet projet = projetsParId.get(fiche.getFicheProjetId());
            LocalDate deposeeLe = dateDepot(fiche);
            if (projet != null && deposeeLe != null) {
                echeances.add(new EcheanceSuiviDTO(projet.getId(), projet.getNomProjet(), deposeeLe, Statut.DEPOSEE,
                        null, projet.getPeriodiciteSuiviMois(), fiche.getId(), fiche.getNumeroRapport()));
            }
        }

        echeances.sort(Comparator.comparing(EcheanceSuiviDTO::date)
                .thenComparing(EcheanceSuiviDTO::nomProjet, Comparator.nullsLast(Comparator.naturalOrder())));
        return new CalendrierSuiviDTO(echeances, projetsSansEcheance);
    }

    /** Même règle que FicheProjetService : un projet terminé ou annulé n'attend plus de fiche. */
    private boolean estClos(FicheProjet projet) {
        return "TERMINE".equals(projet.getStatut()) || "ANNULE".equals(projet.getStatut());
    }

    /** Sans fiche déposée, la première est attendue une périodicité après le début du projet. */
    private LocalDate prochaineDate(FicheProjet projet) {
        if (projet.getDateProchaineFicheSuivi() != null) {
            return projet.getDateProchaineFicheSuivi();
        }
        Integer periodicite = projet.getPeriodiciteSuiviMois();
        return periodicite != null && periodicite > 0 && projet.getDateDebut() != null
                ? projet.getDateDebut().plusMonths(periodicite)
                : null;
    }

    private void ajouterDatesAttendues(List<EcheanceSuiviDTO> echeances, FicheProjet projet, LocalDate prochaine,
                                       LocalDate aujourdhui) {
        Integer configuree = projet.getPeriodiciteSuiviMois();
        long joursRestants = ChronoUnit.DAYS.between(aujourdhui, prochaine);
        echeances.add(new EcheanceSuiviDTO(projet.getId(), projet.getNomProjet(), prochaine,
                joursRestants < 0 ? Statut.EN_RETARD : Statut.A_DEPOSER, joursRestants, configuree, null, null));

        // Comme au dépôt d'une fiche : une périodicité absente vaut un mois
        int periodicite = configuree != null && configuree > 0 ? configuree : 1;
        LocalDate limite = aujourdhui.plusMonths(HORIZON_MOIS);
        if (projet.getDateFinPrevue() != null && projet.getDateFinPrevue().isBefore(limite)) {
            limite = projet.getDateFinPrevue();
        }

        // Chaque date part de la prochaine échéance : le 31 janvier donne le 28 février puis le 31 mars
        LocalDate date = prochaine.plusMonths(periodicite);
        for (int rang = 2; !date.isAfter(limite); rang++) {
            if (date.isAfter(aujourdhui)) {
                echeances.add(new EcheanceSuiviDTO(projet.getId(), projet.getNomProjet(), date, Statut.PREVUE,
                        null, configuree, null, null));
            }
            date = prochaine.plusMonths((long) periodicite * rang);
        }
    }

    /** La date du dépôt est celle de l'enregistrement : la date du rapport est saisie par le chef de projet. */
    private LocalDate dateDepot(FicheSuivi fiche) {
        return fiche.getDateCreation() != null ? fiche.getDateCreation().toLocalDate() : fiche.getDateRapport();
    }
}
