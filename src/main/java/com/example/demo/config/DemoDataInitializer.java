package com.example.demo.config;

import com.example.demo.model.ERole;
import com.example.demo.model.EstimationBudget;
import com.example.demo.model.EstimationCharge;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.HistoriqueModification;
import com.example.demo.model.Notification;
import com.example.demo.model.PlanningAction;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.HistoriqueModificationRepository;
import com.example.demo.repository.NotificationRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.HistoriqueService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Jeu de données de démonstration : 2 pilotes qualité, 3 chefs de projet, 10 fiches de projet et 17 fiches
 * de suivi, saisies comme le ferait un chef de projet dans les formulaires (mêmes champs, mêmes formats).
 *
 * Désactivé par défaut. Variable d'environnement DEMO_DATA :
 * - true  : charge le jeu s'il n'est pas déjà en base ;
 * - reset : supprime le jeu puis le recharge (à faire la veille d'une démonstration pour recaler les dates).
 *
 * Les dates sont écrites pour le 25/10/2026 puis décalées du nombre de jours écoulés depuis : les retards
 * et les échéances affichés sont donc les mêmes quel que soit le jour du chargement.
 */
@Component
@Order(3) // Après DataInitializer (rôles) et AdminUserInitializer
public class DemoDataInitializer implements CommandLineRunner {

    /** Jour pour lequel les dates du jeu ont été écrites. */
    private static final LocalDate REFERENCE = LocalDate.of(2026, 10, 25);
    private static final String MOT_DE_PASSE = "Demo2026";
    private static final String CNI = "Centre National de l'Informatique (CNI)";

    private static final String EMAIL_SAMI = "sami.trabelsi@qualinet.com";
    private static final String EMAIL_INES = "ines.gharbi@qualinet.com";
    private static final String EMAIL_MEHDI = "mehdi.bouaziz@qualinet.com";
    private static final String EMAIL_AMEL = "amel.bensalah@qualinet.com";
    private static final String EMAIL_KARIM = "karim.jlassi@qualinet.com";
    private static final List<String> EMAILS_DEMO = List.of(EMAIL_SAMI, EMAIL_INES, EMAIL_MEHDI, EMAIL_AMEL, EMAIL_KARIM);

    /** Statuts proposés pour une tâche dans le formulaire de fiche de suivi. */
    private static final String TERMINE = "Terminé";
    private static final String EN_COURS = "En cours";
    private static final String EN_RETARD = "En retard";

    private static final DateTimeFormatter HORODATAGE = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final DateTimeFormatter NUMERO_RAPPORT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    @Value("${app.demo-data:false}")
    private String mode;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private HistoriqueModificationRepository historiqueRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private HistoriqueService historiqueService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MongoTemplate mongoTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Jours écoulés entre REFERENCE et le jour du chargement. */
    private long decalage;
    private List<User> pilotes = List.of();
    private int nbProjets;
    private int nbFiches;

    @Override
    public void run(String... args) {
        String choix = mode == null ? "" : mode.trim().toLowerCase(Locale.ROOT);
        if (!choix.equals("true") && !choix.equals("reset")) {
            return;
        }
        if (userRepository.existsByEmail(EMAIL_SAMI)) {
            if (choix.equals("true")) {
                System.out.println("✓ Données de démonstration déjà présentes (DEMO_DATA=reset pour les recharger).");
                return;
            }
            supprimerDonneesDemo();
        }

        decalage = ChronoUnit.DAYS.between(REFERENCE, LocalDate.now());

        compte("Amel", "Ben Salah", EMAIL_AMEL, "+216 97 214 580", ERole.ROLE_PILOTE_QUALITE, "2025-01-13 09:00");
        compte("Karim", "Jlassi", EMAIL_KARIM, "+216 50 932 116", ERole.ROLE_PILOTE_QUALITE, "2026-03-02 10:30");
        // Comme dans l'application, chaque fiche créée notifie tous les pilotes qualité
        pilotes = userRepository.findAll().stream().filter(u -> aLeRole(u, ERole.ROLE_PILOTE_QUALITE)).toList();

        User ines = compte("Ines", "Gharbi", EMAIL_INES, "+216 22 618 904", ERole.ROLE_CHEF_PROJET, "2025-01-20 11:15");
        User sami = compte("Sami", "Trabelsi", EMAIL_SAMI, "+216 98 452 317", ERole.ROLE_CHEF_PROJET, "2025-09-15 08:50");
        User mehdi = compte("Mehdi", "Bouaziz", EMAIL_MEHDI, "+216 55 307 641", ERole.ROLE_CHEF_PROJET, "2026-02-16 14:20");

        projetsSami(sami);
        projetsInes(ines);
        projetsMehdi(mehdi);

        System.out.println("✓ Données de démonstration chargées : 5 comptes (mot de passe " + MOT_DE_PASSE + "), "
            + nbProjets + " projets, " + nbFiches + " fiches de suivi.");
    }

    /* ------------------------------------------------------------------ */
    /* Sami Trabelsi : un ancien projet terminé, un projet suivi à temps,   */
    /* un projet qui vient de démarrer                                      */
    /* ------------------------------------------------------------------ */

    private void projetsSami(User chef) {
        String sami = "Sami Trabelsi";
        String yassine = "Yassine Ferchichi";
        String rim = "Rim Mansouri";
        String hatem = "Hatem Kefi";
        String olfa = "Olfa Ayari";
        String walid = "Walid Chebbi";

        // --- Ancien projet : terminé en mai 2026, avec trois semaines de retard ---
        FicheProjet p = nouveauProjet(chef, "2025-09-22 10:14");
        p.setNomProjet("GED Courrier");
        p.setDesignationProjet("Gestion électronique du courrier administratif");
        p.setDesignationClient("Ministère de l'Équipement et de l'Habitat");
        p.setReference("CNI/DEV/2025/031");
        p.setCadreContractuelProjet("Convention CNI – Ministère de l'Équipement 2025");
        p.setCaractereProjet("national");
        p.setTypeProjet("nouveau");
        p.setPresentation("Mise en place d'une application de gestion du courrier arrivée et départ du ministère : "
            + "enregistrement, numérisation, affectation aux services et suivi des délais de réponse.");
        p.setPerimetre("Bureau d'ordre central et 6 directions centrales. Courrier arrivée, courrier départ et "
            + "courrier interne. L'archivage définitif n'est pas concerné.");
        p.setMaitreOuvrage("Ministère de l'Équipement et de l'Habitat – Direction de l'Organisation et des Méthodes");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            sami, "Chef de projet",
            yassine, "Développeur back-end",
            rim, "Développeuse front-end",
            olfa, "Testeuse QA"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Analyse et conception", "CP + ID", "Octobre – Novembre 2025", "2", "Dossier de conception"),
            new EstimationCharge("Développement", "ID", "Décembre 2025 – Mars 2026", "6", "Application GED et code source"),
            new EstimationCharge("Recette et mise en production", "CP + ID", "Avril 2026", "1.5", "PV de recette, guide utilisateur")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(72000, 228000));
        p.setDelaisPrevisionnels("Le délai prévisionnel du projet est de 7 mois (hors délais de validation).");
        delais(p, "2025-10-01", "2026-04-30", 7, "2025-10-06");
        p.setRisquesPotentiels("Retard dans la numérisation du stock de courrier existant. "
            + "Résistance au changement des agents du bureau d'ordre.");
        p.setPreRequis("Mise à disposition de 3 scanners par le ministère. Serveur d'application hébergé au CNI. "
            + "Désignation d'un correspondant par direction.");
        p.setPlanning(List.of(
            action("Analyse et conception", "CP, ID", "2", 1, 2),
            action("Développement", "ID", "6", 3, 6),
            action("Recette et formation", "CP, ID", "1", 7, 7),
            action("Mise en production", "CP", "0.5", 7, 7)));
        p.setPeriodiciteSuiviMois(2);

        Dossier ged = ouvrir(p, chef);
        ged.objectif = "Mettre en service la GED au bureau d'ordre central et dans les 6 directions avant fin avril 2026.";
        ged.experts = List.of("Nabil Haddad – archiviste, Archives Nationales de Tunisie");
        ged.caracteristiques = List.of("Application web Java Spring Boot et Angular", "Base de données PostgreSQL",
            "Numérisation et reconnaissance de texte (OCR) des courriers entrants");
        ged.taches = List.of(
            titre("Analyse et conception"),
            tache("T1.1", "1- Recueil des besoins auprès du bureau d'ordre", "Comptes rendus de réunions", sami, "2025-10-06", "2025-10-24"),
            tache("T1.2", "2- Rédaction du dossier de conception", "Dossier de conception", yassine, "2025-10-27", "2025-11-28"),
            titre("Développement"),
            tache("T2.1", "1- Enregistrement et numérisation du courrier arrivée", "Module courrier arrivée", yassine, "2025-12-01", "2026-01-16"),
            tache("T2.2", "2- Affectation aux services et circuit de visa", "Module affectation", rim, "2025-12-15", "2026-02-13"),
            tache("T2.3", "3- Courrier départ et courrier interne", "Module courrier départ", yassine, "2026-02-02", "2026-03-13"),
            tache("T2.4", "4- Tableau de bord des délais de réponse", "Tableau de bord", rim, "2026-03-02", "2026-03-27"),
            titre("Recette et formation"),
            tache("T3.1", "1- Recette fonctionnelle", "PV de recette", olfa, "2026-03-30", "2026-04-17"),
            tache("T3.2", "2- Formation des agents du bureau d'ordre", "Support de formation", sami, "2026-04-20", "2026-04-24"),
            titre("Mise en production"),
            tache("T4.1", "1- Installation sur le serveur de production", "PV de mise en production", yassine, "2026-04-27", "2026-04-30"));

        deposer(ged, "2026-01-05 10:20")
            .avancement(100, 100, 70, 30, 0, 0, 0, 0, 0)
            .etat("L'analyse et la conception sont terminées et validées par la Direction de l'Organisation et des Méthodes. "
                + "Le développement a démarré début décembre : le module courrier arrivée est presque terminé, "
                + "le module affectation est en cours.")
            .problemes("Les scanners prévus pour le bureau d'ordre ne sont pas encore livrés par le ministère.")
            .risques("Retard de la numérisation du courrier si les scanners ne sont pas livrés avant février.")
            .recommandations("Relancer la Direction des affaires financières pour l'achat des scanners.")
            .budgetRealise(0.09)
            .enregistrer();

        deposer(ged, "2026-03-04 14:05")
            .avancement(100, 100, 100, 100, 60, 20, 0, 0, 0)
            .etat("Les modules courrier arrivée et affectation sont terminés et testés en interne. Les scanners ont été "
                + "livrés le 10 février. Le module courrier départ est à 60 %.")
            .problemes("Le correspondant de la Direction des ressources humaines n'est pas disponible pour valider le circuit de visa.")
            .risques("Recette décalée si le circuit de visa n'est pas validé avant fin mars.")
            .recommandations("Valider le circuit de visa en réunion avec le secrétaire général.")
            .budgetRealise(0.19)
            .enregistrer();

        deposer(ged, "2026-05-20 09:45")
            .avancement(100, 100, 100, 100, 100, 100, 100, 100, 100)
            .etat("Projet terminé. La recette a été validée le 8 mai et l'application est en production depuis le 18 mai "
                + "au bureau d'ordre central et dans les 6 directions. 1 450 courriers ont déjà été enregistrés.")
            .problemes("Mise en production décalée de trois semaines à cause de la migration du serveur au CNI.")
            .recommandations("Prévoir un contrat de maintenance pour 2026-2027.",
                "Étendre la GED aux directions régionales dans une deuxième phase.")
            .budgetRealise(0.31)
            .enregistrer();

        cloturer(ged, "2026-05-25 11:30", "2026-05-18", 18);

        // --- Projet en cours : 3 fiches de suivi, toutes déposées à temps ---
        p = nouveauProjet(chef, "2026-06-18 09:40");
        p.setNomProjet("e-Recrutement");
        p.setDesignationProjet("Plateforme de candidature en ligne aux concours de recrutement");
        p.setDesignationClient("Présidence du Gouvernement – Direction Générale de la Fonction Publique");
        p.setReference("CNI/DEV/2026/014");
        p.setCadreContractuelProjet("Convention CNI – Présidence du Gouvernement 2026");
        p.setCaractereProjet("national");
        p.setTypeProjet("evolution");
        p.setPresentation("Évolution de la plateforme des concours de la fonction publique : inscription en ligne, "
            + "dépôt des pièces justificatives, paiement des frais de participation et consultation des résultats.");
        p.setHistorique("La première version (2019) permet seulement de consulter les avis de concours. Les candidatures "
            + "se font encore sur papier, ce qui donne des délais de traitement de 2 à 3 mois.");
        p.setPerimetre("Concours externes de la fonction publique (catégories A et B). Espace candidat, espace "
            + "gestionnaire et publication des résultats. Le paiement en ligne passe par e-Dinar.");
        p.setMaitreOuvrage("Présidence du Gouvernement – Direction Générale de la Fonction Publique");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            sami, "Chef de projet",
            hatem, "Analyste fonctionnel",
            yassine, "Développeur back-end",
            rim, "Développeuse front-end",
            olfa, "Testeuse QA"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Analyse fonctionnelle", "CP + Analyste", "Juillet 2026", "1.5", "Cahier des charges fonctionnel"),
            new EstimationCharge("Développement", "ID", "Août – Décembre 2026", "8", "Plateforme e-Recrutement"),
            new EstimationCharge("Recette et mise en production", "CP + ID", "Janvier – Février 2027", "2", "PV de recette")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(108000, 432000));
        p.setDelaisPrevisionnels("Le délai prévisionnel du projet est de 8 mois (hors délais de validation).");
        delais(p, "2026-07-01", "2027-02-26", 8, "2026-07-01");
        p.setRisquesPotentiels("Pic de connexions lors de l'ouverture des concours. "
            + "Retard de la convention avec e-Dinar pour le paiement en ligne.");
        p.setPreRequis("Validation du cahier des charges par la DGFP. Accès de test à l'API de paiement e-Dinar. "
            + "Hébergement sur le cloud gouvernemental du CNI.");
        p.setPlanning(List.of(
            action("Analyse fonctionnelle", "CP, ID", "1.5", 1, 1),
            action("Développement de l'espace candidat", "ID", "4", 2, 4),
            action("Développement de l'espace gestionnaire", "ID", "3", 4, 6),
            action("Intégration du paiement en ligne", "ID", "1", 5, 6),
            action("Recette et mise en production", "CP, ID", "2", 7, 8)));
        p.setPeriodiciteSuiviMois(1);

        Dossier recrutement = ouvrir(p, chef);
        recrutement.objectif = "Permettre aux candidats de déposer leur dossier de concours entièrement en ligne à partir de mars 2027.";
        recrutement.experts = List.of("Leila Chaouch – experte en sécurité applicative, ANCS");
        recrutement.caracteristiques = List.of("Application web Angular et Spring Boot",
            "Hébergement sur le cloud gouvernemental du CNI", "Paiement en ligne via e-Dinar",
            "Authentification par numéro de CIN et code reçu par SMS");
        recrutement.taches = List.of(
            titre("Analyse fonctionnelle"),
            tache("T1.1", "1- Ateliers avec la DGFP", "Comptes rendus des ateliers", hatem, "2026-07-01", "2026-07-10"),
            tache("T1.2", "2- Rédaction du cahier des charges fonctionnel", "Cahier des charges v1.0", hatem, "2026-07-13", "2026-07-24"),
            tache("T1.3", "3- Validation du cahier des charges", "PV de validation", sami, "2026-07-27", "2026-07-31"),
            titre("Développement de l'espace candidat"),
            tache("T2.1", "1- Inscription et authentification des candidats", "Module inscription", yassine, "2026-08-03", "2026-08-28"),
            tache("T2.2", "2- Dépôt des dossiers et des pièces justificatives", "Module dépôt des dossiers", rim, "2026-08-17", "2026-09-25"),
            tache("T2.3", "3- Suivi de la candidature et convocations", "Module suivi", rim, "2026-09-28", "2026-10-30"),
            titre("Développement de l'espace gestionnaire"),
            tache("T3.1", "1- Tri et validation des dossiers", "Module gestionnaire", yassine, "2026-10-05", "2026-11-27"),
            tache("T3.2", "2- Publication des résultats", "Module résultats", rim, "2026-11-16", "2026-12-18"),
            titre("Intégration du paiement en ligne"),
            tache("T4.1", "1- Intégration de l'API de paiement e-Dinar", "Connecteur de paiement", yassine, "2026-11-02", "2026-12-11"),
            titre("Recette et mise en production"),
            tache("T5.1", "1- Recette fonctionnelle", "PV de recette", olfa, "2027-01-04", "2027-01-29"),
            tache("T5.2", "2- Tests de charge", "Rapport des tests de charge", olfa, "2027-02-01", "2027-02-12"),
            tache("T5.3", "3- Mise en production", "PV de mise en production", sami, "2027-02-15", "2027-02-26"));

        deposer(recrutement, "2026-07-30 16:40")
            .avancement(100, 100, 80, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            .etat("Les ateliers avec la DGFP sont terminés et le cahier des charges fonctionnel a été remis le 24 juillet. "
                + "La réunion de validation est prévue le 4 août.")
            .risques("Retard possible de la convention avec e-Dinar pour le paiement en ligne.")
            .recommandations("Lancer dès maintenant la demande d'accès à l'environnement de test e-Dinar.")
            .budgetRealise(0.05)
            .enregistrer();

        deposer(recrutement, "2026-08-31 11:15")
            .avancement(100, 100, 100, 100, 40, 0, 0, 0, 0, 0, 0, 0)
            .etat("Le cahier des charges a été validé le 4 août. Le module d'inscription est terminé. Le dépôt des dossiers "
                + "est à 40 % : la DGFP a demandé un nouveau format pour les pièces justificatives.")
            .problemes("La DGFP a changé le format des pièces justificatives après la validation du cahier des charges.")
            .risques("Retard possible de la convention avec e-Dinar pour le paiement en ligne.")
            .recommandations("Geler le périmètre fonctionnel après cette modification.",
                "Relancer la DGFP pour la signature de la convention e-Dinar.")
            .budgetRealise(0.12)
            .enregistrer();

        deposer(recrutement, "2026-09-30 15:50")
            .avancement(100, 100, 100, 100, 100, 70, 20, 0, 0, 0, 0, 0)
            .etat("L'espace candidat est presque terminé : l'inscription et le dépôt des dossiers sont livrés, le suivi de "
                + "la candidature est à 70 %. Le développement de l'espace gestionnaire a commencé avec une semaine d'avance.")
            .risques("Pic de connexions le jour de l'ouverture des concours.")
            .recommandations("Prévoir des tests de charge avec 20 000 connexions simultanées.",
                "Demander les accès de test e-Dinar (convention signée le 22 septembre).")
            .budgetRealise(0.20)
            .enregistrer();

        // --- Nouveau projet : démarré ce mois-ci, aucune fiche de suivi pour l'instant ---
        p = nouveauProjet(chef, "2026-10-08 14:22");
        p.setNomProjet("Réclamations Municipales");
        p.setDesignationProjet("Application mobile de signalement et de suivi des réclamations municipales");
        p.setDesignationClient("Ministère de l'Intérieur – Direction Générale des Collectivités Locales");
        p.setReference("CNI/DEV/2026/052");
        p.setCadreContractuelProjet("Convention en cours de signature avec la DGCL");
        p.setCaractereProjet("commune_administration");
        p.setTypeProjet("nouveau");
        p.setPresentation("Application mobile qui permet aux citoyens de signaler un problème (éclairage public, voirie, "
            + "déchets) avec une photo et la localisation, puis de suivre le traitement par la municipalité.");
        p.setPerimetre("Phase pilote sur 3 municipalités : Tunis, Ariana et La Marsa. Application Android et iOS, "
            + "back-office web pour les agents municipaux.");
        p.setMaitreOuvrage("Ministère de l'Intérieur – Direction Générale des Collectivités Locales");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            sami, "Chef de projet",
            hatem, "Analyste fonctionnel",
            rim, "Développeuse mobile",
            walid, "Administrateur base de données"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Conception UX et spécifications", "CP + Analyste", "Octobre – Novembre 2026", "2", "Maquettes et spécifications"),
            new EstimationCharge("Développement mobile et back-office", "ID", "Décembre 2026 – Avril 2027", "6", "Applications Android/iOS et back-office"),
            new EstimationCharge("Phase pilote et déploiement", "CP + ID", "Mai – Juin 2027", "2", "Rapport de la phase pilote")));
        p.setModaliteDeveloppement("CO");
        p.setEstimationBudget(budget(90000, 390000));
        p.setDelaisPrevisionnels("Le délai prévisionnel est de 9 mois, dont 2 mois de phase pilote.");
        delais(p, "2026-10-12", "2027-06-30", 9, "2026-10-12");
        p.setRisquesPotentiels("Signature tardive de la convention avec la DGCL. "
            + "Faible utilisation du back-office par les agents municipaux.");
        p.setPreRequis("Signature de la convention. Comptes développeur Google Play et App Store au nom du ministère. "
            + "Un référent désigné par municipalité.");
        p.setPlanning(List.of(
            action("Conception UX et spécifications", "CP, ID", "2", 1, 2),
            action("Développement de l'application mobile", "ID", "4", 3, 6),
            action("Développement du back-office", "ID", "2", 4, 6),
            action("Phase pilote", "CP, ID", "1.5", 7, 8),
            action("Déploiement", "CP", "0.5", 9, 9)));
        p.setPeriodiciteSuiviMois(1);
        ouvrir(p, chef);
    }

    /* ------------------------------------------------------------------ */
    /* Ines Gharbi : un ancien projet terminé, un projet avec une fiche     */
    /* à temps puis une fiche en retard, un nouveau projet                  */
    /* ------------------------------------------------------------------ */

    private void projetsInes(User chef) {
        String ines = "Ines Gharbi";
        String nour = "Nour Hamdi";
        String anis = "Anis Jaziri";
        String salma = "Salma Riahi";
        String bilel = "Bilel Toumi";

        // --- Ancien projet : site web mis en ligne fin octobre 2025 ---
        FicheProjet p = nouveauProjet(chef, "2025-01-27 10:00");
        p.setNomProjet("Site web Affaires Sociales");
        p.setDesignationProjet("Refonte du site web institutionnel du Ministère des Affaires Sociales");
        p.setDesignationClient("Ministère des Affaires Sociales");
        p.setReference("CNI/WEB/2025/008");
        p.setCadreContractuelProjet("Convention CNI – Ministère des Affaires Sociales 2025");
        p.setCaractereProjet("national");
        p.setTypeProjet("refonte");
        p.setPresentation("Refonte complète du site web du ministère : nouvelle charte graphique, version mobile, "
            + "publication des actualités et des procédures administratives, respect des règles d'accessibilité.");
        p.setHistorique("Le site actuel date de 2014. Il n'est pas adapté aux mobiles et chaque mise à jour passe par "
            + "un prestataire externe.");
        p.setPerimetre("Site public en arabe et en français, back-office de publication pour la cellule communication. "
            + "Les services en ligne (CNSS, CNRPS) ne sont pas concernés.");
        p.setMaitreOuvrage("Ministère des Affaires Sociales – Cellule de communication");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            ines, "Chef de projet",
            nour, "Développeuse full-stack",
            salma, "Analyste fonctionnelle"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Maquettes et charte graphique", "CP + Analyste", "Février – Mars 2025", "1.5", "Maquettes validées"),
            new EstimationCharge("Développement et intégration", "ID", "Avril – Juillet 2025", "4", "Site web et back-office"),
            new EstimationCharge("Reprise des contenus et mise en ligne", "CP + ID", "Août – Septembre 2025", "1.5", "Site en ligne")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(36000, 114000));
        p.setDelaisPrevisionnels("Le délai prévisionnel du projet est de 8 mois.");
        delais(p, "2025-02-03", "2025-09-30", 8, "2025-02-10");
        p.setRisquesPotentiels("Disponibilité de la cellule communication pour fournir et valider les contenus.");
        p.setPreRequis("Charte graphique validée par le cabinet du ministre. Nom de domaine et hébergement au CNI.");
        p.setPlanning(List.of(
            action("Maquettes et charte graphique", "CP, ID", "1.5", 1, 2),
            action("Développement et intégration", "ID", "4", 3, 6),
            action("Reprise des contenus", "ID", "1", 7, 7),
            action("Mise en ligne", "CP", "0.5", 8, 8)));
        p.setPeriodiciteSuiviMois(3);

        Dossier site = ouvrir(p, chef);
        site.objectif = "Mettre en ligne le nouveau site du ministère avant fin septembre 2025.";
        site.caracteristiques = List.of("CMS Drupal", "Site bilingue arabe et français",
            "Respect des règles d'accessibilité (RGAA)");
        site.taches = List.of(
            titre("Maquettes et charte graphique"),
            tache("M1", "1- Ateliers avec la cellule communication", "Comptes rendus", salma, "2025-02-10", "2025-02-21"),
            tache("M2", "2- Maquettes des pages et charte graphique", "Maquettes validées", nour, "2025-02-24", "2025-03-28"),
            titre("Développement et intégration"),
            tache("D1", "1- Intégration des pages et version mobile", "Site en préproduction", nour, "2025-04-01", "2025-06-13"),
            tache("D2", "2- Back-office de publication", "Back-office", nour, "2025-06-02", "2025-07-25"),
            tache("D3", "3- Contrôle de l'accessibilité", "Rapport d'accessibilité", salma, "2025-07-14", "2025-07-31"),
            titre("Reprise des contenus"),
            tache("C1", "1- Reprise des actualités et des procédures", "Contenus repris", salma, "2025-08-04", "2025-09-05"),
            titre("Mise en ligne"),
            tache("L1", "1- Mise en ligne et redirection de l'ancien site", "Site en ligne", ines, "2025-09-15", "2025-09-30"));

        deposer(site, "2025-05-02 11:00")
            .avancement(100, 100, 40, 0, 0, 0, 0)
            .etat("Les maquettes et la charte graphique ont été validées par le cabinet du ministre le 28 mars. "
                + "L'intégration des pages a commencé en avril.")
            .risques("Disponibilité de la cellule communication pour fournir les contenus en arabe et en français.")
            .recommandations("Fixer dès maintenant un calendrier de remise des contenus avec la cellule communication.")
            .budgetRealise(0.05)
            .enregistrer();

        deposer(site, "2025-08-01 15:30")
            .avancement(100, 100, 100, 90, 100, 10, 0)
            .etat("Le site est en préproduction et la version mobile est terminée. Le back-office de publication est à 90 %. "
                + "La reprise des contenus a commencé mais la cellule communication n'a remis qu'une partie des textes.")
            .problemes("La cellule communication n'a remis que 40 % des contenus à reprendre.")
            .risques("Report de la mise en ligne si les contenus ne sont pas remis avant fin août.")
            .recommandations("Faire une réunion par semaine avec la cellule communication jusqu'à la mise en ligne.")
            .budgetRealise(0.11)
            .enregistrer();

        deposer(site, "2025-10-29 10:15")
            .avancement(100, 100, 100, 100, 100, 100, 100)
            .etat("Le nouveau site est en ligne depuis le 24 octobre 2025 et l'ancien site redirige vers lui. "
                + "La cellule communication publie elle-même les actualités depuis le back-office.")
            .problemes("Mise en ligne décalée de trois semaines à cause du retard de remise des contenus.")
            .recommandations("Former un deuxième agent de la cellule communication au back-office.")
            .budgetRealise(0.16)
            .enregistrer();

        cloturer(site, "2025-11-03 09:20", "2025-10-24", 24);

        // --- Projet en cours : 1re fiche à temps, 2e fiche déposée avec 5 semaines de retard ---
        p = nouveauProjet(chef, "2026-04-27 11:05");
        p.setNomProjet("e-Bourse");
        p.setDesignationProjet("Dématérialisation des demandes de bourses et de prêts universitaires");
        p.setDesignationClient("Ministère de l'Enseignement Supérieur et de la Recherche Scientifique");
        p.setReference("CNI/DEV/2026/021");
        p.setCadreContractuelProjet("Convention CNI – MESRS 2026");
        p.setCaractereProjet("national");
        p.setTypeProjet("refonte");
        p.setPresentation("Refonte de l'application de gestion des bourses universitaires : les étudiants déposent leur "
            + "demande en ligne et les offices régionaux traitent les dossiers sans papier.");
        p.setHistorique("L'application actuelle date de 2012 (client lourd, base Oracle 10g). Les étudiants déposent un "
            + "dossier papier dans les offices régionaux, que les agents ressaisissent ensuite.");
        p.setPerimetre("Demandes de bourses et de prêts universitaires, traitement par les 3 offices régionaux "
            + "(Nord, Centre, Sud), liaison avec la base des inscriptions universitaires. Le paiement des bourses "
            + "n'est pas concerné.");
        p.setMaitreOuvrage("MESRS – Office des Œuvres Universitaires pour le Nord");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            ines, "Chef de projet",
            salma, "Analyste fonctionnelle",
            anis, "Développeur back-end",
            nour, "Développeuse full-stack",
            bilel, "Testeur"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Étude de l'existant et spécifications", "CP + Analyste", "Mai – Juin 2026", "2", "Spécifications fonctionnelles"),
            new EstimationCharge("Développement", "ID", "Juillet – Octobre 2026", "6", "Application e-Bourse"),
            new EstimationCharge("Reprise des données", "ID", "Septembre – Octobre 2026", "1", "Données migrées"),
            new EstimationCharge("Recette, formation et déploiement", "CP + ID", "Novembre – Décembre 2026", "2", "PV de recette, supports de formation")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(84000, 336000));
        p.setDelaisPrevisionnels("Le délai prévisionnel est de 8 mois. La mise en production doit être faite avant "
            + "l'ouverture de la campagne des bourses de janvier 2027.");
        delais(p, "2026-05-04", "2026-12-31", 8, "2026-05-11");
        p.setRisquesPotentiels("Qualité des données de l'ancienne base Oracle. "
            + "Disponibilité de l'API de la base des inscriptions universitaires.");
        p.setPreRequis("Accès en lecture à la base Oracle actuelle. Convention d'échange de données avec le bureau des "
            + "inscriptions. Un référent désigné par office régional.");
        p.setPlanning(List.of(
            action("Étude de l'existant et spécifications", "CP, ID", "2", 1, 2),
            action("Développement du portail étudiant", "ID", "3", 3, 5),
            action("Développement du back-office des offices", "ID", "3", 4, 6),
            action("Reprise des données", "ID", "1", 5, 6),
            action("Recette et déploiement", "CP, ID", "2", 7, 8)));
        p.setPeriodiciteSuiviMois(1);

        Dossier bourse = ouvrir(p, chef);
        bourse.objectif = "Ouvrir le dépôt en ligne des demandes de bourses pour la campagne de janvier 2027.";
        bourse.experts = List.of("Mourad Ayed – expert base de données Oracle");
        bourse.caracteristiques = List.of("Portail web adapté aux mobiles (Angular)", "API Spring Boot",
            "Migration des données d'Oracle 10g vers PostgreSQL", "Envoi de SMS par la passerelle de l'opérateur national");
        bourse.taches = List.of(
            titre("Étude de l'existant et spécifications"),
            tache("E1", "1- Analyse de l'application existante", "Rapport d'analyse de l'existant", salma, "2026-05-11", "2026-05-22"),
            tache("E2", "2- Rédaction des spécifications fonctionnelles", "Spécifications fonctionnelles", salma, "2026-05-25", "2026-06-19"),
            tache("E3", "3- Validation des spécifications", "PV de validation", ines, "2026-06-22", "2026-06-30"),
            titre("Développement du portail étudiant"),
            tache("D1", "1- Dépôt de la demande en ligne", "Module dépôt de la demande", nour, "2026-07-01", "2026-08-14"),
            tache("D2", "2- Suivi de la demande et notifications par SMS", "Module suivi", nour, "2026-08-17", "2026-09-25"),
            titre("Développement du back-office des offices"),
            tache("B1", "1- Instruction des dossiers", "Module instruction", anis, "2026-08-03", "2026-09-30"),
            tache("B2", "2- Commissions et décisions d'attribution", "Module décisions", anis, "2026-09-14", "2026-10-23"),
            titre("Reprise des données"),
            tache("R1", "1- Migration des dossiers 2023-2026 depuis la base Oracle", "Rapport de migration", anis, "2026-09-01", "2026-10-16"),
            titre("Recette et déploiement"),
            tache("T1", "1- Recette fonctionnelle", "PV de recette", bilel, "2026-11-02", "2026-11-27"),
            tache("T2", "2- Formation des agents des offices régionaux", "Supports de formation", ines, "2026-11-30", "2026-12-11"),
            tache("T3", "3- Mise en production", "PV de mise en production", anis, "2026-12-14", "2026-12-31"));

        deposer(bourse, "2026-06-03 09:30")
            .avancement(100, 50, 0, 0, 0, 0, 0, 0, 0, 0, 0)
            .etat("L'analyse de l'application existante est terminée. La rédaction des spécifications est à mi-parcours, "
                + "les réunions avec les trois offices régionaux ont eu lieu.")
            .problemes("L'accès à l'API de la base des inscriptions universitaires n'est pas encore accordé.")
            .risques("Qualité des données de l'ancienne base Oracle (doublons, champs vides).")
            .recommandations("Prévoir une phase de nettoyage des données avant la migration.")
            .budgetRealise(0.04)
            .enregistrer();

        deposer(bourse, "2026-08-10 17:20")
            .avancement(100, 100, 100, 40, 0, 10, 0, 0, 0, 0, 0)
            .etat("Les spécifications ont été validées le 14 juillet, avec deux semaines de retard. Le développement du "
                + "portail étudiant avance lentement : un développeur était en congé en juillet. Cette fiche est remise "
                + "en retard pour la même raison.")
            .problemes("L'accès à l'API de la base des inscriptions universitaires n'est pas encore accordé.",
                "Absence d'un développeur pendant tout le mois de juillet.")
            .risques("Mise en production après l'ouverture de la campagne des bourses de janvier 2027.",
                "Qualité des données de l'ancienne base Oracle (doublons, champs vides).")
            .recommandations("Remonter la demande d'accès à l'API au comité de pilotage.",
                "Renforcer l'équipe avec un développeur du pôle Enseignement supérieur jusqu'à décembre.")
            .budgetRealise(0.22)
            .enregistrer();

        // --- Nouveau projet : une seule fiche, déposée à temps ---
        p = nouveauProjet(chef, "2026-09-08 15:30");
        p.setNomProjet("SIGS");
        p.setDesignationProjet("Système d'information de gestion des stages des étudiants");
        p.setDesignationClient("Université de Tunis El Manar");
        p.setReference("CNI/DEV/2026/047");
        p.setCadreContractuelProjet("Bon de commande n° 2026/118 – Université de Tunis El Manar");
        p.setCaractereProjet("national");
        p.setTypeProjet("nouveau");
        p.setPresentation("Application web pour gérer les stages des étudiants : publication des offres par les "
            + "entreprises, candidature des étudiants, affectation des encadrants et dépôt des rapports de stage.");
        p.setPerimetre("Les 15 établissements de l'Université de Tunis El Manar. Stages d'été et projets de fin d'études.");
        p.setMaitreOuvrage("Université de Tunis El Manar – Direction des stages");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            ines, "Chef de projet",
            nour, "Développeuse full-stack",
            bilel, "Testeur"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Spécifications", "CP", "Septembre 2026", "1", "Spécifications fonctionnelles"),
            new EstimationCharge("Développement", "ID", "Octobre 2026 – Janvier 2027", "4", "Application SIGS"),
            new EstimationCharge("Recette et déploiement", "CP + ID", "Février – Mars 2027", "1", "PV de recette")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(42000, 138000));
        p.setDelaisPrevisionnels("Le délai prévisionnel est de 6 mois. Mise en service souhaitée avant la campagne "
            + "des stages d'été 2027.");
        delais(p, "2026-09-14", "2027-03-12", 6, "2026-09-14");
        p.setRisquesPotentiels("Beaucoup d'établissements : difficile de recueillir les besoins de chacun. "
            + "Équipe réduite (un seul développeur).");
        p.setPreRequis("Liste des référents stages par établissement. Accès à l'annuaire LDAP de l'université pour "
            + "l'authentification.");
        p.setPlanning(List.of(
            action("Spécifications fonctionnelles", "CP", "1", 1, 1),
            action("Développement de l'espace étudiant et entreprise", "ID", "2", 2, 3),
            action("Développement de l'espace encadrant et administration", "ID", "2", 4, 5),
            action("Recette et déploiement", "CP, ID", "1", 6, 6)));
        p.setPeriodiciteSuiviMois(1);

        Dossier sigs = ouvrir(p, chef);
        sigs.objectif = "Mettre SIGS en service avant la campagne des stages d'été 2027.";
        sigs.caracteristiques = List.of("Application web Angular et Spring Boot",
            "Authentification par l'annuaire LDAP de l'université");
        sigs.taches = List.of(
            titre("Spécifications fonctionnelles"),
            tache("S1", "1- Réunions avec la Direction des stages et 3 établissements", "Comptes rendus", ines, "2026-09-14", "2026-09-25"),
            tache("S2", "2- Rédaction et validation des spécifications", "Spécifications validées", ines, "2026-09-28", "2026-10-09"),
            titre("Développement de l'espace étudiant et entreprise"),
            tache("D1", "1- Publication des offres de stage", "Module offres", nour, "2026-10-12", "2026-11-06"),
            tache("D2", "2- Candidature et suivi des étudiants", "Module candidatures", nour, "2026-11-09", "2026-12-11"),
            titre("Développement de l'espace encadrant et administration"),
            tache("A1", "1- Affectation des encadrants", "Module affectation", nour, "2026-12-14", "2027-01-15"),
            tache("A2", "2- Dépôt et évaluation des rapports de stage", "Module rapports", nour, "2027-01-18", "2027-02-12"),
            titre("Recette et déploiement"),
            tache("R1", "1- Recette avec 3 établissements pilotes", "PV de recette", bilel, "2027-02-15", "2027-03-05"),
            tache("R2", "2- Mise en production", "PV de mise en production", ines, "2027-03-08", "2027-03-12"));

        deposer(sigs, "2026-10-14 10:05")
            .avancement(100, 100, 30, 0, 0, 0, 0, 0)
            .etat("Les spécifications ont été validées le 9 octobre par la Direction des stages. Le développement du "
                + "module de publication des offres a commencé le 12 octobre.")
            .risques("Un seul développeur est affecté au projet : toute absence retarde le planning.")
            .recommandations("Demander l'affectation d'un deuxième développeur à partir de décembre.")
            .budgetRealise(0.02)
            .enregistrer();
    }

    /* ------------------------------------------------------------------ */
    /* Mehdi Bouaziz : un projet suivi à temps mais hors délai, un projet   */
    /* qui n'est plus suivi depuis juin, un retard récent, un projet en     */
    /* attente                                                              */
    /* ------------------------------------------------------------------ */

    private void projetsMehdi(User chef) {
        String mehdi = "Mehdi Bouaziz";
        String fares = "Fares Mejri";
        String khaled = "Khaled Sassi";
        String marwen = "Marwen Ghanmi";
        String asma = "Asma Dridi";
        String lobna = "Lobna Zouari";

        // --- Fiches déposées à temps, mais la date de fin prévue (30/09) est dépassée ---
        FicheProjet p = nouveauProjet(chef, "2026-02-23 09:15");
        p.setNomProjet("Migration Messagerie");
        p.setDesignationProjet("Migration de la messagerie de 4 ministères vers la plateforme du CNI");
        p.setDesignationClient("Ministère des Technologies de la Communication");
        p.setReference("CNI/INF/2026/006");
        p.setCadreContractuelProjet("Convention CNI – MTC 2026");
        p.setCaractereProjet("cni");
        p.setTypeProjet("evolution");
        p.setPresentation("Migration des boîtes aux lettres de 4 ministères, depuis leurs serveurs Exchange locaux vers "
            + "la plateforme de messagerie hébergée au CNI, avec antispam et archivage.");
        p.setHistorique("Chaque ministère gère son propre serveur de messagerie. Plusieurs serveurs ne sont plus "
            + "maintenus (Exchange 2010) et ont subi des incidents de sécurité en 2025.");
        p.setPerimetre("4 ministères pilotes, environ 3 200 boîtes aux lettres. Migration des messages, calendriers et "
            + "contacts. Les postes de travail ne sont pas concernés.");
        p.setMaitreOuvrage("Ministère des Technologies de la Communication");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            mehdi, "Chef de projet",
            fares, "Administrateur systèmes",
            khaled, "Ingénieur réseaux",
            marwen, "Technicien support"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Audit et préparation", "CP + Ingénieur", "Mars – Avril 2026", "2", "Rapport d'audit et plan de migration"),
            new EstimationCharge("Migration des boîtes aux lettres", "Ingénieur systèmes", "Mai – Septembre 2026", "4", "Boîtes migrées"),
            new EstimationCharge("Accompagnement des utilisateurs", "Technicien support", "Mai – Septembre 2026", "2", "Guide utilisateur, tickets traités")));
        p.setModaliteDeveloppement("ST");
        p.setEstimationBudget(budget(60000, 560000));
        p.setDelaisPrevisionnels("Le délai prévisionnel du projet est de 7 mois.");
        delais(p, "2026-03-02", "2026-09-30", 7, "2026-03-09");
        p.setRisquesPotentiels("Perte de messages pendant la migration. Messagerie indisponible pendant les bascules. "
            + "Volume de données plus important que prévu.");
        p.setPreRequis("Accès administrateur aux serveurs Exchange des ministères. Liaison réseau sécurisée entre les "
            + "ministères et le CNI. Licences de la plateforme cible.");
        p.setPlanning(List.of(
            action("Audit des serveurs existants", "CP, ID", "1", 1, 1),
            action("Préparation de la plateforme cible", "ID", "1", 2, 2),
            action("Migration des ministères 1 et 2", "ID", "2", 3, 4),
            action("Migration des ministères 3 et 4", "ID", "2", 5, 6),
            action("Accompagnement et clôture", "CP, CMU", "1", 3, 7)));
        p.setPeriodiciteSuiviMois(3);

        Dossier messagerie = ouvrir(p, chef);
        messagerie.objectif = "Migrer les 3 200 boîtes aux lettres des 4 ministères pilotes vers la messagerie du CNI "
            + "avant fin septembre 2026.";
        messagerie.experts = List.of("Sonia Mabrouk – experte en sécurité, ANCS");
        messagerie.caracteristiques = List.of("Plateforme de messagerie hébergée au CNI",
            "Antispam et antivirus centralisés", "Archivage des messages pendant 10 ans",
            "Migration avec synchronisation des calendriers et des contacts");
        // Mehdi ne renseigne pas la colonne « Code »
        messagerie.taches = List.of(
            titre("Audit des serveurs existants"),
            tache("", "1- Inventaire des boîtes aux lettres et des volumes", "Rapport d'inventaire", fares, "2026-03-09", "2026-03-27"),
            titre("Préparation de la plateforme cible"),
            tache("", "1- Configuration des domaines, de l'antispam et de l'archivage", "Plateforme prête", khaled, "2026-03-30", "2026-04-24"),
            titre("Migration des ministères 1 et 2"),
            tache("", "1- Ministère des Technologies de la Communication (850 boîtes)", "Boîtes migrées", fares, "2026-04-27", "2026-05-22"),
            tache("", "2- Ministère du Commerce (720 boîtes)", "Boîtes migrées", fares, "2026-05-25", "2026-06-26"),
            titre("Migration des ministères 3 et 4"),
            tache("", "1- Ministère de l'Agriculture (980 boîtes)", "Boîtes migrées", fares, "2026-07-01", "2026-08-07"),
            tache("", "2- Ministère de la Jeunesse et des Sports (650 boîtes)", "Boîtes migrées", khaled, "2026-08-10", "2026-09-04"),
            titre("Accompagnement et clôture"),
            tache("", "1- Assistance aux utilisateurs après chaque bascule", "Tickets traités", marwen, "2026-05-18", "2026-09-18"),
            tache("", "2- Bilan et clôture du projet", "Rapport de clôture", mehdi, "2026-09-21", "2026-09-30"));

        deposer(messagerie, "2026-06-01 12:10")
            .avancement(100, 100, 100, 20, 0, 0, 15, 0)
            .etat("L'audit et la préparation de la plateforme sont terminés. Le Ministère des Technologies de la "
                + "Communication a basculé le 22 mai sans perte de messages. La migration du Ministère du Commerce a commencé.")
            .problemes("Le débit de la liaison réseau est insuffisant pour migrer les grosses boîtes aux lettres en journée.")
            .risques("Volume des boîtes du Ministère du Commerce plus important que dans l'inventaire.")
            .recommandations("Migrer les grosses boîtes la nuit et le week-end.")
            .budgetRealise(0.28)
            .enregistrer();

        deposer(messagerie, "2026-09-01 08:55")
            .avancement(100, 100, 100, 100, 60, 0, 50, 0)
            .etat("La migration du Ministère du Commerce s'est terminée le 17 juillet avec trois semaines de retard. Celle "
                + "du Ministère de l'Agriculture est bloquée à 60 % à cause de coupures répétées de la liaison réseau. "
                + "Le Ministère de la Jeunesse et des Sports ne pourra pas basculer avant octobre.")
            .problemes("Le débit de la liaison réseau est insuffisant pour migrer les grosses boîtes aux lettres en journée.",
                "Coupures répétées de la liaison réseau avec le Ministère de l'Agriculture.",
                "Retard de livraison des licences supplémentaires par le sous-traitant.")
            .risques("Dépassement de la date de fin prévue (30 septembre 2026).",
                "Dépassement du budget à cause des licences supplémentaires.")
            .recommandations("Demander à l'opérateur d'augmenter le débit de la liaison du Ministère de l'Agriculture.",
                "Préparer avec le MTC un avenant de délai de deux mois.")
            .budget(0.68, 0.55)
            .enregistrer();

        // --- Une seule fiche (incomplète) en juin, plus rien depuis ---
        p = nouveauProjet(chef, "2026-03-30 13:45");
        p.setNomProjet("Parc Automobile");
        p.setDesignationProjet("Application de gestion du parc automobile et de la consommation de carburant");
        p.setDesignationClient("Ministère de l'Agriculture, des Ressources Hydrauliques et de la Pêche");
        p.setReference("CNI/DEV/2026/019");
        p.setCadreContractuelProjet("Convention CNI – Ministère de l'Agriculture 2026");
        p.setCaractereProjet("commune_administration");
        p.setTypeProjet("nouveau");
        p.setPresentation("Application web pour suivre les véhicules de l'administration : affectation, ordres de "
            + "mission, bons de carburant, entretiens et sinistres.");
        p.setPerimetre("Parc central du ministère et 4 commissariats régionaux, environ 420 véhicules.");
        p.setMaitreOuvrage("Ministère de l'Agriculture – Direction des moyens généraux");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            mehdi, "Chef de projet",
            asma, "Développeuse",
            lobna, "Analyste fonctionnelle"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Spécifications", "CP + Analyste", "Avril 2026", "1", "Spécifications fonctionnelles"),
            new EstimationCharge("Développement", "ID", "Mai – Août 2026", "4", "Application de gestion du parc"),
            new EstimationCharge("Recette et déploiement", "CP + ID", "Septembre 2026", "1", "PV de recette")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(48000, 162000));
        p.setDelaisPrevisionnels("Le délai prévisionnel du projet est de 6 mois.");
        delais(p, "2026-04-06", "2026-09-30", 6, "2026-04-13");
        p.setRisquesPotentiels("Données des véhicules dispersées dans des fichiers Excel régionaux. "
            + "La développeuse est aussi affectée à un autre projet.");
        p.setPreRequis("Inventaire à jour des véhicules. Un responsable du parc désigné par commissariat régional.");
        p.setPlanning(List.of(
            action("Spécifications fonctionnelles", "CP, ID", "1", 1, 1),
            action("Gestion des véhicules et des missions", "ID", "2", 2, 4),
            action("Carburant et entretiens", "ID", "2", 4, 5),
            action("Recette et déploiement", "CP, ID", "1", 6, 6)));
        p.setPeriodiciteSuiviMois(2);

        Dossier parc = ouvrir(p, chef);
        parc.objectif = "Mettre l'application en service au parc central et dans les 4 commissariats régionaux avant fin septembre 2026.";
        parc.caracteristiques = List.of("Application web PHP Laravel", "Base de données MySQL");
        parc.taches = List.of(
            titre("Spécifications fonctionnelles"),
            tache("", "1- Recueil des besoins avec la Direction des moyens généraux", "Spécifications", lobna, "2026-04-13", "2026-05-08"),
            titre("Gestion des véhicules et des missions"),
            tache("", "1- Fiche véhicule et affectation", "Module véhicules", asma, "2026-05-11", "2026-06-12"),
            tache("", "2- Ordres de mission", "Module missions", asma, "2026-06-15", "2026-07-17"),
            titre("Carburant et entretiens"),
            tache("", "1- Bons de carburant", "Module carburant", asma, "2026-07-20", "2026-08-14"),
            tache("", "2- Entretiens et sinistres", "Module entretiens", asma, "2026-08-17", "2026-09-04"),
            titre("Recette et déploiement"),
            tache("", "1- Recette", "PV de recette", lobna, "2026-09-07", "2026-09-18"),
            tache("", "2- Déploiement dans les commissariats régionaux", "PV de déploiement", mehdi, "2026-09-21", "2026-09-30"));

        // Fiche remplie rapidement : ni recommandations ni planning actuel
        deposer(parc, "2026-06-05 18:30")
            .avancement(100, 40, 0, 0, 0, 0, 0)
            .etat("Spécifications terminées. Le module de gestion des véhicules est en cours de développement.")
            .problemes("La développeuse est aussi affectée à un autre projet : elle ne travaille que trois jours par semaine sur celui-ci.",
                "Les données des véhicules sont dans des fichiers Excel différents d'un commissariat à l'autre.")
            .risques("Retard du développement à cause de la disponibilité partielle de la développeuse.",
                "Reprise des données des véhicules plus longue que prévu.")
            .budgetRealise(0.09)
            .sansPlanningActuel()
            .enregistrer();

        // --- Deux fiches, la prochaine est attendue depuis le 7 octobre ---
        p = nouveauProjet(chef, "2026-06-29 10:30");
        p.setNomProjet("Réseau LAN Siège");
        p.setDesignationProjet("Mise à niveau du réseau local du siège du Ministère du Commerce");
        p.setDesignationClient("Ministère du Commerce et du Développement des Exportations");
        p.setReference("CNI/INF/2026/027");
        p.setCadreContractuelProjet("Convention CNI – Ministère du Commerce 2026");
        p.setCaractereProjet("national");
        p.setTypeProjet("evolution");
        p.setPresentation("Remplacement des commutateurs du réseau local du siège (7 étages), installation du Wi-Fi dans "
            + "les salles de réunion et séparation du réseau par VLAN.");
        p.setHistorique("Le câblage et les commutateurs datent de 2011. Pannes fréquentes aux 3e et 5e étages, et aucune "
            + "séparation entre le réseau des postes et celui des serveurs.");
        p.setPerimetre("Siège du ministère : 7 étages, environ 450 postes. Les directions régionales ne sont pas concernées.");
        p.setMaitreOuvrage("Ministère du Commerce – Direction de l'informatique");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            mehdi, "Chef de projet",
            khaled, "Ingénieur réseaux",
            marwen, "Technicien support"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Audit du réseau existant", "Ingénieur réseaux", "Juillet 2026", "0.5", "Rapport d'audit"),
            new EstimationCharge("Installation et configuration", "Ingénieur réseaux + technicien", "Août – Novembre 2026", "3", "Réseau opérationnel"),
            new EstimationCharge("Documentation et transfert", "CP + Ingénieur", "Décembre 2026", "0.5", "Dossier d'exploitation")));
        p.setModaliteDeveloppement("CO");
        p.setEstimationBudget(budget(30000, 350000));
        p.setDelaisPrevisionnels("Le délai prévisionnel est de 6 mois. Les travaux se font étage par étage pour ne pas "
            + "couper le service.");
        delais(p, "2026-07-06", "2026-12-31", 6, "2026-07-06");
        p.setRisquesPotentiels("Retard de livraison des équipements par le fournisseur. Coupures du réseau pendant les travaux.");
        p.setPreRequis("Réception des commutateurs et des bornes Wi-Fi (marché n° 2026/34). Planning des interventions "
            + "validé avec chaque direction.");
        p.setPlanning(List.of(
            action("Audit du réseau existant", "ID", "0.5", 1, 1),
            action("Installation des commutateurs étage par étage", "ID, CMU", "2", 2, 4),
            action("Déploiement du Wi-Fi", "ID", "0.5", 4, 5),
            action("Segmentation VLAN et sécurisation", "ID", "0.5", 5, 6),
            action("Documentation et transfert de compétences", "CP, ID", "0.5", 6, 6)));
        p.setPeriodiciteSuiviMois(1);

        Dossier reseau = ouvrir(p, chef);
        reseau.objectif = "Remplacer le réseau local du siège sans interruption de service avant fin décembre 2026.";
        reseau.caracteristiques = List.of("30 commutateurs administrables 48 ports",
            "12 bornes Wi-Fi pour les salles de réunion", "VLAN séparés : postes, serveurs, téléphonie, invités");
        reseau.taches = List.of(
            titre("Audit du réseau existant"),
            tache("", "1- Relevé des équipements et du câblage", "Rapport d'audit", khaled, "2026-07-06", "2026-07-24"),
            titre("Installation des commutateurs étage par étage"),
            tache("", "1- Réception et configuration des commutateurs", "Commutateurs configurés", khaled, "2026-07-27", "2026-08-21"),
            tache("", "2- Installation des étages 1 à 4", "Étages 1 à 4 basculés", marwen, "2026-08-24", "2026-09-25"),
            tache("", "3- Installation des étages 5 à 7", "Étages 5 à 7 basculés", marwen, "2026-09-28", "2026-10-30"),
            titre("Déploiement du Wi-Fi"),
            tache("", "1- Installation des bornes dans les salles de réunion", "12 bornes installées", marwen, "2026-10-19", "2026-11-13"),
            titre("Segmentation VLAN et sécurisation"),
            tache("", "1- Création des VLAN et des règles de filtrage", "Configuration validée", khaled, "2026-11-16", "2026-12-04"),
            titre("Documentation et transfert de compétences"),
            tache("", "1- Dossier d'exploitation et formation de l'équipe informatique", "Dossier d'exploitation", mehdi, "2026-12-07", "2026-12-31"));

        deposer(reseau, "2026-08-05 13:40")
            .avancement(100, 30, 0, 0, 0, 0, 0)
            .etat("L'audit est terminé : 30 commutateurs à remplacer et 6 baies à recâbler. 18 commutateurs sur 30 ont "
                + "été livrés, leur configuration est en cours.")
            .problemes("Livraison partielle des commutateurs : 18 reçus sur 30.")
            .risques("Retard des travaux si le reste des équipements n'est pas livré avant fin août.")
            .recommandations("Relancer le fournisseur et appliquer les pénalités de retard prévues au marché.")
            .budgetRealise(0.21)
            .enregistrer();

        deposer(reseau, "2026-09-07 10:25")
            .avancement(100, 100, 35, 0, 0, 0, 0)
            .etat("Le reste des équipements a été livré le 28 août et les 30 commutateurs sont configurés. Les étages 1 et 2 "
                + "ont basculé sur le nouveau réseau, le 3e étage est en cours.")
            .problemes("Les directions n'acceptent les coupures que le samedi, ce qui ralentit l'installation.")
            .risques("Retard de livraison des bornes Wi-Fi, prévue fin octobre.")
            .recommandations("Planifier deux étages par samedi jusqu'à fin octobre.")
            .budgetRealise(0.27)
            .enregistrer();

        // --- Projet en attente de la signature de la convention : ni fiche ni périodicité ---
        p = nouveauProjet(chef, "2026-10-19 16:10");
        p.setNomProjet("Tableau de Bord RH");
        p.setDesignationProjet("Tableau de bord décisionnel des ressources humaines de l'État");
        p.setDesignationClient("Présidence du Gouvernement – Direction Générale de la Fonction Publique");
        p.setReference("CNI/BI/2026/058");
        p.setCadreContractuelProjet("Convention en cours de discussion avec la DGFP");
        p.setCaractereProjet("commune_administration");
        p.setTypeProjet("nouveau");
        p.setStatut("EN_ATTENTE");
        p.setPresentation("Tableau de bord pour suivre les effectifs, les départs à la retraite et la masse salariale "
            + "par ministère, à partir des données du système INSAF.");
        p.setPerimetre("Données RH de tous les ministères. Indicateurs : effectifs, pyramide des âges, départs prévus, "
            + "masse salariale.");
        p.setMaitreOuvrage("Présidence du Gouvernement – Direction Générale de la Fonction Publique");
        p.setMaitreOeuvre(CNI);
        p.setEquipeProjet(equipe(
            mehdi, "Chef de projet",
            lobna, "Analyste fonctionnelle",
            asma, "Développeuse BI"));
        p.setEstimationsCharges(List.of(
            new EstimationCharge("Spécification des indicateurs", "CP + Analyste", "Novembre 2026", "1", "Liste des indicateurs validée"),
            new EstimationCharge("Développement des flux et du tableau de bord", "ID", "Décembre 2026 – Mars 2027", "4", "Tableau de bord"),
            new EstimationCharge("Recette et mise en service", "CP + ID", "Avril 2027", "1", "PV de recette")));
        p.setModaliteDeveloppement("I");
        p.setEstimationBudget(budget(30000, 120000));
        p.setDelaisPrevisionnels("Le délai prévisionnel est de 6 mois à partir de la signature de la convention.");
        delais(p, "2026-11-02", "2027-04-30", 6, null);
        p.setRisquesPotentiels("Convention en cours de discussion avec la DGFP. "
            + "L'accès aux données INSAF doit être autorisé par l'INPDP.");
        p.setPreRequis("Signature de la convention. Autorisation d'accès aux données INSAF.");
        p.setPlanning(List.of(
            action("Spécification des indicateurs", "CP, ID", "1", 1, 1),
            action("Développement des flux de données", "ID", "2", 2, 3),
            action("Développement du tableau de bord", "ID", "2", 4, 5),
            action("Recette et mise en service", "CP, ID", "1", 6, 6)));
        ouvrir(p, chef);
    }

    /* ------------------------------------------------------------------ */
    /* Saisie : ce que font les formulaires et les services de l'appli      */
    /* ------------------------------------------------------------------ */

    /** Un projet et ce que son chef reprend d'une fiche de suivi à la suivante (pré-remplissage du formulaire). */
    private static final class Dossier {
        private final FicheProjet projet;
        private final User chef;
        private String objectif;
        private List<String> experts = List.of();
        private List<String> caracteristiques = List.of();
        private List<Ligne> taches = List.of();

        private Dossier(FicheProjet projet, User chef) {
            this.projet = projet;
            this.chef = chef;
        }
    }

    /** Ligne du tableau « État d'avancement » : titre (action du planning projet) ou sous-tâche. */
    private record Ligne(boolean titre, String code, String sujet, String livrable, String assigneA,
                         String debut, String echeance) {
    }

    private static Ligne titre(String action) {
        return new Ligne(true, null, action, null, null, null, null);
    }

    private static Ligne tache(String code, String sujet, String livrable, String assigneA, String debut, String echeance) {
        return new Ligne(false, code, sujet, livrable, assigneA, debut, echeance);
    }

    /** Fiche de suivi remplie dans le formulaire, enregistrée comme le fait FicheSuiviService. */
    private final class Depot {
        private final Dossier dossier;
        private final LocalDateTime rempliLe;
        private int[] avancement = new int[0];
        private String etat;
        private List<String> problemes = List.of();
        private List<String> risques = List.of();
        private List<String> recommandations = List.of();
        private Double budgetPrevision;
        private double budgetRealise;
        private boolean avecPlanningActuel = true;

        private Depot(Dossier dossier, LocalDateTime rempliLe) {
            this.dossier = dossier;
            this.rempliLe = rempliLe;
        }

        /** Pourcentage réalisé de chaque sous-tâche, dans l'ordre du tableau (les titres n'en ont pas). */
        Depot avancement(int... pourcentages) {
            this.avancement = pourcentages;
            return this;
        }

        Depot etat(String texte) {
            this.etat = texte;
            return this;
        }

        Depot problemes(String... textes) {
            this.problemes = List.of(textes);
            return this;
        }

        Depot risques(String... textes) {
            this.risques = List.of(textes);
            return this;
        }

        Depot recommandations(String... textes) {
            this.recommandations = List.of(textes);
            return this;
        }

        /** Budget réalisé en MD, la prévision restant celle cadrée dans la fiche projet. */
        Depot budgetRealise(double realise) {
            this.budgetRealise = realise;
            return this;
        }

        /** Prévision réestimée par le chef de projet et budget réalisé, en MD. */
        Depot budget(double prevision, double realise) {
            this.budgetPrevision = prevision;
            this.budgetRealise = realise;
            return this;
        }

        Depot sansPlanningActuel() {
            this.avecPlanningActuel = false;
            return this;
        }

        FicheSuivi enregistrer() {
            FicheProjet projet = dossier.projet;
            LocalDate dateRapport = rempliLe.toLocalDate();
            List<FicheSuivi.TacheSuivi> taches = taches(dossier, avancement, dateRapport);

            FicheSuivi fiche = new FicheSuivi();
            fiche.setFicheProjetId(projet.getId());
            fiche.setNumeroRapport("Rapport_" + rempliLe.format(NUMERO_RAPPORT));
            fiche.setDateRapport(dateRapport);
            fiche.setFicheSignaletique(signaletique(dossier, budgetPrevision, budgetRealise));

            FicheSuivi.ConstatGlobal constat = fiche.getConstatGlobal();
            constat.setEtatAvancement(etat);
            constat.setObjectifPrincipal(dossier.objectif);
            constat.setProblemesRencontres(new ArrayList<>(problemes));
            constat.setPrincipauxRisques(new ArrayList<>(risques));
            constat.setRecommandations(new ArrayList<>(recommandations));

            fiche.setTachesSuivi(taches);
            if (avecPlanningActuel) {
                fiche.getPlanningActuel().setTaches(gantt(taches));
            }
            fiche.setChefProjetId(dossier.chef.getId());
            fiche.setDateCreation(rempliLe);
            fiche.setDateRemplissage(rempliLe);
            FicheSuivi enregistree = ficheSuiviRepository.save(fiche);
            nbFiches++;

            historiqueRepository.save(trace("FICHE_SUIVI", enregistree.getId(), projet.getId(), "CREATION",
                dossier.chef, rempliLe, enregistree.getNumeroRapport(), "Création de la fiche suivi"));
            notifierPilotes("FICHE_SUIVI_CREATED", nomComplet(dossier.chef) + " a créé une fiche de suivi pour le projet \""
                + projet.getNomProjet() + "\"", enregistree.getId(), "FICHE_SUIVI", dossier.chef, rempliLe);

            // Comme FicheSuiviService : la fiche suivante est attendue une périodicité plus tard
            int periodicite = projet.getPeriodiciteSuiviMois() != null ? projet.getPeriodiciteSuiviMois() : 1;
            projet.setDateDerniereFicheSuivi(dateRapport);
            projet.setDateProchaineFicheSuivi(dateRapport.plusMonths(periodicite));
            projet.setDateModification(rempliLe);
            ficheProjetRepository.save(projet);
            return enregistree;
        }
    }

    private Depot deposer(Dossier dossier, String rempliLe) {
        // Les secondes donnent un numéro de rapport réaliste (Rapport_AAAAMMJJ_HHMMSS)
        return new Depot(dossier, horodatage(rempliLe).withSecond(Math.floorMod(rempliLe.hashCode(), 60)));
    }

    private FicheProjet nouveauProjet(User chef, String creeLe) {
        LocalDateTime le = horodatage(creeLe);
        FicheProjet projet = new FicheProjet();
        projet.setChefProjetId(chef.getId());
        projet.setResponsable(nomComplet(chef));
        projet.setStatut("EN_COURS");
        projet.setCategorie("");
        projet.setHistorique("");
        projet.setDescription("");
        projet.setObjectifs("");
        projet.setDateCreation(le);
        projet.setDateDocument(le.toLocalDate());
        return projet;
    }

    /** Enregistre la fiche projet comme FicheProjetController (historique et notification des pilotes). */
    private Dossier ouvrir(FicheProjet projet, User chef) {
        // Périodicité fixée par le pilote qualité : la 1re fiche est attendue une période après le début
        if (projet.getPeriodiciteSuiviMois() != null) {
            projet.setDateDerniereFicheSuivi(projet.getDateDebut());
            projet.setDateProchaineFicheSuivi(projet.getDateDebut().plusMonths(projet.getPeriodiciteSuiviMois()));
        }
        FicheProjet enregistre = ficheProjetRepository.save(projet);
        nbProjets++;

        historiqueRepository.save(trace("FICHE_PROJET", enregistre.getId(), enregistre.getId(), "CREATION",
            chef, enregistre.getDateCreation(), enregistre.getNomProjet(), "Création de la fiche projet"));
        notifierPilotes("FICHE_PROJET_CREATED", nomComplet(chef) + " a créé la fiche de projet \""
            + enregistre.getNomProjet() + "\"", enregistre.getId(), "FICHE_PROJET", chef, enregistre.getDateCreation());
        return new Dossier(enregistre, chef);
    }

    /** Le chef passe le projet à « Terminé » et saisit la date de fin réelle dans la fiche projet. */
    private void cloturer(Dossier dossier, String le, String finRealisation, int ecartJours) {
        FicheProjet projet = dossier.projet;
        LocalDateTime quand = horodatage(le);
        Map<String, Object> avant = historiqueService.extraireValeursImportantes(projet);

        projet.setStatut("TERMINE");
        projet.setDateFinRealisation(d(finRealisation));
        projet.setEcartConventionnel(ecartJours);
        projet.setDateModification(quand);
        ficheProjetRepository.save(projet);

        HistoriqueModification modification = trace("FICHE_PROJET", projet.getId(), projet.getId(), "MODIFICATION",
            dossier.chef, quand, projet.getNomProjet(), "Modification de Statut");
        modification.setAnciennesValeurs(avant);
        modification.setNouvellesValeurs(historiqueService.extraireValeursImportantes(projet));
        historiqueRepository.save(modification);
        notifierPilotes("FICHE_PROJET_UPDATED", nomComplet(dossier.chef) + " a modifié la fiche de projet \""
            + projet.getNomProjet() + "\"", projet.getId(), "FICHE_PROJET", dossier.chef, quand);
    }

    /** Délais saisis dans le formulaire ; dateDebut et dateFinPrevue, lues par les KPI, reprennent la prévision. */
    private void delais(FicheProjet projet, String debut, String fin, int dureeEnMois, String debutRealisation) {
        projet.setDateDebutPrevision(d(debut));
        projet.setDateFinPrevision(d(fin));
        projet.setDureeEnMois(dureeEnMois);
        projet.setDateDebutRealisation(debutRealisation == null ? null : d(debutRealisation));
        projet.setDateDebut(d(debut));
        projet.setDateFinPrevue(d(fin));
    }

    /** Budget comme le calcule le formulaire : Total = CP + ID (en DT), Budget = Total / 1 000 000 (en MD). */
    private EstimationBudget budget(int cp, int id) {
        EstimationBudget budget = new EstimationBudget();
        budget.setProfils("");
        budget.setChargeParProfilHM("");
        budget.setCp(String.valueOf(cp));
        budget.setId(String.valueOf(id));
        budget.setTotal(String.valueOf(cp + id));
        budget.setBudgetMDHT(String.format(Locale.ROOT, "%.2f", (cp + id) / 1_000_000.0));
        return budget;
    }

    /** Équipe au format envoyé par le formulaire : liste JSON de {nom, role, email}. */
    private String equipe(String... nomsEtRoles) {
        List<Map<String, String>> membres = new ArrayList<>();
        for (int i = 0; i + 1 < nomsEtRoles.length; i += 2) {
            Map<String, String> membre = new LinkedHashMap<>();
            membre.put("nom", nomsEtRoles[i]);
            membre.put("role", nomsEtRoles[i + 1]);
            membre.put("email", "");
            membres.add(membre);
        }
        try {
            return objectMapper.writeValueAsString(membres);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** Action du planning projet, cochée du mois de début au mois de fin (mois 1 à 12 du projet). */
    private PlanningAction action(String action, String profils, String chargeHM, int deMois, int aMois) {
        Map<String, Boolean> mois = new LinkedHashMap<>();
        for (int m = 1; m <= 12; m++) {
            mois.put(String.valueOf(m), m >= deMois && m <= aMois);
        }
        return new PlanningAction(action, profils, chargeHM, mois);
    }

    /** Reprend les lignes du projet avec l'avancement saisi ; le statut suit ce que choisit le chef de projet. */
    private List<FicheSuivi.TacheSuivi> taches(Dossier dossier, int[] avancement, LocalDate dateRapport) {
        long nbSousTaches = dossier.taches.stream().filter(l -> !l.titre()).count();
        if (avancement.length != nbSousTaches) {
            throw new IllegalStateException(dossier.projet.getNomProjet() + " : " + nbSousTaches
                + " sous-tâches mais " + avancement.length + " pourcentages saisis");
        }
        List<String> actions = dossier.projet.getPlanning().stream().map(PlanningAction::getAction).toList();

        List<FicheSuivi.TacheSuivi> taches = new ArrayList<>();
        int i = 0;
        for (Ligne ligne : dossier.taches) {
            FicheSuivi.TacheSuivi tache = new FicheSuivi.TacheSuivi();
            tache.setSujet(ligne.sujet());
            if (ligne.titre()) {
                // Titre importé du planning de la fiche projet, avec les valeurs par défaut du formulaire
                if (!actions.contains(ligne.sujet())) {
                    throw new IllegalStateException(dossier.projet.getNomProjet() + " : « " + ligne.sujet()
                        + " » n'est pas une action du planning projet");
                }
                tache.setEstTitre(true);
                tache.setStatut(EN_COURS);
                tache.setPourcentageRealise(0);
            } else {
                int pourcentage = avancement[i++];
                LocalDate echeance = d(ligne.echeance());
                tache.setEstTitre(false);
                tache.setCode(ligne.code());
                tache.setLivrable(ligne.livrable());
                tache.setAssigneA(ligne.assigneA());
                tache.setDebut(d(ligne.debut()));
                tache.setEcheance(echeance);
                tache.setPourcentageRealise(pourcentage);
                tache.setStatut(pourcentage >= 100 ? TERMINE : echeance.isBefore(dateRapport) ? EN_RETARD : EN_COURS);
            }
            taches.add(tache);
        }
        return taches;
    }

    /** Planning actuel : une barre par action, de sa première sous-tâche à sa dernière échéance. */
    private List<FicheSuivi.TacheGantt> gantt(List<FicheSuivi.TacheSuivi> taches) {
        List<FicheSuivi.TacheGantt> barres = new ArrayList<>();
        String action = null;
        List<FicheSuivi.TacheSuivi> groupe = new ArrayList<>();
        for (FicheSuivi.TacheSuivi tache : taches) {
            if (Boolean.TRUE.equals(tache.getEstTitre())) {
                ajouterBarre(barres, action, groupe);
                action = tache.getSujet();
                groupe = new ArrayList<>();
            } else {
                groupe.add(tache);
            }
        }
        ajouterBarre(barres, action, groupe);
        return barres;
    }

    private void ajouterBarre(List<FicheSuivi.TacheGantt> barres, String action, List<FicheSuivi.TacheSuivi> groupe) {
        if (action == null || groupe.isEmpty()) {
            return;
        }
        FicheSuivi.TacheGantt barre = new FicheSuivi.TacheGantt();
        barre.setNom(action);
        barre.setDateDebut(groupe.stream().map(FicheSuivi.TacheSuivi::getDebut).min(Comparator.naturalOrder()).orElse(null));
        barre.setDateFin(groupe.stream().map(FicheSuivi.TacheSuivi::getEcheance).max(Comparator.naturalOrder()).orElse(null));
        barre.setTauxAvancement((int) Math.round(groupe.stream()
            .mapToInt(FicheSuivi.TacheSuivi::getPourcentageRealise).average().orElse(0)));
        barre.setStatut(EN_COURS); // valeur par défaut du formulaire, qui ne propose pas d'autre statut
        barres.add(barre);
    }

    /** Fiche signalétique : maîtres d'ouvrage et d'œuvre, délais et budget sont repris de la fiche projet. */
    private FicheSuivi.FicheSignaletique signaletique(Dossier dossier, Double prevision, double realise) {
        FicheProjet projet = dossier.projet;
        FicheSuivi.FicheSignaletique signaletique = new FicheSuivi.FicheSignaletique();
        signaletique.setMaitreOuvrage(projet.getMaitreOuvrage());
        signaletique.setMaitreOeuvre(projet.getMaitreOeuvre());
        signaletique.getChefProjet().setNom(dossier.chef.getUsername());
        signaletique.setExperts(new ArrayList<>(dossier.experts));
        signaletique.setDescriptionProjet(projet.getPresentation());
        signaletique.setCaracteristiquesTechniques(new ArrayList<>(dossier.caracteristiques));

        FicheSuivi.DelaisInfo delais = signaletique.getDelais();
        delais.setDateDebut(projet.getDateDebut());
        delais.setDateFin(projet.getDateFinPrevue());
        delais.setDateDebutPrevision(projet.getDateDebutPrevision());
        delais.setDateFinPrevision(projet.getDateFinPrevision());
        delais.setDureeEnMois(projet.getDureeEnMois());
        delais.setDateDebutRealisation(projet.getDateDebutRealisation());

        double prevu = prevision != null ? prevision : Double.parseDouble(projet.getEstimationBudget().getBudgetMDHT());
        FicheSuivi.FinancierInfo financier = signaletique.getFinancier();
        financier.setBudgetPrevision(prevu);
        financier.setBudgetRealisation(realise);
        financier.setEcart(Math.round((prevu - realise) * 100) / 100.0);
        return signaletique;
    }

    private HistoriqueModification trace(String entityType, String entityId, String projetId, String action,
                                         User auteur, LocalDateTime le, String entityName, String description) {
        HistoriqueModification trace = new HistoriqueModification();
        trace.setEntityType(entityType);
        trace.setEntityId(entityId);
        trace.setProjetId(projetId);
        trace.setAction(action);
        trace.setUserId(auteur.getId());
        trace.setUsername(auteur.getUsername());
        trace.setUserRole(ERole.ROLE_CHEF_PROJET.name());
        trace.setDescription(description);
        trace.setEntityName(entityName);
        trace.setDateModification(le);
        return trace;
    }

    private void notifierPilotes(String type, String message, String entityId, String entityType,
                                 User chef, LocalDateTime le) {
        // Les notifications de plus de 10 jours ont déjà été lues par les pilotes
        boolean lue = le.isBefore(LocalDateTime.now().minusDays(10));
        for (User pilote : pilotes) {
            Notification notification = new Notification(pilote.getId(), type, message, entityId, entityType,
                chef.getId(), nomComplet(chef));
            notification.setCreatedAt(le);
            notification.setRead(lue);
            notificationRepository.save(notification);
        }
    }

    private User compte(String prenom, String nom, String email, String telephone, ERole role, String creeLe) {
        Role r = roleRepository.findByName(role)
            .orElseThrow(() -> new IllegalStateException("Rôle introuvable : " + role));
        User user = new User(email.substring(0, email.indexOf('@')), email, passwordEncoder.encode(MOT_DE_PASSE));
        user.setFirstName(prenom);
        user.setLastName(nom);
        user.setPhoneNumber(telephone);
        user.setRoles(new HashSet<>(Set.of(r)));
        user.setCreatedAt(horodatage(creeLe));
        return userRepository.save(user);
    }

    /** Supprime les comptes du jeu et tout ce qui leur est rattaché (projets, fiches, historique, notifications). */
    private void supprimerDonneesDemo() {
        List<String> comptes = EMAILS_DEMO.stream().map(userRepository::findByEmail)
            .flatMap(Optional::stream).map(User::getId).toList();
        List<String> projets = mongoTemplate.find(Query.query(Criteria.where("chefProjetId").in(comptes)), FicheProjet.class)
            .stream().map(FicheProjet::getId).toList();

        mongoTemplate.remove(Query.query(Criteria.where("ficheProjetId").in(projets)), FicheSuivi.class);
        mongoTemplate.remove(Query.query(Criteria.where("id").in(projets)), FicheProjet.class);
        mongoTemplate.remove(Query.query(new Criteria().orOperator(
            Criteria.where("userId").in(comptes), Criteria.where("projetId").in(projets))), HistoriqueModification.class);
        mongoTemplate.remove(Query.query(new Criteria().orOperator(
            Criteria.where("userId").in(comptes), Criteria.where("actorId").in(comptes))), Notification.class);
        mongoTemplate.remove(Query.query(Criteria.where("id").in(comptes)), User.class);
        System.out.println("✓ Anciennes données de démonstration supprimées (" + projets.size() + " projets).");
    }

    private static boolean aLeRole(User user, ERole role) {
        return user.getRoles().stream().anyMatch(r -> r.getName() == role);
    }

    private static String nomComplet(User user) {
        return user.getFirstName() + " " + user.getLastName();
    }

    private LocalDate d(String date) {
        return LocalDate.parse(date).plusDays(decalage);
    }

    private LocalDateTime horodatage(String dateHeure) {
        return LocalDateTime.parse(dateHeure, HORODATAGE).plusDays(decalage);
    }
}
