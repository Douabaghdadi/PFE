package com.example.demo.controller;

import com.example.demo.dto.TeamSuggestionRequest;
import com.example.demo.dto.TeamSuggestionResponse;
import com.example.demo.service.TeamSuggestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ai")
public class TeamSuggestionController {

    @Autowired
    private TeamSuggestionService teamSuggestionService;

    @PostMapping("/suggest-team")
    @PreAuthorize("hasRole('CHEF_PROJET') or hasRole('PILOTE_QUALITE') or hasRole('ADMIN')")
    public ResponseEntity<TeamSuggestionResponse> suggestTeam(@RequestBody TeamSuggestionRequest request) {
        TeamSuggestionResponse response = teamSuggestionService.suggestTeam(request);
        return ResponseEntity.ok(response);
    }
}
