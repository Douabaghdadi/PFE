package com.example.demo.config;

import com.example.demo.model.ERole;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

@Component
@Order(2) // S'exécute après DataInitializer
public class AdminUserInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Créer un utilisateur admin par défaut s'il n'existe pas
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@qualityhub.com");
            admin.setPassword(passwordEncoder.encode("admin123"));

            Set<Role> roles = new HashSet<>();
            Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                    .orElseThrow(() -> new RuntimeException("Error: Admin Role is not found."));
            roles.add(adminRole);
            admin.setRoles(roles);

            userRepository.save(admin);
            System.out.println("✓ Utilisateur admin créé avec succès!");
            System.out.println("  Username: admin");
            System.out.println("  Password: admin123");
            System.out.println("  Email: admin@qualityhub.com");
        }

        // Créer un utilisateur chef de projet par défaut s'il n'existe pas
        if (!userRepository.existsByUsername("chefprojet")) {
            User chefProjet = new User();
            chefProjet.setUsername("chefprojet");
            chefProjet.setEmail("chefprojet@qualityhub.com");
            chefProjet.setPassword(passwordEncoder.encode("chef123"));

            Set<Role> roles = new HashSet<>();
            Role chefRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                    .orElseThrow(() -> new RuntimeException("Error: Chef Projet Role is not found."));
            roles.add(chefRole);
            chefProjet.setRoles(roles);

            userRepository.save(chefProjet);
            System.out.println("✓ Utilisateur chef de projet créé avec succès!");
            System.out.println("  Username: chefprojet");
            System.out.println("  Password: chef123");
            System.out.println("  Email: chefprojet@qualityhub.com");
        }

        // Créer un utilisateur pilote qualité par défaut s'il n'existe pas
        if (!userRepository.existsByUsername("pilote")) {
            User pilote = new User();
            pilote.setUsername("pilote");
            pilote.setEmail("pilote@qualityhub.com");
            pilote.setPassword(passwordEncoder.encode("pilote123"));

            Set<Role> roles = new HashSet<>();
            Role piloteRole = roleRepository.findByName(ERole.ROLE_PILOTE_QUALITE)
                    .orElseThrow(() -> new RuntimeException("Error: Pilote Qualité Role is not found."));
            roles.add(piloteRole);
            pilote.setRoles(roles);

            userRepository.save(pilote);
            System.out.println("✓ Utilisateur pilote qualité créé avec succès!");
            System.out.println("  Username: pilote");
            System.out.println("  Password: pilote123");
            System.out.println("  Email: pilote@qualityhub.com");
        }

        // Vérifier et corriger le rôle de l'utilisateur dcuabagh s'il existe
        userRepository.findByUsername("dcuabagh").ifPresent(user -> {
            Set<Role> currentRoles = user.getRoles();
            boolean hasChefProjetRole = currentRoles.stream()
                    .anyMatch(role -> role.getName() == ERole.ROLE_CHEF_PROJET);
            
            if (!hasChefProjetRole) {
                Role chefRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                        .orElseThrow(() -> new RuntimeException("Error: Chef Projet Role is not found."));
                currentRoles.add(chefRole);
                user.setRoles(currentRoles);
                userRepository.save(user);
                System.out.println("✓ Rôle CHEF_PROJET ajouté à l'utilisateur dcuabagh!");
            }
        });
    }
}
