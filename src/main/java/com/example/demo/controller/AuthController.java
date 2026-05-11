package com.example.demo.controller;

import com.example.demo.dto.ChangePasswordRequest;
import com.example.demo.dto.ForgotPasswordRequest;
import com.example.demo.dto.ResetPasswordRequest;
import com.example.demo.dto.JwtResponse;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.MessageResponse;
import com.example.demo.dto.SignupRequest;
import com.example.demo.model.ERole;
import com.example.demo.model.Role;
import com.example.demo.model.User;
import com.example.demo.model.PasswordResetToken;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.PasswordResetTokenRepository;
import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;
    
    @Autowired
    PasswordResetTokenRepository passwordResetTokenRepository;
    
    @Autowired
    EmailService emailService;

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toList());

        return ResponseEntity.ok(new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        User user = new User(signUpRequest.getUsername(),
                signUpRequest.getEmail(),
                encoder.encode(signUpRequest.getPassword()));

        user.setPhoneNumber(signUpRequest.getPhoneNumber());

        Set<String> strRoles = signUpRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        if (strRoles == null) {
            Role userRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                    .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
            roles.add(userRole);
        } else {
            strRoles.forEach(role -> {
                switch (role) {
                    case "admin":
                        Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(adminRole);
                        break;
                    case "pilote":
                        Role piloteRole = roleRepository.findByName(ERole.ROLE_PILOTE_QUALITE)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(piloteRole);
                        break;
                    default:
                        Role chefRole = roleRepository.findByName(ERole.ROLE_CHEF_PROJET)
                                .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                        roles.add(chefRole);
                }
            });
        }

        user.setRoles(roles);
        userRepository.save(user);

        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
        try {
            User user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (!encoder.matches(request.getCurrentPassword(), user.getPassword())) {
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("Le mot de passe actuel est incorrect"));
            }

            user.setPassword(encoder.encode(request.getNewPassword()));
            userRepository.save(user);

            return ResponseEntity.ok(new MessageResponse("Mot de passe changé avec succès"));
        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Erreur lors du changement de mot de passe: " + e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        System.out.println("🔍 Début de la méthode forgotPassword");
        System.out.println("🔍 Request reçue: " + request);
        System.out.println("🔍 Email du request: " + (request != null ? request.getEmail() : "null"));
        
        try {
            if (request == null || request.getEmail() == null || request.getEmail().isEmpty()) {
                System.err.println("❌ Email vide ou null");
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("L'email est requis"));
            }
            
            System.out.println("📧 Demande de réinitialisation pour: " + request.getEmail());
            
            User user = userRepository.findByEmail(request.getEmail())
                    .orElseThrow(() -> new RuntimeException("Aucun compte n'est associé à cet email"));

            System.out.println("✅ Utilisateur trouvé: " + user.getUsername());

            // Générer un token unique
            String token = UUID.randomUUID().toString();
            System.out.println("🔑 Token généré: " + token);
            
            // Créer le token avec une expiration de 1 heure
            PasswordResetToken resetToken = new PasswordResetToken(
                token,
                user.getId(),
                LocalDateTime.now().plusHours(1)
            );
            passwordResetTokenRepository.save(resetToken);
            System.out.println("💾 Token sauvegardé dans la base de données");

            // Créer le lien de réinitialisation
            String resetLink = "http://localhost:4200/reset-password?token=" + token;

            // Envoyer l'email
            String subject = "Réinitialisation de votre mot de passe - QualityHub";
            String body = "<html><body style='font-family: Arial, sans-serif;'>" +
                    "<div style='max-width: 600px; margin: 0 auto; padding: 20px;'>" +
                    "<div style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;'>" +
                    "<h1 style='color: white; margin: 0;'>QualityHub</h1>" +
                    "</div>" +
                    "<div style='background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;'>" +
                    "<h2 style='color: #111827; margin-top: 0;'>Réinitialisation de mot de passe</h2>" +
                    "<p style='color: #6b7280; line-height: 1.6;'>Bonjour <strong>" + user.getUsername() + "</strong>,</p>" +
                    "<p style='color: #6b7280; line-height: 1.6;'>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>" +
                    "<div style='text-align: center; margin: 30px 0;'>" +
                    "<a href='" + resetLink + "' style='background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;'>Réinitialiser mon mot de passe</a>" +
                    "</div>" +
                    "<p style='color: #6b7280; line-height: 1.6; font-size: 14px;'>Ce lien expirera dans 1 heure.</p>" +
                    "<p style='color: #6b7280; line-height: 1.6; font-size: 14px;'>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.</p>" +
                    "<hr style='border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;'>" +
                    "<p style='color: #9ca3af; font-size: 12px; text-align: center;'>© 2024 QualityHub. Tous droits réservés.</p>" +
                    "</div>" +
                    "</div>" +
                    "</body></html>";

            emailService.sendEmail(user.getEmail(), subject, body);
            System.out.println("✅ Email envoyé avec succès");
            
            return ResponseEntity.ok(new MessageResponse("Un email de réinitialisation a été envoyé à votre adresse"));
        } catch (Exception e) {
            System.err.println("❌ Erreur: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        try {
            // Vérifier le token
            PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                    .orElseThrow(() -> new RuntimeException("Token invalide"));

            // Vérifier si le token est expiré
            if (resetToken.isExpired()) {
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("Le lien de réinitialisation a expiré"));
            }

            // Vérifier si le token a déjà été utilisé
            if (resetToken.isUsed()) {
                return ResponseEntity
                        .badRequest()
                        .body(new MessageResponse("Ce lien a déjà été utilisé"));
            }

            // Récupérer l'utilisateur
            User user = userRepository.findById(resetToken.getUserId())
                    .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));

            // Mettre à jour le mot de passe
            user.setPassword(encoder.encode(request.getNewPassword()));
            userRepository.save(user);

            // Marquer le token comme utilisé
            resetToken.setUsed(true);
            passwordResetTokenRepository.save(resetToken);

            return ResponseEntity.ok(new MessageResponse("Votre mot de passe a été réinitialisé avec succès"));
        } catch (Exception e) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse(e.getMessage()));
        }
    }
}
