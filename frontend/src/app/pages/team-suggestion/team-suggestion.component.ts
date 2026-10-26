import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamSuggestionService, TeamSuggestionRequest, TeamSuggestionResponse } from '../../services/team-suggestion.service';

@Component({
  selector: 'app-team-suggestion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './team-suggestion.component.html',
  styleUrls: ['./team-suggestion.component.css']
})
export class TeamSuggestionComponent {
  private teamService = inject(TeamSuggestionService);
  private router = inject(Router);

  loading = false;
  result: TeamSuggestionResponse | null = null;
  error: string | null = null;

  form: TeamSuggestionRequest = {
    typeProjet: '',
    budgetMDH: '',
    dureeEnMois: null,
    complexite: 'MOYENNE',
    description: '',
    modaliteDeveloppement: ''
  };

  typesProjet = ['Nouveau', 'Evolution', 'Refonte'];
  complexites = ['FAIBLE', 'MOYENNE', 'ELEVEE'];
  modalites = ['interne', 'ST', 'CO', 'Co-traitance'];

  suggest() {
    if (!this.form.typeProjet || !this.form.complexite) {
      this.error = 'Veuillez remplir au moins le type de projet et la complexité.';
      return;
    }

    this.loading = true;
    this.result = null;
    this.error = null;

    this.teamService.suggestTeam(this.form).subscribe({
      next: (data) => {
        this.result = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur complète:', err);
        const status = err.status;
        if (status === 401) this.error = 'Non autorisé (401) - Token invalide ou expiré. Reconnectez-vous.';
        else if (status === 403) this.error = 'Accès refusé (403) - Vous n\'avez pas les droits nécessaires.';
        else if (status === 0) this.error = 'Impossible de contacter le serveur. Réessayez dans un instant.';
        else this.error = `Erreur ${status} : ${err.error?.message || err.message || 'Erreur inconnue'}`;
        this.loading = false;
      }
    });
  }

  reset() {
    this.result = null;
    this.error = null;
    this.form = {
      typeProjet: '',
      budgetMDH: '',
      dureeEnMois: null,
      complexite: 'MOYENNE',
      description: '',
      modaliteDeveloppement: ''
    };
  }

  goBack() {
    this.router.navigate(['/projets']);
  }

  /** L'IA renvoie « Prénom Nom - rôle » (ou « À recruter - rôle ») : nom et rôle sont affichés séparément. */
  decomposerMembre(membre: string): { nom: string; role: string; aRecruter: boolean } {
    const [nom, ...role] = membre.split(/\s+[-–]\s+/);
    const propre = (nom || '').trim();
    return {
      nom: propre,
      role: role.join(' - ').trim(),
      aRecruter: /^[àaÀA]\s+recruter$/i.test(propre)
    };
  }

  initiales(nom: string): string {
    return nom.split(/\s+/).filter(Boolean).slice(0, 2).map(partie => partie.charAt(0).toUpperCase()).join('');
  }
}
