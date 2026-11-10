package com.example.demo.service;

import com.example.demo.dto.EquipeReunionDTO;
import com.example.demo.dto.ParticipantReunionDTO;
import com.example.demo.dto.ReunionRequest;
import com.example.demo.dto.ReunionsDTO;
import com.example.demo.model.ERole;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.Reunion;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.ReunionRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Réunions Google Meet, réunies sur une page. Le chef d'un projet y réunit son équipe et les pilotes qualité ; le pilote
 * qualité réunit des chefs de projet, sans projet rattaché. Seul celui qui a planifié une réunion l'annule. Chacun ne
 * voit que celles qu'il organise et celles où il est invité ; l'administrateur les voit toutes. Une réunion ne change
 * pas le contenu de la fiche : elle laisse une trace dans l'historique du projet mais ne touche pas à sa validation.
 * Un membre d'équipe n'a pas forcément de compte : Google le prévient alors seul.
 */
@Service
public class ReunionService {

    public static final int DUREE_MIN_MINUTES = 15;

    /** Avec un compte Google gratuit, une réunion de trois personnes ou plus est coupée à 60 minutes. */
    public static final int DUREE_MAX_MINUTES = 60;

    private static final int TITRE_MAX = 120;
    private static final int DESCRIPTION_MAX = 1000;

    private static final DateTimeFormatter DATE_HISTORIQUE = DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm");

    /** Google refuse tout l'événement si une seule adresse est invalide. */
    private static final Pattern FORMAT_EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    /** Une personne invitée ; {@code compteId} est nul pour un membre d'équipe sans compte Qualinet. */
    private record Invite(String email, String nom, String compteId) {
    }

    @Autowired
    private ReunionRepository reunionRepository;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GoogleMeetService googleMeetService;

    @Autowired
    private ControleAcces controleAcces;

    @Autowired
    private HistoriqueService historiqueService;

    @Autowired
    private UserNotificationService userNotificationService;

    public ReunionsDTO lister(Authentication authentication) {
        return etat(authentication);
    }

