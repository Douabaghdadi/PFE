package com.example.demo;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DemoApplication {

	public static void main(String[] args) {
		fixerFuseauHoraire();
		SpringApplication.run(DemoApplication.class, args);
	}

	/**
	 * Les utilisateurs sont à Tunis, mais le serveur en ligne tourne en UTC. Sans cela, les dates enregistrées ont une
	 * heure de retard sur le navigateur, qui les lit sans fuseau : une action à l'instant s'affiche « Il y a 1h ».
	 */
	static void fixerFuseauHoraire() {
		TimeZone.setDefault(TimeZone.getTimeZone("Africa/Tunis"));
	}

}
