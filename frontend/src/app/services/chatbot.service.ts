import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequestPayload {
  message: string;
  context: 'chef_projet' | 'pilote_qualite';
}

export interface ChatResponsePayload {
  reply: string;
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081/api/chat';

  sendMessage(message: string, context: 'chef_projet' | 'pilote_qualite'): Observable<ChatResponsePayload> {
    const token = localStorage.getItem('token');
    return this.http.post<ChatResponsePayload>(
      this.apiUrl,
      { message, context },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
}
