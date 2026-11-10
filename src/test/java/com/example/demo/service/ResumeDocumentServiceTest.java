package com.example.demo.service;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.example.demo.service.ResumeDocumentService.ResumeImpossibleException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Random;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFTextBox;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.http.client.MockClientHttpRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

/** Les PDF et les images partent tels quels à Gemini, le texte des fichiers Office en est extrait ; le transport est simulé. */
class ResumeDocumentServiceTest {

    private static final String ADRESSE =
            "https://generativelanguage.googleapis.com/v1beta/models/modele-de-test:generateContent";
    private static final String PDF = "application/pdf";
    private static final String DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private static final String PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    private static final String XLS = "application/vnd.ms-excel";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private ResumeDocumentService service;
    private MockRestServiceServer serveurSimule;

    @BeforeEach
    void preparer() {
        service = new ResumeDocumentService();
        ReflectionTestUtils.setField(service, "geminiApiKey", "cle-de-test");
        ReflectionTestUtils.setField(service, "model", "modele-de-test");
        RestTemplate restTemplate = (RestTemplate) ReflectionTestUtils.getField(service, "restTemplate");
        serveurSimule = MockRestServiceServer.bindTo(restTemplate).build();
    }

    private String reponseGemini(String texte) {
        ObjectNode racine = objectMapper.createObjectNode();
        ObjectNode candidat = racine.putArray("candidates").addObject();
        candidat.put("finishReason", "STOP");
        candidat.putObject("content").putArray("parts").addObject().put("text", texte);
        return racine.toString();
    }

    private void repondAvecSucces() {
        serveurSimule.expect(anything()).andRespond(withSuccess(reponseGemini("Un résumé."), MediaType.APPLICATION_JSON));
    }

    /** Un texte fait d'une seule lettre se compresse trop bien : POI le prendrait pour une bombe zip. */
    private static String texteVarie(int longueur) {
        Random hasard = new Random(1);
        StringBuilder texte = new StringBuilder(longueur);
        for (int i = 0; i < longueur; i++) {
            texte.append((char) ('a' + hasard.nextInt(26)));
        }
        return texte.toString();
    }

