package com.example.demo.config;

import com.example.demo.security.jwt.JwtUtils;
import com.example.demo.security.services.UserDetailsImpl;
import com.example.demo.security.services.UserDetailsServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Notifications internes en temps réel : STOMP au-dessus d'un WebSocket.
 * Le navigateur ouvre /ws, s'authentifie avec son jeton JWT dans la trame CONNECT
 * (un WebSocket ne peut pas envoyer d'en-tête Authorization), puis s'abonne à
 * /user/queue/notifications, une file propre à son compte.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    public static final String USER_QUEUE_NOTIFICATIONS = "/queue/notifications";

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Value("${app.cors.allowed-origins}")
    private String[] allowedOrigins;

    @Bean
    public ThreadPoolTaskScheduler webSocketHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        return scheduler;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins(allowedOrigins);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Les battements de coeur gardent la connexion ouverte à travers le proxy de l'hébergeur
        registry.enableSimpleBroker("/queue")
                .setHeartbeatValue(new long[] {10000, 10000})
                .setTaskScheduler(webSocketHeartbeatScheduler());
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                StompCommand command = accessor != null ? accessor.getCommand() : null;
                if (command == null) {
                    return message; // battement de coeur
                }

                if (StompCommand.CONNECT.equals(command)) {
                    accessor.setUser(authenticate(accessor.getFirstNativeHeader("Authorization")));
                } else if (StompCommand.SEND.equals(command)) {
                    // Le navigateur ne fait qu'écouter : le serveur est seul à publier
                    throw new MessageDeliveryException("Envoi de message non autorisé");
                } else if (StompCommand.SUBSCRIBE.equals(command)
                        && !("/user" + USER_QUEUE_NOTIFICATIONS).equals(accessor.getDestination())) {
                    throw new MessageDeliveryException("Abonnement non autorisé");
                }
                return message;
            }
        });
    }

    /**
     * Valide le jeton de la trame CONNECT. Le nom du principal est l'identifiant de l'utilisateur :
     * c'est lui qu'utilise convertAndSendToUser pour router une notification vers le bon compte.
     */
    private UsernamePasswordAuthenticationToken authenticate(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            throw new MessageDeliveryException("Jeton manquant");
        }
        String jwt = authorizationHeader.substring(7);
        if (!jwtUtils.validateJwtToken(jwt)) {
            throw new MessageDeliveryException("Jeton invalide");
        }
        try {
            UserDetailsImpl user = (UserDetailsImpl) userDetailsService
                    .loadUserByEmail(jwtUtils.getEmailFromJwtToken(jwt));
            return new UsernamePasswordAuthenticationToken(user.getId(), null, user.getAuthorities());
        } catch (Exception e) {
            throw new MessageDeliveryException("Utilisateur introuvable");
        }
    }
}
