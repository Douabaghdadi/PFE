package com.example.demo.service;

import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.ChargeMembreDTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.PointHistoriqueKPIDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Vérifie que les exports PDF et Excel se génèrent réellement avec un rapport complet
 * (toutes sections renseignées) et avec un rapport minimal (projet sans suivi).
 */
class KPIReportRenderingTest {

    private final PDFReportService pdfReportService = new PDFReportService();
    private final ExcelReportService excelReportService = new ExcelReportService();

    private ProjetKPIReportDTO rapportComplet() {
        ProjetKPIReportDTO kpi = new ProjetKPIReportDTO();
        kpi.setProjetId("p1");
        kpi.setNomProjet("Refonte portail");
        kpi.setStatut("EN_COURS");
        kpi.setDateDebut("2025-01-15");
        kpi.setDateFinPrevue("2026-01-15");
        kpi.setNombreFichesSuivi(3);
        kpi.setDateDerniereFiche("2026-09-01");
        kpi.setNumeroDerniereFiche("FS-003");

        kpi.setTauxAvancement(50);
        kpi.setTauxAvancementPlanifie(99);
        kpi.setEcartPlanning(-49);
        kpi.setSpi(0.51);
        kpi.setJoursRetard(12);
        kpi.setDateFinProjetee("2026-07-04");
        kpi.setJoursDerapageProjete(170);
        kpi.setDeltaAvancement(24);

        kpi.setTotalTaches(3);
        kpi.setTachesTerminees(1);
        kpi.setTachesEnCours(1);
        kpi.setTachesNonDemarrees(1);
        kpi.setTachesEnRetard(1);
        kpi.setTachesEcheanceProche(1);
        kpi.setTauxRespectEcheances(50);
        kpi.setListeTachesEnRetard(List.of(tache("Développement", "Bob", "2026-09-06", 50, 10)));
        kpi.setListeTachesEcheanceProche(List.of(tache("Recette", "Alice", "2026-09-21", 0, -5)));

        kpi.setChargeEstimee(50);
        kpi.setChargeConsommee(29);
        kpi.setChargeRestanteEstimee(25);
        kpi.setTauxConsommationCharge(58);
        kpi.setIndiceEfficacite(0.86);

        kpi.setNombreProblemes(1);
        kpi.setNombreRisques(1);
        kpi.setNombreRecommandations(1);
        kpi.setListeProblemes(List.of("Environnement de test indisponible"));
        kpi.setListeRisques(List.of("Dépendance prestataire"));
        kpi.setListeRecommandations(List.of("Sécuriser l'environnement de recette avant le 30/09"));

        kpi.setBudgetTotal(2.5);
        kpi.setBudgetPrevision(2.5);
        kpi.setBudgetRealisation(1.8);
        kpi.setEcartBudget(0.7);
        kpi.setTauxConsommationBudget(72);

        kpi.setTailleEquipe(2);
        kpi.setListeMembresEquipe(List.of(
            new MembreEquipeDTO("Alice Martin", "Chef de projet"),
            new MembreEquipeDTO("Bob Durand", "Développeur")));
        kpi.setChargeParMembre(List.of(
            charge("Alice Martin", 2, 1, 0, 50, 20, 9),
            charge("Bob Durand", 1, 0, 1, 50, 30, 20)));

        kpi.setScoreSante(47);
        kpi.setNiveauSante("ATTENTION");
        kpi.setDetailScore(List.of(
            new ComposanteScoreDTO("Avancement vs planning", 15.3, 30, "SPI 0,51"),
            new ComposanteScoreDTO("Respect des délais", 16.5, 25, "12 j de retard"),
            new ComposanteScoreDTO("Qualité et maîtrise des risques", 19.5, 25, "1 problème, 1 risque"),
            new ComposanteScoreDTO("Maîtrise charge et budget", 16.1, 20, "efficacité 0,86")));
        kpi.setAlertes(List.of(
            new AlerteKPIDTO(AlerteKPIDTO.CRITIQUE, "Délais", "Avancement en retrait du planning", "SPI de 0,51."),
            new AlerteKPIDTO(AlerteKPIDTO.MINEUR, "Tâches", "1 échéance imminente", "Moins de 14 jours.")));
        kpi.setHistorique(List.of(
            point("2026-03-01", "FS-001", 10, 2, 1),
            point("2026-06-01", "FS-002", 26, 1, 1),
            point("2026-09-01", "FS-003", 50, 1, 1)));
        return kpi;
    }

