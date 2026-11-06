import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HistoriqueJournalComponent } from '../../../components/historique-journal/historique-journal.component';

@Component({
  selector: 'app-pilote-historique-projet',
  standalone: true,
  imports: [HistoriqueJournalComponent],
  template: `<app-historique-journal [projetId]="projetId" [retourLink]="['/pilote-qualite/fiches-projet', projetId]" />`
})
export class PiloteHistoriqueProjetComponent {
  projetId = inject(ActivatedRoute).snapshot.paramMap.get('id') || '';
}
