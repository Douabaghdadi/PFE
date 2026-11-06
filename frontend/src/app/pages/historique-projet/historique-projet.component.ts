import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HistoriqueJournalComponent } from '../../components/historique-journal/historique-journal.component';

@Component({
  selector: 'app-historique-projet',
  standalone: true,
  imports: [HistoriqueJournalComponent],
  template: `<app-historique-journal [projetId]="projetId" [retourLink]="['/projets', projetId]" />`
})
export class HistoriqueProjetComponent {
  projetId = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
}
