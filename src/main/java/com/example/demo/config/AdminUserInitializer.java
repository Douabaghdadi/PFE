package com.example.demo.config;

import com.example.demo.model.ERole;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
@Order(2) // S'exécute après DataInitializer
public class AdminUserInitializer implements CommandLineRunner {

    private static final String[] COMPTES_PAR_DEFAUT = {"admin", "chefprojet", "pilote"};

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Fourni par l'environnement : aucun mot de passe n'est écrit dans le code. */
    @Value("${app.comptes-initiaux.mot-de-passe:}")
    private String motDePasseInitial;

    @Override
    public void run(String... args) throws Exception {
        boolean creationPossible = motDePasseInitial != null && !motDePasseInitial.isBlank();
        if (!creationPossible) {
            signalerComptesManquants();
        }

        // Créer un utilisateur admin par défaut s'il n'existe pas
        if (creationPossible && !userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@qualinet.com");
            admin.setPassword(passwordEncoder.encode(motDePasseInitial));

            Set<Role> roles = new HashSet<>();
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Admin Role is not found."));
            roles.add(adminRole);
            admin.setRoles(roles);

            userRepository.save(admin);
            System.out.println("✓ Utilisateur admin créé avec succès!");
            System.out.println("  Username: admin");
            System.out.println("  Email: admin@qualinet.com");
        }

        // Créer un utilisateur chef de projet par défaut s'il n'existe pas
        if (creationPossible && !userRepository.existsByUsername("chefprojet")) {
            User chefProjet = new User();
            chefProjet.setUsername("chefprojet");
            chefProjet.setEmail("chefprojet@qualinet.com");
            chefProjet.setPassword(passwordEncoder.encode(motDePasseInitial));

            Set<Role> roles = new HashSet<>();
            Role chefRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                    .orElseThrow(() -> new RuntimeException("Error: Chef Projet Role is not found."));
            roles.add(chefRole);
            chefProjet.setRoles(roles);

            userRepository.save(chefProjet);
            System.out.println("✓ Utilisateur chef de projet créé avec succès!");
            System.out.println("  Username: chefprojet");
            System.out.println("  Email: chefprojet@qualinet.com");
        }

        // Créer un utilisateur pilote qualité par défaut s'il n'existe pas
        if (creationPossible && !userRepository.existsByUsername("pilote")) {
            User pilote = new User();
            pilote.setUsername("pilote");
            pilote.setEmail("pilote@qualinet.com");
            pilote.setPassword(passwordEncoder.encode(motDePasseInitial));

            Set<Role> roles = new HashSet<>();
            Role piloteRole = roleRepository.findByName(ERole.ROLE_PILOTE_QUALITE)
                    .orElseThrow(() -> new RuntimeException("Error: Pilote Qualité Role is not found."));
            roles.add(piloteRole);
            pilote.setRoles(roles);

            userRepository.save(pilote);
            System.out.println("✓ Utilisateur pilote qualité créé avec succès!");
            System.out.println("  Username: pilote");
            System.out.println("  Email: pilote@qualinet.com");
        }

        // Les comptes par défaut créés avant le passage de QualityHub à Qualinet gardent l'ancien domaine
        for (String username : COMPTES_PAR_DEFAUT) {
            migrerEmailQualinet(username);
        }
    }

    private void signalerComptesManquants() {
        boolean manquant = Arrays.stream(COMPTES_PAR_DEFAUT).anyMatch(nom -> !userRepository.existsByUsername(nom));
        if (manquant) {
            System.out.println("⚠ Comptes par défaut non créés : définissez COMPTES_INITIAUX_MOT_DE_PASSE.");
        }
    }

    private void migrerEmailQualinet(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            String ancienEmail = user.getEmail();
            if (ancienEmail == null || !ancienEmail.endsWith("@qualityhub.com")) {
                return;
            }
            String nouvelEmail = ancienEmail.replace("@qualityhub.com", "@qualinet.com");
            if (userRepository.existsByEmail(nouvelEmail)) {
                System.out.println("⚠ Email " + nouvelEmail + " déjà utilisé : " + username + " garde " + ancienEmail);
                return;
            }
            user.setEmail(nouvelEmail);
            userRepository.save(user);
            System.out.println("✓ Email de " + username + " mis à jour : " + ancienEmail + " → " + nouvelEmail);
        });
    }
}
