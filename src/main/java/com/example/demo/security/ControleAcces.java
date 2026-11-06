package com.example.demo.security;

import com.example.demo.security.services.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

/**
 * Droits de lecture sur les fiches : le rôle ouvre l'accès à l'API, mais un chef de projet
 * ne lit que ce qui lui appartient.
 */
@Component
public class ControleAcces {

    /** Le pilote qualité et l'administrateur supervisent tous les projets. */
    public boolean estSuperviseur(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(role -> role.equals("ROLE_ADMIN") || role.equals("ROLE_PILOTE_QUALITE"));
    }

    public boolean estUtilisateur(String userId, Authentication authentication) {
        UserDetailsImpl utilisateur = (UserDetailsImpl) authentication.getPrincipal();
        return utilisateur.getId().equals(userId);
    }

    /** Une fiche se lit par un superviseur ou par le chef de projet à qui elle appartient. */
    public boolean peutLire(String chefProjetId, Authentication authentication) {
        return estSuperviseur(authentication) || estUtilisateur(chefProjetId, authentication);
    }
}
