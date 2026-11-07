package com.example.demo.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.dto.FicheSuiviRequest;
import com.example.demo.model.FicheProjet;
import com.example.demo.model.FicheSuivi;
import com.example.demo.repository.FicheProjetRepository;
import com.example.demo.repository.FicheSuiviRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Le suppléant saisi dans le formulaire est enregistré et tracé comme les autres champs de la fiche. */
@ExtendWith(MockitoExtension.class)
class FicheSuiviServiceTest {

    private static final String CHEF = "chef-1";

    @Mock
    private FicheSuiviRepository ficheSuiviRepository;
    @Mock
    private FicheProjetRepository ficheProjetRepository;
    @Mock
    private HistoriqueService historiqueService;
    @Mock
    private PieceJointeService pieceJointeService;

    @InjectMocks
    private FicheSuiviService ficheSuiviService;

    @Test
    void leSuppleantSaisiEstEnregistreEtTrace() {
        FicheSuivi fiche = new FicheSuivi();
        fiche.setId("s1");
        fiche.setFicheProjetId("p1");
        fiche.setChefProjetId(CHEF);
        when(ficheSuiviRepository.findById("s1")).thenReturn(Optional.of(fiche));
        when(ficheProjetRepository.findById("p1")).thenReturn(Optional.of(new FicheProjet()));
        when(ficheSuiviRepository.save(any(FicheSuivi.class))).thenAnswer(appel -> appel.getArgument(0));

        FicheSuivi.FicheSignaletique signaletique = new FicheSuivi.FicheSignaletique();
        signaletique.getChefProjet().setSuppleant("Rim Mansouri");
        FicheSuiviRequest modification = new FicheSuiviRequest();
        modification.setFicheSignaletique(signaletique);

        FicheSuivi resultat = ficheSuiviService.updateFicheSuivi("s1", modification, CHEF);

        assertEquals("Rim Mansouri", resultat.getFicheSignaletique().getChefProjet().getSuppleant());
        verify(historiqueService).enregistrerModification(eq("FICHE_SUIVI"), eq("s1"), eq(CHEF),
                argThat(avant -> avant.containsKey("suppleant") && avant.get("suppleant") == null),
                argThat(apres -> "Rim Mansouri".equals(apres.get("suppleant"))),
                eq("p1"), any());
    }
}
