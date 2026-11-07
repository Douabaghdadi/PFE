package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.model.PieceJointe;
import com.example.demo.service.PieceJointeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.NoSuchElementException;
import java.util.function.Supplier;

/** Documents joints aux fiches. Les droits se décident fiche par fiche, dans {@link PieceJointeService}. */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
public class PieceJointeController {

    @Autowired
    private PieceJointeService pieceJointeService;

    @GetMapping("/fiches/{type}/{ficheId}/pieces-jointes")
    public ResponseEntity<?> lister(@PathVariable String type, @PathVariable String ficheId, Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(pieceJointeService.lister(type, ficheId, authentication)));
    }

    @PostMapping("/fiches/{type}/{ficheId}/pieces-jointes")
    public ResponseEntity<?> ajouter(@PathVariable String type, @PathVariable String ficheId,
                                     @RequestParam("fichier") MultipartFile fichier, Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(pieceJointeService.ajouter(type, ficheId, fichier, authentication)));
    }

    @DeleteMapping("/pieces-jointes/{id}")
    public ResponseEntity<?> retirer(@PathVariable String id, Authentication authentication) {
        return repondre(() -> ResponseEntity.ok(pieceJointeService.retirer(id, authentication)));
    }

    /** Toujours servi en téléchargement : un fichier déposé ne doit jamais s'exécuter dans la page d'un lecteur. */
    @GetMapping("/pieces-jointes/{id}")
    public ResponseEntity<?> telecharger(@PathVariable String id, Authentication authentication) {
        return repondre(() -> {
            PieceJointeService.Fichier fichier = pieceJointeService.ouvrir(id, authentication);
            PieceJointe piece = fichier.piece();
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(piece.getTypeMime()))
                    .contentLength(piece.getTaille())
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename(piece.getNomFichier(), StandardCharsets.UTF_8).build().toString())
                    .body(new InputStreamResource(fichier.contenu()));
        });
    }

    /** 404 si la fiche ou le document n'existe plus, 403 hors droits, 400 ou 409 avec la raison à afficher. */
    private ResponseEntity<?> repondre(Supplier<ResponseEntity<?>> action) {
        try {
            return action.get();
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new MessageResponse(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(new MessageResponse(e.getMessage()));
        }
    }
}
