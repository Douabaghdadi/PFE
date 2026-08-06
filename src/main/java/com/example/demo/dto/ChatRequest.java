package com.example.demo.dto;

public class ChatRequest {
    private String message;
    private String context; // "chef_projet" ou "pilote_qualite"

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }
}
