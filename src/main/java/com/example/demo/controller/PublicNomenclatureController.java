package com.example.demo.controller;

import com.example.demo.model.Nomenclature;
import com.example.demo.service.NomenclatureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/nomenclatures")
public class PublicNomenclatureController {
    @Autowired
    private NomenclatureService nomenclatureService;

    @GetMapping
    public ResponseEntity<List<Nomenclature>> getAllNomenclatures() {
        return ResponseEntity.ok(nomenclatureService.getAllNomenclatures());
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<Nomenclature>> getNomenclaturesByType(@PathVariable String type) {
        return ResponseEntity.ok(nomenclatureService.getNomenclaturesByType(type));
    }
}
