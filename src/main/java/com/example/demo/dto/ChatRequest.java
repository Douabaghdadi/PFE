package com.example.demo.dto;

import java.util.List;

public class ChatRequest {
    private String message;
    private String context; // "chef_projet" ou "pilote_qualite"
    private List<ChatTurn> history; // échanges précédents, du plus ancien au plus récent

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public String getContext() { return context; }
    public void setContext(String context) { this.context = context; }
    public List<ChatTurn> getHistory() { return history; }
    public void setHistory(List<ChatTurn> history) { this.history = history; }
}
