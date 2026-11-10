package com.example.demo.controller;

import com.example.demo.dto.CalendrierSuiviDTO;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.CalendrierSuiviService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Calendrier des dépôts : chacun ne voit que les fiches de ses propres projets. */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/chef-projet/calendrier-suivi")
@PreAuthorize("hasRole('CHEF_PROJET') or hasRole('ADMIN')")
public class CalendrierSuiviController {

    @Autowired
    private CalendrierSuiviService calendrierSuiviService;

    @GetMapping
    public ResponseEntity<CalendrierSuiviDTO> calendrier(Authentication authentication) {
        UserDetailsImpl utilisateur = (UserDetailsImpl) authentication.getPrincipal();
        return ResponseEntity.ok(calendrierSuiviService.calendrierDe(utilisateur.getId()));
    }
}
