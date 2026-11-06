import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Réponse d'erreur : affichée, mais jamais renvoyée à Gemini. */
  error?: boolean;
}

/** Un échange précédent, tel que le backend le transmet à Gemini. */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  context: 'chef_projet' | 'pilote_qualite';
  history: ChatTurn[];
}

export interface ChatResponsePayload {
  reply: string;
  success: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/chat`;

  sendMessage(message: string, context: 'chef_projet' | 'pilote_qualite', history: ChatTurn[] = []): Observable<ChatResponsePayload> {
    const token = localStorage.getItem('token');
    const payload: ChatRequestPayload = { message, context, history };
    return this.http.post<ChatResponsePayload>(
      this.apiUrl,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  }
}
