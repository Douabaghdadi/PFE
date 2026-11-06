import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Nomenclature {
  id: string;
  type: string;
  code: string;
  libelle: string;
  description?: string;
  actif: boolean;
  dateCreation?: string;
  dateModification?: string;
}

interface NomenclatureRequest {
  type: string;
  code: string;
  libelle: string;
  description: string;
  actif: boolean;
}

/** Une liste de choix et l'endroit où elle est proposée. */
interface ListeDef {
  value: string;
  label: string;
  usage: string;
}

/** Une liste affichée : sa définition et ses valeurs (après recherche). */
interface Liste extends ListeDef {
  valeurs: Nomenclature[];
}

/** Dans l'ordre où les champs apparaissent dans les formulaires. */
const LISTES: ListeDef[] = [
  { value: 'STATUT', label: 'Statut du projet', usage: 'Fiche projet : champ « Statut du projet ».' },
  { value: 'CARACTERE_PROJET', label: 'Caractère du projet', usage: 'Fiche projet : champ « Caractère du projet ».' },
  { value: 'TYPE_PROJET', label: 'Type de projet', usage: 'Fiche projet : champ « Type de projet », repris dans le filtre de la liste des projets.' },
  { value: 'MODALITE_DEVELOPPEMENT', label: 'Modalité de développement', usage: 'Fiche projet : champ « Modalité ».' },
  { value: 'CATEGORIE_PROJET', label: 'Catégorie de projet', usage: 'Liste de référence : aucun formulaire ne la propose pour l\'instant.' },
  { value: 'STATUT_TACHE', label: 'Statut de tâche', usage: 'Fiche de suivi : statut de chaque tâche.' },
];

