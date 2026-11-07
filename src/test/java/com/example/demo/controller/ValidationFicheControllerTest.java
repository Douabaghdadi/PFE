package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.security.WebSecurityConfig;
import com.example.demo.security.jwt.AuthEntryPointJwt;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import com.example.demo.service.ValidationFicheService;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Les décisions passent par la vraie chaîne de sécurité : seul le pilote qualité peut les prendre. */
@WebMvcTest(controllers = ValidationFicheController.class, properties = {
        "app.frontend.url=http://localhost:4200",
        "app.cors.allowed-origins=http://localhost:4200"})
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
class ValidationFicheControllerTest {

    private static final String VALIDER_SUIVI = "/api/pilote-qualite/fiches-suivi/s1/valider";
    private static final String CORRIGER_SUIVI = "/api/pilote-qualite/fiches-suivi/s1/demander-correction";
    private static final String VALIDER_PROJET = "/api/pilote-qualite/fiches-projet/p1/valider";
    private static final String CORRIGER_PROJET = "/api/pilote-qualite/fiches-projet/p1/demander-correction";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ValidationFicheService validationFicheService;
    @MockitoBean
    private JwtUtils jwtUtils;
    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    private static UserDetailsImpl connecte(String role) {
        return new UserDetailsImpl("u1", "u1", "u1@qualinet.com", "", List.of(new SimpleGrantedAuthority(role)));
    }

    private static String corps(String motif) {
        return "{\"motif\": \"" + motif + "\"}";
    }

    @Test
    void refuseUneDecisionSansJeton() throws Exception {
        mockMvc.perform(put(VALIDER_SUIVI)).andExpect(status().isUnauthorized());

        verifyNoInteractions(validationFicheService);
    }

    @Test
    void leChefDeProjetEtLAdministrateurNePeuventPasDecider() throws Exception {
        for (String role : List.of("ROLE_CHEF_PROJET", "ROLE_ADMIN")) {
            mockMvc.perform(put(VALIDER_SUIVI).with(user(connecte(role)))).andExpect(status().isForbidden());
            mockMvc.perform(put(VALIDER_PROJET).with(user(connecte(role)))).andExpect(status().isForbidden());
            mockMvc.perform(put(CORRIGER_SUIVI).with(user(connecte(role)))
                            .contentType(MediaType.APPLICATION_JSON).content(corps("Budget manquant")))
                    .andExpect(status().isForbidden());
        }

        verifyNoInteractions(validationFicheService);
    }

    @Test
    void lePiloteQualiteValideUneFiche() throws Exception {
        when(validationFicheService.validerFicheSuivi("s1", "u1")).thenReturn(new FicheSuivi());
        when(validationFicheService.validerFicheProjet("p1", "u1")).thenReturn(new FicheProjet());

        mockMvc.perform(put(VALIDER_SUIVI).with(user(connecte("ROLE_PILOTE_QUALITE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.validation.statut").value("A_VALIDER"));
        mockMvc.perform(put(VALIDER_PROJET).with(user(connecte("ROLE_PILOTE_QUALITE"))))
                .andExpect(status().isOk());
    }

    @Test
    void uneDemandeDeCorrectionSansMotifEstRefusee() throws Exception {
        for (String corpsVide : List.of("{}", corps("   "))) {
            mockMvc.perform(put(CORRIGER_PROJET).with(user(connecte("ROLE_PILOTE_QUALITE")))
                            .contentType(MediaType.APPLICATION_JSON).content(corpsVide))
                    .andExpect(status().isBadRequest());
        }

        verify(validationFicheService, never()).demanderCorrectionFicheProjet(any(), any(), any());
    }

    @Test
    void unMotifTropLongEstRefuse() throws Exception {
        mockMvc.perform(put(CORRIGER_SUIVI).with(user(connecte("ROLE_PILOTE_QUALITE")))
                        .contentType(MediaType.APPLICATION_JSON).content(corps("x".repeat(501))))
                .andExpect(status().isBadRequest());

        verify(validationFicheService, never()).demanderCorrectionFicheSuivi(any(), any(), any());
    }

    @Test
    void uneFicheDejaTraiteeRenvoieUnConflitAvecSonMessage() throws Exception {
        when(validationFicheService.validerFicheSuivi("s1", "u1"))
                .thenThrow(new IllegalStateException("Cette fiche n'est plus à valider."));

        mockMvc.perform(put(VALIDER_SUIVI).with(user(connecte("ROLE_PILOTE_QUALITE"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Cette fiche n'est plus à valider."));
    }

    @Test
    void uneFicheIntrouvableRenvoie404() throws Exception {
        when(validationFicheService.validerFicheProjet("p1", "u1")).thenThrow(new NoSuchElementException());

        mockMvc.perform(put(VALIDER_PROJET).with(user(connecte("ROLE_PILOTE_QUALITE"))))
                .andExpect(status().isNotFound());
    }
}
