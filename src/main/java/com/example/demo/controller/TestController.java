package com.example.demo.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/all")
    public String allAccess() {
        return "Contenu public accessible sans authentification.";
    }

    @GetMapping("/user")
    @PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
    public String userAccess() {
        return "Contenu utilisateur authentifié.";
    }

    @GetMapping("/chef")
    @PreAuthorize("hasRole('CHEF_PROJET')")
    public String chefAccess() {
        return "Contenu Chef de Projet.";
    }

    @GetMapping("/pilote")
    @PreAuthorize("hasRole('PILOTE_QUALITE')")
    public String piloteAccess() {
        return "Contenu Pilote Qualité.";
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminAccess() {
        return "Contenu Administrateur.";
    }
}
