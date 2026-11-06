package com.example.demo.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserController controller;

    @Test
    void leProfilMisAJourNeRenvoiePasLeMotDePasse() throws Exception {
        User user = new User("ines", "ines@qualinet.com", "$2a$10$empreinteDuMotDePasse");
        user.setId("u1");
        when(userRepository.findById("u1")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        MockMvcBuilders.standaloneSetup(controller).build()
                .perform(put("/api/users/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"id": "u1", "username": "ines", "email": "ines@qualinet.com", "phoneNumber": "+216 20 000 000"}
                                """))
                .andExpect(status().isOk())
                // La page de modification du profil relit ces trois champs pour mettre à jour la session
                .andExpect(jsonPath("$.username").value("ines"))
                .andExpect(jsonPath("$.email").value("ines@qualinet.com"))
                .andExpect(jsonPath("$.phoneNumber").value("+216 20 000 000"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }
}
