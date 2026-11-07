package com.example.demo;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.TimeZone;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class DemoApplicationTests {

	@Test
	void contextLoads() {
	}

	/** Heure locale d'un instant enregistré, une fois le fuseau de l'application fixé. */
	private static LocalDateTime lueDansLApplication(String instant) {
		TimeZone avant = TimeZone.getDefault();
		try {
			DemoApplication.fixerFuseauHoraire();
			return LocalDateTime.ofInstant(Instant.parse(instant), ZoneId.systemDefault());
		} finally {
			TimeZone.setDefault(avant);
		}
	}

	@Test
	void lesHeuresSontCellesDeTunisQuelQueSoitLeServeur() {
		// En février : Casablanca, le fuseau du PC de développement, est alors en UTC, ce test le distingue donc de Tunis
		assertEquals(LocalDateTime.of(2026, 2, 20, 15, 47), lueDansLApplication("2026-02-20T14:47:00Z"));
	}

	@Test
	void uneDateDejaEnregistreeGardeSonJour() {
		// Écrite à minuit UTC par le serveur en ligne, ou à minuit à Tunis depuis le PC : le jour lu est le même
		assertEquals(LocalDate.of(2026, 6, 5), lueDansLApplication("2026-06-05T00:00:00Z").toLocalDate());
		assertEquals(LocalDate.of(2026, 6, 5), lueDansLApplication("2026-06-04T23:00:00Z").toLocalDate());
	}

}
