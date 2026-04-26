package com.example.demo.service;

import com.example.demo.dto.NomenclatureRequest;
import com.example.demo.model.Nomenclature;
import com.example.demo.repository.NomenclatureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NomenclatureService {
    @Autowired
    private NomenclatureRepository nomenclatureRepository;

    public List<Nomenclature> getAllNomenclatures() {
        return nomenclatureRepository.findAll();
    }

    public List<Nomenclature> getNomenclaturesByType(String type) {
        return nomenclatureRepository.findByType(type);
    }

    public Nomenclature getNomenclatureById(String id) {
        return nomenclatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nomenclature not found"));
    }

    public Nomenclature createNomenclature(NomenclatureRequest request) {
        if (nomenclatureRepository.existsByTypeAndCode(request.getType(), request.getCode())) {
            throw new RuntimeException("Nomenclature with this type and code already exists");
        }

        Nomenclature nomenclature = new Nomenclature();
        nomenclature.setType(request.getType());
        nomenclature.setCode(request.getCode());
        nomenclature.setLibelle(request.getLibelle());
        nomenclature.setDescription(request.getDescription());
        nomenclature.setActif(request.getActif() != null ? request.getActif() : true);
        nomenclature.setDateCreation(LocalDateTime.now());

        return nomenclatureRepository.save(nomenclature);
    }

    public Nomenclature updateNomenclature(String id, NomenclatureRequest request) {
        Nomenclature nomenclature = nomenclatureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Nomenclature not found"));

        if (!nomenclature.getCode().equals(request.getCode()) &&
                nomenclatureRepository.existsByTypeAndCode(request.getType(), request.getCode())) {
            throw new RuntimeException("Nomenclature with this type and code already exists");
        }

        nomenclature.setType(request.getType());
        nomenclature.setCode(request.getCode());
        nomenclature.setLibelle(request.getLibelle());
        nomenclature.setDescription(request.getDescription());
        nomenclature.setActif(request.getActif());
        nomenclature.setDateModification(LocalDateTime.now());

        return nomenclatureRepository.save(nomenclature);
    }

    public void deleteNomenclature(String id) {
        if (!nomenclatureRepository.existsById(id)) {
            throw new RuntimeException("Nomenclature not found");
        }
        nomenclatureRepository.deleteById(id);
    }
}