    private TacheKPIDTO tache(String sujet, String assigne, String echeance, int pourcentage, int ecart) {
        TacheKPIDTO tache = new TacheKPIDTO();
        tache.setSujet(sujet);
        tache.setAssigneA(assigne);
        tache.setEcheance(echeance);
        tache.setPourcentageRealise(pourcentage);
        tache.setJoursEcart(ecart);
        return tache;
    }

    private ChargeMembreDTO charge(String nom, int taches, int terminees, int retard,
                                   double avancement, double estimee, double consommee) {
        ChargeMembreDTO charge = new ChargeMembreDTO(nom);
        charge.setNombreTaches(taches);
        charge.setTachesTerminees(terminees);
        charge.setTachesEnRetard(retard);
        charge.setAvancementMoyen(avancement);
        charge.setChargeEstimee(estimee);
        charge.setChargeConsommee(consommee);
        return charge;
    }

    private PointHistoriqueKPIDTO point(String date, String rapport, double avancement, int problemes, int risques) {
        PointHistoriqueKPIDTO point = new PointHistoriqueKPIDTO();
        point.setDate(date);
        point.setNumeroRapport(rapport);
        point.setTauxAvancement(avancement);
        point.setNombreProblemes(problemes);
        point.setNombreRisques(risques);
        return point;
    }

    @Test
    void genereUnPdfPourUnRapportComplet() {
        byte[] pdf = pdfReportService.generateProjetKPIPDF(rapportComplet());

        assertNotNull(pdf);
        assertTrue(pdf.length > 5000, "le PDF généré doit contenir toutes les sections");
        assertEquals('%', (char) pdf[0]);
        assertEquals('P', (char) pdf[1]);
    }

    @Test
    void genereUnPdfPourUnProjetSansSuivi() {
        ProjetKPIReportDTO minimal = new ProjetKPIReportDTO();
        minimal.setNomProjet("Projet neuf");
        minimal.setStatut("EN_ATTENTE");
        minimal.setNiveauSante("CRITIQUE");

        byte[] pdf = pdfReportService.generateProjetKPIPDF(minimal);

        assertNotNull(pdf);
        assertTrue(pdf.length > 1000);
    }

    @Test
    void genereUnClasseurMultiOngletsPourUnRapportComplet() throws Exception {
        byte[] xlsx = excelReportService.generateProjetKPIExcel(rapportComplet());

        assertNotNull(xlsx);
        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(xlsx))) {
            assertEquals(4, workbook.getNumberOfSheets());
            assertNotNull(workbook.getSheet("Synthèse"));
            assertNotNull(workbook.getSheet("Tâches"));
            assertNotNull(workbook.getSheet("Équipe"));
            assertNotNull(workbook.getSheet("Historique"));
        }
    }

    @Test
    void genereUnClasseurReduitQuandLeDetailEstAbsent() throws Exception {
        ProjetKPIReportDTO minimal = new ProjetKPIReportDTO();
        minimal.setNomProjet("Projet neuf");
        minimal.setNiveauSante("CRITIQUE");

        byte[] xlsx = excelReportService.generateProjetKPIExcel(minimal);

        try (Workbook workbook = WorkbookFactory.create(new ByteArrayInputStream(xlsx))) {
            // Seule la synthèse est produite : aucun détail de tâches, d'équipe ou d'historique.
            assertEquals(1, workbook.getNumberOfSheets());
            assertNotNull(workbook.getSheet("Synthèse"));
        }
    }
}
