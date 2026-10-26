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
import com.itextpdf.kernel.pdf.xobject.PdfImageXObject;
import com.itextpdf.layout.Canvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.BackgroundImage;
import com.itextpdf.layout.properties.BackgroundRepeat;
import com.itextpdf.layout.properties.BackgroundSize;
import com.itextpdf.layout.properties.BorderCollapsePropertyValue;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
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
 * Il reprend, dans le même ordre et avec les mêmes libellés, l'onglet « KPI Classique » de la page
 * KPI du pilote qualité : un indicateur affiché à l'écran se retrouve à l'identique sur le papier.
 */
@Service
public class PDFReportService {

    private static final DeviceRgb INK = new DeviceRgb(15, 23, 42);
    private static final DeviceRgb BRAND = new DeviceRgb(9, 200, 44);
    private static final DeviceRgb BRAND_DEEP = new DeviceRgb(5, 110, 30);
    private static final DeviceRgb GREEN = new DeviceRgb(16, 185, 129);
    private static final DeviceRgb MUTED = new DeviceRgb(100, 116, 139);
    private static final DeviceRgb MUTED_ON_DARK = new DeviceRgb(214, 247, 220);
    private static final DeviceRgb LINE = new DeviceRgb(226, 232, 240);
    private static final DeviceRgb SURFACE_ALT = new DeviceRgb(248, 250, 252);
    private static final DeviceRgb WHITE = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb TRACK = new DeviceRgb(238, 241, 246);
    private static final DeviceRgb PLANNED = new DeviceRgb(148, 163, 184);
    private static final DeviceRgb RED = new DeviceRgb(239, 68, 68);
    private static final DeviceRgb RED_SOFT = new DeviceRgb(254, 242, 242);
    private static final DeviceRgb AMBER = new DeviceRgb(245, 158, 11);
    private static final DeviceRgb AMBER_SOFT = new DeviceRgb(255, 251, 235);
    private static final DeviceRgb BLUE = new DeviceRgb(59, 130, 246);
    private static final DeviceRgb BLUE_SOFT = new DeviceRgb(239, 246, 255);
    private static final DeviceRgb BRAND_SOFT = new DeviceRgb(240, 253, 244);
    private static final DeviceRgb GRAY = new DeviceRgb(107, 114, 128);

    private static final float MARGIN = 40f;
    /** Espace entre deux cadres posés côte à côte. */
    private static final float GOUTTIERE = 8f;

    private static final String LOGO_PATH = "branding/qualinet-logo-horizontal.png";
    private static volatile byte[] logoPng;

    private PdfFont regular;
    private PdfFont bold;

    public byte[] generateProjetKPIPDF(ProjetKPIReportDTO kpi) {
        try {
            // Première passe : construit le document sans décoration pour connaître le nombre total de pages.
            byte[] draft = render(kpi, null);
            int totalPages;
            try (PdfDocument countDoc = new PdfDocument(new PdfReader(new ByteArrayInputStream(draft)))) {
                totalPages = countDoc.getNumberOfPages();
            }
            // Deuxième passe : rendu final avec la bande de couleur et la pagination "Page X / Y" sur chaque page.
            return render(kpi, totalPages);

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur lors de la génération du PDF", e);
        }
    }

    private byte[] render(ProjetKPIReportDTO kpi, Integer totalPages) throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdfDoc = new PdfDocument(writer);
        Document document = new Document(pdfDoc);
        document.setMargins(52, MARGIN, 62, MARGIN);

        regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
        bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        document.setFont(regular);

        if (totalPages != null) {
            pdfDoc.addEventHandler(PdfDocumentEvent.END_PAGE, new PageDecorationHandler(kpi, totalPages));
        }

        // Même ordre que l'onglet « KPI Classique » de la page KPI
        addHero(document, kpi);
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

    /* ---------- Bandeau d'en-tête ---------- */

    private void addHero(Document document, ProjetKPIReportDTO kpi) {
        Table inner = new Table(UnitValue.createPercentArray(new float[]{62, 38})).useAllAvailableWidth();

        Cell left = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        left.add(logoChip());
        left.add(new Paragraph("RAPPORT DE PILOTAGE QUALITÉ")
            .setFont(bold).setFontSize(7.5f).setFontColor(WHITE).setCharacterSpacing(1.4f).setMargin(0));
        left.add(new Paragraph(orDash(kpi.getNomProjet()))
            .setFont(bold).setFontSize(22).setFontColor(WHITE).setMarginTop(6).setMarginBottom(0));
        left.add(new Paragraph("Indicateurs clés du projet · du " + formatDate(kpi.getDateDebut())
                + " au " + formatDate(kpi.getDateFinPrevue()))
            .setFontSize(9.5f).setFontColor(MUTED_ON_DARK).setMarginTop(3).setMarginBottom(0));
        inner.addCell(left);

        Cell right = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        right.setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.MIDDLE);
        right.add(new Paragraph("Généré le")
            .setFontSize(7.5f).setFontColor(MUTED_ON_DARK).setCharacterSpacing(0.8f).setMargin(0));
        right.add(new Paragraph(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy 'à' HH:mm")))
            .setFont(bold).setFontSize(10.5f).setFontColor(WHITE).setMarginTop(2).setMarginBottom(0));
        right.add(statusBadge(kpi.getStatut()));
        inner.addCell(right);

        Table hero = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        hero.setMarginBottom(14);
        hero.addCell(new Cell()
            .add(inner)
            .setBorder(Border.NO_BORDER)
            .setBackgroundImage(heroGradient())
            .setPaddingTop(20).setPaddingBottom(20)
            .setPaddingLeft(24).setPaddingRight(24));

        document.add(hero);
    }

