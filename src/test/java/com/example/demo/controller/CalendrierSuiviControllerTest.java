package com.example.demo.controller;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.dto.CalendrierSuiviDTO;
import com.example.demo.dto.EcheanceSuiviDTO;
import com.example.demo.security.WebSecurityConfig;
import com.example.demo.security.jwt.AuthEntryPointJwt;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import com.example.demo.service.CalendrierSuiviService;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Le calendrier passe par la vraie chaîne de sécurité : il est réservé aux chefs de projet et à leurs propres fiches. */
@WebMvcTest(controllers = CalendrierSuiviController.class, properties = {
        "app.frontend.url=http://localhost:4200",
        "app.cors.allowed-origins=http://localhost:4200"})
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
class CalendrierSuiviControllerTest {

    private static final String CALENDRIER = "/api/chef-projet/calendrier-suivi";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CalendrierSuiviService calendrierSuiviService;
    @MockitoBean
    private JwtUtils jwtUtils;
    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    private static UserDetailsImpl compte(String id, String role) {
        return new UserDetailsImpl(id, id, id + "@qualinet.com", "", List.of(new SimpleGrantedAuthority(role)));
    }

    @Test
    void sansJetonLeCalendrierEstInaccessible() throws Exception {
        mockMvc.perform(get(CALENDRIER)).andExpect(status().isUnauthorized());
        verifyNoInteractions(calendrierSuiviService);
    }

    @Test
    void unPiloteQualiteNaPasDeCalendrierDesDepots() throws Exception {
        mockMvc.perform(get(CALENDRIER).with(user(compte("q1", "ROLE_PILOTE_QUALITE"))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(calendrierSuiviService);
    }

    @Test
    void leChefConnecteRecoitSesPropresEcheances() throws Exception {
        EcheanceSuiviDTO retard = new EcheanceSuiviDTO("p1", "Portail", LocalDate.of(2026, 10, 1),
                EcheanceSuiviDTO.Statut.EN_RETARD, -38L, 3, null, null);
        when(calendrierSuiviService.calendrierDe("c1"))
                .thenReturn(new CalendrierSuiviDTO(List.of(retard), List.of("Sans date")));

        mockMvc.perform(get(CALENDRIER).with(user(compte("c1", "ROLE_CHEF_PROJET"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.echeances[0].projetId").value("p1"))
                .andExpect(jsonPath("$.echeances[0].date").value("2026-10-01"))
                .andExpect(jsonPath("$.echeances[0].statut").value("EN_RETARD"))
                .andExpect(jsonPath("$.echeances[0].joursRestants").value(-38))
                .andExpect(jsonPath("$.projetsSansEcheance[0]").value("Sans date"));
    }
}
