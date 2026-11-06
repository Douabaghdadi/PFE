package com.example.demo.service;

import com.example.demo.dto.AlerteKPIDTO;
import com.example.demo.dto.ComposanteScoreDTO;
import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.PointHistoriqueKPIDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
import com.example.demo.dto.TacheKPIDTO;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.events.Event;
import com.itextpdf.kernel.events.IEventHandler;
import com.itextpdf.kernel.events.PdfDocumentEvent;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.kernel.pdf.canvas.PdfCanvasConstants;
import com.itextpdf.kernel.pdf.xobject.PdfFormXObject;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.DashedBorder;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.BorderRadius;
import com.itextpdf.layout.properties.BorderCollapsePropertyValue;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * Rapport PDF des KPI d'un projet.
 *
 * Il reprend, dans le même ordre, avec les mêmes libellés et le même langage visuel, l'onglet « KPI classique »
 * de la page KPI du pilote qualité : panneaux blancs à coins arrondis, encre bleue du logo pour les titres et les
 * chiffres, vert de l'app pour les repères, pastilles « texte + point » pour les états. La couleur ne porte jamais
 * l'information seule : le sens est toujours écrit (libellé, valeur), et les textes colorés sont assez foncés
 * pour rester lisibles sur le papier.
 */
@Service
public class PDFReportService {

    private static final DeviceRgb INK = rgb(15, 36, 71);
    private static final DeviceRgb INK_2 = rgb(53, 67, 95);
    private static final DeviceRgb MUTED = rgb(91, 107, 133);
    private static final DeviceRgb LINE = rgb(221, 231, 226);
    private static final DeviceRgb LINE_SOFT = rgb(235, 241, 238);
    private static final DeviceRgb SURFACE_ALT = rgb(244, 248, 246);
    private static final DeviceRgb TABLE_HEAD = rgb(241, 247, 244);
    private static final DeviceRgb LEAD_BG = rgb(234, 247, 240);
    private static final DeviceRgb LEAD_LINE = rgb(201, 228, 214);
    private static final DeviceRgb WHITE = rgb(255, 255, 255);
    private static final DeviceRgb TRACK = rgb(236, 240, 238);
    private static final DeviceRgb PLANNED = rgb(157, 184, 169);
    private static final DeviceRgb BRAND = rgb(9, 200, 44);
    private static final DeviceRgb BRAND_TEXT = rgb(4, 120, 87);
    private static final DeviceRgb BADGE_BG = rgb(230, 243, 236);
    private static final DeviceRgb COURBE = rgb(5, 150, 105);
    private static final DeviceRgb COURBE_AIRE = rgb(231, 248, 236);
    private static final DeviceRgb NON_DEMARREES = rgb(195, 212, 202);

    /**
     * Tonalité d'un indicateur : couleur du texte (foncée, lisible sur blanc), couleur des repères graphiques
     * (point, barre), et teintes de la pastille.
     */
    private enum Ton {
        OK(rgb(4, 120, 87), rgb(9, 200, 44), rgb(230, 246, 236), rgb(11, 93, 67), rgb(191, 230, 207)),
        WARN(rgb(180, 83, 9), rgb(245, 158, 11), rgb(255, 251, 235), rgb(146, 64, 14), rgb(253, 230, 138)),
        DANGER(rgb(185, 28, 28), rgb(239, 68, 68), rgb(254, 242, 242), rgb(185, 28, 28), rgb(254, 202, 202)),
        INFO(rgb(26, 67, 148), rgb(59, 108, 196), rgb(232, 238, 249), rgb(26, 67, 148), rgb(199, 212, 234)),
        NEUTRAL(rgb(91, 107, 133), rgb(148, 163, 184), rgb(241, 245, 244), rgb(71, 85, 105), rgb(219, 227, 223));

        final DeviceRgb text;
        final DeviceRgb fill;
        final DeviceRgb soft;
        final DeviceRgb softText;
        final DeviceRgb softLine;

        Ton(DeviceRgb text, DeviceRgb fill, DeviceRgb soft, DeviceRgb softText, DeviceRgb softLine) {
            this.text = text;
            this.fill = fill;
            this.soft = soft;
            this.softText = softText;
            this.softLine = softLine;
        }
    }

    private static final float MARGIN = 40f;
    /** Espace entre deux cadres posés côte à côte. */
    private static final float GOUTTIERE = 10f;
    /** Largeur utile d'un panneau (A4 moins marges, bordure et marges intérieures), pour les graphiques vectoriels. */
    private static final float LARGEUR_PANNEAU = 482f;

    private static final String LOGO_PATH = "branding/qualinet-logo-horizontal.png";
    private static volatile byte[] logoPng;

    private PdfDocument pdfDocument;
    private PdfFont regular;
    private PdfFont bold;

    private static DeviceRgb rgb(int r, int g, int b) {
        return new DeviceRgb(r, g, b);
    }

