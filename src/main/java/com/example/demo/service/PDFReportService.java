package com.example.demo.service;

import com.example.demo.dto.MembreEquipeDTO;
import com.example.demo.dto.ProjetKPIReportDTO;
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
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.BackgroundImage;
import com.itextpdf.layout.properties.BackgroundRepeat;
import com.itextpdf.layout.properties.BackgroundSize;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.GradientPaint;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class PDFReportService {

    private static final DeviceRgb INK = new DeviceRgb(15, 23, 42);
    private static final DeviceRgb BRAND = new DeviceRgb(9, 200, 44);
    private static final DeviceRgb BRAND_DEEP = new DeviceRgb(5, 110, 30);
    private static final DeviceRgb MUTED = new DeviceRgb(100, 116, 139);
    private static final DeviceRgb MUTED_ON_DARK = new DeviceRgb(214, 247, 220);
    private static final DeviceRgb LINE = new DeviceRgb(226, 232, 240);
    private static final DeviceRgb SURFACE_ALT = new DeviceRgb(248, 250, 252);
    private static final DeviceRgb WHITE = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb TRACK = new DeviceRgb(238, 241, 246);
    private static final DeviceRgb RED = new DeviceRgb(239, 68, 68);
    private static final DeviceRgb RED_SOFT = new DeviceRgb(254, 242, 242);
    private static final DeviceRgb AMBER = new DeviceRgb(245, 158, 11);
    private static final DeviceRgb AMBER_SOFT = new DeviceRgb(255, 251, 235);
    private static final DeviceRgb BLUE = new DeviceRgb(59, 130, 246);
    private static final DeviceRgb BLUE_SOFT = new DeviceRgb(239, 246, 255);
    private static final DeviceRgb GRAY = new DeviceRgb(107, 114, 128);

    private static final float MARGIN = 40f;

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

        addHero(document, kpi);
        addStatCards(document, kpi);
        addAvancement(document, kpi);
        addSante(document, kpi);
        addSynthese(document, kpi);
        addBudget(document, kpi);
        addEquipe(document, kpi);
        addRecommandations(document, kpi);
        addQualite(document, kpi);

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
        left.add(new Paragraph("RAPPORT DE PILOTAGE QUALITÉ")
            .setFont(bold).setFontSize(7.5f).setFontColor(WHITE).setCharacterSpacing(1.4f).setMargin(0));
        left.add(new Paragraph("KPI du Projet")
            .setFont(bold).setFontSize(23).setFontColor(WHITE).setMarginTop(6).setMarginBottom(0));
        left.add(new Paragraph(orDash(kpi.getNomProjet()))
            .setFontSize(11).setFontColor(MUTED_ON_DARK).setMarginTop(3).setMarginBottom(0));
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
        hero.setMarginBottom(18);
        hero.addCell(new Cell()
            .add(inner)
            .setBorder(Border.NO_BORDER)
            .setBackgroundImage(heroGradient())
            .setPaddingTop(22).setPaddingBottom(22)
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

    /* ---------- Bandeau de 4 indicateurs ---------- */

    private void addStatCards(Document document, ProjetKPIReportDTO kpi) {
        Table cards = new Table(UnitValue.createPercentArray(
            new float[]{24f, 1.33f, 24f, 1.33f, 24f, 1.33f, 24f})).useAllAvailableWidth();
        cards.setMarginBottom(6);

        cards.addCell(statCard("AVANCEMENT",
            String.format(Locale.FRANCE, "%.0f%%", kpi.getTauxAvancement()),
            progressLabel(kpi.getTauxAvancement()), progressColor(kpi.getTauxAvancement())));
        cards.addCell(spacer());

        boolean late = kpi.getJoursRetard() > 0;
        cards.addCell(statCard("RETARD",
            kpi.getJoursRetard() + (kpi.getJoursRetard() > 1 ? " jours" : " jour"),
            late ? "Planning à rattraper" : "Dans les délais",
            late ? RED : BRAND));
        cards.addCell(spacer());

        cards.addCell(statCard("PROBLÈMES",
            String.valueOf(kpi.getNombreProblemes()),
            kpi.getNombreProblemes() > 5 ? "Attention requise" : "Sous contrôle",
            kpi.getNombreProblemes() > 5 ? RED : BRAND));
        cards.addCell(spacer());

        cards.addCell(statCard("RISQUES",
            String.valueOf(kpi.getNombreRisques()),
            kpi.getNombreRisques() > 3 ? "Vigilance" : "Acceptable",
            kpi.getNombreRisques() > 3 ? AMBER : BRAND));

        document.add(cards);
    }

    private Cell statCard(String label, String value, String hint, DeviceRgb accent) {
        Cell card = new Cell()
            .setBackgroundColor(WHITE)
            .setBorder(new SolidBorder(LINE, 0.75f))
            .setBorderTop(new SolidBorder(accent, 3))
            .setPadding(11);
        card.add(new Paragraph(label)
            .setFont(bold).setFontSize(7).setFontColor(MUTED).setCharacterSpacing(0.9f).setMargin(0));
        card.add(new Paragraph(value)
            .setFont(bold).setFontSize(19).setFontColor(INK).setMarginTop(5).setMarginBottom(0));
        card.add(new Paragraph(hint)
            .setFontSize(7.5f).setFontColor(accent).setMarginTop(3).setMarginBottom(0));
        return card;
    }

    private Cell spacer() {
        return new Cell().setBorder(Border.NO_BORDER).setPadding(0);
    }

    /* ---------- Sections ---------- */

    private void addAvancement(Document document, ProjetKPIReportDTO kpi) {
        double pct = kpi.getTauxAvancement();

        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("AVANCEMENT DU PROJET"));
        block.add(new Paragraph(String.format(Locale.FRANCE, "%.1f %%", pct))
            .setFont(bold).setFontSize(26).setFontColor(progressColor(pct)).setMarginBottom(2));
        block.add(progressBar(pct));

        Table legend = new Table(UnitValue.createPercentArray(new float[]{50, 50})).useAllAvailableWidth();
        legend.addCell(borderless(new Paragraph(progressLabel(pct)).setFontSize(9).setFontColor(MUTED)));
        legend.addCell(borderless(new Paragraph("Objectif : 100 %").setFontSize(9).setFontColor(MUTED))
            .setTextAlignment(TextAlignment.RIGHT));
        legend.setMarginBottom(4);
        block.add(legend);

        document.add(block);
    }

    private void addSante(Document document, ProjetKPIReportDTO kpi) {
        double score = healthScore(kpi);
        DeviceRgb color = healthColor(score);

        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("SANTÉ DU PROJET"));

        Table head = new Table(UnitValue.createPercentArray(new float[]{25, 75})).useAllAvailableWidth();
        Cell scoreCell = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
        scoreCell.add(new Paragraph()
            .add(new Text(String.format(Locale.FRANCE, "%.0f", score)).setFont(bold).setFontSize(26).setFontColor(color))
            .add(new Text(" /100").setFontSize(10).setFontColor(MUTED))
            .setMargin(0));
        head.addCell(scoreCell);

        Cell info = new Cell().setBorder(Border.NO_BORDER).setVerticalAlignment(VerticalAlignment.MIDDLE);
        info.add(new Paragraph(healthLabel(score)).setFont(bold).setFontSize(13).setFontColor(INK).setMargin(0));
        info.add(new Paragraph(healthDescription(score)).setFontSize(9).setFontColor(MUTED).setMarginTop(3));
        head.addCell(info);
        block.add(head);

        int avancementPts = (int) Math.round((kpi.getTauxAvancement() / 100.0) * 40);
        int problemsPts = 30 - Math.min(kpi.getNombreProblemes() * 5, 30);
        int risksPts = 20 - Math.min(kpi.getNombreRisques() * 5, 20);
        int delayPts = kpi.getJoursRetard() == 0 ? 10 : (kpi.getJoursRetard() <= 7 ? 5 : 0);

        Table breakdown = new Table(UnitValue.createPercentArray(new float[]{70, 30})).useAllAvailableWidth();
        breakdown.setMarginTop(14);
        addScoreRow(breakdown, "Avancement (40 pts max)", avancementPts, BRAND);
        addScoreRow(breakdown, "Problèmes (30 pts max)", problemsPts, problemsPts > 15 ? BRAND : RED);
        addScoreRow(breakdown, "Risques (20 pts max)", risksPts, risksPts > 10 ? BRAND : AMBER);
        addScoreRow(breakdown, "Respect des délais (10 pts max)", delayPts, delayPts == 10 ? BRAND : AMBER);

        breakdown.addCell(new Cell()
            .add(new Paragraph("Score total").setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER)
            .setBorderTop(new SolidBorder(LINE, 1)).setPadding(8));
        breakdown.addCell(new Cell()
            .add(new Paragraph(String.format(Locale.FRANCE, "%.0f/100", score)).setFont(bold).setFontSize(9.5f).setFontColor(color).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER)
            .setBorderTop(new SolidBorder(LINE, 1)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));

        block.add(breakdown);
        document.add(block);
    }

    private void addScoreRow(Table table, String label, int points, DeviceRgb color) {
        table.addCell(new Cell()
            .add(new Paragraph(label).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f)).setPadding(8));
        table.addCell(new Cell()
            .add(new Paragraph((points >= 0 ? "+" : "") + points + " pts").setFont(bold).setFontSize(9.5f).setFontColor(color).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
    }

    private void addSynthese(Document document, ProjetKPIReportDTO kpi) {
        addSectionTitle(document, "SYNTHÈSE DU PROJET");

        Table table = infoTable();
        addInfoRow(table, "Nom du projet", orDash(kpi.getNomProjet()));
        addInfoRow(table, "Statut", formatStatut(kpi.getStatut()));
        addInfoRow(table, "Date de début", formatDate(kpi.getDateDebut()));
        addInfoRow(table, "Date de fin prévue", formatDate(kpi.getDateFinPrevue()));
        if (kpi.getDateFinReelle() != null && !kpi.getDateFinReelle().isBlank()) {
            addInfoRow(table, "Date de fin réelle", formatDate(kpi.getDateFinReelle()));
        }
        addInfoRow(table, "Jours de retard", String.valueOf(kpi.getJoursRetard()));
        document.add(table);
    }

    private void addBudget(Document document, ProjetKPIReportDTO kpi) {
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("BUDGET"));
        block.add(new Paragraph(money(kpi.getBudgetTotal()) + " DH")
            .setFont(bold).setFontSize(22).setFontColor(INK).setMarginBottom(1));
        block.add(new Paragraph(String.format(Locale.FRANCE, "Budget total alloué · %.2f MDH", kpi.getBudgetTotal()))
            .setFontSize(9).setFontColor(MUTED).setMarginBottom(10));

        double breakdownTotal = kpi.getBudgetMateriel() + kpi.getBudgetLogiciel() + kpi.getBudgetRessourcesHumaines();
        if (breakdownTotal <= 0) {
            document.add(block);
            return;
        }

        Table table = new Table(UnitValue.createPercentArray(new float[]{44, 34, 22})).useAllAvailableWidth();
        table.setMarginBottom(4);
        table.addHeaderCell(headerCell("Poste"));
        table.addHeaderCell(headerCell("Montant (DH)").setTextAlignment(TextAlignment.RIGHT));
        table.addHeaderCell(headerCell("Part").setTextAlignment(TextAlignment.RIGHT));

        addBudgetRow(table, "Matériel", kpi.getBudgetMateriel(), breakdownTotal, BLUE);
        addBudgetRow(table, "Logiciel", kpi.getBudgetLogiciel(), breakdownTotal, new DeviceRgb(124, 58, 237));
        addBudgetRow(table, "Ressources humaines", kpi.getBudgetRessourcesHumaines(), breakdownTotal, BRAND);

        table.addCell(new Cell()
            .add(new Paragraph("Total réparti").setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER)
            .setBorderTop(new SolidBorder(LINE, 1)).setPadding(8));
        table.addCell(new Cell()
            .add(new Paragraph(money(breakdownTotal)).setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER)
            .setBorderTop(new SolidBorder(LINE, 1)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));
        table.addCell(new Cell()
            .add(new Paragraph("100 %").setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBackgroundColor(SURFACE_ALT).setBorder(Border.NO_BORDER)
            .setBorderTop(new SolidBorder(LINE, 1)).setPadding(8).setTextAlignment(TextAlignment.RIGHT));

        block.add(table);
        document.add(block);
    }

    private void addEquipe(Document document, ProjetKPIReportDTO kpi) {
        Div block = new Div().setKeepTogether(true);
        block.add(sectionTitle("ÉQUIPE"));

        int taille = kpi.getTailleEquipe();
        block.add(new Paragraph(String.valueOf(taille))
            .setFont(bold).setFontSize(22).setFontColor(INK).setMarginBottom(1));
        block.add(new Paragraph(taille > 1 ? "membres affectés au projet" : "membre affecté au projet")
            .setFontSize(9).setFontColor(MUTED));

        List<MembreEquipeDTO> membres = kpi.getListeMembresEquipe();
        if (membres != null && !membres.isEmpty()) {
            Table table = new Table(UnitValue.createPercentArray(new float[]{55, 45})).useAllAvailableWidth();
            table.setMarginTop(12);
            for (MembreEquipeDTO membre : membres) {
                table.addCell(new Cell()
                    .add(new Paragraph(orDash(membre.getNom())).setFont(bold).setFontSize(9.5f).setFontColor(INK).setMargin(0))
                    .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f)).setPadding(8));
                table.addCell(new Cell()
                    .add(new Paragraph(orDash(membre.getRole())).setFontSize(9).setFontColor(MUTED).setMargin(0))
                    .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f))
                    .setPadding(8).setTextAlignment(TextAlignment.RIGHT));
            }
            block.add(table);
        }

        document.add(block);
    }

    private void addRecommandations(Document document, ProjetKPIReportDTO kpi) {
        List<String[]> recommandations = buildRecommandations(kpi);
        if (recommandations.isEmpty()) return;

        document.add(sectionTitle("RECOMMANDATIONS"));

        for (String[] reco : recommandations) {
            Div card = new Div().setKeepTogether(true).setMarginBottom(6);
            Cell cell = new Cell()
                .setBackgroundColor(BLUE_SOFT)
                .setBorder(Border.NO_BORDER)
                .setBorderLeft(new SolidBorder(BLUE, 3))
                .setPadding(10);
            cell.add(new Paragraph(reco[0]).setFont(bold).setFontSize(9.5f).setFontColor(INK).setMarginBottom(2));
            cell.add(new Paragraph(reco[1]).setFontSize(9).setFontColor(MUTED).setMargin(0));

            Table wrapper = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            wrapper.addCell(cell);
            card.add(wrapper);
            document.add(card);
        }
    }

    private List<String[]> buildRecommandations(ProjetKPIReportDTO kpi) {
        List<String[]> recos = new ArrayList<>();

        if (kpi.getTauxAvancement() < 30) {
            recos.add(new String[]{"Accélérer l'avancement",
                "Le projet avance lentement. Considérez d'augmenter les ressources ou de revoir les priorités."});
        }
        if (kpi.getNombreProblemes() > 5) {
            recos.add(new String[]{"Résoudre les problèmes",
                kpi.getNombreProblemes() + " problèmes identifiés. Organisez une réunion pour les traiter en priorité."});
        }
        if (kpi.getNombreRisques() > 3) {
            recos.add(new String[]{"Mitiger les risques",
                kpi.getNombreRisques() + " risques détectés. Établissez un plan de mitigation pour chacun."});
        }
        if (kpi.getJoursRetard() > 0) {
            recos.add(new String[]{"Rattraper le retard",
                "Le projet a " + kpi.getJoursRetard() + " jour(s) de retard. Revoyez le planning et les dépendances."});
        }
        if (kpi.getBudgetTotal() == 0) {
            recos.add(new String[]{"Définir le budget",
                "Aucun budget défini. Ajoutez les informations budgétaires pour un meilleur suivi."});
        }
        if (recos.isEmpty() && kpi.getTauxAvancement() > 50) {
            recos.add(new String[]{"Continuez ainsi !",
                "Le projet progresse bien. Maintenez le rythme et la qualité du travail."});
        }
        return recos;
    }

    private void addQualite(Document document, ProjetKPIReportDTO kpi) {
        addSectionTitle(document, "QUALITÉ : PROBLÈMES ET RISQUES");

        document.add(new Paragraph("Problèmes identifiés (" + count(kpi.getListeProblemes(), kpi.getNombreProblemes()) + ")")
            .setFont(bold).setFontSize(10.5f).setFontColor(INK).setMarginBottom(6).setKeepWithNext(true));
        addIssueList(document, kpi.getListeProblemes(), RED, RED_SOFT, "Aucun problème identifié.");

        document.add(new Paragraph("Risques identifiés (" + count(kpi.getListeRisques(), kpi.getNombreRisques()) + ")")
            .setFont(bold).setFontSize(10.5f).setFontColor(INK).setMarginTop(12).setMarginBottom(6).setKeepWithNext(true));
        addIssueList(document, kpi.getListeRisques(), AMBER, AMBER_SOFT, "Aucun risque identifié.");
    }

    private void addIssueList(Document document, List<String> items, DeviceRgb accent, DeviceRgb soft, String emptyText) {
        if (items == null || items.isEmpty()) {
            document.add(new Paragraph(emptyText)
                .setFontSize(9).setFontColor(MUTED)
                .setBackgroundColor(SURFACE_ALT).setPadding(10));
            return;
        }
        int index = 1;
        for (String item : items) {
            Table row = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            row.setMarginBottom(4);
            row.addCell(new Cell()
                .add(new Paragraph(index++ + ".   " + item).setFontSize(9.5f).setFontColor(INK).setMargin(0))
                .setBackgroundColor(soft)
                .setBorder(Border.NO_BORDER)
                .setBorderLeft(new SolidBorder(accent, 3))
                .setPadding(9));
            document.add(row);
        }
    }

    /* ---------- Briques réutilisables ---------- */

    private void addSectionTitle(Document document, String title) {
        document.add(sectionTitle(title));
    }

    private Paragraph sectionTitle(String title) {
        return new Paragraph(title)
            .setFont(bold).setFontSize(10).setFontColor(INK).setCharacterSpacing(1.1f)
            .setMarginTop(20).setMarginBottom(10)
            .setPaddingBottom(6)
            .setBorderBottom(new SolidBorder(LINE, 1))
            .setKeepWithNext(true);
    }

    private Table infoTable() {
        return new Table(UnitValue.createPercentArray(new float[]{38, 62}))
            .useAllAvailableWidth()
            .setMarginBottom(4);
    }

    private void addInfoRow(Table table, String label, String value) {
        table.addCell(new Cell()
            .add(new Paragraph(label).setFont(bold).setFontSize(9).setFontColor(MUTED).setMargin(0))
            .setBackgroundColor(SURFACE_ALT)
            .setBorder(Border.NO_BORDER)
            .setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPadding(9));
        table.addCell(new Cell()
            .add(new Paragraph(value).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBorder(Border.NO_BORDER)
            .setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPadding(9));
    }

    private void addBudgetRow(Table table, String label, double amountMDH, double totalMDH, DeviceRgb dotColor) {
        Paragraph poste = new Paragraph()
            .add(new Text("•  ").setFont(bold).setFontSize(13).setFontColor(dotColor))
            .add(new Text(label).setFontSize(9.5f).setFontColor(INK))
            .setMargin(0);

        table.addCell(new Cell().add(poste)
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f)).setPadding(8));
        table.addCell(new Cell()
            .add(new Paragraph(money(amountMDH)).setFontSize(9.5f).setFontColor(INK).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPadding(8).setTextAlignment(TextAlignment.RIGHT));
        table.addCell(new Cell()
            .add(new Paragraph(String.format(Locale.FRANCE, "%.0f %%", totalMDH > 0 ? amountMDH / totalMDH * 100 : 0))
                .setFont(bold).setFontSize(9.5f).setFontColor(MUTED).setMargin(0))
            .setBorder(Border.NO_BORDER).setBorderBottom(new SolidBorder(LINE, 0.75f))
            .setPadding(8).setTextAlignment(TextAlignment.RIGHT));
    }

    private Cell headerCell(String text) {
        return new Cell()
            .add(new Paragraph(text).setFont(bold).setFontSize(8).setFontColor(MUTED)
                .setCharacterSpacing(0.6f).setMargin(0))
            .setBorder(Border.NO_BORDER)
            .setBorderBottom(new SolidBorder(LINE, 1))
            .setPaddingBottom(6);
    }

    private Cell borderless(Paragraph paragraph) {
        return new Cell().add(paragraph.setMargin(0)).setBorder(Border.NO_BORDER).setPadding(0);
    }

    private Table progressBar(double percentage) {
        float pct = (float) Math.max(0, Math.min(100, percentage));
        Table bar;
        if (pct < 1f) {
            bar = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            bar.addCell(barCell(TRACK));
        } else if (pct > 99f) {
            bar = new Table(UnitValue.createPercentArray(new float[]{100})).useAllAvailableWidth();
            bar.addCell(barCell(progressColor(percentage)));
        } else {
            bar = new Table(UnitValue.createPercentArray(new float[]{pct, 100 - pct})).useAllAvailableWidth();
            bar.addCell(barCell(progressColor(percentage)));
            bar.addCell(barCell(TRACK));
        }
        return bar.setMarginTop(4).setMarginBottom(6);
    }

    private Cell barCell(DeviceRgb color) {
        return new Cell().setHeight(9).setBackgroundColor(color).setBorder(Border.NO_BORDER).setPadding(0);
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
            new Paragraph("QualityHub · Rapport KPI · " + projet)
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

    private double healthScore(ProjetKPIReportDTO kpi) {
        double score = (kpi.getTauxAvancement() / 100.0) * 40;
        score += 30 - Math.min(kpi.getNombreProblemes() * 5, 30);
        score += 20 - Math.min(kpi.getNombreRisques() * 5, 20);
        if (kpi.getJoursRetard() == 0) {
            score += 10;
        } else if (kpi.getJoursRetard() <= 7) {
            score += 5;
        }
        return Math.round(Math.max(0, Math.min(100, score)));
    }

    private DeviceRgb healthColor(double score) {
        if (score >= 80) return BRAND;
        if (score >= 60) return BLUE;
        if (score >= 40) return AMBER;
        return RED;
    }

    private String healthLabel(double score) {
        if (score >= 80) return "Excellent";
        if (score >= 60) return "Bon";
        if (score >= 40) return "Attention";
        return "Critique";
    }

    private String healthDescription(double score) {
        if (score >= 80) return "Le projet progresse très bien, continuez ainsi.";
        if (score >= 60) return "Le projet avance correctement avec quelques points d'attention.";
        if (score >= 40) return "Le projet nécessite une attention particulière.";
        return "Le projet est en difficulté, intervention urgente recommandée.";
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
        if (percentage >= 75) return BRAND;
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

    private String money(double valueMDH) {
        // le separateur de milliers francais est un espace insecable : iText le rend comme un blanc
        return String.format(Locale.FRANCE, "%,.0f", valueMDH * 1_000_000)
            .replace(' ', ' ')
            .replace(' ', ' ');
    }

    private int count(List<String> items, int fallback) {
        return items != null ? items.size() : fallback;
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