    /** Un chef de projet se voit proposer les pilotes qualité, en plus de son équipe ; un pilote, les chefs de projet. */
    public List<ParticipantReunionDTO> participantsPossibles(Authentication authentication) {
        boolean pilote = estPiloteQualite(authentication);
        if (!pilote && !estChefDeProjet(authentication)) {
            throw new AccessDeniedException("Seuls un chef de projet ou un pilote qualité planifient des réunions.");
        }
        List<User> utilisateurs = userRepository.findAll();
        return (pilote ? chefsDeProjet(utilisateurs) : pilotesQualite(utilisateurs)).stream()
                .map(personne -> new ParticipantReunionDTO(personne.getEmail(), personne.getUsername()))
                .sorted(Comparator.comparing(ParticipantReunionDTO::email, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /** Les adresses de l'équipe du projet, sans doublon, sans le chef, invité d'office, ni les pilotes, déjà proposés. */
    public EquipeReunionDTO equipeDuProjet(String projetId, Authentication authentication) {
        FicheProjet projet = ficheProjetRepository.findById(projetId).orElseThrow();
        verifierGestion(projet, authentication);

        Set<String> dejaProposes = new HashSet<>();
        dejaProposes.add(cle(((UserDetailsImpl) authentication.getPrincipal()).getEmail()));
        pilotesQualite(userRepository.findAll()).forEach(pilote -> dejaProposes.add(cle(pilote.getEmail())));

        List<ParticipantReunionDTO> membres = new ArrayList<>();
        int sansEmail = 0;
        for (Map<String, String> membre : lireEquipe(projet)) {
            String nom = texte(membre.get("nom"));
            String email = texte(membre.get("email"));
            if (!FORMAT_EMAIL.matcher(email).matches()) {
                if (!nom.isEmpty()) {
                    sansEmail++;
                }
            } else if (dejaProposes.add(cle(email))) {
                membres.add(new ParticipantReunionDTO(email, nom.isEmpty() ? email : nom));
            }
        }
        membres.sort(Comparator.comparing(ParticipantReunionDTO::email, String.CASE_INSENSITIVE_ORDER));
        return new EquipeReunionDTO(membres, sansEmail);
    }

    /** Le chef d'un projet réunit son équipe et les pilotes qualité. */
    public ReunionsDTO planifier(String projetId, ReunionRequest demande, Authentication authentication) {
        FicheProjet projet = ficheProjetRepository.findById(projetId).orElseThrow();
        verifierGestion(projet, authentication);
        verifierPlanificationActive();
        verifierDemande(demande, texte(demande.titre()), texte(demande.description()));

        UserDetailsImpl chef = (UserDetailsImpl) authentication.getPrincipal();
        creer(demande, projet, invitesChoisis(demande.participantEmails(), projet, chef.getEmail()), chef);
        return etat(authentication);
    }

    /** Le pilote qualité réunit des chefs de projet : il n'a pas de projet à lui, la réunion n'est rattachée à aucun. */
    public ReunionsDTO planifierSansProjet(ReunionRequest demande, Authentication authentication) {
        if (!estPiloteQualite(authentication)) {
            throw new AccessDeniedException("Seul un pilote qualité planifie une réunion sans projet.");
        }
        verifierPlanificationActive();
        verifierDemande(demande, texte(demande.titre()), texte(demande.description()));

        Map<String, Invite> autorises = new HashMap<>();
        chefsDeProjet(userRepository.findAll()).forEach(chef ->
                autorises.put(cle(chef.getEmail()), new Invite(chef.getEmail(), chef.getUsername(), chef.getId())));
        creer(demande, null, selectionner(demande.participantEmails(), autorises), (UserDetailsImpl) authentication.getPrincipal());
        return etat(authentication);
    }

    private void creer(ReunionRequest demande, FicheProjet projet, List<Invite> invites, UserDetailsImpl organisateur) {
        String titre = texte(demande.titre());
        String description = texte(demande.description());

        // L'organisateur est invité lui aussi : l'événement appartient au compte Google de la plateforme
        List<String> emails = new ArrayList<>(List.of(organisateur.getEmail()));
        invites.forEach(invite -> emails.add(invite.email()));

        GoogleMeetService.EvenementMeet evenement = googleMeetService.creer(titre,
                descriptionEvenement(projet, organisateur, description), demande.debut(), demande.dureeMinutes(), emails);

        Reunion reunion = new Reunion();
        reunion.setProjetId(projet == null ? null : projet.getId());
        reunion.setTitre(titre);
        reunion.setDescription(description);
        reunion.setDebut(demande.debut());
        reunion.setDureeMinutes(demande.dureeMinutes());
        reunion.setParticipantIds(invites.stream().map(Invite::compteId).filter(Objects::nonNull).toList());
        reunion.setParticipantNoms(invites.stream().map(Invite::nom).toList());
        reunion.setLienMeet(evenement.lienMeet());
        reunion.setEvenementGoogleId(evenement.evenementId());
        reunion.setOrganisateurId(organisateur.getId());
        reunion.setOrganisateurNom(organisateur.getUsername());
        reunion.setDateCreation(LocalDateTime.now());
        reunionRepository.save(reunion);

        tracer(projet, reunion, "PLANIFICATION_REUNION", "Réunion planifiée : " + titre, true);
        userNotificationService.createReunionNotification(reunion, nomDe(projet), true);
    }

    public ReunionsDTO annuler(String id, Authentication authentication) {
        Reunion reunion = reunionRepository.findById(id).orElseThrow();
        if (!controleAcces.estUtilisateur(reunion.getOrganisateurId(), authentication)) {
            throw new AccessDeniedException("Seul le chef de projet qui a planifié cette réunion peut l'annuler.");
        }
        FicheProjet projet = reunion.getProjetId() == null ? null
                : ficheProjetRepository.findById(reunion.getProjetId()).orElseThrow();
        if (reunion.estTerminee(LocalDateTime.now())) {
            throw new IllegalStateException("Cette réunion est terminée : elle ne peut plus être annulée.");
        }
        verifierPlanificationActive();

        googleMeetService.annuler(reunion.getEvenementGoogleId());
        reunionRepository.delete(reunion);

        tracer(projet, reunion, "ANNULATION_REUNION", "Réunion annulée : " + reunion.getTitre(), false);
        userNotificationService.createReunionNotification(reunion, nomDe(projet), false);
        return etat(authentication);
    }

    /**
     * Les réunions disparaissent avec leur projet. Celles à venir sont annulées chez Google pour prévenir les invités ;
     * un échec ne bloque pas la suppression, le projet n'existerait plus pour réessayer.
     */
    public void supprimerDuProjet(String projetId) {
        List<Reunion> reunions = reunionRepository.findByProjetIdOrderByDebutDesc(projetId);
        LocalDateTime maintenant = LocalDateTime.now();
        for (Reunion reunion : reunions) {
            if (!reunion.estTerminee(maintenant) && googleMeetService.estActif()) {
                try {
                    googleMeetService.annuler(reunion.getEvenementGoogleId());
                } catch (GoogleMeetService.Indisponible e) {
                    System.err.println("Réunion " + reunion.getId() + " non annulée chez Google : " + e.getMessage());
                }
            }
        }
        reunionRepository.deleteAll(reunions);
    }

    public void supprimerDesProjets(Collection<String> projetIds) {
        projetIds.forEach(this::supprimerDuProjet);
    }

    /** Les réunions que le lecteur peut voir, avec le nom de leur projet et ce qu'il peut en faire. */
    private ReunionsDTO etat(Authentication authentication) {
        String lecteurId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        List<Reunion> reunions = aLeRole(authentication, ERole.ROLE_ADMIN)
                ? reunionRepository.findAll(Sort.by(Sort.Direction.DESC, "debut"))
                : reunionRepository.findConcernant(lecteurId);

        Set<String> projetIds = reunions.stream().map(Reunion::getProjetId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<String, String> nomsProjets = new HashMap<>();
        ficheProjetRepository.findAllById(projetIds)
                .forEach(projet -> nomsProjets.put(projet.getId(), projet.getNomProjet()));

        LocalDateTime maintenant = LocalDateTime.now();
        for (Reunion reunion : reunions) {
            reunion.setNomProjet(nomsProjets.get(reunion.getProjetId()));
            reunion.setPeutAnnuler(lecteurId.equals(reunion.getOrganisateurId()) && !reunion.estTerminee(maintenant));
        }
        return new ReunionsDTO(reunions, estChefDeProjet(authentication) || estPiloteQualite(authentication),
                googleMeetService.estActif());
    }

    private static boolean estChefDeProjet(Authentication authentication) {
        return aLeRole(authentication, ERole.ROLE_CHEF_PROJET);
    }

    private static boolean estPiloteQualite(Authentication authentication) {
        return aLeRole(authentication, ERole.ROLE_PILOTE_QUALITE);
    }

    private static boolean aLeRole(Authentication authentication, ERole role) {
        return authentication.getAuthorities().stream().anyMatch(autorite -> role.name().equals(autorite.getAuthority()));
    }

    private void verifierGestion(FicheProjet projet, Authentication authentication) {
        if (!controleAcces.estUtilisateur(projet.getChefProjetId(), authentication)) {
            throw new AccessDeniedException("Seul le chef de ce projet peut y planifier une réunion.");
        }
    }

    private void verifierPlanificationActive() {
        if (!googleMeetService.estActif()) {
            throw new IllegalStateException("Les réunions Google Meet ne sont pas activées sur ce serveur.");
        }
    }

    private static void verifierDemande(ReunionRequest demande, String titre, String description) {
        if (titre.isEmpty()) {
            throw new IllegalArgumentException("Donnez un titre à la réunion.");
        }
        if (titre.length() > TITRE_MAX) {
            throw new IllegalArgumentException("Le titre ne doit pas dépasser " + TITRE_MAX + " caractères.");
        }
        if (description.length() > DESCRIPTION_MAX) {
            throw new IllegalArgumentException("L'ordre du jour ne doit pas dépasser " + DESCRIPTION_MAX + " caractères.");
        }
        if (demande.debut() == null || !demande.debut().isAfter(LocalDateTime.now())) {
            throw new IllegalArgumentException("Choisissez une date et une heure à venir.");
        }
        if (demande.dureeMinutes() < DUREE_MIN_MINUTES || demande.dureeMinutes() > DUREE_MAX_MINUTES) {
            throw new IllegalArgumentException("La durée doit être comprise entre " + DUREE_MIN_MINUTES
                    + " et " + DUREE_MAX_MINUTES + " minutes.");
        }
    }

    /** Le serveur garde le dernier mot : seuls les pilotes qualité et l'équipe de ce projet peuvent recevoir l'invitation. */
    private List<Invite> invitesChoisis(List<String> emails, FicheProjet projet, String emailChef) {
        List<User> utilisateurs = userRepository.findAll();
        Map<String, User> comptes = new HashMap<>();
        utilisateurs.stream().filter(compte -> compte.getEmail() != null).forEach(compte -> comptes.put(cle(compte.getEmail()), compte));

        Map<String, Invite> autorises = new HashMap<>();
        for (Map<String, String> membre : lireEquipe(projet)) {
            String email = texte(membre.get("email"));
            if (FORMAT_EMAIL.matcher(email).matches()) {
                User compte = comptes.get(cle(email));
                String nom = compte != null ? compte.getUsername() : texte(membre.get("nom"));
                autorises.putIfAbsent(cle(email), new Invite(email, nom.isEmpty() ? email : nom, compte != null ? compte.getId() : null));
            }
        }
        pilotesQualite(utilisateurs).forEach(pilote ->
                autorises.put(cle(pilote.getEmail()), new Invite(pilote.getEmail(), pilote.getUsername(), pilote.getId())));
        autorises.remove(cle(emailChef));
        return selectionner(emails, autorises);
    }

    private static List<Invite> selectionner(List<String> emails, Map<String, Invite> autorises) {
        if (emails == null || emails.isEmpty()) {
            throw new IllegalArgumentException("Choisissez au moins un participant.");
        }
        List<Invite> invites = new ArrayList<>();
        for (String email : new LinkedHashSet<>(emails.stream().map(ReunionService::cle).toList())) {
            Invite invite = autorises.get(email);
            if (invite == null) {
                throw new IllegalArgumentException("Un participant choisi ne peut pas être invité.");
            }
            invites.add(invite);
        }
        return invites;
    }

    private static List<User> pilotesQualite(List<User> utilisateurs) {
        return avecRole(utilisateurs, ERole.ROLE_PILOTE_QUALITE);
    }

    private static List<User> chefsDeProjet(List<User> utilisateurs) {
        return avecRole(utilisateurs, ERole.ROLE_CHEF_PROJET);
    }

    private static List<User> avecRole(List<User> utilisateurs, ERole role) {
        return utilisateurs.stream()
                .filter(utilisateur -> utilisateur.getEmail() != null && aLeRole(utilisateur, role))
                .toList();
    }

    /** L'équipe saisie sur la fiche projet ; un ancien texte libre n'a pas de membre exploitable. */
    private static List<Map<String, String>> lireEquipe(FicheProjet projet) {
        String equipe = projet.getEquipeProjet();
        if (equipe == null || equipe.isBlank()) {
            return List.of();
        }
        try {
            return new ObjectMapper().readValue(equipe, new TypeReference<List<Map<String, String>>>() { }).stream()
                    .filter(Objects::nonNull)
                    .toList();
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    /** Deux écritures d'une même adresse désignent la même personne. */
    private static String cle(String email) {
        return texte(email).toLowerCase(Locale.ROOT);
    }

    private static boolean aLeRole(User utilisateur, ERole role) {
        return utilisateur.getRoles().stream().anyMatch(r -> r.getName() == role);
    }

    /** Le texte de l'invitation : c'est tout ce que reçoit un participant qui n'a pas accès au projet. */
    private static String descriptionEvenement(FicheProjet projet, UserDetailsImpl organisateur, String description) {
        String contexte = projet == null
                ? "Réunion organisée par " + organisateur.getUsername()
                : "Projet : " + projet.getNomProjet() + "\nChef de projet : " + organisateur.getUsername();
        return description.isEmpty() ? contexte : contexte + "\n\n" + description;
    }

    private static String nomDe(FicheProjet projet) {
        return projet == null ? null : projet.getNomProjet();
    }

    /** L'historique est celui d'un projet : une réunion sans projet n'y figure pas. */
    private void tracer(FicheProjet projet, Reunion reunion, String action, String description, boolean ajout) {
        if (projet == null) {
            return;
        }
        Map<String, Object> valeurs = new HashMap<>();
        valeurs.put("reunion", reunion.getTitre());
        valeurs.put("date", reunion.getDebut().format(DATE_HISTORIQUE));
        valeurs.put("participants", String.join(", ", reunion.getParticipantNoms()));

        historiqueService.enregistrerAction("FICHE_PROJET", projet.getId(), reunion.getOrganisateurId(), action, description,
                ajout ? new HashMap<>() : valeurs, ajout ? valeurs : new HashMap<>(), projet.getId(), projet.getNomProjet());
    }

    private static String texte(String valeur) {
        return valeur == null ? "" : valeur.trim();
    }
}
