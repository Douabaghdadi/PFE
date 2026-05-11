package com.example.demo.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class SmsService {

    @Value("${twilio.account.sid}")
    private String accountSid;

    @Value("${twilio.auth.token}")
    private String authToken;

    @Value("${twilio.phone.number}")
    private String fromPhoneNumber;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
    }

    public void sendSms(String to, String messageText) {
        try {
            Message message = Message.creator(
                new PhoneNumber(to),
                new PhoneNumber(fromPhoneNumber),
                messageText
            ).create();
            
            System.out.println("SMS envoyé avec succès à: " + to + " (SID: " + message.getSid() + ")");
        } catch (Exception e) {
            System.err.println("Erreur lors de l'envoi du SMS à " + to + ": " + e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi du SMS", e);
        }
    }

    public void sendFicheSuiviReminderSms(String to, String chefProjetName, String projetName, int joursRetard) {
        String message = String.format(
            "QualityHub - Rappel: La fiche de suivi du projet \"%s\" est en retard de %d jour(s). " +
            "Veuillez la remplir via la plateforme. Cordialement, QualityHub",
            projetName,
            joursRetard
        );
        
        sendSms(to, message);
    }
}
