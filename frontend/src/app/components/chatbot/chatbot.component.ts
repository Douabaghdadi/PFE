import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService, ChatMessage } from '../../services/chatbot.service';
import { ChatMarkdownPipe } from './chat-markdown.pipe';

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

  constructor(private chatbotService: ChatbotService) {}

  ngOnInit() {
    this.messages = [
      {
        role: 'assistant',
        content: this.context === 'chef_projet'
          ? '👋 Bonjour ! Je suis votre assistant IA. Je peux vous aider à gérer vos fiches projet, suivre l\'avancement et analyser vos KPI. Comment puis-je vous aider ?'
          : '👋 Bonjour ! Je suis votre assistant IA Qualité. Je peux vous aider à analyser les données qualité, identifier les risques et formuler des recommandations. Comment puis-je vous aider ?',
        timestamp: new Date()
      }
    ];
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
  }

  sendMessage(text?: string) {
    const message = (text ?? this.userInput).trim();
    if (!message || this.isLoading) return;

    this.messages.push({ role: 'user', content: message, timestamp: new Date() });
    this.userInput = '';
    this.isLoading = true;

    this.chatbotService.sendMessage(message, this.context).subscribe({
      next: (res) => {
        this.messages.push({
          role: 'assistant',
          content: res.success ? res.reply : (res.error || 'Une erreur est survenue.'),
          timestamp: new Date()
        });
        this.isLoading = false;
      },
      error: () => {
        this.messages.push({
          role: 'assistant',
          content: '❌ Impossible de contacter l\'assistant. Vérifiez votre connexion.',
          timestamp: new Date()
        });
        this.isLoading = false;
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat() {
    this.ngOnInit();
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch {}
  }
}