@Component({
  selector: 'app-admin-nomenclature',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-nomenclature.component.html',
  styleUrls: ['../../pilote-qualite/pilote-ui.css', '../../shared/projets-ui.css', '../admin-ui.css', './admin-nomenclature.component.css']
})
export class AdminNomenclatureComponent implements OnInit {
  private http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api/admin/nomenclatures`;

  @ViewChild('formDialog') formDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('suppressionDialog') suppressionDialog?: ElementRef<HTMLDialogElement>;

  nomenclatures = signal<Nomenclature[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  /** Confirmation affichée après un ajout, une modification ou une suppression. */
  message = signal('');
  private messageTimer?: ReturnType<typeof setTimeout>;

  recherche = signal('');

  // Formulaire d'ajout et de modification
  newNomenclature: NomenclatureRequest = this.formulaireVide();
  isCreating = signal(false);
  createError = signal('');
  /** Valeur en cours de modification ; null pour un ajout. */
  enEdition = signal<Nomenclature | null>(null);
  isEditMode = computed(() => this.enEdition() !== null);
  /** Les champs manquants ne sont signalés qu'après une tentative d'enregistrement. */
  tentative = signal(false);

  // Suppression : confirmation dans une boîte de dialogue
  aSupprimer = signal<Nomenclature | null>(null);
  suppressionEnCours = signal(false);
  erreurSuppression = signal('');

  readonly nomenclatureTypes = LISTES;

  /**
   * Une liste par type, dans l'ordre des formulaires ; pendant une recherche, seules les listes concernées.
   * Les valeurs gardent l'ordre du serveur : c'est celui des listes déroulantes des formulaires.
   */
  listes = computed<Liste[]>(() => {
    const terme = this.recherche().trim().toLowerCase();
    const correspond = (n: Nomenclature) => !terme
      || [n.code, n.libelle, n.description].some(v => v?.toLowerCase().includes(terme));

    const toutes = this.nomenclatures();
    // Un type inconnu de cette page reste visible, à la fin, sous son code
    const inconnus = [...new Set(toutes.map(n => n.type))]
      .filter(type => !LISTES.some(l => l.value === type))
      .map(type => ({ value: type, label: type, usage: '' }));

    return [...LISTES, ...inconnus]
      .map(def => ({
        ...def,
        valeurs: toutes.filter(n => n.type === def.value && correspond(n)),
      }))
      .filter(liste => !terme || liste.valeurs.length > 0);
  });

  nbResultats = computed(() => this.listes().reduce((total, liste) => total + liste.valeurs.length, 0));

  ngOnInit() {
    this.loadNomenclatures();
  }

  loadNomenclatures() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    // Le jeton est ajouté par authInterceptor
    this.http.get<Nomenclature[]>(this.api).subscribe({
      next: (data) => {
        this.nomenclatures.set(data || []);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading nomenclatures:', error);
        this.errorMessage.set('Impossible de charger la nomenclature.');
        this.isLoading.set(false);
      }
    });
  }

  getTypeLabel(type: string): string {
    return LISTES.find(t => t.value === type)?.label ?? type;
  }

  formatDate(date: string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  pl(n: number, singulier: string, pluriel = singulier + 's'): string {
    return `${n} ${n > 1 ? pluriel : singulier}`;
  }

  // ==================== Ajout et modification ====================

  /** Ouvre le formulaire vide ; depuis une liste, son type est déjà choisi. */
  openCreate(type = '') {
    this.enEdition.set(null);
    this.newNomenclature = { ...this.formulaireVide(), type };
    this.ouvrirFormulaire();
  }

  editNomenclature(nomenclature: Nomenclature) {
    this.enEdition.set(nomenclature);
    this.newNomenclature = {
      type: nomenclature.type,
      code: nomenclature.code,
      libelle: nomenclature.libelle,
      description: nomenclature.description || '',
      actif: nomenclature.actif,
    };
    this.ouvrirFormulaire();
  }

  private ouvrirFormulaire() {
    this.createError.set('');
    this.tentative.set(false);
    const dialog = this.formDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Le premier champ à remplir reçoit le focus : le type s'il n'est pas choisi, sinon le libellé
      setTimeout(() => dialog.querySelector<HTMLElement>(this.newNomenclature.type ? '#n-libelle' : '#n-type')?.focus());
    }
  }

  createNomenclature() {
    this.tentative.set(true);
    if (!this.newNomenclature.type || !this.newNomenclature.code.trim() || !this.newNomenclature.libelle.trim()) {
      this.createError.set('');
      return;
    }

    this.createError.set('');
    this.isCreating.set(true);
    const corps: NomenclatureRequest = {
      ...this.newNomenclature,
      code: this.newNomenclature.code.trim(),
      libelle: this.newNomenclature.libelle.trim(),
      description: this.newNomenclature.description.trim(),
    };
    const enEdition = this.enEdition();
    const modification = enEdition !== null;
    const requete = enEdition
      ? this.http.put(`${this.api}/${enEdition.id}`, corps)
      : this.http.post(this.api, corps);

    requete.subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeForm();
        this.loadNomenclatures();
        this.afficherMessage(modification
          ? `Valeur « ${corps.libelle} » modifiée.`
          : `Valeur « ${corps.libelle} » ajoutée à la liste « ${this.getTypeLabel(corps.type)} ».`);
      },
      error: (error) => {
        this.isCreating.set(false);
        console.error('Error saving nomenclature:', error);
        // Le serveur répond en anglais : on traduit le seul refus attendu (code déjà pris dans la liste)
        const brut: string = error?.error?.message || '';
        this.createError.set(brut.includes('already exists')
          ? 'Ce code existe déjà dans cette liste : choisissez-en un autre.'
          : (modification ? 'La modification n\'a pas pu être enregistrée.' : 'La valeur n\'a pas pu être ajoutée.'));
      }
    });
  }

  closeForm() {
    const dialog = this.formDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.onFormClosed();
  }

  /** Appelé aussi à la fermeture native (touche Échap). */
  onFormClosed() {
    if (this.isCreating()) return;
    this.newNomenclature = this.formulaireVide();
    this.enEdition.set(null);
    this.createError.set('');
    this.tentative.set(false);
  }

  /** En modification, le code a changé : les fiches déjà remplies gardent l'ancien. */
  codeModifie(): boolean {
    const enEdition = this.enEdition();
    return !!enEdition && !!this.newNomenclature.code.trim() && this.newNomenclature.code.trim() !== enEdition.code;
  }

  // ==================== Suppression ====================

  deleteNomenclature(nomenclature: Nomenclature) {
    this.aSupprimer.set(nomenclature);
    this.erreurSuppression.set('');
    const dialog = this.suppressionDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
      setTimeout(() => dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus());
    }
  }

  annulerSuppression() {
    const dialog = this.suppressionDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.onSuppressionClosed();
  }

  onSuppressionClosed() {
    if (this.suppressionEnCours()) return;
    this.aSupprimer.set(null);
  }

  confirmerSuppression() {
    const nomenclature = this.aSupprimer();
    if (!nomenclature || this.suppressionEnCours()) return;
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set('');

    this.http.delete(`${this.api}/${nomenclature.id}`).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.annulerSuppression();
        this.loadNomenclatures();
        this.afficherMessage(`Valeur « ${nomenclature.libelle} » supprimée.`);
      },
      error: (error) => {
        console.error('Error deleting nomenclature:', error);
        this.suppressionEnCours.set(false);
        this.erreurSuppression.set('La suppression n\'a pas pu être effectuée.');
      }
    });
  }

  /**
   * Un clic sur le fond assombri (donc sur la boîte elle-même, pas sur son contenu) ferme la fenêtre,
   * sauf pendant un envoi : une erreur doit rester visible.
   */
  onDialogClick(event: MouseEvent, dialog: HTMLDialogElement) {
    if (event.target !== dialog || this.isCreating() || this.suppressionEnCours()) return;
    if (dialog === this.formDialog?.nativeElement) this.closeForm();
    else this.annulerSuppression();
  }

  private afficherMessage(texte: string) {
    clearTimeout(this.messageTimer);
    this.message.set(texte);
    this.messageTimer = setTimeout(() => this.message.set(''), 5000);
  }

  private formulaireVide(): NomenclatureRequest {
    return { type: '', code: '', libelle: '', description: '', actif: true };
  }
}
