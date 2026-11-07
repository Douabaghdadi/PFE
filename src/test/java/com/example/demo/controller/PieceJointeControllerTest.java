package com.example.demo.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.dto.PiecesJointesFicheDTO;
import com.example.demo.model.PieceJointe;
import com.example.demo.model.ValidationFiche;
import com.example.demo.security.WebSecurityConfig;
import com.example.demo.security.jwt.AuthEntryPointJwt;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import com.example.demo.service.PieceJointeService;
import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Les documents passent par la vraie chaîne de sécurité ; chaque refus donne le bon code et sa raison. */
@WebMvcTest(controllers = PieceJointeController.class, properties = {
        "app.frontend.url=http://localhost:4200",
        "app.cors.allowed-origins=http://localhost:4200"})
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
class PieceJointeControllerTest {

    private static final String LISTE = "/api/fiches/fiches-projet/p1/pieces-jointes";
    private static final String DOCUMENT = "/api/pieces-jointes/d1";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PieceJointeService pieceJointeService;
    @MockitoBean
    private JwtUtils jwtUtils;
    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    private static UserDetailsImpl chef() {
        return new UserDetailsImpl("c1", "chef", "chef@qualinet.com", "",
                List.of(new SimpleGrantedAuthority("ROLE_CHEF_PROJET")));
    }

    private static UserDetailsImpl pilote() {
        return new UserDetailsImpl("q1", "pilote", "pilote@qualinet.com", "",
                List.of(new SimpleGrantedAuthority("ROLE_PILOTE_QUALITE")));
    }

    private static MockMultipartFile compteRendu() {
        return new MockMultipartFile("fichier", "compte-rendu.pdf", "application/pdf", new byte[] {1, 2, 3});
    }

    @Test
    void sansJetonRienNestAccessible() throws Exception {
        mockMvc.perform(get(LISTE)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(DOCUMENT)).andExpect(status().isUnauthorized());
        mockMvc.perform(multipart(LISTE).file(compteRendu())).andExpect(status().isUnauthorized());
        verifyNoInteractions(pieceJointeService);
    }

    @Test
    void laListeDonneLesDocumentsEtLesDroitsDuLecteur() throws Exception {
        PieceJointe piece = new PieceJointe();
        piece.setNomFichier("compte-rendu.pdf");
        piece.setFichierId("identifiant-interne");
        when(pieceJointeService.lister(eq("fiches-projet"), eq("p1"), any()))
                .thenReturn(new PiecesJointesFicheDTO(List.of(piece), false, new ValidationFiche()));

        mockMvc.perform(get(LISTE).with(user(pilote())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pieces[0].nomFichier").value("compte-rendu.pdf"))
                // L'identifiant GridFS reste côté serveur : tout passe par le contrôle des droits
                .andExpect(jsonPath("$.pieces[0].fichierId").doesNotExist())
                .andExpect(jsonPath("$.peutGerer").value(false))
                .andExpect(jsonPath("$.validation.statut").value("A_VALIDER"));
    }

    @Test
    void ajouterUnDocumentPasseParLeFormulaireMultipart() throws Exception {
        when(pieceJointeService.ajouter(eq("fiches-projet"), eq("p1"), any(), any()))
                .thenReturn(new PiecesJointesFicheDTO(List.of(), true, new ValidationFiche()));

        mockMvc.perform(multipart(LISTE).file(compteRendu()).with(user(chef())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.peutGerer").value(true));
    }

    @Test
    void leTelechargementForceLenregistrementAvecLeNomDOrigine() throws Exception {
        PieceJointe piece = new PieceJointe();
        piece.setNomFichier("Procès-verbal.pdf");
        piece.setTypeMime("application/pdf");
        piece.setTaille(3);
        when(pieceJointeService.ouvrir(eq("d1"), any()))
                .thenReturn(new PieceJointeService.Fichier(piece, new ByteArrayInputStream(new byte[] {1, 2, 3})));

        mockMvc.perform(get(DOCUMENT).with(user(pilote())))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(content().bytes(new byte[] {1, 2, 3}))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("attachment")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION, containsString("UTF-8''")))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void chaqueRefusDonneSonCodeEtSaRaison() throws Exception {
        when(pieceJointeService.ajouter(eq("fiches-projet"), eq("p1"), any(), any()))
                .thenThrow(new IllegalArgumentException("Format refusé"));
        mockMvc.perform(multipart(LISTE).file(compteRendu()).with(user(chef())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Format refusé"));

        when(pieceJointeService.retirer(eq("d1"), any())).thenThrow(new AccessDeniedException("Refusé"));
        mockMvc.perform(delete(DOCUMENT).with(user(chef())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Refusé"));

        when(pieceJointeService.lister(eq("fiches-projet"), eq("p1"), any()))
                .thenThrow(new IllegalStateException("Limite atteinte"));
        mockMvc.perform(get(LISTE).with(user(chef()))).andExpect(status().isConflict());

        when(pieceJointeService.ouvrir(eq("d1"), any())).thenThrow(new NoSuchElementException());
        mockMvc.perform(get(DOCUMENT).with(user(chef()))).andExpect(status().isNotFound());
    }
}