    private BackgroundImage heroGradient() {
        BufferedImage img = new BufferedImage(640, 220, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setPaint(new GradientPaint(0, 0, toAwt(BRAND), img.getWidth(), img.getHeight(), toAwt(BRAND_DEEP)));
        g.fillRect(0, 0, img.getWidth(), img.getHeight());
        g.dispose();

        try {
            ByteArrayOutputStream png = new ByteArrayOutputStream();
            ImageIO.write(img, "png", png);
            PdfImageXObject xObject = new PdfImageXObject(ImageDataFactory.create(png.toByteArray()));
            BackgroundSize size = new BackgroundSize();
            size.setBackgroundSizeToValues(UnitValue.createPercentValue(100), UnitValue.createPercentValue(100));
            return new BackgroundImage.Builder()
                .setImage(xObject)
                .setBackgroundSize(size)
                .setBackgroundRepeat(new BackgroundRepeat(BackgroundRepeat.BackgroundRepeatValue.NO_REPEAT))
                .build();
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du dégradé d'en-tête", e);
        }
    }

    private java.awt.Color toAwt(DeviceRgb color) {
        float[] c = color.getColorValue();
        return new java.awt.Color(c[0], c[1], c[2]);
    }

    /** Logo Qualinet sur un cartouche blanc : ses couleurs restent lisibles sur le dégradé vert. */
    private Table logoChip() {
        Image logo = new Image(ImageDataFactory.create(logoPng())).scaleToFit(66, 18);
        Table chip = new Table(UnitValue.createPointArray(new float[]{82}));
        chip.setMarginBottom(10);
        chip.addCell(new Cell()
            .add(logo)
            .setBackgroundColor(WHITE)
            .setBorder(Border.NO_BORDER)
            .setPaddingTop(5).setPaddingBottom(5).setPaddingLeft(8).setPaddingRight(8));
        return chip;
    }

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

    private Table statusBadge(String statut) {
        Table badge = new Table(UnitValue.createPointArray(new float[]{104}));
        badge.setHorizontalAlignment(HorizontalAlignment.RIGHT).setMarginTop(10);
        badge.addCell(new Cell()
            .add(new Paragraph(formatStatut(statut)).setFont(bold).setFontSize(8).setFontColor(WHITE).setMargin(0))
            .setBackgroundColor(statusColor(statut))
            .setBorder(Border.NO_BORDER)
            .setTextAlignment(TextAlignment.CENTER)
            .setPaddingTop(5).setPaddingBottom(5));
        return badge;
    }

    /* ---------- Bandeau de pilotage : 4 indicateurs ---------- */

    private void addStatCards(Document document, ProjetKPIReportDTO kpi) {
        Table cards = grille(4);
        cards.setMarginBottom(4);

        boolean planning = kpi.getTauxAvancementPlanifie() > 0;
        cards.addCell(statCard("AVANCEMENT RÉEL",
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxAvancement()),
            planning ? signe(kpi.getEcartPlanning(), 0) + " pts vs planning" : progressLabel(kpi.getTauxAvancement()),
            planning ? ecartColor(kpi.getEcartPlanning()) : progressColor(kpi.getTauxAvancement())));

        cards.addCell(statCard("INDICE DE DÉLAI (SPI)",
            planning ? String.format(Locale.FRANCE, "%.2f", kpi.getSpi()) : "–",
            spiLabel(kpi), spiColor(kpi)));

        cards.addCell(statCard("SANTÉ DU PROJET",
            String.format(Locale.FRANCE, "%.0f/100", kpi.getScoreSante()),
            niveauSanteLabel(kpi.getNiveauSante()), healthColor(kpi.getScoreSante())));

        int alertes = kpi.getAlertes() == null ? 0 : kpi.getAlertes().size();
        int bloquantes = compterAlertes(kpi, AlerteKPIDTO.CRITIQUE) + compterAlertes(kpi, AlerteKPIDTO.MAJEUR);
        cards.addCell(statCard("ALERTES",
            String.valueOf(alertes),
            bloquantes > 0 ? bloquantes + " à traiter en priorité" : "Aucune alerte bloquante",
            bloquantes > 0 ? RED : BRAND));

        document.add(cards);
    }

    private Cell statCard(String label, String value, String hint, DeviceRgb accent) {
        Cell card = new Cell()
            .setBackgroundColor(WHITE)
            .setBorder(new SolidBorder(LINE, 0.75f))
            .setBorderTop(new SolidBorder(accent, 3))
            .setPadding(10);
        card.add(new Paragraph(label)
            .setFont(bold).setFontSize(6.8f).setFontColor(MUTED).setCharacterSpacing(0.8f).setMargin(0));
        card.add(new Paragraph(value)
            .setFont(bold).setFontSize(18).setFontColor(INK).setMarginTop(5).setMarginBottom(0));
        card.add(new Paragraph(hint)
            .setFontSize(7.5f).setFontColor(accent).setMarginTop(3).setMarginBottom(0));
        return card;
    }

    /* ---------- Alertes de pilotage ---------- */

