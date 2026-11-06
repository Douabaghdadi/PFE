import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FicheSuiviService, FicheSuivi } from '../../services/fiche-suivi.service';
import { FicheSuiviGanttChartComponent } from '../../components/fiche-suivi-gantt-chart/fiche-suivi-gantt-chart.component';

@Component({
  selector: 'app-fiche-suivi-gantt',
  standalone: true,
  imports: [CommonModule, RouterModule, FicheSuiviGanttChartComponent],
  templateUrl: './fiche-suivi-gantt.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/detail-ui.css']
})
export class FicheSuiviGanttComponent implements OnInit {
  private ficheSuiviService = inject(FicheSuiviService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ficheSuivi: FicheSuivi | null = null;
  loading = true;
  error: string | null = null;
  /** Nom du projet suivi, affiché dans l'en-tête ; vide tant qu'il n'est pas connu. */
  projetNom = '';

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadFicheSuivi(id);
    } else {
      this.error = 'ID de la fiche de suivi non fourni';
      this.loading = false;
    }
  }

  loadFicheSuivi(id: string) {
    this.loading = true;
    this.error = null;

    this.ficheSuiviService.getFicheSuiviById(id).subscribe({
      next: (fiche) => {
        this.ficheSuivi = fiche;
        this.loading = false;
        this.loadProjetNom(fiche.ficheProjetId);
      },
      error: (err) => {
        console.error('Erreur lors du chargement de la fiche de suivi:', err);
        this.error = 'Erreur lors du chargement de la fiche de suivi';
        this.loading = false;
      }
    });
  }

  /** Le nom du projet est un plus : s'il ne se charge pas, l'en-tête s'en passe. */
  private loadProjetNom(projetId: string | undefined) {
    if (!projetId) return;
    this.ficheSuiviService.getProjetName(projetId).subscribe({
      next: (nom: string) => { this.projetNom = nom || ''; },
      error: () => { this.projetNom = ''; }
    });
  }

  goBack() {
    const id = this.route.snapshot.paramMap.get('id');
    this.router.navigate(['/fiche-suivi', id]);
  }
}
