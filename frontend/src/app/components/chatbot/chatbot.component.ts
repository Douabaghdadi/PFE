import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatMessage, ChatTurn } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';
import { ChatMarkdownPipe } from './chat-markdown.pipe';

/** Messages gardés dans le navigateur, et échanges renvoyés à Gemini à chaque question. */
const MAX_STORED_MESSAGES = 50;
const MAX_HISTORY_TURNS = 10;

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatMarkdownPipe],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css'],
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  @Input() context: 'chef_projet' | 'pilote_qualite' = 'chef_projet';
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('champSaisie') champSaisie?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fab') fab?: ElementRef<HTMLButtonElement>;

  isOpen = false;
  isLoading = false;
  userInput = '';
  messages: ChatMessage[] = [];

  readonly suggestedQuestionsByContext: Record<'chef_projet' | 'pilote_qualite', string[]> = {
    chef_projet: [
      'Quel est l\'avancement de mes projets ?',
      'Y a-t-il des tâches en retard ?',
      'Résume mes dernières fiches de suivi',
      'Comment respecter mes délais ?'
    ],
    pilote_qualite: [
      'Quels sont les risques majeurs actuellement ?',
      'Résume les problèmes qualité en cours',
      'Donne des recommandations qualité',
      'Quel est l\'état d\'avancement global ?'
    ]
  };

  constructor(private chatbotService: ChatbotService, private authService: AuthService) {}

  ngOnInit() {
    this.messages = this.loadMessages() ?? [this.welcomeMessage()];
  }

  private welcomeMessage(): ChatMessage {
    return {
      role: 'assistant',
      content: this.context === 'chef_projet'
        ? 'Bonjour. Je peux vous aider à suivre vos projets, vos fiches de suivi et vos indicateurs.'
        : 'Bonjour. Je peux analyser les données qualité, repérer les risques et proposer des recommandations.',
      timestamp: new Date()
    };
  }

  /** Une conversation par utilisateur et par rôle, pour ne jamais mélanger deux comptes sur le même navigateur. */
  private get storageKey(): string {
    const user = this.authService.currentUser();
    return `qualinet.chat.${user?.id ?? user?.username ?? 'anonyme'}.${this.context}`;
  }

  private loadMessages(): ChatMessage[] | null {
    try {
      const raw = localStorage.getItem(this.storageKey);
      const saved = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(saved) || saved.length === 0) return null;
      return saved
        .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m?.content === 'string')
        .map((m: any) => ({ role: m.role, content: m.content, timestamp: new Date(m.timestamp), error: m.error === true }));
    } catch {
      return null;
    }
  }

  private saveMessages() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.messages.slice(-MAX_STORED_MESSAGES)));
    } catch {
      // Stockage plein ou bloqué : la conversation reste simplement en mémoire
    }
  }

  /** Derniers échanges réussis, sans le message d'accueil ni les questions restées sans réponse. */
  private buildHistory(): ChatTurn[] {
    const history: ChatTurn[] = [];
    for (const m of this.messages) {
      if (m.error) {
        if (history.at(-1)?.role === 'user') history.pop();
        continue;
      }
      history.push({ role: m.role, content: m.content });
    }
    const recent = history.slice(-MAX_HISTORY_TURNS);
    while (recent.length && recent[0].role === 'assistant') recent.shift();
    return recent;
  }

  get suggestedQuestions(): string[] {
    return this.suggestedQuestionsByContext[this.context];
  }

  askSuggestion(question: string) {
    if (this.isLoading) return;
    this.sendMessage(question);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) this.focusInput();
  }

  /** Échap referme l'assistant et rend le focus au bouton d'ouverture. */
  closeChat() {
    if (!this.isOpen) return;
    this.isOpen = false;
    setTimeout(() => this.fab?.nativeElement.focus());
  }

  /** Place le curseur dans le champ, sauf sur écran tactile (le clavier virtuel masquerait la conversation). */
  private focusInput() {
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      setTimeout(() => this.champSaisie?.nativeElement.focus());
    }
  }

  sendMessage(text?: string) {
    const message = (text ?? this.userInput).trim();
    if (!message || this.isLoading) return;

    const history = this.buildHistory();
    this.messages.push({ role: 'user', content: message, timestamp: new Date() });
    this.saveMessages();
    this.userInput = '';
    this.isLoading = true;

    this.chatbotService.sendMessage(message, this.context, history).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'assistant',
          content: res.success ? res.reply : (res.error || 'Une erreur est survenue.'),
          timestamp: new Date(),
          error: !res.success
        });
        this.saveMessages();
        this.isLoading = false;
        this.focusInput();
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: 'Impossible de contacter l\'assistant. Vérifiez votre connexion.',
          timestamp: new Date(),
          error: true
        });
        this.saveMessages();
        this.isLoading = false;
        this.focusInput();
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /** Efface l'historique enregistré et repart du message d'accueil. */
  clearChat() {
    if (this.isLoading) return;
    try {
      localStorage.removeItem(this.storageKey);
    } catch {}
    this.messages = [this.welcomeMessage()];
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
