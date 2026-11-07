package com.example.demo.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.demo.model.Nomenclature;
import com.example.demo.repository.NomenclatureRepository;
import com.example.demo.repository.RoleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** Valeurs de la nomenclature au démarrage : les anciennes catégories partent, une base neuve reçoit les statuts. */
@ExtendWith(MockitoExtension.class)
class DataInitializerTest {

    @Mock
    private RoleRepository roleRepository;
    @Mock
    private NomenclatureRepository nomenclatureRepository;

    @InjectMocks
    private DataInitializer dataInitializer;

    @Test
    void lesAnciennesCategoriesSontRetireesSansToucherAuReste() throws Exception {
        when(roleRepository.count()).thenReturn(3L);
        when(nomenclatureRepository.count()).thenReturn(17L);

        dataInitializer.run();

        verify(nomenclatureRepository).deleteByType("CATEGORIE_PROJET");
        verify(nomenclatureRepository, never()).deleteAll();
        verify(nomenclatureRepository, never()).save(any());
    }

    @Test
    void uneBaseNeuveNeRecoitQueLesStatuts() throws Exception {
        when(roleRepository.count()).thenReturn(3L);
        when(nomenclatureRepository.count()).thenReturn(0L);

        dataInitializer.run();

        ArgumentCaptor<Nomenclature> valeurs = ArgumentCaptor.forClass(Nomenclature.class);
        verify(nomenclatureRepository, times(4)).save(valeurs.capture());
        assertEquals(4, valeurs.getAllValues().size());
        assertTrue(valeurs.getAllValues().stream().allMatch(valeur -> "STATUT".equals(valeur.getType())));
    }
}