    private void addAlertes(Document document, ProjetKPIReportDTO kpi) {
        List<AlerteKPIDTO> alertes = kpi.getAlertes();
        if (alertes == null || alertes.isEmpty()) {
            return;
        }
        document.add(sectionTitle("ALERTES DE PILOTAGE", alertes.size() + " détectée(s)"));

        Table liste = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        liste.setBorderCollapse(BorderCollapsePropertyValue.SEPARATE).setVerticalBorderSpacing(5);
        for (AlerteKPIDTO alerte : alertes) {
            DeviceRgb accent = niveauColor(alerte.getNiveau());
            Cell cell = new Cell()
                .setBackgroundColor(niveauSoftColor(alerte.getNiveau())).setBorder(Border.NO_BORDER)
                .setBorderLeft(new SolidBorder(accent, 3)).setPaddingTop(7).setPaddingBottom(7)
                .setPaddingLeft(10).setPaddingRight(10).setKeepTogether(true);
            cell.add(new Paragraph()
                .add(new Text(alerte.getNiveau() + " · " + orDash(alerte.getCategorie()) + "   ")
                    .setFont(bold).setFontSize(7).setFontColor(accent).setCharacterSpacing(0.6f))
                .add(new Text(orDash(alerte.getTitre())).setFont(bold).setFontSize(9.5f).setFontColor(INK))
                .setMargin(0));
            cell.add(new Paragraph(orDash(alerte.getMessage()))
                .setFontSize(8.5f).setFontColor(MUTED).setMarginTop(2).setMarginBottom(0));
            liste.addCell(cell);
        }
        document.add(liste);
    }

    /* ---------- Avancement vs planning ---------- */

    private void addAvancementPlanning(Document document, ProjetKPIReportDTO kpi) {
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("AVANCEMENT VS PLANNING",
            kpi.getNombreFichesSuivi() > 0 ? kpi.getNombreFichesSuivi() + " fiche(s) de suivi" : null));