    /** Synchronisé : les polices et le document en cours sont des champs, un seul rapport se construit à la fois. */
    public synchronized byte[] generateProjetKPIPDF(ProjetKPIReportDTO kpi) {
        try {
            // Première passe : construit le document sans décoration pour connaître le nombre total de pages.
            byte[] draft = render(kpi, null);
            int totalPages;
            try (PdfDocument countDoc = new PdfDocument(new PdfReader(new ByteArrayInputStream(draft)))) {
                totalPages = countDoc.getNumberOfPages();
            }
            // Deuxième passe : rendu final avec le filet et la pagination "Page X / Y" sur chaque page.
            return render(kpi, totalPages);

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    private byte[] render(ProjetKPIReportDTO kpi, Integer totalPages) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        PdfWriter writer = new PdfWriter(baos);
        pdfDocument = new PdfDocument(writer);
        Document document = new Document(pdfDocument);
        document.setMargins(46, MARGIN, 62, MARGIN);

        regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        document.setFont(regular);

        if (totalPages != null) {
            pdfDocument.addEventHandler(PdfDocumentEvent.END_PAGE, new PageDecorationHandler(kpi, totalPages));
        }

        // Même ordre que l'onglet « KPI classique » de la page KPI
        addEntete(document, kpi);
        addStatCards(document, kpi);
        addAlertes(document, kpi);
        addAvancementPlanning(document, kpi);
        addSante(document, kpi);
        addEvolution(document, kpi);
        addTaches(document, kpi);
        addCharge(document, kpi);
        addCalendrierEtEquipe(document, kpi);
        addBudget(document, kpi);
        addRecommandations(document, kpi);
        addProblemesEtRisques(document, kpi);

        document.close();
        return baos.toByteArray();
    }

    /* ---------- Décoration de page (filet, pied de page, pagination) ---------- */

    private final class PageDecorationHandler implements IEventHandler {
        private final String projet;
        private final int totalPages;

        private PageDecorationHandler(ProjetKPIReportDTO kpi, int totalPages) {
            this.projet = orDash(kpi.getNomProjet());
            this.totalPages = totalPages;
        }

        @Override
        public void handleEvent(Event event) {
            PdfDocumentEvent docEvent = (PdfDocumentEvent) event;
            PdfPage page = docEvent.getPage();
            int pageNumber = docEvent.getDocument().getPageNumber(page);
            decoratePage(page, pageNumber, totalPages, projet);
        }
    }

    /* ---------- En-tête : logo, titre du projet, date de génération et statut ---------- */

    private void addEntete(Document document, ProjetKPIReportDTO kpi) {
        Table entete = new Table(UnitValue.createPercentArray(new float[]{70, 30})).useAllAvailableWidth();

        Cell gauche = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        Image logo = new Image(ImageDataFactory.create(logoPng())).scaleToFit(104, 28);
        logo.setMarginBottom(12);
        gauche.add(logo);
        gauche.add(new Paragraph("RAPPORT DE PILOTAGE QUALITÉ")
            .setFont(bold).setFontSize(7.5f).setFontColor(BRAND_TEXT).setCharacterSpacing(1.2f).setMargin(0));
        // Un nom très long réduit le titre plutôt que de le répartir sur quatre lignes
        int longueurNom = orDash(kpi.getNomProjet()).length();
        float tailleTitre = longueurNom > 70 ? 15f : (longueurNom > 42 ? 18f : 22f);
        gauche.add(new Paragraph(orDash(kpi.getNomProjet()))
            .setFont(bold).setFontSize(tailleTitre).setFontColor(INK).setMarginTop(4).setMarginBottom(0));
        boolean periode = kpi.getDateDebut() != null && !kpi.getDateDebut().isBlank()
            && kpi.getDateFinPrevue() != null && !kpi.getDateFinPrevue().isBlank();
        gauche.add(new Paragraph("Indicateurs clés du projet" + (periode
                ? " · du " + formatDate(kpi.getDateDebut()) + " au " + formatDate(kpi.getDateFinPrevue()) : ""))
            .setFontSize(9.5f).setFontColor(MUTED).setMarginTop(3).setMarginBottom(0));
        entete.addCell(gauche);

        Cell droite = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        droite.setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.BOTTOM);
        droite.add(new Paragraph("Généré le").setFontSize(7.5f).setFontColor(MUTED).setMargin(0));
        droite.add(new Paragraph(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm")))
            .setFont(bold).setFontSize(10.5f).setFontColor(INK).setMarginTop(2).setMarginBottom(8));
        droite.add(pill(formatStatut(kpi.getStatut()), statutTon(kpi.getStatut()), 8f)
            .setHorizontalAlignment(HorizontalAlignment.RIGHT));
        entete.addCell(droite);

        document.add(entete);
        document.add(new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth()
            .setMarginTop(12).setMarginBottom(14)
            .addCell(new Cell().setHeight(0).setBorder(Border.NO_BORDER).setBorderTop(new SolidBorder(LINE, 0.75f)).setPadding(0)));
    }

    /** Logo Qualinet sur le fond blanc de la page : ses couleurs d'origine, jamais sur du vert. */
    private static byte[] logoPng() {
        byte[] png = logoPng;
        if (png == null) {
            try (InputStream in = new ClassPathResource(LOGO_PATH).getInputStream()) {
                png = in.readAllBytes();
                logoPng = png;
            } catch (IOException e) {
                throw new UncheckedIOException("Logo introuvable : " + LOGO_PATH, e);
            }
        }
        return png;
    }

    /* ---------- Résumé : 4 indicateurs, le premier plus large ---------- */

    private void addStatCards(Document document, ProjetKPIReportDTO kpi) {
        Table cartes = grille(new float[]{1.35f, 1f, 1f, 1f});
        cartes.setMarginBottom(2);

        boolean planning = kpi.getTauxAvancementPlanifie() > 0;
        Ton tonEcart = ecartTon(kpi.getEcartPlanning());

        // Avancement réel : la carte de tête, avec sa barre
        Cell avancement = carte(true);
        avancement.add(libelleCarte("Avancement réel"));
        avancement.add(new Paragraph(String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxAvancement()))
            .setFont(bold).setFontSize(26).setFontColor(INK).setMarginTop(3).setMarginBottom(6));
        avancement.add(barre(kpi.getTauxAvancement(), Ton.OK.fill, 7).setMarginBottom(6));
        avancement.add(planning
            ? indice(signe(kpi.getEcartPlanning(), 0) + " pts par rapport au planning", tonEcart)
            : indice(progressLabel(kpi.getTauxAvancement()), null));
        cartes.addCell(avancement);

        Cell spi = carte(false);
        spi.add(libelleCarte("Indice de délai (SPI)"));
        spi.add(valeurCarte(planning ? String.format(Locale.FRANCE, "%.2f", kpi.getSpi()) : "–", null, INK));
        spi.add(indice(spiLabel(kpi), spiTon(kpi)));
        cartes.addCell(spi);

        Cell sante = carte(false);
        sante.add(libelleCarte("Santé du projet"));
        sante.add(ProjetKPIReportDTO.NON_EVALUE.equals(kpi.getNiveauSante())
            ? valeurCarte("–", null, INK)
            : valeurCarte(String.format(Locale.FRANCE, "%.0f", kpi.getScoreSante()), "/100", INK));
        sante.add(indice(niveauSanteLabel(kpi.getNiveauSante()), santeTon(kpi.getNiveauSante())));
        cartes.addCell(sante);

        int alertes = kpi.getAlertes() == null ? 0 : kpi.getAlertes().size();
        int bloquantes = compterAlertes(kpi, AlerteKPIDTO.CRITIQUE) + compterAlertes(kpi, AlerteKPIDTO.MAJEUR);
        Cell alertesCarte = carte(false);
        alertesCarte.add(libelleCarte("Alertes"));
        alertesCarte.add(valeurCarte(String.valueOf(alertes), null, bloquantes > 0 ? Ton.DANGER.text : INK));
        alertesCarte.add(indice(bloquantes > 0 ? bloquantes + " à traiter en priorité" : "Aucune alerte bloquante",
            bloquantes > 0 ? Ton.DANGER : Ton.OK));
        cartes.addCell(alertesCarte);

        document.add(cartes);
    }

    private Cell carte(boolean tete) {
        Cell carte = new Cell()
            .setBackgroundColor(tete ? LEAD_BG : WHITE)
            .setBorder(new SolidBorder(tete ? LEAD_LINE : LINE, 0.75f))
            .setBorderRadius(new BorderRadius(9))
            .setPaddingTop(11).setPaddingBottom(11).setPaddingLeft(12).setPaddingRight(12)
            .setKeepTogether(true);
        return carte;
    }

    private Paragraph libelleCarte(String texte) {
        return new Paragraph(texte).setFontSize(8).setFontColor(MUTED).setMargin(0);
    }

    private Paragraph valeurCarte(String valeur, String unite, DeviceRgb couleur) {
        Paragraph p = new Paragraph().setMarginTop(3).setMarginBottom(6)
            .add(new Text(valeur).setFont(bold).setFontSize(20).setFontColor(couleur));
        if (unite != null) {
            p.add(new Text(unite).setFontSize(9).setFontColor(MUTED));
        }
        return p;
    }

    /** Ligne d'état d'une carte : point de couleur et libellé écrit. */
    private Paragraph indice(String texte, Ton ton) {
        Paragraph p = new Paragraph().setMargin(0);
        if (ton != null) {
            p.add(new Text("• ").setFont(bold).setFontSize(9).setFontColor(ton.fill));
        }
        p.add(new Text(texte).setFontSize(7.8f).setFontColor(ton != null ? ton.text : MUTED));
        return p;
    }

    /* ---------- Alertes de pilotage ---------- */

