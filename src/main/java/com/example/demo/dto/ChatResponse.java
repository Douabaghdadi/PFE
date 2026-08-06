package com.example.demo.dto;

public class ChatResponse {
    private String reply;
    private boolean success;
    private String error;

    public ChatResponse(String reply) {
        this.reply = reply;
        this.success = true;
    }

    public ChatResponse(String error, boolean success) {
        this.error = error;
        this.success = false;
    }

    public String getReply() { return reply; }
    public void setReply(String reply) { this.reply = reply; }
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}
