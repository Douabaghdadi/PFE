import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { FicheDecidee, TypeFiche, ValidationFiche, ValidationFicheService } from '../../services/validation-fiche.service';
import { statutValidation, validationDef } from '../../pages/shared/validation-stats';

/**
 * Bandeau de validation d'une fiche : son état, puis ce que le lecteur peut en faire.
 * Commun aux quatre pages de détail : le pilote qualité y prend sa décision,
 * le chef de projet y lit la décision et ouvre le formulaire pour corriger.
 */
@Component({
  selector: 'app-fiche-validation',
  standalone: true,
  imports: [NgClass, RouterLink],
  templateUrl: './fiche-validation.component.html',
  styleUrls: ['../../pages/pilote-qualite/pilote-ui.css', '../../pages/shared/projets-ui.css', './fiche-validation.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FicheValidationComponent {
  private validationService = inject(ValidationFicheService);

  readonly type = input.required<TypeFiche>();
  readonly ficheId = input.required<string>();
  readonly validation = input<ValidationFiche>();
  /** Vrai pour le pilote qualité seulement : ouvre les deux décisions. */
  readonly peutDecider = input(false);
  /** Formulaire de la fiche, fourni à la page du chef de projet pour corriger. */
  readonly lienCorrection = input<any[] | null>(null);

  readonly decidee = output<ValidationFiche>();

  private dialogue = viewChild<ElementRef<HTMLDialogElement>>('dialogue');
  private etat = viewChild<ElementRef<HTMLElement>>('etat');

  readonly statut = computed(() => statutValidation(this.validation()));
  readonly def = computed(() => validationDef(this.validation()));
  readonly motifAffiche = computed(() => this.statut() === 'A_CORRIGER' ? this.validation()?.motif : undefined);

  readonly phrase = computed(() => {
    const validation = this.validation();
    switch (this.statut()) {
      case 'VALIDEE':
        return `Validée par ${validation?.piloteNom} le ${this.dateDecision()}.`;
      case 'A_CORRIGER':
        return `Correction demandée par ${validation?.piloteNom} le ${this.dateDecision()}.`
          + (this.peutDecider() ? ' En attente du chef de projet.' : '');
      default:
        return this.peutDecider() ? 'Cette fiche attend votre décision.' : 'Cette fiche attend la décision du pilote qualité.';
    }
  });

  readonly peutValider = computed(() => this.peutDecider() && this.statut() === 'A_VALIDER');
  /** Une fiche validée peut encore être renvoyée : une erreur se repère parfois après coup. */
  readonly peutDemanderCorrection = computed(() => this.peutDecider() && this.statut() !== 'A_CORRIGER');
  readonly peutCorriger = computed(() => !!this.lienCorrection() && this.statut() === 'A_CORRIGER');

  readonly motif = signal('');
  readonly dialogueOuvert = signal(false);
  readonly enCours = signal(false);
  readonly erreur = signal('');

  private dateDecision(): string {
    const date = this.validation()?.dateDecision;
    return date ? new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  }

  valider() {
    this.decider(this.validationService.valider(this.type(), this.ficheId()));
  }

  envoyerCorrection() {
    const motif = this.motif().trim();
    if (!motif) return;
    this.decider(this.validationService.demanderCorrection(this.type(), this.ficheId(), motif));
  }

  private decider(appel: Observable<FicheDecidee>) {
    if (this.enCours()) return;
    this.enCours.set(true);
    this.erreur.set('');
    appel.subscribe({
      next: (fiche) => {
        this.enCours.set(false);
        this.decidee.emit(fiche.validation);
        this.fermerDialogue();
        // Le bouton utilisé disparaît : le focus passe sur le nouvel état, qui est aussi annoncé aux lecteurs d'écran
        setTimeout(() => this.etat()?.nativeElement.focus());
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreur.set(err?.error?.message || 'La décision n\'a pas pu être enregistrée. Réessayez.');
      }
    });
  }

  ouvrirDialogue() {
    this.motif.set('');
    this.erreur.set('');
    this.dialogueOuvert.set(true);
    this.dialogue()?.nativeElement.showModal();
  }

  fermerDialogue() {
    const dialogue = this.dialogue()?.nativeElement;
    if (dialogue?.open) dialogue.close();
    this.dialogueOuvert.set(false);
  }

  /** Un clic sur le fond assombri ferme la fenêtre, sauf pendant l'envoi. */
  onDialogueClick(event: MouseEvent) {
    if (event.target === this.dialogue()?.nativeElement && !this.enCours()) this.fermerDialogue();
  }
}
