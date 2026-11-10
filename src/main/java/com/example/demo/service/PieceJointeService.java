package com.example.demo.service;

import com.example.demo.dto.PiecesJointesFicheDTO;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.PieceJointe;
import com.example.demo.model.StatutValidation;
import com.example.demo.model.ValidationFiche;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.PieceJointeRepository;
import com.example.demo.security.ControleAcces;
import com.example.demo.security.services.UserDetailsImpl;
import com.mongodb.client.gridfs.model.GridFSFile;
import org.bson.types.ObjectId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Supplier;

/**
 * Documents joints aux fiches. Ils se lisent comme la fiche, mais seul le chef de projet à qui elle
 * appartient les ajoute ou les retire. Ce changement porte sur le contenu de la fiche : comme une
 * modification, il annule la décision du pilote qualité, est tracé dans l'historique et lui est notifié.
 */
@Service
public class PieceJointeService {

    public static final String TYPE_FICHE_PROJET = "FICHE_PROJET";
    public static final String TYPE_FICHE_SUIVI = "FICHE_SUIVI";

    /** Plafonds fixés pour tenir dans l'espace de la base : les fichiers y sont stockés avec les données. */
    public static final long TAILLE_MAX_OCTETS = 10L * 1024 * 1024;
    public static final int NOMBRE_MAX_PAR_FICHE = 10;

