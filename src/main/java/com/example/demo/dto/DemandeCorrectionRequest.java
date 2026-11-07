package com.example.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Le motif est obligatoire : c'est lui qui dit au chef de projet quoi corriger. */
public class DemandeCorrectionRequest {
    @NotBlank
    @Size(max = 500)
    private String motif;

    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }
}
