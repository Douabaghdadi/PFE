package com.example.demo.security.jwt;

import com.example.demo.security.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class AuthTokenFilter extends OncePerRequestFilter {
    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        logger.info("🔍 AuthTokenFilter - Request: {} {}", request.getMethod(), request.getRequestURI());
        
        // Skip JWT validation for OPTIONS requests (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            logger.info("⏭️  Skipping OPTIONS request");
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String jwt = parseJwt(request);
            logger.info("🎫 JWT Token présent: {}", jwt != null);
            
            if (jwt != null) {
                logger.info("🔐 Token: {}...", jwt.substring(0, Math.min(20, jwt.length())));
                boolean isValid = jwtUtils.validateJwtToken(jwt);
                logger.info("✅ Token valide: {}", isValid);
                
                if (isValid) {
                    String username = jwtUtils.getUserNameFromJwtToken(jwt);
                    logger.info("👤 Username extrait du token: {}", username);

                    UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                    logger.info("👥 UserDetails chargé: {}, Authorities: {}", 
                        userDetails.getUsername(), 
                        userDetails.getAuthorities());
                    
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    logger.info("✅ Authentication définie dans SecurityContext");
                } else {
                    logger.warn("❌ Token invalide - authentication refusée");
                }
            } else {
                logger.warn("⚠️  Aucun token JWT trouvé dans la requête");
            }
        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'authentification: {}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        return null;
    }
}