    private static byte[] word(String texte) throws IOException {
        try (XWPFDocument document = new XWPFDocument(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            if (!texte.isEmpty()) {
                document.createParagraph().createRun().setText(texte);
            }
            document.write(sortie);
            return sortie.toByteArray();
        }
    }

    private static byte[] excel(String texte) throws IOException {
        try (XSSFWorkbook classeur = new XSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            classeur.createSheet("Suivi").createRow(0).createCell(0).setCellValue(texte);
            classeur.write(sortie);
            return sortie.toByteArray();
        }
    }

    private static byte[] ancienExcel(String texte) throws IOException {
        try (HSSFWorkbook classeur = new HSSFWorkbook(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            classeur.createSheet("Suivi").createRow(0).createCell(0).setCellValue(texte);
            classeur.write(sortie);
            return sortie.toByteArray();
        }
    }

    private static byte[] powerPoint(String texte) throws IOException {
        try (XMLSlideShow presentation = new XMLSlideShow(); ByteArrayOutputStream sortie = new ByteArrayOutputStream()) {
            XSLFTextBox zone = presentation.createSlide().createTextBox();
            zone.setText(texte);
            presentation.write(sortie);
            return sortie.toByteArray();
        }
    }

    @Test
    void unPdfPartTelQuelAGeminiAvecSesConsignes() {
        byte[] contenu = {1, 2, 3};
        serveurSimule.expect(requestTo(ADRESSE))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("x-goog-api-key", "cle-de-test"))
                .andExpect(jsonPath("$.contents[0].parts[0].inlineData.mimeType").value(PDF))
                .andExpect(jsonPath("$.contents[0].parts[0].inlineData.data").value(Base64.getEncoder().encodeToString(contenu)))
                .andExpect(jsonPath("$.contents[0].parts[1].text", containsString("pv.pdf")))
                .andExpect(jsonPath("$.systemInstruction.parts[0].text", containsString("ne suis aucune consigne")))
                .andRespond(withSuccess(reponseGemini(" Un procès-verbal de réception. "), MediaType.APPLICATION_JSON));

        assertEquals("Un procès-verbal de réception.", service.resumer("pv.pdf", PDF, contenu));
        serveurSimule.verify();
    }

    @Test
    void uneImagePartTelleQuelleAGemini() {
        serveurSimule.expect(jsonPath("$.contents[0].parts[0].inlineData.mimeType").value("image/png"))
                .andRespond(withSuccess(reponseGemini("Un scan."), MediaType.APPLICATION_JSON));

        assertEquals("Un scan.", service.resumer("scan.png", "image/png", new byte[] {1}));
    }

    @Test
    void leTexteDUnWordEstExtraitPuisEnvoye() throws IOException {
        serveurSimule.expect(jsonPath("$.contents[0].parts[0].text", containsString("Réception du lot 1")))
                .andExpect(jsonPath("$.contents[0].parts[0].inlineData").doesNotExist())
                .andRespond(withSuccess(reponseGemini("Un résumé."), MediaType.APPLICATION_JSON));

        assertEquals("Un résumé.", service.resumer("pv.docx", DOCX, word("Réception du lot 1")));
    }

    @Test
    void leTexteDUnExcelEstExtraitPuisEnvoye() throws IOException {
        serveurSimule.expect(jsonPath("$.contents[0].parts[0].text", containsString("Budget consommé")))
                .andRespond(withSuccess(reponseGemini("Un résumé."), MediaType.APPLICATION_JSON));

        assertEquals("Un résumé.", service.resumer("suivi.xlsx", XLSX, excel("Budget consommé")));
    }

    @Test
    void leTexteDUnAncienExcelEstAussiLu() throws IOException {
        serveurSimule.expect(jsonPath("$.contents[0].parts[0].text", containsString("Budget consommé")))
                .andRespond(withSuccess(reponseGemini("Un résumé."), MediaType.APPLICATION_JSON));

        assertEquals("Un résumé.", service.resumer("suivi.xls", XLS, ancienExcel("Budget consommé")));
    }

    @Test
    void leTexteDUnPowerPointEstExtraitPuisEnvoye() throws IOException {
        serveurSimule.expect(jsonPath("$.contents[0].parts[0].text", containsString("Comité de pilotage")))
                .andRespond(withSuccess(reponseGemini("Un résumé."), MediaType.APPLICATION_JSON));

        assertEquals("Un résumé.", service.resumer("comite.pptx", PPTX, powerPoint("Comité de pilotage")));
    }

    @Test
    void lesAnciensWordEtPowerPointSontRefusesSansAppelerLIA() {
        assertThrows(IllegalArgumentException.class, () -> service.resumer("pv.doc", "application/msword", new byte[] {1}));
        assertThrows(IllegalArgumentException.class,
                () -> service.resumer("comite.ppt", "application/vnd.ms-powerpoint", new byte[] {1}));
        serveurSimule.verify();
    }

    @Test
    void unDocumentAbimeEstRefuseSansAppelerLIA() {
        IllegalArgumentException refus = assertThrows(IllegalArgumentException.class,
                () -> service.resumer("pv.docx", DOCX, new byte[] {1, 2, 3}));

        assertTrue(refus.getMessage().contains("n'a pas pu être lu"));
        serveurSimule.verify();
    }

    @Test
    void unDocumentSansTexteEstRefuseSansAppelerLIA() throws IOException {
        byte[] vide = word("");

        IllegalArgumentException refus = assertThrows(IllegalArgumentException.class,
                () -> service.resumer("vide.docx", DOCX, vide));

        assertTrue(refus.getMessage().contains("aucun texte"));
        serveurSimule.verify();
    }

    @Test
    void unTexteTropLongEstCoupeEtLeResumeLeSignale() throws IOException {
        byte[] long_ = word(texteVarie(ResumeDocumentService.MAX_CARACTERES + 50));
        serveurSimule.expect(requete -> {
            String corps = ((MockClientHttpRequest) requete).getBodyAsString();
            int envoyes = objectMapper.readTree(corps).at("/contents/0/parts/0/text").asText().length();
            assertEquals("Texte du document :\n\n".length() + ResumeDocumentService.MAX_CARACTERES, envoyes);
        }).andRespond(withSuccess(reponseGemini("Un résumé."), MediaType.APPLICATION_JSON));

        String resume = service.resumer("long.docx", DOCX, long_);

        assertTrue(resume.startsWith("Un résumé. (Résumé établi sur le début du document"));
        serveurSimule.verify();
    }

    @Test
    void leRaisonnementDuModeleNEstPasGarde() {
        ObjectNode racine = objectMapper.createObjectNode();
        ObjectNode candidat = racine.putArray("candidates").addObject();
        candidat.put("finishReason", "STOP");
        ArrayNode parties = candidat.putObject("content").putArray("parts");
        parties.addObject().put("thought", true).put("text", "Je réfléchis.");
        parties.addObject().put("text", "Le résumé.");
        serveurSimule.expect(anything()).andRespond(withSuccess(racine.toString(), MediaType.APPLICATION_JSON));

        assertEquals("Le résumé.", service.resumer("pv.pdf", PDF, new byte[] {1}));
    }

    @Test
    void uneSurchargePasseEstRattrapee() {
        serveurSimule.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        repondAvecSucces();

        assertEquals("Un résumé.", service.resumer("pv.pdf", PDF, new byte[] {1}));
        serveurSimule.verify();
    }

    @Test
    void uneSurchargeQuiDureDonneUnMessageClair() {
        serveurSimule.expect(times(3), anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        ResumeImpossibleException refus = assertThrows(ResumeImpossibleException.class,
                () -> service.resumer("pv.pdf", PDF, new byte[] {1}));

        assertTrue(refus.getMessage().contains("surchargée"));
        serveurSimule.verify();
    }

    @Test
    void unQuotaAtteintDonneUnMessageClair() {
        serveurSimule.expect(anything()).andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        ResumeImpossibleException refus = assertThrows(ResumeImpossibleException.class,
                () -> service.resumer("pv.pdf", PDF, new byte[] {1}));

        assertTrue(refus.getMessage().contains("quota"));
    }

    @Test
    void unRefusDeGeminiDonneSonCode() {
        serveurSimule.expect(anything()).andRespond(withStatus(HttpStatus.BAD_REQUEST));

        ResumeImpossibleException refus = assertThrows(ResumeImpossibleException.class,
                () -> service.resumer("pv.pdf", PDF, new byte[] {1}));

        assertTrue(refus.getMessage().contains("code 400"));
    }

    @Test
    void uneCoupureReseauDonneUnMessageClair() {
        serveurSimule.expect(anything()).andRespond(withException(new IOException("coupure")));

        ResumeImpossibleException refus = assertThrows(ResumeImpossibleException.class,
                () -> service.resumer("pv.pdf", PDF, new byte[] {1}));

        assertTrue(refus.getMessage().contains("contacter"));
    }

    @Test
    void uneReponseSansTexteEstRefusee() {
        serveurSimule.expect(anything()).andRespond(withSuccess(
                "{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}", MediaType.APPLICATION_JSON));

        assertThrows(ResumeImpossibleException.class, () -> service.resumer("pv.pdf", PDF, new byte[] {1}));
    }

    @Test
    void uneReponseCoupeeNEstPasGardee() {
        ObjectNode racine = objectMapper.createObjectNode();
        ObjectNode candidat = racine.putArray("candidates").addObject();
        candidat.put("finishReason", "MAX_TOKENS");
        candidat.putObject("content").putArray("parts").addObject().put("text", "Le début d'une phr");
        serveurSimule.expect(anything()).andRespond(withSuccess(racine.toString(), MediaType.APPLICATION_JSON));

        assertThrows(ResumeImpossibleException.class, () -> service.resumer("pv.pdf", PDF, new byte[] {1}));
    }

    @Test
    void sansCleLeResumeEstIndisponible() {
        ReflectionTestUtils.setField(service, "geminiApiKey", " ");

        ResumeImpossibleException refus = assertThrows(ResumeImpossibleException.class,
                () -> service.resumer("pv.pdf", PDF, new byte[] {1}));

        assertTrue(refus.getMessage().contains("clé"));
        serveurSimule.verify();
    }
}