        block.add(ligneComparaison("Réalisé", kpi.getTauxAvancement(), progressColor(kpi.getTauxAvancement()),
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxAvancement())));
        block.add(ligneComparaison("Planifié à ce jour", kpi.getTauxAvancementPlanifie(), PLANNED,
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxAvancementPlanifie())));

        Table indicateurs = grille(3).setMarginTop(8);
        indicateurs.addCell(cadreChiffre("Depuis la fiche précédente", signe(kpi.getDeltaAvancement(), 1) + " pts",
            kpi.getDeltaAvancement() > 0 ? BRAND : AMBER));
        indicateurs.addCell(cadreChiffre("Jours de retard", String.valueOf(kpi.getJoursRetard()),
            kpi.getJoursRetard() > 0 ? RED : BRAND));
        indicateurs.addCell(cadreChiffre("Fin projetée",
            kpi.getDateFinProjetee() != null ? formatDate(kpi.getDateFinProjetee()) : "–", INK));
        block.add(indicateurs);

        if (kpi.getDateFinProjetee() != null) {
            boolean derapage = kpi.getJoursDerapageProjete() > 0;
            block.add(note(derapage
                    ? "Au rythme actuel, la fin est projetée au " + formatDate(kpi.getDateFinProjetee())
                        + ", soit " + kpi.getJoursDerapageProjete() + " jour(s) après la date prévue."
                    : "Au rythme actuel, le projet se termine dans les délais prévus.",
                derapage ? RED : BRAND_DEEP, derapage ? RED_SOFT : BRAND_SOFT));
        }
        document.add(block);
    }

    /* ---------- Santé du projet ---------- */

    private void addSante(Document document, ProjetKPIReportDTO kpi) {
        double score = kpi.getScoreSante();
        DeviceRgb color = healthColor(score);

        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("SANTÉ DU PROJET", null));

        Table head = new Table(UnitValue.createPercentArray(new float[]{22, 78})).useAllAvailableWidth();
        head.addCell(new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(new Paragraph()
                .add(new Text(String.format(Locale.FRANCE, "%.0f", score)).setFont(bold).setFontSize(28).setFontColor(color))
                .add(new Text(" /100").setFontSize(10).setFontColor(MUTED))
                .setMargin(0)));
        head.addCell(new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(new Paragraph(niveauSanteLabel(kpi.getNiveauSante()))
                .setFont(bold).setFontSize(13).setFontColor(INK).setMargin(0))
            .add(new Paragraph(niveauSanteDescription(kpi.getNiveauSante()))
                .setFontSize(9).setFontColor(MUTED).setMarginTop(2).setMarginBottom(0)));
        block.add(head);

        block.add(new Paragraph("Détail du calcul").setFont(bold).setFontSize(9).setFontColor(INK)
            .setMarginTop(10).setMarginBottom(2));
        Table detail = new Table(UnitValue.createPercentArray(new float[]{80, 20})).useAllAvailableWidth();
        if (kpi.getDetailScore() != null) {
            for (ComposanteScoreDTO composante : kpi.getDetailScore()) {
                addComposante(detail, composante);
            }
        }
        detail.addCell(new Cell()
            .add(new Paragraph("Score total").setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER).setPadding(8));
        detail.addCell(new Cell()
            .add(new Paragraph(String.format(Locale.FRANCE, "%.0f/100", score))
                .setFont(bold).setFontSize(9.5f).setFontColor(color).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER).setPadding(8)
            .setTextAlignment(TextAlignment.RIGHT));
        block.add(detail);

        document.add(block);
    }

    /** Une composante du score : libellé et maximum, barre de remplissage, commentaire, points obtenus. */
    private void addComposante(Table table, ComposanteScoreDTO composante) {
        double ratio = composante.getPointsMax() > 0 ? composante.getPoints() / composante.getPointsMax() * 100 : 0;
        DeviceRgb color = ratio >= 80 ? BRAND : (ratio >= 50 ? AMBER : RED);

        Cell libelle = new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPaddingTop(7).setPaddingBottom(7).setPaddingLeft(0).setPaddingRight(12);
        libelle.add(new Paragraph()
            .add(new Text(orDash(composante.getLibelle())).setFontSize(9.5f).setFontColor(INK))
            .add(new Text(String.format(Locale.FRANCE, "  / %.0f pts", composante.getPointsMax()))
                .setFontSize(8).setFontColor(MUTED))
            .setMargin(0));
        libelle.add(barre(ratio, color, 5).setMarginTop(4).setMarginBottom(3));
        if (composante.getCommentaire() != null && !composante.getCommentaire().isBlank()) {
            libelle.add(new Paragraph(composante.getCommentaire()).setFontSize(8).setFontColor(MUTED).setMargin(0));
        }
        table.addCell(libelle);

        table.addCell(new Cell()
            .add(new Paragraph(String.format(Locale.FRANCE, "%.1f pts", composante.getPoints()))
                .setFont(bold).setFontSize(9.5f).setFontColor(color).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPadding(7).setTextAlignment(TextAlignment.RIGHT).setVerticalAlignment(VerticalAlignment.TOP));
    }

    /* ---------- Évolution de l'avancement (une ligne par fiche de suivi) ---------- */

    private void addEvolution(Document document, ProjetKPIReportDTO kpi) {
        List<PointHistoriqueKPIDTO> historique = kpi.getHistorique();
        if (historique == null || historique.size() < 2) {
            return;
        }
        document.add(sectionTitle("ÉVOLUTION DE L'AVANCEMENT", historique.size() + " relevé(s)"));

        Table table = new Table(UnitValue.createPercentArray(new float[]{15, 27, 34, 12, 12})).useAllAvailableWidth();
        table.addHeaderCell(enTete("Date"));
        table.addHeaderCell(enTete("Rapport"));
        table.addHeaderCell(enTete("Avancement"));
        table.addHeaderCell(enTete("Problèmes").setTextAlignment(TextAlignment.RIGHT));
        table.addHeaderCell(enTete("Risques").setTextAlignment(TextAlignment.RIGHT));

        for (PointHistoriqueKPIDTO point : historique) {
            table.addCell(celluleTexte(formatDate(point.getDate()), INK, TextAlignment.LEFT));
            table.addCell(celluleTexte(orDash(point.getNumeroRapport()), MUTED, TextAlignment.LEFT));

            Table avancement = new Table(UnitValue.createPercentArray(new float[]{72, 28})).useAllAvailableWidth();
            avancement.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .add(barre(point.getTauxAvancement(), progressColor(point.getTauxAvancement()), 5)));
            avancement.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingLeft(6)
                .add(new Paragraph(String.format(Locale.FRANCE, "%.0f %%", point.getTauxAvancement()))
                    .setFont(bold).setFontSize(9).setFontColor(INK).setMargin(0)));
            table.addCell(new Cell().add(avancement).setBorder(Border.NO_BORDER)
                .setBorderBottom(new SolidBorder(LINE, 0.75f)).setPadding(6).setVerticalAlignment(VerticalAlignment.MIDDLE));

            table.addCell(celluleTexte(String.valueOf(point.getNombreProblemes()), MUTED, TextAlignment.RIGHT));
            table.addCell(celluleTexte(String.valueOf(point.getNombreRisques()), MUTED, TextAlignment.RIGHT));
        }
        document.add(table);
    }

    /* ---------- Exécution des tâches ---------- */

    private void addTaches(Document document, ProjetKPIReportDTO kpi) {
        if (kpi.getTotalTaches() == 0) {
            return;
        }
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("EXÉCUTION DES TÂCHES", kpi.getTotalTaches() + " tâche(s)"));

        Table repartition = grille(3);
        repartition.addCell(cadreChiffre("Terminées", kpi.getTachesTerminees() + " / " + kpi.getTotalTaches(), BRAND));
        repartition.addCell(cadreChiffre("En cours", String.valueOf(kpi.getTachesEnCours()), BLUE));
        repartition.addCell(cadreChiffre("Non démarrées", String.valueOf(kpi.getTachesNonDemarrees()), GRAY));
        repartition.addCell(cadreChiffre("Hors délai", String.valueOf(kpi.getTachesEnRetard()),
            kpi.getTachesEnRetard() > 0 ? RED : BRAND));
        repartition.addCell(cadreChiffre("Échéances imminentes", String.valueOf(kpi.getTachesEcheanceProche()),
            kpi.getTachesEcheanceProche() > 0 ? AMBER : BRAND));
        repartition.addCell(cadreChiffre("Respect des échéances",
            kpi.getTauxRespectEcheances() >= 0 ? String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxRespectEcheances()) : "–",
            INK));
        block.add(repartition);
        document.add(block);

        addTableTaches(document, "Tâches hors délai", kpi.getListeTachesEnRetard(), RED, true);
        addTableTaches(document, "Échéances imminentes", kpi.getListeTachesEcheanceProche(), AMBER, false);
    }

    private void addTableTaches(Document document, String titre, List<TacheKPIDTO> taches,
                                DeviceRgb accent, boolean retard) {
        if (taches == null || taches.isEmpty()) {
            return;
        }
        document.add(new Paragraph(titre + " (" + taches.size() + ")")
            .setFont(bold).setFontSize(9.5f).setFontColor(accent)
            .setMarginTop(10).setMarginBottom(4).setKeepWithNext(true));

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
            table.addCell(celluleTexte(tache.getPourcentageRealise() + " %", INK, TextAlignment.RIGHT));
            table.addCell(celluleTexte(Math.abs(tache.getJoursEcart()) + " j", accent, TextAlignment.RIGHT));
        }
        document.add(table);
    }

    /* ---------- Charge et efficacité (seulement si des temps ont été saisis) ---------- */

    private void addCharge(Document document, ProjetKPIReportDTO kpi) {
        if (kpi.getChargeEstimee() <= 0 && kpi.getChargeConsommee() <= 0) {
            return;
        }
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("CHARGE ET EFFICACITÉ",
            String.format(Locale.FRANCE, "Indice CPI %.2f", kpi.getIndiceEfficacite())));

        Table stats = grille(4);
        stats.addCell(cadreChiffre("Charge estimée", String.format(Locale.FRANCE, "%.0f j", kpi.getChargeEstimee()), INK));
        stats.addCell(cadreChiffre("Charge consommée", String.format(Locale.FRANCE, "%.0f j", kpi.getChargeConsommee()), INK));
        stats.addCell(cadreChiffre("Reste à faire", String.format(Locale.FRANCE, "%.0f j", kpi.getChargeRestanteEstimee()), INK));
        stats.addCell(cadreChiffre("Efficacité (CPI)",
            kpi.getChargeConsommee() > 0 ? String.format(Locale.FRANCE, "%.2f", kpi.getIndiceEfficacite()) : "–",
            kpi.getIndiceEfficacite() >= 1 ? BRAND : (kpi.getIndiceEfficacite() >= 0.8 ? AMBER : RED)));
        block.add(stats);

        if (kpi.getChargeEstimee() > 0) {
            block.add(ligneComparaison("Consommation", kpi.getTauxConsommationCharge(),
                kpi.getTauxConsommationCharge() > kpi.getTauxAvancement() + 15 ? RED : BRAND,
                String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxConsommationCharge())).setMarginTop(8));
            block.add(new Paragraph(String.format(Locale.FRANCE,
                    "%.0f %% de la charge estimée consommée pour %.0f %% d'avancement.",
                    kpi.getTauxConsommationCharge(), kpi.getTauxAvancement()))
                .setFontSize(8.5f).setFontColor(MUTED).setMarginTop(2).setMarginBottom(0));
        }
        document.add(block);
    }

    /* ---------- Calendrier et équipe, côte à côte ---------- */

    private void addCalendrierEtEquipe(Document document, ProjetKPIReportDTO kpi) {
        Table deuxColonnes = grille(2).setMarginTop(4);
        deuxColonnes.setKeepTogether(true);

        Cell calendrier = cadre();
        calendrier.add(titreCadre("CALENDRIER", dureeJours(kpi)));
        calendrier.add(ligneInfo("Début", formatDate(kpi.getDateDebut()), INK));
        calendrier.add(ligneInfo("Fin prévue", formatDate(kpi.getDateFinPrevue()), INK));
        if (kpi.getDateFinReelle() != null && !kpi.getDateFinReelle().isBlank()) {
            calendrier.add(ligneInfo("Livré le", formatDate(kpi.getDateFinReelle()), BRAND_DEEP));
        }
        Long retardLivraison = retardLivraison(kpi);
        if (retardLivraison != null) {
            calendrier.add(ligneInfo("Délais", retardLivraison > 0
                    ? "Livré avec " + retardLivraison + " jour(s) de retard" : "Livré dans les délais",
                retardLivraison > 0 ? RED : BRAND_DEEP));
        } else {
            calendrier.add(ligneInfo("Délais", kpi.getJoursRetard() > 0
                    ? kpi.getJoursRetard() + " jour(s) de retard" : "Dans les délais",
                kpi.getJoursRetard() > 0 ? RED : BRAND_DEEP));
        }
        if (kpi.getDateFinProjetee() != null) {
            calendrier.add(ligneInfo("Fin projetée", formatDate(kpi.getDateFinProjetee()),
                kpi.getJoursDerapageProjete() > 0 ? RED : BRAND_DEEP));
        }
        if (kpi.getDateDerniereFiche() != null) {
            calendrier.add(ligneInfo("Dernière fiche", formatDate(kpi.getDateDerniereFiche()), INK));
        }
        deuxColonnes.addCell(calendrier);

        Cell equipe = cadre();
        int taille = kpi.getTailleEquipe();
        equipe.add(titreCadre("ÉQUIPE", taille > 0 ? taille + (taille > 1 ? " membres" : " membre") : null));
        List<MembreEquipeDTO> membres = kpi.getListeMembresEquipe();
        if (membres == null || membres.isEmpty()) {
            equipe.add(new Paragraph("Aucun membre affecté à ce projet").setFontSize(9).setFontColor(MUTED).setMargin(0));
        } else {
            for (MembreEquipeDTO membre : membres) {
                equipe.add(ligneInfo(orDash(membre.getNom()), orDash(membre.getRole()), MUTED));
            }
        }
        deuxColonnes.addCell(equipe);

        document.add(deuxColonnes);
    }

    /* ---------- Budget ---------- */

    private void addBudget(Document document, ProjetKPIReportDTO kpi) {
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("BUDGET", String.format(Locale.FRANCE, "%.2f MD", kpi.getBudgetTotal())));
        block.add(new Paragraph("Budget cadré dans la fiche projet").setFontSize(8.5f).setFontColor(MUTED).setMargin(0));
        block.add(new Paragraph()
            .add(new Text(money(kpi.getBudgetTotal())).setFont(bold).setFontSize(20).setFontColor(INK))
            .add(new Text(" DT").setFontSize(10).setFontColor(MUTED))
            .setMarginTop(2).setMarginBottom(8));

        if (kpi.getBudgetPrevision() <= 0 && kpi.getBudgetRealisation() <= 0) {
            block.add(note("Aucun suivi budgétaire (prévision / réalisation) n'a été renseigné dans les fiches de suivi.",
                MUTED, SURFACE_ALT));
            document.add(block);
            return;
        }

        block.add(ligneComparaison("Prévu", 100, PLANNED, money(kpi.getBudgetPrevision()) + " DT"));
        block.add(ligneComparaison("Consommé", kpi.getTauxConsommationBudget(),
            kpi.getTauxConsommationBudget() > kpi.getTauxAvancement() + 15 ? RED : BRAND,
            money(kpi.getBudgetRealisation()) + " DT"));

        Table indicateurs = grille(2).setMarginTop(8);
        indicateurs.addCell(cadreChiffre("Taux de consommation",
            String.format(Locale.FRANCE, "%.0f %%", kpi.getTauxConsommationBudget()), INK));
        indicateurs.addCell(cadreChiffre("Écart disponible", money(kpi.getEcartBudget()) + " DT",
            kpi.getEcartBudget() >= 0 ? BRAND : RED));
        block.add(indicateurs);

        document.add(block);
    }

    /* ---------- Recommandations du chef de projet ---------- */

    private void addRecommandations(Document document, ProjetKPIReportDTO kpi) {
        List<String> recommandations = kpi.getListeRecommandations();
        if (recommandations == null || recommandations.isEmpty()) {
            return;
        }
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("RECOMMANDATIONS DU CHEF DE PROJET", null));

        Table liste = new Table(UnitValue.createPercentArray(new float[]{6, 94})).useAllAvailableWidth();
        int numero = 1;
        for (String recommandation : recommandations) {
            liste.addCell(new Cell()
                .add(new Paragraph(String.valueOf(numero++)).setFont(bold).setFontSize(9).setFontColor(WHITE).setMargin(0))
                .setBackgroundColor(BRAND).setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(WHITE, 4))
                .setTextAlignment(TextAlignment.CENTER).setVerticalAlignment(VerticalAlignment.MIDDLE).setPadding(5));
            liste.addCell(new Cell()
                .add(new Paragraph(recommandation).setFontSize(9.5f).setFontColor(INK).setMargin(0))
                .setBackgroundColor(BRAND_SOFT).setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(WHITE, 4))
                .setPaddingTop(6).setPaddingBottom(6).setPaddingLeft(9).setPaddingRight(9));
        }
        block.add(liste);
        document.add(block);
    }

    /* ---------- Problèmes et risques, côte à côte ---------- */

    private void addProblemesEtRisques(Document document, ProjetKPIReportDTO kpi) {
        document.add(sectionTitle("PROBLÈMES ET RISQUES", null));

        Table deuxColonnes = grille(2);
        deuxColonnes.addCell(listeQualite("Problèmes", kpi.getListeProblemes(), kpi.getNombreProblemes(),
            RED, RED_SOFT, "Aucun problème déclaré dans la dernière fiche."));
        deuxColonnes.addCell(listeQualite("Risques", kpi.getListeRisques(), kpi.getNombreRisques(),
            AMBER, AMBER_SOFT, "Aucun risque déclaré dans la dernière fiche."));
        document.add(deuxColonnes);
    }

    private Cell listeQualite(String titre, List<String> elements, int nombre, DeviceRgb accent,
                              DeviceRgb fond, String vide) {
        Cell colonne = new Cell().setBorder(Border.NO_BORDER).setPadding(0);
        int total = elements != null ? elements.size() : nombre;
        colonne.add(new Paragraph()
            .add(new Text(titre).setFont(bold).setFontSize(10).setFontColor(INK))
            .add(new Text("  " + total).setFont(bold).setFontSize(10).setFontColor(accent))
            .setMarginTop(0).setMarginBottom(6));

        if (elements == null || elements.isEmpty()) {
            colonne.add(note(vide, MUTED, SURFACE_ALT).setMarginTop(0));
            return colonne;
        }
        Table liste = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
        liste.setBorderCollapse(BorderCollapsePropertyValue.SEPARATE).setVerticalBorderSpacing(4);
        for (String element : elements) {
            liste.addCell(new Cell()
                .add(new Paragraph(element).setFontSize(9).setFontColor(INK).setMargin(0))
                .setBackgroundColor(fond).setBorder(Border.NO_BORDER).setBorderLeft(new SolidBorder(accent, 3))
                .setPadding(7).setKeepTogether(true));
        }
        colonne.add(liste);
        return colonne;
    }

    /* ---------- Briques réutilisables ---------- */

    /** Titre de section avec, à droite, une précision discrète (nombre d'éléments, unité...). */
    private Table sectionTitle(String title, String precision) {
        Table titre = new Table(UnitValue.createPercentArray(new float[]{70, 30})).useAllAvailableWidth();
        titre.setMarginTop(16).setMarginBottom(8).setKeepWithNext(true);
        titre.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 1))
            .setPaddingLeft(0).setPaddingBottom(5)
            .add(new Paragraph(title).setFont(bold).setFontSize(10).setFontColor(INK).setCharacterSpacing(1.1f).setMargin(0)));
        titre.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 1))
            .setPaddingRight(0).setPaddingBottom(5).setTextAlignment(TextAlignment.RIGHT)
            .setVerticalAlignment(VerticalAlignment.BOTTOM)
            .add(new Paragraph(precision != null ? precision : "").setFontSize(8).setFontColor(MUTED).setMargin(0)));
        return titre;
    }

    /** Grille de cadres côte à côte, séparés d'une gouttière. */
    private Table grille(int colonnes) {
        float[] largeurs = new float[colonnes];
        Arrays.fill(largeurs, 1f);
        Table table = new Table(UnitValue.createPercentArray(largeurs)).useAllAvailableWidth();
        table.setBorderCollapse(BorderCollapsePropertyValue.SEPARATE);
        table.setHorizontalBorderSpacing(GOUTTIERE).setVerticalBorderSpacing(GOUTTIERE);
        // Compense l'espacement extérieur pour aligner la grille sur les marges du document
        table.setMarginLeft(-GOUTTIERE).setMarginRight(-GOUTTIERE);
        return table;
    }

    /** Petit cadre « libellé + valeur », comme les mini-indicateurs de la page KPI. */
    private Cell cadreChiffre(String label, String value, DeviceRgb color) {
        return new Cell()
            .add(new Paragraph(label).setFontSize(7.5f).setFontColor(MUTED).setMargin(0))
            .add(new Paragraph(value).setFont(bold).setFontSize(12.5f).setFontColor(color).setMarginTop(3).setMarginBottom(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(new SolidBorder(LINE, 0.75f))
            .setPaddingTop(8).setPaddingBottom(8).setPaddingLeft(10).setPaddingRight(10);
    }

    private Cell cadre() {
        return new Cell().setBackgroundColor(WHITE).setBorder(new SolidBorder(LINE, 0.75f)).setPadding(12);
    }

    private Table titreCadre(String titre, String precision) {
        Table entete = new Table(UnitValue.createPercentArray(new float[]{60, 40})).useAllAvailableWidth();
        entete.setMarginBottom(6);
        entete.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0)
            .add(new Paragraph(titre).setFont(bold).setFontSize(9.5f).setFontColor(INK).setCharacterSpacing(1f).setMargin(0)));
        entete.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0).setTextAlignment(TextAlignment.RIGHT)
            .add(new Paragraph(precision != null ? precision : "").setFontSize(8).setFontColor(MUTED).setMargin(0)));
        return entete;
    }

    /** Ligne « clé : valeur » d'un cadre (calendrier, équipe). */
    private Table ligneInfo(String cle, String valeur, DeviceRgb couleurValeur) {
        Table ligne = new Table(UnitValue.createPercentArray(new float[]{45, 55})).useAllAvailableWidth();
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.5f))
            .setPaddingLeft(0).setPaddingTop(5).setPaddingBottom(5)
            .add(new Paragraph(cle).setFontSize(9).setFontColor(INK).setMargin(0)));
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.5f))
            .setPaddingRight(0).setPaddingTop(5).setPaddingBottom(5).setTextAlignment(TextAlignment.RIGHT)
            .add(new Paragraph(valeur).setFont(bold).setFontSize(9).setFontColor(couleurValeur).setMargin(0)));
        return ligne;
    }

    /** Ligne de comparaison « libellé | barre | valeur », comme « Réalisé / Planifié » sur la page KPI. */
    private Table ligneComparaison(String label, double pourcentage, DeviceRgb couleur, String valeur) {
        Table ligne = new Table(UnitValue.createPercentArray(new float[]{20, 58, 22})).useAllAvailableWidth();
        ligne.setMarginBottom(3);
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(0).setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(new Paragraph(label).setFontSize(9).setFontColor(MUTED).setMargin(0)));
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(barre(pourcentage, couleur, 9)));
        ligne.addCell(new Cell().setBorder(Border.NO_BORDER).setPaddingRight(0).setTextAlignment(TextAlignment.RIGHT)
            .setVerticalAlignment(VerticalAlignment.MIDDLE)
            .add(new Paragraph(valeur).setFont(bold).setFontSize(10).setFontColor(INK).setMargin(0)));
        return ligne;
    }

    private Paragraph note(String texte, DeviceRgb couleur, DeviceRgb fond) {
        return new Paragraph(texte).setFontSize(8.5f).setFontColor(couleur).setBackgroundColor(fond)
            .setPadding(8).setMarginTop(8).setMarginBottom(0);
    }

    private Cell enTete(String text) {
        return new Cell()
            .add(new Paragraph(text).setFont(bold).setFontSize(7.5f).setFontColor(MUTED)
                .setCharacterSpacing(0.6f).setMargin(0))
            .setBackgroundColor(SURFACE_ALT)
            .setBorder(Border.NO_BORDER)
            .setBorderBottom(new SolidBorder(LINE, 1))
            .setPadding(6);
    }

    private Cell celluleTexte(String texte, DeviceRgb couleur, TextAlignment alignement) {
        return new Cell()
            .add(new Paragraph(texte).setFontSize(9).setFontColor(couleur).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPadding(6).setTextAlignment(alignement).setVerticalAlignment(VerticalAlignment.MIDDLE);
    }

    /** Barre de progression : la part remplie dans la couleur donnée, le reste en gris clair. */
    private Table barre(double percentage, DeviceRgb color, float hauteur) {
        float pct = (float) Math.max(0, Math.min(100, percentage));
        Table bar;
        if (pct < 1f) {
            bar = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            bar.addCell(cellBarre(TRACK, hauteur));
        } else if (pct > 99f) {
            bar = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            bar.addCell(cellBarre(color, hauteur));
        } else {
            bar = new Table(UnitValue.createPercentArray(new float[]{pct, 100 - pct})).useAllAvailableWidth();
            bar.addCell(cellBarre(color, hauteur));
            bar.addCell(cellBarre(TRACK, hauteur));
        }
        return bar;
    }

    private Cell cellBarre(DeviceRgb color, float hauteur) {
        return new Cell().setHeight(hauteur).setBackgroundColor(color).setBorder(Border.NO_BORDER).setPadding(0);
    }

    /* ---------- Filet supérieur, pied de page et pagination ---------- */

    private void decoratePage(PdfPage page, int pageNumber, int totalPages, String projet) {
        Rectangle size = page.getPageSize();
        PdfCanvas pdfCanvas = new PdfCanvas(page);

        pdfCanvas.saveState()
            .setFillColor(BRAND_DEEP)
            .rectangle(0, size.getTop() - 7, size.getWidth(), 7)
            .fill()
            .restoreState();
        pdfCanvas.saveState()
            .setFillColor(BRAND)
            .rectangle(0, size.getTop() - 7, size.getWidth() * 0.42f, 7)
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

    /* ---------- Utilitaires ---------- */

    private DeviceRgb statusColor(String statut) {
        if (statut == null) return GRAY;
        switch (statut.toUpperCase()) {
            case "EN_COURS": return BLUE;
            case "TERMINE": return BRAND;
            case "EN_ATTENTE": return AMBER;
            case "ANNULE": return RED;
            default: return GRAY;
        }
    }

    private DeviceRgb ecartColor(double ecart) {
        if (ecart >= 0) return BRAND;
        if (ecart >= -10) return AMBER;
        return RED;
    }

    /** Mêmes seuils que la page KPI : au-delà de 1,05 le projet est réellement en avance. */
    private String spiLabel(ProjetKPIReportDTO kpi) {
        if (kpi.getTauxAvancementPlanifie() <= 0) return "Planning non exploitable";
        if (kpi.getSpi() > 1.05) return "En avance sur le planning";
        if (kpi.getSpi() >= 0.9) return "Conforme au planning";
        if (kpi.getSpi() >= 0.8) return "Léger retrait";
        return "Retard significatif";
    }

    private DeviceRgb spiColor(ProjetKPIReportDTO kpi) {
        if (kpi.getTauxAvancementPlanifie() <= 0) return GRAY;
        if (kpi.getSpi() >= 0.9) return BRAND;
        if (kpi.getSpi() >= 0.8) return AMBER;
        return RED;
    }

    private String niveauSanteLabel(String niveau) {
        if (niveau == null) return "-";
        switch (niveau) {
            case "EXCELLENT": return "Excellent";
            case "BON": return "Bon";
            case "ATTENTION": return "Attention";
            default: return "Critique";
        }
    }

    private String niveauSanteDescription(String niveau) {
        if (niveau == null) return "";
        switch (niveau) {
            case "EXCELLENT": return "Les indicateurs sont au vert sur les quatre axes de pilotage.";
            case "BON": return "Le projet avance correctement, avec quelques points de vigilance.";
            case "ATTENTION": return "Plusieurs indicateurs se dégradent : un arbitrage est nécessaire.";
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

    private DeviceRgb niveauColor(String niveau) {
        if (AlerteKPIDTO.CRITIQUE.equals(niveau)) return RED;
        if (AlerteKPIDTO.MAJEUR.equals(niveau)) return AMBER;
        return BLUE;
    }

    private DeviceRgb niveauSoftColor(String niveau) {
        if (AlerteKPIDTO.CRITIQUE.equals(niveau)) return RED_SOFT;
        if (AlerteKPIDTO.MAJEUR.equals(niveau)) return AMBER_SOFT;
        return BLUE_SOFT;
    }

    private DeviceRgb healthColor(double score) {
        if (score >= 80) return GREEN;
        if (score >= 60) return BLUE;
        if (score >= 40) return AMBER;
        return RED;
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

    private DeviceRgb progressColor(double percentage) {
        if (percentage >= 75) return GREEN;
        if (percentage >= 50) return BLUE;
        if (percentage >= 25) return AMBER;
        return RED;
    }

    private String progressLabel(double percentage) {
        if (percentage >= 75) return "Excellent progrès";
        if (percentage >= 50) return "Bon avancement";
        if (percentage >= 25) return "En cours";
        return "Démarrage";
    }

    /** Durée du projet en jours, affichée à côté du titre « Calendrier » comme sur la page. */
    private String dureeJours(ProjetKPIReportDTO kpi) {
        try {
            long jours = ChronoUnit.DAYS.between(
                LocalDate.parse(kpi.getDateDebut()), LocalDate.parse(kpi.getDateFinPrevue()));
            return jours > 0 ? jours + " jours" : null;
        } catch (Exception e) {
            return null;
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

    private String money(double valueMD) {
        // le separateur de milliers francais est un espace insecable (fine ou non) : Helvetica ne le connait
        // pas, on le remplace par une espace ordinaire
        return String.format(Locale.FRANCE, "%,.0f", valueMD * 1_000_000)
            .replace(' ', ' ')
            .replace(' ', ' ');
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
}
