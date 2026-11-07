import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { PieceJointe, PieceJointeService, PiecesJointesFiche } from '../../services/piece-jointe.service';
import type { TypeFiche, ValidationFiche } from '../../services/validation-fiche.service';

const FORMATS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'png', 'jpg', 'jpeg'];
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;
const NOMBRE_MAX = 10;

/**
 * Documents joints à une fiche, communs aux quatre pages de détail. Le serveur indique qui peut les
 * gérer : le chef de projet de la fiche ajoute et retire, le pilote qualité et l'administrateur téléchargent.
 */
@Component({
  selector: 'app-pieces-jointes',
  standalone: true,
  templateUrl: './pieces-jointes.component.html',
  styleUrls: ['../../pages/pilote-qualite/pilote-ui.css', '../../pages/shared/projets-ui.css', './pieces-jointes.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PiecesJointesComponent implements OnInit {
  private service = inject(PieceJointeService);

  readonly type = input.required<TypeFiche>();
  readonly ficheId = input.required<string>();

  /** Un ajout ou un retrait renvoie la fiche au pilote qualité : la page met à jour son bandeau. */
  readonly validationChangee = output<ValidationFiche>();

  private dialogue = viewChild<ElementRef<HTMLDialogElement>>('dialogue');
  private boutonAjouter = viewChild<ElementRef<HTMLButtonElement>>('boutonAjouter');

  readonly formatsAcceptes = FORMATS.map(format => `.${format}`).join(',');

  readonly pieces = signal<PieceJointe[]>([]);
  readonly peutGerer = signal(false);
  readonly chargement = signal(true);
  readonly envoiEnCours = signal(false);
  readonly telechargementId = signal<string | null>(null);
  readonly aRetirer = signal<PieceJointe | null>(null);
  readonly retraitEnCours = signal(false);
  readonly erreur = signal('');
  readonly annonce = signal('');

  readonly limiteAtteinte = computed(() => this.pieces().length >= NOMBRE_MAX);

  ngOnInit() {
    this.service.lister(this.type(), this.ficheId()).subscribe({
      next: (etat) => {
        this.appliquer(etat);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Les documents de cette fiche n\'ont pas pu être chargés.');
        this.chargement.set(false);
      }
    });
  }

  onFichierChoisi(evenement: Event) {
    const champ = evenement.target as HTMLInputElement;
    const fichier = champ.files?.[0];
    // Vidé tout de suite : sinon, choisir à nouveau le même fichier ne déclencherait rien
    champ.value = '';
    if (!fichier) return;

    const refus = this.raisonDuRefus(fichier);
    this.erreur.set(refus);
    if (refus) return;

    this.envoiEnCours.set(true);
    this.service.ajouter(this.type(), this.ficheId(), fichier).subscribe({
      next: (etat) => {
        this.envoiEnCours.set(false);
        this.apresChangement(etat, `Document ${fichier.name} ajouté.`);
      },
      error: (err) => {
        this.envoiEnCours.set(false);
        this.erreur.set(err?.error?.message || 'Le document n\'a pas pu être envoyé. Réessayez.');
      }
    });
  }

  /** Évite d'envoyer pour rien un fichier que le serveur refusera : il garde le dernier mot. */
  private raisonDuRefus(fichier: File): string {
    if (!FORMATS.includes(extension(fichier.name))) {
      return 'Format refusé : joignez un PDF, un document Word, Excel ou PowerPoint, ou une image.';
    }
    if (fichier.size === 0) return 'Ce fichier est vide.';
    if (fichier.size > TAILLE_MAX_OCTETS) return 'Ce fichier dépasse la taille maximale de 10 Mo.';
    return '';
  }

  telecharger(piece: PieceJointe) {
    if (this.telechargementId()) return;
    this.telechargementId.set(piece.id);
    this.erreur.set('');
    this.service.telecharger(piece.id).subscribe({
      next: (contenu) => {
        this.telechargementId.set(null);
        const adresse = URL.createObjectURL(contenu);
        const lien = document.createElement('a');
        lien.href = adresse;
        lien.download = piece.nomFichier;
        lien.click();
        URL.revokeObjectURL(adresse);
      },
      error: () => {
        this.telechargementId.set(null);
        this.erreur.set('Ce document n\'a pas pu être téléchargé. Réessayez.');
      }
    });
  }

  demanderRetrait(piece: PieceJointe) {
    this.erreur.set('');
    this.aRetirer.set(piece);
    this.dialogue()?.nativeElement.showModal();
  }

  confirmerRetrait() {
    const piece = this.aRetirer();
    if (!piece || this.retraitEnCours()) return;
    this.retraitEnCours.set(true);
    this.service.retirer(piece.id).subscribe({
      next: (etat) => {
        this.retraitEnCours.set(false);
        this.fermerDialogue();
        this.apresChangement(etat, `Document ${piece.nomFichier} retiré.`);
        // La ligne du bouton utilisé a disparu : le focus revient sur l'action principale
        setTimeout(() => this.boutonAjouter()?.nativeElement.focus());
      },
      error: (err) => {
        this.retraitEnCours.set(false);
        this.fermerDialogue();
        this.erreur.set(err?.error?.message || 'Le document n\'a pas pu être retiré. Réessayez.');
      }
    });
  }

  fermerDialogue() {
    const dialogue = this.dialogue()?.nativeElement;
    if (dialogue?.open) dialogue.close();
    this.aRetirer.set(null);
  }

  /** Un clic sur le fond assombri ferme la fenêtre, sauf pendant le retrait. */
  onDialogueClick(evenement: MouseEvent) {
    if (evenement.target === this.dialogue()?.nativeElement && !this.retraitEnCours()) this.fermerDialogue();
  }

  private apresChangement(etat: PiecesJointesFiche, annonce: string) {
    this.appliquer(etat);
    this.annonce.set(annonce);
    this.validationChangee.emit(etat.validation);
  }

  private appliquer(etat: PiecesJointesFiche) {
    this.pieces.set(etat.pieces);
    this.peutGerer.set(etat.peutGerer);
  }

  /** Le format en clair sur la ligne : « PDF », « DOCX ». */
  format(piece: PieceJointe): string {
    return extension(piece.nomFichier).toUpperCase();
  }

  taille(octets: number): string {
    if (octets < 1024) return `${octets} o`;
    if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
    return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
  }

  date(valeur: string): string {
    return new Date(valeur).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}

function extension(nom: string): string {
  const point = nom.lastIndexOf('.');
  return point < 0 ? '' : nom.slice(point + 1).toLowerCase();
}
