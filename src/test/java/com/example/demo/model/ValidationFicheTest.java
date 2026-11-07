package com.example.demo.model;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.convert.NoOpDbRefResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

/** Les règles de la validation, communes aux fiches projet et aux fiches de suivi. */
class ValidationFicheTest {

    private static ValidationFiche aCorriger() {
        ValidationFiche validation = new ValidationFiche();
        validation.demanderCorrection("Budget manquant", "p1", "Amel Ben Salah");
        return validation;
    }

    @Test
    void uneNouvelleFicheAttendLaDecisionDuPilote() {
        assertEquals(StatutValidation.A_VALIDER, new FicheSuivi().getValidation().getStatut());
        assertEquals(StatutValidation.A_VALIDER, new FicheProjet().getValidation().getStatut());
    }

    @Test
    void uneFicheEnregistreeAvantLaFonctionnaliteSeLitAValider() {
        // Même configuration que Spring Data, sans base : les dates restent des types simples
        MongoCustomConversions conversions = new MongoCustomConversions(List.of());
        MongoMappingContext contexte = new MongoMappingContext();
        contexte.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
        contexte.afterPropertiesSet();
        MappingMongoConverter convertisseur = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, contexte);
        convertisseur.setCustomConversions(conversions);
        convertisseur.afterPropertiesSet();

        FicheSuivi suivi = convertisseur.read(FicheSuivi.class, new Document("_id", "s1").append("numeroRapport", "R1"));
        FicheProjet projet = convertisseur.read(FicheProjet.class, new Document("_id", "p1").append("nomProjet", "P1"));

        assertEquals(StatutValidation.A_VALIDER, suivi.getValidation().getStatut());
        assertEquals(StatutValidation.A_VALIDER, projet.getValidation().getStatut());
    }

    @Test
    void validerEnregistreLeDecideurEtLaDate() {
        ValidationFiche validation = new ValidationFiche();

        validation.valider("p1", "Amel Ben Salah");

        assertEquals(StatutValidation.VALIDEE, validation.getStatut());
        assertEquals("p1", validation.getPiloteId());
        assertEquals("Amel Ben Salah", validation.getPiloteNom());
        assertNotNull(validation.getDateDecision());
    }

    @Test
    void uneFicheDejaValideeOuACorrigerNePeutPasEtreValidee() {
        ValidationFiche validee = new ValidationFiche();
        validee.valider("p1", "Amel Ben Salah");

        assertThrows(IllegalStateException.class, () -> validee.valider("p2", "Karim Jlassi"));
        assertThrows(IllegalStateException.class, () -> aCorriger().valider("p2", "Karim Jlassi"));
    }

    @Test
    void uneCorrectionPeutEtreDemandeeSurUneFicheDejaValidee() {
        ValidationFiche validation = new ValidationFiche();
        validation.valider("p1", "Amel Ben Salah");

        validation.demanderCorrection("Erreur vue après coup", "p1", "Amel Ben Salah");

        assertEquals(StatutValidation.A_CORRIGER, validation.getStatut());
        assertEquals("Erreur vue après coup", validation.getMotif());
    }

    @Test
    void uneFicheValideeRenvoyeeAuChefNeSeSupprimeToujoursPas() {
        // Validée avant l'ajout du champ dejaValidee, comme les fiches déjà en base
        ValidationFiche validation = new ValidationFiche();
        validation.setStatut(StatutValidation.VALIDEE);

        validation.demanderCorrection("Erreur vue après coup", "p1", "Amel Ben Salah");

        assertThrows(IllegalStateException.class, validation::verifierSupprimable);
    }

    @Test
    void uneCorrectionNeSeDemandePasDeuxFois() {
        ValidationFiche validation = aCorriger();

        assertThrows(IllegalStateException.class,
                () -> validation.demanderCorrection("Autre motif", "p2", "Karim Jlassi"));
        assertEquals("Budget manquant", validation.getMotif());
    }

    @Test
    void uneFicheValideeUneFoisNeSeSupprimePlusMemeModifieeDepuis() {
        new ValidationFiche().verifierSupprimable();
        aCorriger().verifierSupprimable();

        ValidationFiche validation = new ValidationFiche();
        validation.valider("p1", "amel.bensalah");
        assertThrows(IllegalStateException.class, validation::verifierSupprimable);

        validation.remettreAValider();
        assertEquals(StatutValidation.A_VALIDER, validation.getStatut());
        assertThrows(IllegalStateException.class, validation::verifierSupprimable);
    }

    @Test
    void uneFicheValideeAvantCetteRegleResteProtegeeApresUneModification() {
        // En base, ces fiches ont le statut « Validée » sans le champ dejaValidee
        ValidationFiche validation = new ValidationFiche();
        validation.setStatut(StatutValidation.VALIDEE);
        assertTrue(validation.isDejaValidee());

        validation.remettreAValider();

        assertTrue(validation.isDejaValidee());
    }

    @Test
    void remettreAValiderEffaceLaDecisionPrecedente() {
        ValidationFiche validation = aCorriger();

        validation.remettreAValider();

        assertEquals(StatutValidation.A_VALIDER, validation.getStatut());
        assertNull(validation.getMotif());
        assertNull(validation.getPiloteNom());
        assertNull(validation.getDateDecision());
    }
}