    private void addAlertes(Document document, ProjetKPIReportDTO kpi) {
        List<AlerteKPIDTO> alertes = kpi.getAlertes();
        if (alertes == null || alertes.isEmpty()) {
            return;
        }
        Div panneau = panneau().setKeepTogether(alertes.size() <= 5);
        entetePanneau(panneau, "Alertes de pilotage", String.valueOf(alertes.size()),
            "Points détectés automatiquement à partir des fiches de suivi.", null);

        Table liste = new Table(UnitValue.createPercentArray(new float[]{15, 85})).useAllAvailableWidth();
        for (int i = 0; i < alertes.size(); i++) {
            AlerteKPIDTO alerte = alertes.get(i);
            boolean derniere = i == alertes.size() - 1;
            Ton ton = alerteTon(alerte.getNiveau());

            Cell niveau = ligneListe(derniere).setPaddingLeft(0).setPaddingRight(8);
            niveau.add(pill(alerteLabel(alerte.getNiveau()), ton, 7.5f));
            liste.addCell(niveau);

            Cell texte = ligneListe(derniere).setKeepTogether(true);
            texte.add(new Paragraph(orDash(alerte.getTitre())).setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0));
            texte.add(new Paragraph(orDash(alerte.getMessage()))
                .setFontSize(8.5f).setFontColor(INK_2).setMarginTop(2).setMarginBottom(0));
            texte.add(new Paragraph(orDash(alerte.getCategorie()))
                .setFontSize(7.5f).setFontColor(MUTED).setMarginTop(3).setMarginBottom(0));
            liste.addCell(texte);
        }
        panneau.add(liste);
        document.add(panneau);
    }

    /* ---------- Avancement et planning ---------- */

    private void addAvancementPlanning(Document document, ProjetKPIReportDTO kpi) {
        Div panneau = panneau().setKeepTogether(true);
        entetePanneau(panneau, "Avancement et planning", null,
            kpi.getNombreFichesSuivi() > 0 ? "Calculé sur " + pluriel(kpi.getNombreFichesSuivi(), "fiche") + " de suivi." : null,
            null);

        panneau.add(ligneComparaison("Réalisé", kpi.getTauxAvancement(), Ton.OK.fill,
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxAvancement())));
        panneau.add(ligneComparaison("Planifié à ce jour", kpi.getTauxAvancementPlanifie(), PLANNED,
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxAvancementPlanifie())));

        Table indicateurs = infos(3).setMarginTop(10);
        double delta = kpi.getDeltaAvancement();
        indicateurs.addCell(info("Depuis la fiche précédente", signe(delta, 1) + " pts",
            delta > 0 ? Ton.OK : (delta < 0 ? Ton.WARN : null), false));
        indicateurs.addCell(info("Jours de retard", String.valueOf(kpi.getJoursRetard()),
            kpi.getJoursRetard() > 0 ? Ton.DANGER : Ton.OK, false));
        indicateurs.addCell(info("Fin projetée",
            kpi.getDateFinProjetee() != null ? formatDate(kpi.getDateFinProjetee()) : "Non calculable", null, false));
        panneau.add(indicateurs);

        if (kpi.getDateFinProjetee() != null) {
            boolean derapage = kpi.getJoursDerapageProjete() > 0;
            panneau.add(note(derapage
                    ? "Au rythme actuel, la fin est projetée au " + formatDate(kpi.getDateFinProjetee())
                        + ", soit " + pluriel(kpi.getJoursDerapageProjete(), "jour") + " après la date prévue."
                    : "Au rythme actuel, le projet se termine dans les délais prévus.",
                derapage ? Ton.WARN : Ton.OK));
        }
        document.add(panneau);
    }

    /* ---------- Santé du projet ---------- */

    private void addSante(Document document, ProjetKPIReportDTO kpi) {
        double score = kpi.getScoreSante();
        Ton ton = santeTon(kpi.getNiveauSante());
        boolean detail = kpi.getDetailScore() != null && !kpi.getDetailScore().isEmpty();

        Div panneau = panneau().setKeepTogether(true);
        entetePanneau(panneau, "Santé du projet", null, "Score sur 100, détaillé par composante.", null);

        Table corps = new Table(UnitValue.createPercentArray(detail ? new float[]{27, 73} : new float[]{100}))
            .useAllAvailableWidth();

        Cell resume = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingRight(detail ? 16 : 0);
        if (!ProjetKPIReportDTO.NON_EVALUE.equals(kpi.getNiveauSante())) {
            resume.add(anneauScore(score, ton, 92).setHorizontalAlignment(HorizontalAlignment.LEFT));
        }
        resume.add(new Paragraph().setMarginTop(6).setMarginBottom(0)
            .add(new Text("• ").setFont(bold).setFontSize(12).setFontColor(ton.fill))
            .add(new Text(niveauSanteLabel(kpi.getNiveauSante())).setFont(bold).setFontSize(12).setFontColor(ton.text)));
        resume.add(new Paragraph(niveauSanteDescription(kpi.getNiveauSante()))
            .setFontSize(8.5f).setFontColor(MUTED).setMarginTop(2).setMarginBottom(0));
        corps.addCell(resume);

        if (detail) {
            Cell composantes = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
            Table lignes = new Table(UnitValue.createPercentArray(new float[]{80, 20})).useAllAvailableWidth();
            for (ComposanteScoreDTO composante : kpi.getDetailScore()) {
                addComposante(lignes, composante);
            }
            lignes.addCell(new Cell()
                .add(new Paragraph("Score total").setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
                .setBorder(Border.NO_BORDER).setPaddingLeft(0).setPaddingTop(9).setPaddingBottom(0));
            lignes.addCell(new Cell()
                .add(new Paragraph(String.format(Locale.FRANCE, "%.0f / 100", score))
                    .setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
                .setBorder(Border.NO_BORDER).setPaddingRight(0).setPaddingTop(9).setPaddingBottom(0)
                .setTextAlignment(TextAlignment.RIGHT));
            composantes.add(lignes);
            corps.addCell(composantes);
        }
        panneau.add(corps);
        document.add(panneau);
    }

    /** Une composante du score : libellé et maximum, barre de remplissage, commentaire, points obtenus. */
    private void addComposante(Table table, ComposanteScoreDTO composante) {
        double ratio = composante.getPointsMax() > 0 ? composante.getPoints() / composante.getPointsMax() * 100 : 0;
        Ton ton = ratio >= 80 ? Ton.OK : (ratio >= 50 ? Ton.WARN : Ton.DANGER);

        Cell libelle = new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE_SOFT, 0.75f))
            .setPaddingTop(0).setPaddingBottom(8).setPaddingLeft(0).setPaddingRight(12).setKeepTogether(true);
        libelle.add(new Paragraph()
            .add(new Text(orDash(composante.getLibelle())).setFontSize(9.5f).setFontColor(INK))
            .add(new Text(String.format(Locale.FRANCE, "   sur %.0f pts", composante.getPointsMax()))
                .setFontSize(7.8f).setFontColor(MUTED))
            .setMargin(0));
        libelle.add(barre(ratio, ton.fill, 5).setMarginTop(4).setMarginBottom(3));
        if (composante.getCommentaire() != null && !composante.getCommentaire().isBlank()) {
            libelle.add(new Paragraph(composante.getCommentaire()).setFontSize(7.8f).setFontColor(MUTED).setMargin(0));
        }
        table.addCell(libelle);

        table.addCell(new Cell()
            .add(new Paragraph(String.format(Locale.FRANCE, "%.1f pts", composante.getPoints()))
                .setFont(bold).setFontSize(9.5f).setFontColor(ton.text).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE_SOFT, 0.75f))
            .setPaddingTop(0).setPaddingBottom(8).setPaddingRight(0)
            .setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.TOP));
        // L'espace entre composantes vient du bas de cellule ; la première ligne n'a pas de marge haute
    }

    /* ---------- Évolution de l'avancement : courbe, puis le détail par fiche de suivi ---------- */

    private void addEvolution(Document document, ProjetKPIReportDTO kpi) {
        List<PointHistoriqueKPIDTO> historique = kpi.getHistorique();
        if (historique == null || historique.size() < 2) {
            return;
        }
        Div panneau = panneau();
        // Le titre ne reste jamais seul en bas de page : il voyage avec la courbe
        Div debut = new Div().setKeepTogether(true);
        entetePanneau(debut, "Évolution de l'avancement", null,
            pluriel(historique.size(), "relevé") + ", un par fiche de suivi.", null);
        debut.add(courbeAvancement(historique, LARGEUR_PANNEAU, 150f).setMarginBottom(8));
        panneau.add(debut);

        Table table = new Table(UnitValue.createPercentArray(new float[]{18, 38, 16, 14, 14})).useAllAvailableWidth();
        table.addHeaderCell(enTete("Date"));
        table.addHeaderCell(enTete("Rapport"));
        table.addHeaderCell(enTete("Avancement").setTextAlignment(TextAlignment.RIGHT));
        table.addHeaderCell(enTete("Problèmes").setTextAlignment(TextAlignment.RIGHT));
        table.addHeaderCell(enTete("Risques").setTextAlignment(TextAlignment.RIGHT));
        for (PointHistoriqueKPIDTO point : historique) {
            table.addCell(celluleTexte(formatDate(point.getDate()), INK, TextAlignment.LEFT));
            table.addCell(celluleTexte(orDash(point.getNumeroRapport()), MUTED, TextAlignment.LEFT));
            table.addCell(celluleTexte(String.format(Locale.FRANCE, "%.0f %%", point.getTauxAvancement()), INK, TextAlignment.RIGHT, true));
            table.addCell(celluleTexte(String.valueOf(point.getNombreProblemes()), MUTED, TextAlignment.RIGHT));
            table.addCell(celluleTexte(String.valueOf(point.getNombreRisques()), MUTED, TextAlignment.RIGHT));
        }
        panneau.add(table);
        document.add(panneau);
    }

    /** Courbe d'avancement dessinée en vectoriel : nette à toute taille, sans dépendre des polices du serveur. */
    private Image courbeAvancement(List<PointHistoriqueKPIDTO> points, float largeur, float hauteur) {
        PdfFormXObject form = new PdfFormXObject(new Rectangle(0, 0, largeur, hauteur));
        PdfCanvas c = new PdfCanvas(form, pdfDocument);

        float gauche = 36, droite = 26, haut = 16, bas = 24, retrait = 16;
        float zoneL = largeur - gauche - droite;
        float zoneH = hauteur - haut - bas;
        int n = points.size();

        for (int niveau : new int[]{0, 25, 50, 75, 100}) {
            float y = bas + niveau / 100f * zoneH;
            c.saveState().setStrokeColor(LINE_SOFT).setLineWidth(0.7f).moveTo(gauche, y).lineTo(largeur - droite, y)
                .stroke().restoreState();
            texteVectoriel(c, niveau + " %", gauche - 7, y - 2.3f, 6.8f, regular, MUTED, 2);
        }

        float[] xs = new float[n];
        float[] ys = new float[n];
        float largeurUtile = zoneL - 2 * retrait;
        for (int i = 0; i < n; i++) {
            xs[i] = n == 1 ? gauche + zoneL / 2 : gauche + retrait + i * largeurUtile / (n - 1);
            double taux = Math.max(0, Math.min(100, points.get(i).getTauxAvancement()));
            ys[i] = bas + (float) taux / 100f * zoneH;
        }

        c.saveState().setFillColor(COURBE_AIRE).moveTo(xs[0], bas);
        for (int i = 0; i < n; i++) {
            c.lineTo(xs[i], ys[i]);
        }
        c.lineTo(xs[n - 1], bas).closePath().fill().restoreState();

        c.saveState().setStrokeColor(COURBE).setLineWidth(1.9f)
            .setLineJoinStyle(PdfCanvasConstants.LineJoinStyle.ROUND)
            .setLineCapStyle(PdfCanvasConstants.LineCapStyle.ROUND)
            .moveTo(xs[0], ys[0]);
        for (int i = 1; i < n; i++) {
            c.lineTo(xs[i], ys[i]);
        }
        c.stroke().restoreState();

        // Au-delà de 8 relevés, on n'écrit qu'une étiquette sur deux ou trois pour qu'elles ne se chevauchent pas
        int pas = (int) Math.ceil(n / 8.0);
        for (int i = 0; i < n; i++) {
            c.saveState().setFillColor(WHITE).setStrokeColor(COURBE).setLineWidth(1.9f)
                .circle(xs[i], ys[i], 3.2f).fillStroke().restoreState();
            // La dernière étiquette est toujours écrite ; la précédente saute si elle la toucherait
            boolean etiquette = i == n - 1 || (i % pas == 0 && n - 1 - i >= pas);
            if (etiquette) {
                texteVectoriel(c, String.format(Locale.FRANCE, "%.0f %%", points.get(i).getTauxAvancement()),
                    xs[i], ys[i] + 7, 7.4f, bold, INK, 1);
                String date = formatDateCourte(points.get(i).getDate());
                if (date.isEmpty()) {
                    date = orDash(points.get(i).getNumeroRapport());
                }
                texteVectoriel(c, date, xs[i], bas - 13, 6.8f, regular, MUTED, 1);
            }
        }
        c.release();
        return new Image(form);
    }

    /** Anneau de score : piste claire, arc de la couleur de l'état, score au centre. */
    private Image anneauScore(double score, Ton ton, float taille) {
        PdfFormXObject form = new PdfFormXObject(new Rectangle(0, 0, taille, taille));
        PdfCanvas c = new PdfCanvas(form, pdfDocument);
        float centre = taille / 2;
        float epaisseur = 8f;
        float rayon = centre - epaisseur / 2 - 1;

        c.saveState().setStrokeColor(LINE_SOFT).setLineWidth(epaisseur).circle(centre, centre, rayon).stroke().restoreState();

        double part = Math.max(0, Math.min(100, score)) / 100.0;
        if (part >= 0.999) {
            c.saveState().setStrokeColor(ton.fill).setLineWidth(epaisseur).circle(centre, centre, rayon).stroke().restoreState();
        } else if (part > 0) {
            // L'arc part du haut et tourne dans le sens des aiguilles d'une montre
            c.saveState().setStrokeColor(ton.fill).setLineWidth(epaisseur)
                .setLineCapStyle(PdfCanvasConstants.LineCapStyle.BUTT)
                .arc(centre - rayon, centre - rayon, centre + rayon, centre + rayon, 90, -360 * part)
                .stroke().restoreState();
        }
        texteVectoriel(c, String.format(Locale.FRANCE, "%.0f", score), centre, centre - 2, 25, bold, INK, 1);
        texteVectoriel(c, "/ 100", centre, centre - 15, 7.5f, regular, MUTED, 1);
        c.release();
        return new Image(form);
    }

    /** Écrit un texte dans un canvas vectoriel. Alignement : 0 gauche, 1 centré, 2 droite. */
    private void texteVectoriel(PdfCanvas c, String texte, float x, float y, float taille, PdfFont police,
                                DeviceRgb couleur, int alignement) {
        float largeur = police.getWidth(texte, taille);
        float x0 = alignement == 0 ? x : (alignement == 1 ? x - largeur / 2 : x - largeur);
        c.beginText().setFontAndSize(police, taille).setFillColor(couleur).moveText(x0, y).showText(texte).endText();
    }

    /* ---------- Exécution des tâches ---------- */

    private void addTaches(Document document, ProjetKPIReportDTO kpi) {
        if (kpi.getTotalTaches() == 0) {
            return;
        }
        Div panneau = panneau();
        Div debut = new Div().setKeepTogether(true);
        entetePanneau(debut, "Exécution des tâches", String.valueOf(kpi.getTotalTaches()),
            "Répartition par statut et respect des échéances.", null);

        // Répartition : une barre empilée et sa légende, à la place du donut de la page
        int total = Math.max(1, kpi.getTachesTerminees() + kpi.getTachesEnCours() + kpi.getTachesNonDemarrees());
        debut.add(barreSegments(
            new double[]{kpi.getTachesTerminees(), kpi.getTachesEnCours(), kpi.getTachesNonDemarrees()},
            new DeviceRgb[]{Ton.OK.fill, Ton.INFO.fill, NON_DEMARREES}, 9).setMarginBottom(6));
        Table legende = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1})).useAllAvailableWidth();
        legende.addCell(caseLegende("Terminées", kpi.getTachesTerminees(), total, Ton.OK.fill));
        legende.addCell(caseLegende("En cours", kpi.getTachesEnCours(), total, Ton.INFO.fill));
        legende.addCell(caseLegende("Non démarrées", kpi.getTachesNonDemarrees(), total, NON_DEMARREES));
        debut.add(legende);

        Table stats = infos(4).setMarginTop(10);
        stats.addCell(info("Hors délai", String.valueOf(kpi.getTachesEnRetard()),
            kpi.getTachesEnRetard() > 0 ? Ton.DANGER : Ton.OK, true));
        stats.addCell(info("Échéances imminentes", String.valueOf(kpi.getTachesEcheanceProche()),
            kpi.getTachesEcheanceProche() > 0 ? Ton.WARN : Ton.OK, true));
        stats.addCell(info("Respect des échéances",
            kpi.getTauxRespectEcheances() >= 0 ? String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxRespectEcheances()) : "–",
            null, true));
        stats.addCell(info("En cours", String.valueOf(kpi.getTachesEnCours()), null, true));
        debut.add(stats);
        panneau.add(debut);

        addTableTaches(panneau, "Tâches hors délai", kpi.getListeTachesEnRetard(), Ton.DANGER, true);
        addTableTaches(panneau, "Échéances imminentes", kpi.getListeTachesEcheanceProche(), Ton.WARN, false);
        document.add(panneau);
    }

    private Cell caseLegende(String libelle, int valeur, int total, DeviceRgb couleur) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingRight(8);
        cell.add(new Paragraph()
            .add(new Text("• ").setFont(bold).setFontSize(10).setFontColor(couleur))
            .add(new Text(libelle).setFontSize(8.8f).setFontColor(INK)).setMargin(0));
        cell.add(new Paragraph(String.format(Locale.FRANCE, "%d · %.0f %%", valeur, valeur * 100.0 / total))
            .setFontSize(7.8f).setFontColor(MUTED).setMarginTop(1).setMarginBottom(0).setMarginLeft(8));
        return cell;
    }

    private void addTableTaches(Div panneau, String titre, List<TacheKPIDTO> taches, Ton ton, boolean retard) {
        if (taches == null || taches.isEmpty()) {
            return;
        }
        Div bloc = new Div().setKeepTogether(taches.size() <= 8);
        bloc.add(new Paragraph()
            .add(new Text("• ").setFont(bold).setFontSize(11).setFontColor(ton.fill))
            .add(new Text(titre).setFont(bold).setFontSize(9.8f).setFontColor(INK))
            .add(new Text("   " + taches.size()).setFont(bold).setFontSize(8.5f).setFontColor(MUTED))
            .setMarginTop(14).setMarginBottom(5).setKeepWithNext(true));

        Table table = new Table(UnitValue.createPercentArray(new float[]{40, 22, 16, 10, 12})).useAllAvailableWidth();
        table.addHeaderCell(enTete("Tâche"));
        table.addHeaderCell(enTete("Assignée à"));
        table.addHeaderCell(enTete("Échéance"));
        table.addHeaderCell(enTete("Réalisé").setTextAlignment(TextAlignment.RIGHT));
        table.addHeaderCell(enTete(retard ? "Retard" : "Dans").setTextAlignment(TextAlignment.RIGHT));

        for (TacheKPIDTO tache : taches) {
            table.addCell(celluleTexte(orDash(tache.getSujet()), INK, TextAlignment.LEFT));
            table.addCell(celluleTexte(orDash(tache.getAssigneA()), MUTED, TextAlignment.LEFT));
            table.addCell(celluleTexte(tache.getEcheance() != null ? formatDate(tache.getEcheance()) : "–", MUTED, TextAlignment.LEFT));
            table.addCell(celluleTexte(tache.getPourcentageRealise() + " %", INK, TextAlignment.RIGHT, true));
            table.addCell(celluleTexte(Math.abs(tache.getJoursEcart()) + " j", ton.text, TextAlignment.RIGHT, true));
        }
        bloc.add(table);
        panneau.add(bloc);
    }

    /* ---------- Charge et efficacité (seulement si des temps ont été saisis) ---------- */

    private void addCharge(Document document, ProjetKPIReportDTO kpi) {
        if (kpi.getChargeEstimee() <= 0 && kpi.getChargeConsommee() <= 0) {
            return;
        }
        Div panneau = panneau().setKeepTogether(true);
        entetePanneau(panneau, "Charge et efficacité", null, "En jours de travail.", null);

        Table stats = infos(4);
        stats.addCell(info("Charge estimée", String.format(Locale.FRANCE, "%.0f j", kpi.getChargeEstimee()), null, true));
        stats.addCell(info("Charge consommée", String.format(Locale.FRANCE, "%.0f j", kpi.getChargeConsommee()), null, true));
        stats.addCell(info("Reste à faire", String.format(Locale.FRANCE, "%.0f j", kpi.getChargeRestanteEstimee()), null, true));
        stats.addCell(info("Efficacité (CPI)",
            kpi.getChargeConsommee() > 0 ? String.format(Locale.FRANCE, "%.2f", kpi.getIndiceEfficacite()) : "–",
            kpi.getChargeConsommee() > 0 ? efficaciteTon(kpi.getIndiceEfficacite()) : null, true));
        panneau.add(stats);

        if (kpi.getChargeEstimee() > 0) {
            panneau.add(ligneComparaison("Consommation", kpi.getTauxConsommationCharge(),
                consommationTon(kpi.getTauxConsommationCharge(), kpi.getTauxAvancement()).fill,
                String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxConsommationCharge())).setMarginTop(10));
            panneau.add(note(String.format(Locale.FRANCE,
                    "%.0f %% de la charge estimée est consommée pour %.0f %% d'avancement.",
                    kpi.getTauxConsommationCharge(), kpi.getTauxAvancement()), null));
        }
        document.add(panneau);
    }

    /* ---------- Calendrier et équipe, côte à côte ---------- */

    private void addCalendrierEtEquipe(Document document, ProjetKPIReportDTO kpi) {
        Table deuxColonnes = grille(new float[]{1.25f, 1f}).setMarginBottom(2).setKeepTogether(true);

        Cell calendrier = cadre();
        String duree = dureeJours(kpi);
        entetePanneau(calendrier, "Calendrier", null, duree != null ? "Durée prévue : " + duree + "." : null, null);
        calendrier.add(barre(avancementTemporel(kpi), Ton.OK.fill, 6).setMarginBottom(5));
        Table bornes = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
        bornes.addCell(borne("Début", formatDate(kpi.getDateDebut()), TextAlignment.LEFT));
        bornes.addCell(borne("Fin prévue", formatDate(kpi.getDateFinPrevue()), TextAlignment.RIGHT));
        calendrier.add(bornes);

        boolean livre = kpi.getDateFinReelle() != null && !kpi.getDateFinReelle().isBlank();
        if (livre) {
            calendrier.add(ligneEtat("Livré le " + formatDate(kpi.getDateFinReelle()), Ton.OK));
        }
        Long retardLivraison = retardLivraison(kpi);
        if (kpi.getJoursRetard() > 0) {
            calendrier.add(ligneEtat(pluriel(kpi.getJoursRetard(), "jour") + " de retard", Ton.DANGER));
        }
        if (retardLivraison != null && retardLivraison > 0) {
            calendrier.add(ligneEtat("Livré avec " + pluriel(retardLivraison.intValue(), "jour") + " de retard", Ton.DANGER));
        }
        if (kpi.getJoursRetard() == 0 && (retardLivraison == null || retardLivraison <= 0)) {
            calendrier.add(ligneEtat("Dans les délais", Ton.OK));
        }
        // Un projet livré n'a plus de fin « projetée » : la date de livraison l'a remplacée
        if (kpi.getDateFinProjetee() != null && !livre) {
            calendrier.add(ligneEtat("Fin projetée : " + formatDate(kpi.getDateFinProjetee()),
                kpi.getJoursDerapageProjete() > 0 ? Ton.DANGER : Ton.OK));
        }
        if (kpi.getDateDerniereFiche() != null) {
            calendrier.add(ligneEtat("Dernière fiche de suivi : " + formatDate(kpi.getDateDerniereFiche()), Ton.NEUTRAL));
        }
        deuxColonnes.addCell(calendrier);

        Cell equipe = cadre();
        int taille = kpi.getTailleEquipe();
        entetePanneau(equipe, "Équipe", taille > 0 ? String.valueOf(taille) : null, null, null);
        List<MembreEquipeDTO> membres = kpi.getListeMembresEquipe();
        if (membres == null || membres.isEmpty()) {
            equipe.add(videEncadre("Aucun membre affecté à ce projet."));
        } else {
            for (MembreEquipeDTO membre : membres) {
                equipe.add(ligneMembre(orDash(membre.getNom()), membre.getRole()));
            }
        }
        deuxColonnes.addCell(equipe);

        document.add(deuxColonnes);
    }

    private Cell borne(String libelle, String date, TextAlignment alignement) {
        return new Cell().setBorder(Border.NO_BORDER).setPadding(0).setTextAlignment(alignement)
            .add(new Paragraph(libelle).setFontSize(7.8f).setFontColor(MUTED).setMargin(0))
            .add(new Paragraph(date).setFont(bold).setFontSize(9.5f).setFontColor(INK).setMarginTop(1).setMarginBottom(0));
    }

    private Paragraph ligneEtat(String texte, Ton ton) {
        return new Paragraph().setMarginTop(5).setMarginBottom(0)
            .add(new Text("• ").setFont(bold).setFontSize(9.5f).setFontColor(ton.fill))
            .add(new Text(texte).setFontSize(8.8f).setFontColor(ton == Ton.NEUTRAL ? INK_2 : ton.text));
    }

    /** Un membre : pastille d'initiales, nom et rôle. */
    private Table ligneMembre(String nom, String role) {
        Table ligne = new Table(UnitValue.createPercentArray(new float[]{14, 86})).useAllAvailableWidth();
        ligne.setMarginBottom(5);
        Table avatar = new Table(UnitValue.createPointArray(new float[]{22})).setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        avatar.addCell(new Cell()
            .add(new Paragraph(initiales(nom)).setFont(bold).setFontSize(6.8f).setFontColor(Ton.INFO.text)
                .setMargin(0).setTextAlignment(TextAlignment.CENTER))
            .setBackgroundColor(Ton.INFO.soft).setBorder(Border.NO_BORDER).setBorderRadius(new BorderRadius(11))
            .setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(0).setPaddingRight(0));
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0).add(avatar));
        Cell texte = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setVerticalAlignment(VerticalAlignment.MIDDLE);
        texte.add(new Paragraph(nom).setFont(bold).setFontSize(9).setFontColor(INK).setMargin(0));
        if (role != null && !role.isBlank()) {
            texte.add(new Paragraph(role).setFontSize(8).setFontColor(MUTED).setMarginTop(1).setMarginBottom(0));
        }
        ligne.addCell(texte);
        return ligne;
    }

    /* ---------- Budget ---------- */

    private void addBudget(Document document, ProjetKPIReportDTO kpi) {
        Div panneau = panneau().setKeepTogether(true);
        entetePanneau(panneau, "Budget", null, "Budget cadré dans la fiche projet.", null);
        panneau.add(new Paragraph()
            .add(new Text(money(kpi.getBudgetTotal())).setFont(bold).setFontSize(22).setFontColor(INK))
            .add(new Text(" DT").setFontSize(10).setFontColor(MUTED))
            .setMarginTop(0).setMarginBottom(0));
        panneau.add(new Paragraph(String.format(Locale.FRANCE, "%.2f MD", kpi.getBudgetTotal()))
            .setFontSize(8.5f).setFontColor(MUTED).setMarginTop(1).setMarginBottom(8));

        if (kpi.getBudgetPrevision() <= 0 && kpi.getBudgetRealisation() <= 0) {
            panneau.add(note("Aucun suivi budgétaire (prévision et réalisation) n'a été renseigné dans les fiches de suivi.", null));
            document.add(panneau);
            return;
        }

        panneau.add(ligneComparaison("Prévu", 100, PLANNED, money(kpi.getBudgetPrevision()) + " DT"));
        panneau.add(ligneComparaison("Consommé", kpi.getTauxConsommationBudget(),
            consommationTon(kpi.getTauxConsommationBudget(), kpi.getTauxAvancement()).fill,
            money(kpi.getBudgetRealisation()) + " DT"));

        Table indicateurs = infos(2).setMarginTop(10);
        indicateurs.addCell(info("Taux de consommation",
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxConsommationBudget()), null, true));
        indicateurs.addCell(info("Écart disponible", money(kpi.getEcartBudget()) + " DT",
            kpi.getEcartBudget() >= 0 ? Ton.OK : Ton.DANGER, true));
        panneau.add(indicateurs);

        document.add(panneau);
    }

    /* ---------- Recommandations du chef de projet ---------- */

    private void addRecommandations(Document document, ProjetKPIReportDTO kpi) {
        List<String> recommandations = kpi.getListeRecommandations();
        if (recommandations == null || recommandations.isEmpty()) {
            return;
        }
        Div panneau = panneau().setKeepTogether(recommandations.size() <= 6);
        entetePanneau(panneau, "Recommandations du chef de projet", String.valueOf(recommandations.size()), null, null);

        Table liste = new Table(UnitValue.createPercentArray(new float[]{6, 94})).useAllAvailableWidth();
        for (int i = 0; i < recommandations.size(); i++) {
            boolean derniere = i == recommandations.size() - 1;
            liste.addCell(ligneListe(derniere).setPaddingLeft(0).setPaddingRight(6).add(badge(String.valueOf(i + 1))));
            liste.addCell(ligneListe(derniere).setKeepTogether(true)
                .add(new Paragraph(recommandations.get(i)).setFontSize(9.3f).setFontColor(INK).setMargin(0)));
        }
        panneau.add(liste);
        document.add(panneau);
    }

    /** Pastille numérotée (recommandations). */
    private Table badge(String numero) {
        Table t = new Table(UnitValue.createPointArray(new float[]{19})).setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        t.addCell(new Cell()
            .add(new Paragraph(numero).setFont(bold).setFontSize(8).setFontColor(BRAND_TEXT).setMargin(0)
                .setTextAlignment(TextAlignment.CENTER))
            .setBackgroundColor(BADGE_BG).setBorder(Border.NO_BORDER).setBorderRadius(new BorderRadius(9.5f))
            .setPaddingTop(4.5f).setPaddingBottom(4.5f).setPaddingLeft(0).setPaddingRight(0));
        return t;
    }

    /* ---------- Problèmes et risques, côte à côte ---------- */

    private void addProblemesEtRisques(Document document, ProjetKPIReportDTO kpi) {
        Table deuxColonnes = grille(new float[]{1f, 1f}).setMarginBottom(2);
        deuxColonnes.addCell(listeQualite("Problèmes", kpi.getListeProblemes(), kpi.getNombreProblemes(), Ton.DANGER,
            kpi.getNombreProblemesPersistants() > 0
                ? kpi.getNombreProblemesPersistants() + " déjà signalé"
                    + (kpi.getNombreProblemesPersistants() > 1 ? "s" : "") + " dans la fiche précédente."
                : null,
            "Aucun problème signalé."));
        deuxColonnes.addCell(listeQualite("Risques", kpi.getListeRisques(), kpi.getNombreRisques(), Ton.WARN,
            null, "Aucun risque signalé."));
        document.add(deuxColonnes);
    }

    private Cell listeQualite(String titre, List<String> elements, int nombre, Ton ton, String sous, String vide) {
        Cell colonne = cadre();
        int total = elements != null ? elements.size() : nombre;
        entetePanneau(colonne, titre, String.valueOf(total), sous, ton);

        if (elements == null || elements.isEmpty()) {
            colonne.add(videEncadre(vide));
            return colonne;
        }
        Table liste = new Table(UnitValue.createPercentArray(new float[]{5, 95})).useAllAvailableWidth();
        for (int i = 0; i < elements.size(); i++) {
            boolean dernier = i == elements.size() - 1;
            liste.addCell(ligneListe(dernier).setPaddingLeft(0).setPaddingRight(0)
                .add(new Paragraph("•").setFont(bold).setFontSize(11).setFontColor(ton.fill).setMargin(0)
                    .setMultipliedLeading(0.9f)));
            liste.addCell(ligneListe(dernier).setKeepTogether(true)
                .add(new Paragraph(elements.get(i)).setFontSize(8.8f).setFontColor(INK_2).setMargin(0)));
        }
        colonne.add(liste);
        return colonne;
    }

    /* ---------- Briques réutilisables ---------- */

    /** Panneau blanc à coins arrondis : l'équivalent des panneaux de la page. */
    private Div panneau() {
        return new Div()
            .setBackgroundColor(WHITE)
            .setBorder(new SolidBorder(LINE, 0.75f))
            .setBorderRadius(new BorderRadius(9))
            .setPadding(14)
            .setMarginBottom(10);
    }

    /** Panneau placé dans une cellule de grille (deux panneaux côte à côte, de même hauteur). */
    private Cell cadre() {
        return new Cell()
            .setBackgroundColor(WHITE)
            .setBorder(new SolidBorder(LINE, 0.75f))
            .setBorderRadius(new BorderRadius(9))
            .setPadding(14);
    }

    /** Titre du panneau (avec, s'il y en a un, son compteur et un point de couleur) et sa phrase d'explication. */
    private void entetePanneau(Div conteneur, String titre, String compteur, String sous, Ton point) {
        enteteParagraphes(titre, compteur, sous, point).forEach(conteneur::add);
    }

    private void entetePanneau(Cell conteneur, String titre, String compteur, String sous, Ton point) {
        enteteParagraphes(titre, compteur, sous, point).forEach(conteneur::add);
    }

    private List<Paragraph> enteteParagraphes(String titre, String compteur, String sous, Ton point) {
        Paragraph p = new Paragraph().setMargin(0).setKeepWithNext(true);
        if (point != null) {
            p.add(new Text("• ").setFont(bold).setFontSize(13).setFontColor(point.fill));
        }
        p.add(new Text(titre).setFont(bold).setFontSize(11.5f).setFontColor(INK));
        if (compteur != null) {
            p.add(new Text("   " + compteur).setFont(bold).setFontSize(9).setFontColor(MUTED));
        }
        if (sous == null) {
            return List.of(p.setMarginBottom(9));
        }
        return List.of(p, new Paragraph(sous).setFontSize(8.5f).setFontColor(MUTED)
            .setMarginTop(2).setMarginBottom(9).setKeepWithNext(true));
    }

    /** Grille de cadres côte à côte, séparés d'une gouttière. */
    private Table grille(float[] largeurs) {
        Table table = new Table(UnitValue.createPercentArray(largeurs)).useAllAvailableWidth();
        table.setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        table.setHorizontalBorderSpacing(GOUTTIERE).setVerticalBorderSpacing(GOUTTIERE);
        // Compense l'espacement extérieur pour aligner la grille sur les marges du document
        table.setMarginLeft(-GOUTTIERE).setMarginRight(-GOUTTIERE);
        return table;
    }

    /** Grille de chiffres sans cadre (la « liste de définitions » de la page). */
    private Table infos(int colonnes) {
        float[] largeurs = new float[colonnes];
        Arrays.fill(largeurs, 1f);
        return new Table(UnitValue.createPercentArray(largeurs)).useAllAvailableWidth();
    }

    /** Un chiffre clé : libellé discret, valeur en gras (de la couleur de l'état, ou d'encre sans état). */
    private Cell info(String label, String value, Ton ton, boolean grand) {
        return new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingRight(8)
            .add(new Paragraph(label).setFont(bold).setFontSize(7.8f).setFontColor(MUTED).setMargin(0))
            .add(new Paragraph(value).setFont(bold).setFontSize(grand ? 14 : 12.5f)
                .setFontColor(ton != null ? ton.text : INK).setMarginTop(3).setMarginBottom(0));
    }

    /** Pastille « point + texte » : même rendu que les statuts de la page. */
    private Table pill(String texte, Ton ton, float taille) {
        String contenu = "• " + texte;
        float largeur = bold.getWidth(contenu, taille) + 20;
        Table pill = new Table(UnitValue.createPointArray(new float[]{largeur}))
            .setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        pill.addCell(new Cell()
            .add(new Paragraph(contenu).setFont(bold).setFontSize(taille).setFontColor(ton.softText)
                .setMargin(0).setTextAlignment(TextAlignment.CENTER))
            .setBackgroundColor(ton.soft).setBorder(new SolidBorder(ton.softLine, 0.75f))
            .setBorderRadius(new BorderRadius(taille + 3))
            .setPaddingTop(3).setPaddingBottom(3).setPaddingLeft(6).setPaddingRight(6));
        return pill;
    }

    /** Encadré de commentaire : teinte douce de l'état, ou neutre sans état. */
    private Table note(String texte, Ton ton) {
        DeviceRgb fond;
        DeviceRgb bordure;
        DeviceRgb encre;
        if (ton == Ton.OK) {
            fond = rgb(236, 253, 245);
            bordure = rgb(167, 243, 208);
            encre = rgb(6, 95, 70);
        } else if (ton == Ton.WARN) {
            fond = rgb(255, 251, 235);
            bordure = rgb(253, 230, 138);
            encre = rgb(146, 64, 14);
        } else if (ton == Ton.DANGER) {
            fond = rgb(254, 242, 242);
            bordure = rgb(254, 202, 202);
            encre = rgb(153, 27, 27);
        } else {
            fond = SURFACE_ALT;
            bordure = LINE;
            encre = INK_2;
        }
        Table boite = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth()
            .setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        boite.setMarginTop(10);
        boite.addCell(new Cell()
            .add(new Paragraph(texte).setFontSize(8.6f).setFontColor(encre).setMargin(0))
            .setBackgroundColor(fond).setBorder(new SolidBorder(bordure, 0.75f)).setBorderRadius(new BorderRadius(7))
            .setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(10).setPaddingRight(10));
        return boite;
    }

    /** « Aucun … » : cadre en tirets, comme les états vides de la page. */
    private Table videEncadre(String texte) {
        Table boite = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth()
            .setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        boite.addCell(new Cell()
            .add(new Paragraph(texte).setFontSize(8.6f).setFontColor(MUTED).setMargin(0).setTextAlignment(TextAlignment.CENTER))
            .setBorder(new DashedBorder(rgb(195, 212, 202), 0.75f)).setBorderRadius(new BorderRadius(7))
            .setPaddingTop(9).setPaddingBottom(9));
        return boite;
    }

    /** Cellule d'une liste à lignes séparées par un filet (alertes, recommandations, problèmes, risques). */
    private Cell ligneListe(boolean derniere) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPaddingTop(7).setPaddingBottom(7).setPaddingRight(0)
            .setVerticalAlignment(VerticalAlignment.TOP);
        if (!derniere) {
            cell.setBorderBottom(new SolidBorder(LINE_SOFT, 0.75f));
        } else {
            cell.setPaddingBottom(0);
        }
        return cell;
    }

    /** Ligne de comparaison « libellé | barre | valeur », comme « Réalisé / Planifié » sur la page KPI. */
    private Table ligneComparaison(String label, double pourcentage, DeviceRgb couleur, String valeur) {
        Table ligne = new Table(UnitValue.createPercentArray(new float[]{22, 54, 24})).useAllAvailableWidth();
        ligne.setMarginBottom(4);
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(0).setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(new Paragraph(label).setFontSize(9).setFontColor(INK_2).setMargin(0)));
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(barre(pourcentage, couleur, 8)));
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingRight(0).setTextAlignment(TextAlignment.RIGHT)
            .setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(new Paragraph(valeur).setFont(bold).setFontSize(9.8f).setFontColor(INK).setMargin(0)));
        return ligne;
    }

    private Cell enTete(String text) {
        return new Cell()
            .add(new Paragraph(text).setFont(bold).setFontSize(7.8f).setFontColor(MUTED).setMargin(0))
            .setBackgroundColor(TABLE_HEAD)
            .setBorder(Border.NO_BORDER)
            .setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8);
    }

    private Cell celluleTexte(String texte, DeviceRgb couleur, TextAlignment alignement) {
        return celluleTexte(texte, couleur, alignement, false);
    }

    private Cell celluleTexte(String texte, DeviceRgb couleur, TextAlignment alignement, boolean gras) {
        Paragraph p = new Paragraph(texte).setFontSize(8.8f).setFontColor(couleur).setMargin(0);
        if (gras) {
            p.setFont(bold);
        }
        return new Cell().add(p)
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE_SOFT, 0.75f))
            .setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(8).setPaddingRight(8)
            .setTextAlignment(alignement).setVerticalAlignment(VerticalAlignment.MIDDLE);
    }

    /** Barre de progression : la part remplie dans la couleur donnée, le reste en gris-vert clair. */
    private Table barre(double percentage, DeviceRgb color, float hauteur) {
        return barreSegments(new double[]{Math.max(0, Math.min(100, percentage)), 100 - Math.max(0, Math.min(100, percentage))},
            new DeviceRgb[]{color, TRACK}, hauteur);
    }

    /** Barre à plusieurs segments proportionnels aux valeurs ; sans valeur, elle reste une piste vide. */
    private Table barreSegments(double[] valeurs, DeviceRgb[] couleurs, float hauteur) {
        double somme = Arrays.stream(valeurs).sum();
        if (somme <= 0) {
            Table vide = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            vide.addCell(cellBarre(TRACK, hauteur));
            return vide;
        }
        int retenus = 0;
        for (double valeur : valeurs) {
            if (valeur >= 0.5) retenus++;
        }
        if (retenus == 0) {
            Table vide = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            vide.addCell(cellBarre(couleurs[couleurs.length - 1], hauteur));
            return vide;
        }
        float[] largeurs = new float[retenus];
        DeviceRgb[] teintes = new DeviceRgb[retenus];
        int k = 0;
        for (int i = 0; i < valeurs.length; i++) {
            if (valeurs[i] >= 0.5) {
                largeurs[k] = (float) (valeurs[i] / somme * 99.99);
                teintes[k++] = couleurs[i];
            }
        }
        Table barre = new Table(UnitValue.createPercentArray(largeurs)).useAllAvailableWidth();
        for (DeviceRgb teinte : teintes) {
            barre.addCell(cellBarre(teinte, hauteur));
        }
        return barre;
    }

    private Cell cellBarre(DeviceRgb color, float hauteur) {
        return new Cell().setHeight(hauteur).setBackgroundColor(color).setBorder(Border.NO_BORDER).setPadding(0);
    }

    /* ---------- Filet supérieur, pied de page et pagination ---------- */

    private void decoratePage(PdfPage page, int pageNumber, int totalPages, String projet) {
        Rectangle size = page.getPageSize();
        PdfCanvas pdfCanvas = new PdfCanvas(page);

        pdfCanvas.saveState()
            .setFillColor(BRAND)
            .rectangle(0, size.getTop() - 4, size.getWidth(), 4)
            .fill()
            .restoreState();
        pdfCanvas.saveState()
            .setStrokeColor(LINE)
            .setLineWidth(0.75f)
            .moveTo(MARGIN, 44).lineTo(size.getWidth() - MARGIN, 44)
            .stroke()
            .restoreState();

        Canvas canvas = new Canvas(pdfCanvas, size);
        canvas.showTextAligned(
            new Paragraph("Qualinet · Rapport KPI · " + projet)
                .setFont(regular).setFontSize(7.5f).setFontColor(MUTED),
            MARGIN, 32, TextAlignment.LEFT);
        canvas.showTextAligned(
            new Paragraph("Page " + pageNumber + " / " + totalPages)
                .setFont(bold).setFontSize(7.5f).setFontColor(MUTED),
            size.getWidth() - MARGIN, 32, TextAlignment.RIGHT);
        canvas.close();
    }

    /* ---------- Tonalités et libellés (mêmes seuils que la page KPI) ---------- */

    private Ton statutTon(String statut) {
        if (statut == null) return Ton.NEUTRAL;
        switch (statut.toUpperCase()) {
            case "EN_COURS": return Ton.INFO;
            case "TERMINE": return Ton.OK;
            case "EN_ATTENTE": return Ton.WARN;
            case "ANNULE": return Ton.DANGER;
            default: return Ton.NEUTRAL;
        }
    }

    private Ton ecartTon(double ecart) {
        if (ecart >= 0) return Ton.OK;
        if (ecart >= -10) return Ton.WARN;
        return Ton.DANGER;
    }

    /** Mêmes seuils que la page KPI : au-delà de 1,05 le projet est réellement en avance. */
    private String spiLabel(ProjetKPIReportDTO kpi) {
        if (kpi.getTauxAvancementPlanifie() <= 0) return "Planning non exploitable";
        if (kpi.getSpi() > 1.05) return "En avance sur le planning";
        if (kpi.getSpi() >= 0.9) return "Conforme au planning";
        if (kpi.getSpi() >= 0.8) return "Léger retrait";
        return "Retard significatif";
    }

    private Ton spiTon(ProjetKPIReportDTO kpi) {
        if (kpi.getTauxAvancementPlanifie() <= 0) return Ton.NEUTRAL;
        if (kpi.getSpi() >= 0.9) return Ton.OK;
        if (kpi.getSpi() >= 0.8) return Ton.WARN;
        return Ton.DANGER;
    }

    private Ton efficaciteTon(double cpi) {
        if (cpi >= 1) return Ton.OK;
        if (cpi >= 0.8) return Ton.WARN;
        return Ton.DANGER;
    }

    /** Une consommation (charge ou budget) qui dépasse l'avancement de plus de 15 points inquiète. */
    private Ton consommationTon(double taux, double avancement) {
        return taux > avancement + 15 ? Ton.DANGER : Ton.OK;
    }

    private Ton santeTon(String niveau) {
        if (niveau == null) return Ton.DANGER;
        switch (niveau) {
            case "EXCELLENT":
            case "BON": return Ton.OK;
            case "ATTENTION": return Ton.WARN;
            case ProjetKPIReportDTO.NON_EVALUE: return Ton.NEUTRAL;
            default: return Ton.DANGER;
        }
    }

    private String niveauSanteLabel(String niveau) {
        if (niveau == null) return "-";
        switch (niveau) {
            case "EXCELLENT": return "Excellent";
            case "BON": return "Bon";
            case "ATTENTION": return "Attention";
            case ProjetKPIReportDTO.NON_EVALUE: return "Non évalué";
            default: return "Critique";
        }
    }

    private String niveauSanteDescription(String niveau) {
        if (niveau == null) return "";
        switch (niveau) {
            case "EXCELLENT": return "Les indicateurs sont au vert sur les quatre axes de pilotage.";
            case "BON": return "Le projet avance correctement, avec quelques points de vigilance.";
            case "ATTENTION": return "Plusieurs indicateurs se dégradent : un arbitrage est nécessaire.";
            case ProjetKPIReportDTO.NON_EVALUE: return "Aucune fiche de suivi : le score sera calculé dès le premier dépôt.";
            default: return "Le projet est en difficulté, une intervention rapide est recommandée.";
        }
    }

    private int compterAlertes(ProjetKPIReportDTO kpi, String niveau) {
        if (kpi.getAlertes() == null) return 0;
        int total = 0;
        for (AlerteKPIDTO alerte : kpi.getAlertes()) {
            if (niveau.equals(alerte.getNiveau())) total++;
        }
        return total;
    }

    private Ton alerteTon(String niveau) {
        if (AlerteKPIDTO.CRITIQUE.equals(niveau)) return Ton.DANGER;
        if (AlerteKPIDTO.MAJEUR.equals(niveau)) return Ton.WARN;
        return Ton.NEUTRAL;
    }

    private String alerteLabel(String niveau) {
        if (AlerteKPIDTO.CRITIQUE.equals(niveau)) return "Critique";
        if (AlerteKPIDTO.MAJEUR.equals(niveau)) return "Majeure";
        return "Mineure";
    }

    private String formatStatut(String statut) {
        if (statut == null || statut.isBlank()) return "-";
        switch (statut.toUpperCase()) {
            case "EN_COURS": return "En cours";
            case "TERMINE": return "Terminé";
            case "EN_ATTENTE": return "En attente";
            case "ANNULE": return "Annulé";
            default:
                String lower = statut.toLowerCase(Locale.FRANCE).replace('_', ' ');
                return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
        }
    }

    private String progressLabel(double percentage) {
        if (percentage >= 75) return "Excellent progrès";
        if (percentage >= 50) return "Bon avancement";
        if (percentage >= 25) return "En cours";
        return "Démarrage";
    }

    /** Durée du projet en jours, affichée sous le titre « Calendrier » comme sur la page. */
    private String dureeJours(ProjetKPIReportDTO kpi) {
        try {
            long jours = ChronoUnit.DAYS.between(
                LocalDate.parse(kpi.getDateDebut()), LocalDate.parse(kpi.getDateFinPrevue()));
            return jours > 0 ? pluriel((int) jours, "jour") : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** Part du temps prévu déjà écoulée, pour la frise du calendrier (0 si les dates sont absentes). */
    private double avancementTemporel(ProjetKPIReportDTO kpi) {
        try {
            LocalDate debut = LocalDate.parse(kpi.getDateDebut());
            LocalDate fin = LocalDate.parse(kpi.getDateFinPrevue());
            long total = ChronoUnit.DAYS.between(debut, fin);
            if (total <= 0) return 0;
            return Math.max(0, Math.min(100, ChronoUnit.DAYS.between(debut, LocalDate.now()) * 100.0 / total));
        } catch (Exception e) {
            return 0;
        }
    }

    /**
     * Retard de livraison d'un projet livré (fin réelle - fin prévue, en jours), null s'il n'est pas livré :
     * une fois le projet clos, le retard « à date » vaut 0 et ne dit plus rien de la livraison.
     */
    private Long retardLivraison(ProjetKPIReportDTO kpi) {
        try {
            return ChronoUnit.DAYS.between(LocalDate.parse(kpi.getDateFinPrevue()), LocalDate.parse(kpi.getDateFinReelle()));
        } catch (Exception e) {
            return null;
        }
    }

    /** Nombre signé comme sur la page : « +12 », « -41 », « 0 ». */
    private String signe(double valeur, int decimales) {
        String texte = String.format(Locale.FRANCE, "%." + decimales + "f", valeur);
        return valeur > 0 ? "+" + texte : texte;
    }

    /** « 1 fiche », « 3 fiches ». */
    private String pluriel(int n, String mot) {
        return n + " " + mot + (n > 1 ? "s" : "");
    }

    private String money(double valueMD) {
        // le séparateur de milliers français est une espace insécable (fine ou non) : Helvetica ne la connaît
        // pas, on la remplace par une espace ordinaire
        return String.format(Locale.FRANCE, "%,.0f", valueMD * 1_000_000)
            .replace(' ', ' ')
            .replace(' ', ' ');
    }

    /** Initiales d'un nom (« Amel Gharbi » → AG, « chefprojet » → CH). */
    private String initiales(String nom) {
        String[] parts = (nom == null ? "" : nom.trim()).split("[\\s._-]+");
        if (parts.length == 0 || parts[0].isEmpty()) return "?";
        String initiales = parts.length == 1 || parts[1].isEmpty()
            ? parts[0].substring(0, Math.min(2, parts[0].length()))
            : "" + parts[0].charAt(0) + parts[1].charAt(0);
        return initiales.toUpperCase(Locale.FRANCE);
    }

    private String orDash(String value) {
        return value != null && !value.isBlank() ? value : "-";
    }

    private String formatDate(String value) {
        if (value == null || value.isBlank()) return "Non définie";
        DateTimeFormatter output = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        try {
            return LocalDate.parse(value).format(output);
        } catch (Exception ignored) {
            // la valeur n'est pas une date ISO simple
        }
        try {
            return LocalDateTime.parse(value).format(output);
        } catch (Exception ignored) {
            return value;
        }
    }

    /** Date sur l'axe de la courbe : « 15/08/26 », ou vide si elle est absente. */
    private String formatDateCourte(String value) {
        if (value == null || value.isBlank()) return "";
        DateTimeFormatter output = DateTimeFormatter.ofPattern("dd/MM/yy");
        try {
            return LocalDate.parse(value).format(output);
        } catch (Exception ignored) {
            // la valeur n'est pas une date ISO simple
        }
        try {
            return LocalDateTime.parse(value).format(output);
        } catch (Exception ignored) {
            return value;
        }
    }
}
