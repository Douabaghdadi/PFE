package com.example.demo.config;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class DotenvConfig implements ApplicationContextInitializer<ConfigurableApplicationContext> {

    @Override
    public void initialize(ConfigurableApplicationContext applicationContext) {
        ConfigurableEnvironment environment = applicationContext.getEnvironment();
        
        Path envPath = Paths.get(".env");
        if (Files.exists(envPath)) {
            Map<String, Object> envMap = new HashMap<>();
            
            try (BufferedReader reader = new BufferedReader(new FileReader(envPath.toFile()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    
                    int separatorIndex = line.indexOf('=');
                    if (separatorIndex > 0) {
                        String key = line.substring(0, separatorIndex).trim();
                        String value = line.substring(separatorIndex + 1).trim();
                        envMap.put(key, value);
                        System.setProperty(key, value);
                    }
                }
                
                environment.getPropertySources().addFirst(new MapPropertySource("dotenv", envMap));
                System.out.println("Fichier .env chargé avec succès");
            } catch (IOException e) {
                System.err.println("Erreur lors du chargement du fichier .env: " + e.getMessage());
            }
        }
    }
}
