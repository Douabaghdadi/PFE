package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.dto.EquipeReunionDTO;
import com.example.demo.dto.ParticipantReunionDTO;
import com.example.demo.dto.ReunionsDTO;
import com.example.demo.model.Reunion;
import com.example.demo.security.WebSecurityConfig;
import com.example.demo.security.jwt.AuthEntryPointJwt;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import com.example.demo.service.GoogleMeetService;
import com.example.demo.service.ReunionService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Les réunions passent par la vraie chaîne de sécurité ; chaque refus donne le bon code et sa raison. */
@WebMvcTest(controllers = ReunionController.class, properties = {
        "app.frontend.url=http://localhost:4200",
        "app.cors.allowed-origins=http://localhost:4200"})
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
class ReunionControllerTest {

    private static final String LISTE = "/api/reunions";
    private static final String PLANIFICATION = "/api/projets/p1/reunions";
    private static final String DEMANDE = """
            {"titre":"Revue","description":"","debut":"2026-11-12T10:00","dureeMinutes":30,"participantEmails":["q@exemple.com"]}""";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ReunionService reunionService;
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

    private static MockHttpServletRequestBuilder planification() {
        return post(PLANIFICATION).contentType(MediaType.APPLICATION_JSON).content(DEMANDE);
    }

    @Test
    void sansJetonRienNestAccessible() throws Exception {
        mockMvc.perform(get(LISTE)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(LISTE + "/participants")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(PLANIFICATION + "/equipe")).andExpect(status().isUnauthorized());
        mockMvc.perform(planification()).andExpect(status().isUnauthorized());
        mockMvc.perform(post(LISTE).contentType(MediaType.APPLICATION_JSON).content(DEMANDE)).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/reunions/r1")).andExpect(status().isUnauthorized());
        verifyNoInteractions(reunionService);
    }

    @Test
    void laListeDonneLeLienMeetEtLeProjetSansLIdentifiantInterneDeGoogle() throws Exception {
        Reunion reunion = new Reunion();
        reunion.setTitre("Revue");
        reunion.setDebut(LocalDateTime.of(2026, 11, 12, 10, 0));
        reunion.setLienMeet("https://meet.google.com/abc-defg-hij");
        reunion.setEvenementGoogleId("identifiant-interne");
        reunion.setNomProjet("Atlas");
        when(reunionService.lister(any())).thenReturn(new ReunionsDTO(List.of(reunion), false, true));

        mockMvc.perform(get(LISTE).with(user(pilote())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.peutPlanifier").value(false))
                .andExpect(jsonPath("$.planificationActive").value(true))
                .andExpect(jsonPath("$.reunions[0].lienMeet").value("https://meet.google.com/abc-defg-hij"))
                .andExpect(jsonPath("$.reunions[0].nomProjet").value("Atlas"))
                .andExpect(jsonPath("$.reunions[0].peutAnnuler").value(false))
                .andExpect(jsonPath("$.reunions[0].debut").value("2026-11-12T10:00:00"))
                .andExpect(jsonPath("$.reunions[0].evenementGoogleId").doesNotExist());
    }

    @Test
    void lesParticipantsPossiblesDonnentLeurEmail() throws Exception {
        when(reunionService.participantsPossibles(any()))
                .thenReturn(List.of(new ParticipantReunionDTO("amel@exemple.com", "amel.bensalah")));

        mockMvc.perform(get(LISTE + "/participants").with(user(chef())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("amel@exemple.com"))
                .andExpect(jsonPath("$[0].nom").value("amel.bensalah"));
    }

    @Test
    void lEquipeDuProjetDonneSesEmailsEtLeNombreDeMembresSansAdresse() throws Exception {
        when(reunionService.equipeDuProjet(eq("p1"), any()))
                .thenReturn(new EquipeReunionDTO(List.of(new ParticipantReunionDTO("rim@exemple.com", "Rim Mansouri")), 2));

        mockMvc.perform(get(PLANIFICATION + "/equipe").with(user(chef())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.membres[0].email").value("rim@exemple.com"))
                .andExpect(jsonPath("$.sansEmail").value(2));
    }

    @Test
    void lHeureDuFormulaireArriveTelleQuelleAuService() throws Exception {
        when(reunionService.planifier(eq("p1"), any(), any())).thenReturn(new ReunionsDTO(List.of(), true, true));

        mockMvc.perform(planification().with(user(chef()))).andExpect(status().isOk());

        verify(reunionService).planifier(eq("p1"),
                argThat(demande -> demande.debut().equals(LocalDateTime.of(2026, 11, 12, 10, 0))
                        && demande.dureeMinutes() == 30 && demande.participantEmails().equals(List.of("q@exemple.com"))), any());
    }

    @Test
    void unPilotePlanifieUneReunionSansProjet() throws Exception {
        when(reunionService.planifierSansProjet(any(), any())).thenReturn(new ReunionsDTO(List.of(), true, true));

        mockMvc.perform(post(LISTE).contentType(MediaType.APPLICATION_JSON).content(DEMANDE).with(user(pilote())))
                .andExpect(status().isOk());

        verify(reunionService).planifierSansProjet(argThat(demande -> demande.participantEmails().equals(List.of("q@exemple.com"))), any());
    }

    @Test
    void unPiloteRecoitLaRaisonDuRefus() throws Exception {
        when(reunionService.planifier(eq("p1"), any(), any()))
                .thenThrow(new AccessDeniedException("Seul le chef de ce projet peut y planifier une réunion."));

        mockMvc.perform(planification().with(user(pilote())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Seul le chef de ce projet peut y planifier une réunion."));
    }

    @Test
    void chaqueErreurDonneSonCodeEtSaRaison() throws Exception {
        when(reunionService.planifier(eq("p1"), any(), any()))
                .thenThrow(new IllegalArgumentException("Choisissez une date et une heure à venir."));
        mockMvc.perform(planification().with(user(chef())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Choisissez une date et une heure à venir."));

        when(reunionService.annuler(eq("r1"), any()))
                .thenThrow(new IllegalStateException("Cette réunion est terminée : elle ne peut plus être annulée."));
        mockMvc.perform(delete("/api/reunions/r1").with(user(chef())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Cette réunion est terminée : elle ne peut plus être annulée."));
    }

    @Test
    void unEchecDeGoogleDonneUn503EtUnMessageLisible() throws Exception {
        when(reunionService.planifier(eq("p1"), any(), any()))
                .thenThrow(new GoogleMeetService.Indisponible("Google n'a pas pu créer la réunion. Réessayez.", null));

        mockMvc.perform(planification().with(user(chef())))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Google n'a pas pu créer la réunion. Réessayez."));
    }

    @Test
    void unProjetOuUneReunionAbsentsDonnentUn404() throws Exception {
        when(reunionService.planifier(eq("p1"), any(), any())).thenThrow(new NoSuchElementException());
        when(reunionService.annuler(eq("r1"), any())).thenThrow(new NoSuchElementException());

        mockMvc.perform(planification().with(user(chef()))).andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/reunions/r1").with(user(chef()))).andExpect(status().isNotFound());
    }
}
