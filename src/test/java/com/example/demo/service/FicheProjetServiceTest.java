package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.model.User;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import com.example.demo.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.convert.NoOpDbRefResolver;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

/** Le détail d'une fiche projet affiche le nom d'utilisateur de son chef, sans le recopier en base. */
@ExtendWith(MockitoExtension.class)
class FicheProjetServiceTest {

    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private HistoriqueService historiqueService;
    @Mock
    private FicheSuiviRepository ficheSuiviRepository;
    @Mock
    private PieceJointeService pieceJointeService;
    @Mock
    private ReunionService reunionService;

    @InjectMocks
    private FicheProjetService ficheProjetService;
    @InjectMocks
    private FicheSuiviService ficheSuiviService;

    private FicheProjet ficheDe(String chefProjetId) {
        FicheProjet fiche = new FicheProjet();
        fiche.setChefProjetId(chefProjetId);
        when(ficheProjetRepository.findById("p1")).thenReturn(Optional.of(fiche));
        return fiche;
    }

    @Test
    void leDetailDonneLeNomDUtilisateurDuChefEtNonSonPrenomEtSonNom() {
        ficheDe("chef-1");
        User chef = new User("mehdi.bouaziz", "mehdi.bouaziz@qualinet.com", "");
        chef.setFirstName("Mehdi");
        chef.setLastName("Bouaziz");
        when(userRepository.findById("chef-1")).thenReturn(Optional.of(chef));

        assertEquals("mehdi.bouaziz", ficheProjetService.getFicheProjetById("p1").getChefProjetNom());
    }

    @Test
    void uneFicheDontLeCompteDuChefNExistePlusSeLitQuandMeme() {
        ficheDe("chef-supprime");
        when(userRepository.findById("chef-supprime")).thenReturn(Optional.empty());

        assertNull(ficheProjetService.getFicheProjetById("p1").getChefProjetNom());
    }

    @Test
    void supprimerUneFicheProjetSupprimeSesDocumentsEtSesReunions() {
        ficheDe("chef-1");

        ficheProjetService.deleteFicheProjet("p1", "chef-1");

        verify(pieceJointeService).supprimerDeLaFiche("FICHE_PROJET", "p1");
        verify(reunionService).supprimerDuProjet("p1");
        verify(ficheProjetRepository).deleteById("p1");
    }

    @Test
    void supprimerUneFicheDeSuiviSupprimeSesDocuments() {
        FicheSuivi fiche = new FicheSuivi();
        fiche.setChefProjetId("chef-1");
        when(ficheSuiviRepository.findById("s1")).thenReturn(Optional.of(fiche));

        ficheSuiviService.deleteFicheSuivi("s1", "chef-1");

        verify(pieceJointeService).supprimerDeLaFiche("FICHE_SUIVI", "s1");
        verify(ficheSuiviRepository).deleteById("s1");
    }

    @Test
    void leNomDuChefNEstJamaisEnregistreEnBase() {
        MongoCustomConversions conversions = new MongoCustomConversions(List.of());
        MongoMappingContext contexte = new MongoMappingContext();
        contexte.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
        contexte.afterPropertiesSet();
        MappingMongoConverter convertisseur = new MappingMongoConverter(NoOpDbRefResolver.INSTANCE, contexte);
        convertisseur.setCustomConversions(conversions);
        convertisseur.afterPropertiesSet();

        FicheProjet fiche = new FicheProjet();
        fiche.setNomProjet("e-Bourse");
        fiche.setChefProjetNom("mehdi.bouaziz");
        Document document = new Document();
        convertisseur.write(fiche, document);

        assertEquals("e-Bourse", document.get("nomProjet"));
        assertFalse(document.containsKey("chefProjetNom"));
    }
}
