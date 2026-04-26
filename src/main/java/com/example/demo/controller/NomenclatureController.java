package com.example.demo.controller;

import com.example.demo.dto.MessageResponse;
import com.example.demo.dto.NomenclatureRequest;
import com.example.demo.model.Nomenclature;
import com.example.demo.service.NomenclatureService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/admin/nomenclatures")
@PreAuthorize("hasRole('ADMIN')")
public class NomenclatureController {
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

    @GetMapping("/{id}")
    public ResponseEntity<Nomenclature> getNomenclatureById(@PathVariable String id) {
        try {
            return ResponseEntity.ok(nomenclatureService.getNomenclatureById(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createNomenclature(@Valid @RequestBody NomenclatureRequest request) {
        try {
            Nomenclature nomenclature = nomenclatureService.createNomenclature(request);
            return ResponseEntity.ok(nomenclature);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateNomenclature(@PathVariable String id,
                                                @Valid @RequestBody NomenclatureRequest request) {
        try {
            Nomenclature nomenclature = nomenclatureService.updateNomenclature(id, request);
            return ResponseEntity.ok(nomenclature);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNomenclature(@PathVariable String id) {
        try {
            nomenclatureService.deleteNomenclature(id);
            return ResponseEntity.ok(new MessageResponse("Nomenclature deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new MessageResponse("Error: " + e.getMessage()));
        }
    }
}
