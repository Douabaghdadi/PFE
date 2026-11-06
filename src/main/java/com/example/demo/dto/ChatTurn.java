package com.example.demo.dto;

public class ChatTurn {
    private String role; // "user" ou "assistant"
    private String content;

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
