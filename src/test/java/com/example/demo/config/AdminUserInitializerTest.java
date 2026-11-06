package com.example.demo.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.model.ERole;
import com.example.demo.model.Role;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

/** Les comptes par défaut ne reçoivent que le mot de passe fourni par l'environnement. */
@ExtendWith(MockitoExtension.class)
class AdminUserInitializerTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AdminUserInitializer initializer;

    @Test
    void neCreeAucunCompteSansMotDePasseFourni() throws Exception {
        ReflectionTestUtils.setField(initializer, "motDePasseInitial", "");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);

        initializer.run();

        verify(userRepository, never()).save(any());
    }

    @Test
    void creeLesTroisComptesAvecLeMotDePasseDeLEnvironnement() throws Exception {
        ReflectionTestUtils.setField(initializer, "motDePasseInitial", "valeur-de-test");
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(roleRepository.findByName(any(ERole.class)))
                .thenAnswer(appel -> Optional.of(new Role(appel.getArgument(0))));
        when(passwordEncoder.encode("valeur-de-test")).thenReturn("empreinte");

        initializer.run();

        verify(userRepository, times(3)).save(argThat(compte -> "empreinte".equals(compte.getPassword())));
    }
}
