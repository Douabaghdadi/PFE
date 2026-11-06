import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { initiales, pl } from '../../pages/shared/projet-stats';
import { NomenclatureService } from '../../services/nomenclature.service';

export interface MembreEquipe {
  nom: string;
  role: string;
  email?: string;
}

/** Champs d'une fiche projet affichés par ce composant : tous facultatifs, chaque page lui passe sa propre fiche. */
export interface ProjetFicheData {
  nomProjet?: string;
  designationProjet?: string;
  designationClient?: string;
  cadreContractuelProjet?: string;
  caractereProjet?: string;
  typeProjet?: string;
  presentation?: string;
  historique?: string;
  perimetre?: string;
  maitreOuvrage?: string;
  maitreOeuvre?: string;
  equipeProjet?: any;
  estimationsCharges?: any[];
  modaliteDeveloppement?: string;
  estimationBudget?: any;
  delaisPrevisionnels?: string;
  risquesPotentiels?: string;
  preRequis?: string;
  planning?: any[];
}

/**
 * Corps d'une fiche projet en lecture seule : résumé chiffré puis les sections de la fiche.
 * Commun à la page du chef de projet (/projets/:id) et à celle du pilote qualité
 * (/pilote-qualite/fiches-projet/:id), qui ne gardent que l'en-tête, les actions et le chargement.
 */
@Component({
  selector: 'app-projet-fiche',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './projet-fiche.component.html',
  styleUrls: ['../../pages/shared/lecture-ui.css', './projet-fiche.component.css']
})
export class ProjetFicheComponent {
  private nomenclatureService = inject(NomenclatureService);

  readonly projet = input.required<ProjetFicheData>();

  constructor() {
    this.nomenclatureService.charger().subscribe();
  }

  readonly pl = pl;
  readonly initiales = initiales;
  readonly mois = Array.from({ length: 12 }, (_, i) => String(i + 1));

  /** L'équipe est enregistrée en JSON ; si elle n'est pas lisible comme une liste, elle s'affiche telle quelle. */
  readonly equipe = computed<{ membres: MembreEquipe[]; texte: string }>(() => {
    let valeur = this.projet().equipeProjet;
    if (typeof valeur === 'string' && valeur.trim().startsWith('[')) {
      try { valeur = JSON.parse(valeur); } catch { /* le texte brut est conservé */ }
    }
    if (Array.isArray(valeur)) return { membres: valeur, texte: '' };
    return { membres: [], texte: typeof valeur === 'string' ? valeur.trim() : '' };
  });

  readonly charges = computed(() => this.projet().estimationsCharges || []);
  readonly planning = computed(() => this.projet().planning || []);
  readonly budget = computed(() => this.projet().estimationBudget || null);

  /** Montant saisi en texte (« 480000 » → « 480 000 ») ; une valeur non numérique est rendue telle quelle. */
  nombre(valeur: unknown): string {
    if (valeur === null || valeur === undefined || valeur === '') return '';
    const n = Number(valeur);
    return isFinite(n) ? n.toLocaleString('fr-FR') : String(valeur);
  }

  // Libellés de la nomenclature ; un code absent de la nomenclature s'affiche tel quel
  getTypeLabel(type: string | undefined): string {
    return this.nomenclatureService.libelle('TYPE_PROJET', type);
  }

  getCaractereLabel(caractere: string | undefined): string {
    return this.nomenclatureService.libelle('CARACTERE_PROJET', caractere);
  }

  getModaliteLabel(modalite: string | undefined): string {
    return this.nomenclatureService.libelle('MODALITE_DEVELOPPEMENT', modalite);
  }
}
