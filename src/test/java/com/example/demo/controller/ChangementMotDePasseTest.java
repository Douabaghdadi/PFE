package com.example.demo.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.model.User;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.WebSecurityConfig;
import com.example.demo.security.jwt.AuthEntryPointJwt;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import com.example.demo.service.EmailService;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

/** Le changement de mot de passe passe par la vraie chaîne de sécurité : le jeton décide de l'utilisateur. */
@WebMvcTest(controllers = AuthController.class, properties = {
        "app.frontend.url=http://localhost:4200",
        "app.cors.allowed-origins=http://localhost:4200"})
@Import({WebSecurityConfig.class, AuthEntryPointJwt.class})
class ChangementMotDePasseTest {

    private static final String CORPS = """
            {"userId": "autre-utilisateur", "currentPassword": "actuel", "newPassword": "Nouveau123"}
            """;

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private PasswordEncoder encoder;

    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private RoleRepository roleRepository;
    @MockitoBean
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @MockitoBean
    private EmailService emailService;
    @MockitoBean
    private JwtUtils jwtUtils;
    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    private static UserDetailsImpl connecte() {
        return new UserDetailsImpl("u1", "ines", "ines@qualinet.com", "",
                List.of(new SimpleGrantedAuthority("ROLE_CHEF_PROJET")));
    }

    private User compte() {
        User compte = new User("ines", "ines@qualinet.com", encoder.encode("actuel"));
        compte.setId("u1");
        return compte;
    }

    @Test
    void refuseLaDemandeSansJeton() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON).content(CORPS))
                .andExpect(status().isUnauthorized());

        verify(userRepository, never()).save(any());
    }

    @Test
    void changeLeMotDePasseDeLUtilisateurDuJetonEtNonCeluiDeLaRequete() throws Exception {
        when(userRepository.findById("u1")).thenReturn(Optional.of(compte()));

        mockMvc.perform(post("/api/auth/change-password").with(user(connecte()))
                        .contentType(MediaType.APPLICATION_JSON).content(CORPS))
                .andExpect(status().isOk());

        verify(userRepository).findById("u1");
        verify(userRepository, never()).findById("autre-utilisateur");
        verify(userRepository).save(any());
    }

    @Test
    void refuseUnMotDePasseActuelIncorrect() throws Exception {
        when(userRepository.findById("u1")).thenReturn(Optional.of(compte()));

        mockMvc.perform(post("/api/auth/change-password").with(user(connecte()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword": "faux", "newPassword": "Nouveau123"}
                                """))
                .andExpect(status().isBadRequest());

        verify(userRepository, never()).save(any());
    }
}
