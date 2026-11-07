package com.example.demo.config;

import com.example.demo.model.Notification;
import com.example.demo.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import com.example.demo.repository.UserRepository;

/**
 * L'application nomme les comptes par leur nom d'utilisateur. Les notifications enregistrées avant ce choix portent
 * encore le prénom et le nom de leur auteur : le serveur les reprend au démarrage, en n'écrivant que ces deux champs.
 * Une fois reprises, aucune notification ne correspond plus : le démarrage suivant n'écrit rien.
 */
@Component
@Order(4)
public class NomsNotificationsInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Override
    public void run(String... args) {
        int reprises = 0;
        for (User user : userRepository.findAll()) {
            if (user.getFirstName() == null || user.getLastName() == null) {
                continue;
            }
            String nomComplet = user.getFirstName() + " " + user.getLastName();
            Query deCeCompte = Query.query(Criteria.where("actorId").is(user.getId()).and("actorName").is(nomComplet));
            for (Notification notification : mongoTemplate.find(deCeCompte, Notification.class)) {
                mongoTemplate.updateFirst(Query.query(Criteria.where("id").is(notification.getId())),
                    new Update().set("actorName", user.getUsername())
                        .set("message", renommer(notification.getMessage(), nomComplet, user.getUsername())),
                    Notification.class);
                reprises++;
            }
        }
        if (reprises > 0) {
            System.out.println("✓ Nom d'utilisateur repris dans " + reprises + " notifications.");
        }
    }

    /** Le nom de l'auteur ouvre toujours le message ; le reste, dont le nom d'un projet, ne change pas. */
    static String renommer(String message, String nomComplet, String username) {
        return message != null && message.startsWith(nomComplet) ? username + message.substring(nomComplet.length()) : message;
    }
}