    /** Formats acceptés et type renvoyé au téléchargement : celui que déclare le navigateur n'est pas fiable. */
    private static final Map<String, String> TYPES_ACCEPTES = Map.ofEntries(
            Map.entry("pdf", "application/pdf"),
            Map.entry("doc", "application/msword"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("xls", "application/vnd.ms-excel"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("ppt", "application/vnd.ms-powerpoint"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("png", "image/png"),
            Map.entry("jpg", "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"));

    @Autowired
    private PieceJointeRepository pieceJointeRepository;

    @Autowired
    private FicheProjetRepository ficheProjetRepository;

    @Autowired
    private FicheSuiviRepository ficheSuiviRepository;

    @Autowired
    private GridFsTemplate gridFsTemplate;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private ResumeDocumentService resumeDocumentService;

    @Autowired
    private ControleAcces controleAcces;

    @Autowired
    private HistoriqueService historiqueService;

    @Autowired
    private UserNotificationService userNotificationService;

    /** Le contenu d'un document, à fermer par l'appelant. */
    public record Fichier(PieceJointe piece, InputStream contenu) {
    }

    /** Ce qu'il faut savoir d'une fiche, quel que soit son type. */
    private record Fiche(String entityType, String entityId, String projetId, String entityName, String chefProjetId,
                         String nomProjet, ValidationFiche validation, Supplier<ValidationFiche> remettreAValider) {
    }

    public PiecesJointesFicheDTO lister(String type, String ficheId, Authentication authentication) {
        Fiche fiche = ficheDepuisAdresse(type, ficheId);
        verifierLecture(fiche, authentication);
        return etat(fiche, fiche.validation(), authentication);
    }

    public PiecesJointesFicheDTO ajouter(String type, String ficheId, MultipartFile fichier, Authentication authentication) {
        Fiche fiche = ficheDepuisAdresse(type, ficheId);
        verifierGestion(fiche, authentication);

        String nomFichier = nomPropre(fichier.getOriginalFilename());
        String typeMime = typeAccepte(nomFichier);
        if (fichier.isEmpty()) {
            throw new IllegalArgumentException("Ce fichier est vide.");
        }
        if (fichier.getSize() > TAILLE_MAX_OCTETS) {
            throw new IllegalArgumentException("Ce fichier dépasse la taille maximale de 10 Mo.");
        }
        if (pieceJointeRepository.countByEntityTypeAndEntityId(fiche.entityType(), fiche.entityId()) >= NOMBRE_MAX_PAR_FICHE) {
            throw new IllegalStateException("Cette fiche a déjà " + NOMBRE_MAX_PAR_FICHE
                    + " documents : retirez-en un pour en ajouter un autre.");
        }

        UserDetailsImpl utilisateur = (UserDetailsImpl) authentication.getPrincipal();
        PieceJointe piece = new PieceJointe();
        piece.setEntityType(fiche.entityType());
        piece.setEntityId(fiche.entityId());
        piece.setProjetId(fiche.projetId());
        piece.setNomFichier(nomFichier);
        piece.setTypeMime(typeMime);
        piece.setTaille(fichier.getSize());
        piece.setDeposeParId(utilisateur.getId());
        piece.setDeposeParNom(utilisateur.getUsername());
        piece.setDateDepot(LocalDateTime.now());
        piece.setFichierId(stocker(fichier, nomFichier, typeMime));
        pieceJointeRepository.save(piece);

        ValidationFiche validation = suiteChangement(fiche, "AJOUT_DOCUMENT", "Document ajouté : " + nomFichier,
                nomFichier, true, utilisateur.getId());
        return etat(fiche, validation, authentication);
    }

    public Fichier ouvrir(String id, Authentication authentication) {
        PieceJointe piece = pieceJointeRepository.findById(id).orElseThrow();
        verifierLecture(ficheDe(piece.getEntityType(), piece.getEntityId()), authentication);

        GridFSFile fichier = gridFsTemplate.findOne(requeteFichier(piece.getFichierId()));
        if (fichier == null) {
            throw new NoSuchElementException("Contenu du document introuvable");
        }
        try {
            return new Fichier(piece, gridFsTemplate.getResource(fichier).getInputStream());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /**
     * Réservé au pilote qualité : le résumé l'aide à contrôler une fiche qu'il n'a pas rédigée.
     * Un document n'est résumé qu'une fois : il ne change jamais, et chaque appel à l'IA consomme du quota.
     * Résumer revient à lire : la fiche, sa validation et son historique ne changent pas.
     * Synchronisé : un fichier encodé pèse plusieurs dizaines de Mo, sur un serveur limité à 512 Mo.
     */
    public synchronized PieceJointe resumer(String id, Authentication authentication) {
        if (!controleAcces.estPiloteQualite(authentication)) {
            throw new AccessDeniedException("Le résumé d'un document est réservé au pilote qualité.");
        }
        Fichier fichier = ouvrir(id, authentication);
        PieceJointe piece = fichier.piece();
        try (InputStream contenu = fichier.contenu()) {
            if (piece.getResume() == null) {
                piece.setResume(resumeDocumentService.resumer(piece.getNomFichier(), piece.getTypeMime(), contenu.readAllBytes()));
                // updateFirst : un save recréerait la description d'un document retiré pendant l'appel à l'IA
                mongoTemplate.updateFirst(Query.query(Criteria.where("id").is(id)),
                        Update.update("resume", piece.getResume()), PieceJointe.class);
            }
            return piece;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public PiecesJointesFicheDTO retirer(String id, Authentication authentication) {
        PieceJointe piece = pieceJointeRepository.findById(id).orElseThrow();
        Fiche fiche = ficheDe(piece.getEntityType(), piece.getEntityId());
        verifierGestion(fiche, authentication);

        effacer(piece);

        String utilisateurId = ((UserDetailsImpl) authentication.getPrincipal()).getId();
        ValidationFiche validation = suiteChangement(fiche, "RETRAIT_DOCUMENT", "Document retiré : " + piece.getNomFichier(),
                piece.getNomFichier(), false, utilisateurId);
        return etat(fiche, validation, authentication);
    }

    /** Les documents disparaissent avec leur fiche : sans elle, plus personne ne pourrait les lire ni les retirer. */
    public void supprimerDeLaFiche(String entityType, String entityId) {
        pieceJointeRepository.findByEntityTypeAndEntityIdOrderByDateDepotDesc(entityType, entityId).forEach(this::effacer);
    }

    public void supprimerDesProjets(Collection<String> projetIds) {
        pieceJointeRepository.findByProjetIdIn(projetIds).forEach(this::effacer);
    }

    private void effacer(PieceJointe piece) {
        pieceJointeRepository.delete(piece);
        gridFsTemplate.delete(requeteFichier(piece.getFichierId()));
    }

    private ValidationFiche suiteChangement(Fiche fiche, String action, String description, String nomFichier,
                                            boolean ajout, String utilisateurId) {
        StatutValidation avant = fiche.validation().getStatut();
        ValidationFiche validation = fiche.remettreAValider().get();

        Map<String, Object> anciennesValeurs = new HashMap<>();
        Map<String, Object> nouvellesValeurs = new HashMap<>();
        anciennesValeurs.put("statutValidation", avant.getLibelle());
        nouvellesValeurs.put("statutValidation", validation.getStatut().getLibelle());
        (ajout ? nouvellesValeurs : anciennesValeurs).put("document", nomFichier);

        historiqueService.enregistrerAction(fiche.entityType(), fiche.entityId(), utilisateurId, action, description,
                anciennesValeurs, nouvellesValeurs, fiche.projetId(), fiche.entityName());
        userNotificationService.createPieceJointeNotification(fiche.entityId(), fiche.entityType(), fiche.nomProjet(),
                nomFichier, ajout, utilisateurId);
        return validation;
    }

    private PiecesJointesFicheDTO etat(Fiche fiche, ValidationFiche validation, Authentication authentication) {
        List<PieceJointe> pieces = pieceJointeRepository
                .findByEntityTypeAndEntityIdOrderByDateDepotDesc(fiche.entityType(), fiche.entityId());
        return new PiecesJointesFicheDTO(pieces, controleAcces.estUtilisateur(fiche.chefProjetId(), authentication),
                controleAcces.estPiloteQualite(authentication), validation);
    }

    private void verifierLecture(Fiche fiche, Authentication authentication) {
        if (!controleAcces.peutLire(fiche.chefProjetId(), authentication)) {
            throw new AccessDeniedException("Vous n'avez pas accès aux documents de cette fiche.");
        }
    }

    private void verifierGestion(Fiche fiche, Authentication authentication) {
        if (!controleAcces.estUtilisateur(fiche.chefProjetId(), authentication)) {
            throw new AccessDeniedException("Seul le chef de projet de cette fiche peut gérer ses documents.");
        }
    }

    /** Le type vient de l'adresse de l'API, écrite comme celle des décisions de validation. */
    private Fiche ficheDepuisAdresse(String type, String ficheId) {
        return switch (type) {
            case "fiches-projet" -> ficheDe(TYPE_FICHE_PROJET, ficheId);
            case "fiches-suivi" -> ficheDe(TYPE_FICHE_SUIVI, ficheId);
            default -> throw new NoSuchElementException("Type de fiche inconnu : " + type);
        };
    }

    private Fiche ficheDe(String entityType, String ficheId) {
        return TYPE_FICHE_PROJET.equals(entityType)
                ? ficheProjet(ficheProjetRepository.findById(ficheId).orElseThrow())
                : ficheSuivi(ficheSuiviRepository.findById(ficheId).orElseThrow());
    }

    private Fiche ficheProjet(FicheProjet fiche) {
        return new Fiche(TYPE_FICHE_PROJET, fiche.getId(), fiche.getId(), fiche.getNomProjet(), fiche.getChefProjetId(),
                fiche.getNomProjet(), fiche.getValidation(), () -> {
                    fiche.getValidation().remettreAValider();
                    fiche.setDateModification(LocalDateTime.now());
                    return ficheProjetRepository.save(fiche).getValidation();
                });
    }

    private Fiche ficheSuivi(FicheSuivi fiche) {
        String nomProjet = ficheProjetRepository.findById(fiche.getFicheProjetId())
                .map(FicheProjet::getNomProjet)
                .orElse("Projet supprimé");
        return new Fiche(TYPE_FICHE_SUIVI, fiche.getId(), fiche.getFicheProjetId(), fiche.getNumeroRapport(),
                fiche.getChefProjetId(), nomProjet, fiche.getValidation(), () -> {
                    fiche.getValidation().remettreAValider();
                    fiche.setDateModification(LocalDateTime.now());
                    return ficheSuiviRepository.save(fiche).getValidation();
                });
    }

    private String stocker(MultipartFile fichier, String nomFichier, String typeMime) {
        try (InputStream contenu = fichier.getInputStream()) {
            ObjectId id = gridFsTemplate.store(contenu, nomFichier, typeMime);
            return id.toHexString();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private static Query requeteFichier(String fichierId) {
        return Query.query(Criteria.where("_id").is(new ObjectId(fichierId)));
    }

    /** Certains navigateurs envoient le chemin complet : seul le nom du fichier est conservé. */
    private static String nomPropre(String nomOriginal) {
        String nom = nomOriginal == null ? "" : nomOriginal;
        nom = nom.substring(Math.max(nom.lastIndexOf('/'), nom.lastIndexOf('\\')) + 1)
                .replaceAll("\\p{Cntrl}", "")
                .trim();
        if (nom.isEmpty()) {
            throw new IllegalArgumentException("Ce fichier n'a pas de nom.");
        }
        return nom;
    }

    private static String typeAccepte(String nomFichier) {
        int point = nomFichier.lastIndexOf('.');
        String extension = point < 0 ? "" : nomFichier.substring(point + 1).toLowerCase(Locale.ROOT);
        String typeMime = TYPES_ACCEPTES.get(extension);
        if (typeMime == null) {
            throw new IllegalArgumentException("Format refusé : joignez un PDF, un document Word, Excel ou PowerPoint, ou une image.");
        }
        return typeMime;
    }
}
