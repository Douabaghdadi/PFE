import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Rendu Markdown minimal pour les réponses du chatbot (gras, listes, code inline).
 * Le texte source est échappé avant toute transformation : les seules balises HTML
 * injectées sont celles que cette pipe génère elle-même, donc le innerHTML reste sûr.
 */
@Pipe({
  name: 'chatMarkdown',
  standalone: true,
})
export class ChatMarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    const html = ChatMarkdownPipe.toHtml(value ?? '');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private static toHtml(raw: string): string {
    const lines = raw.replace(/\r\n/g, '\n').split('\n');

    const blocks: string[] = [];
    let listBuffer: string[] = [];
    let listType: 'ul' | 'ol' | null = null;
    let paragraphBuffer: string[] = [];

    const flushList = () => {
      if (listBuffer.length) {
        blocks.push(`<${listType}>${listBuffer.join('')}</${listType}>`);
        listBuffer = [];
        listType = null;
      }
    };

    const flushParagraph = () => {
      if (paragraphBuffer.length) {
        blocks.push(`<p>${paragraphBuffer.join('<br>')}</p>`);
        paragraphBuffer = [];
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        flushList();
        continue;
      }

      const orderedMatch = line.match(/^\d+[.)]\s+(.*)$/);
      const bulletMatch = line.match(/^[-*•]\s+(.*)$/);

      if (orderedMatch) {
        flushParagraph();
        if (listType !== 'ol') { flushList(); listType = 'ol'; }
        listBuffer.push(`<li>${ChatMarkdownPipe.inline(orderedMatch[1])}</li>`);
      } else if (bulletMatch) {
        flushParagraph();
        if (listType !== 'ul') { flushList(); listType = 'ul'; }
        listBuffer.push(`<li>${ChatMarkdownPipe.inline(bulletMatch[1])}</li>`);
      } else {
        flushList();
        paragraphBuffer.push(ChatMarkdownPipe.inline(line));
      }
    }
    flushParagraph();
    flushList();

    return blocks.join('');
  }

  private static inline(text: string): string {
    let out = ChatMarkdownPipe.escapeHtml(text);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(?:^|\s)_([^_]+)_(?=\s|$)/g, (m, p1) => m.replace(`_${p1}_`, `<em>${p1}</em>`));
    return out;
  }

  private static escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
