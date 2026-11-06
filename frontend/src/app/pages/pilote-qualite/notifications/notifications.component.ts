import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from, of } from 'rxjs';
import { catchError, concatMap, map, toArray } from 'rxjs/operators';
import { ChefProjet, PiloteQualiteNotificationService } from '../../../services/pilote-qualite-notification.service';

type Mode = 'tous' | 'selection';
type Confirmation = 'envoi' | 'effacer';

interface Retour {
  type: 'ok' | 'partiel' | 'erreur';
  texte: string;
}

const OBJET_MAX = 150;

/**
 * Messagerie du pilote qualité : envoi d'emails personnalisés aux chefs de projet.
 * L'API accepte un destinataire (chefId) ou tous (chefId vide) : une sélection
 * de plusieurs chefs envoie donc une requête par destinataire, l'une après l'autre.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['../pilote-ui.css', './notifications.component.css']
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(PiloteQualiteNotificationService);
  private cdr = inject(ChangeDetectorRef);

  readonly objetMax = OBJET_MAX;

  // Destinataires
  chefs = signal<ChefProjet[]>([]);
  chargementChefs = signal(true);
  erreurChefs = signal(false);
  mode = signal<Mode>('tous');
  selection = signal<ReadonlySet<string>>(new Set());
  recherche = signal('');
  /** Panneau de choix des destinataires, ouvert par-dessus le formulaire. */
  pickerOuvert = signal(false);

  // Contenu
  objet = signal('');
  message = signal('');

  // Envoi
  envoiEnCours = signal(false);
  tentative = signal(false);
  retour = signal<Retour | null>(null);
  confirmation = signal<Confirmation | null>(null);

  private dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private champObjet = viewChild<ElementRef<HTMLInputElement>>('champObjet');
  private champMessage = viewChild<ElementRef<HTMLTextAreaElement>>('champMessage');
  private champRecherche = viewChild<ElementRef<HTMLInputElement>>('champRecherche');
  private zoneDestinataires = viewChild<ElementRef<HTMLElement>>('zoneDestinataires');
  private boutonAjouter = viewChild<ElementRef<HTMLButtonElement>>('boutonAjouter');

  chefsFiltres = computed(() => {
    const q = this.recherche().trim().toLowerCase();
    if (!q) return this.chefs();
    return this.chefs().filter(c => c.username.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
  });

  chefsSelectionnes = computed(() => this.chefs().filter(c => this.selection().has(c.id)));

  /** Chefs réellement destinataires selon le mode choisi. */
  destinataires = computed(() => this.mode() === 'tous' ? this.chefs() : this.chefsSelectionnes());

  /** L'API ignore les comptes sans email : ils ne reçoivent rien. */
  sansEmail = computed(() => this.destinataires().filter(c => !c.email).length);
  nbDestinataires = computed(() => this.destinataires().length - this.sansEmail());

  erreurDestinataires = computed(() => this.nbDestinataires() === 0
    ? (this.mode() === 'selection' ? 'Choisissez au moins un destinataire.' : 'Aucun chef de projet ne peut recevoir d\'email.')
    : '');
  erreurObjet = computed(() => this.objet().trim() ? '' : 'Saisissez l\'objet du message.');
  erreurMessage = computed(() => this.message().trim() ? '' : 'Rédigez le contenu du message.');
  formulaireValide = computed(() => !this.erreurDestinataires() && !this.erreurObjet() && !this.erreurMessage());

  /** Un envoi à plusieurs personnes demande une confirmation explicite. */
  envoiCollectif = computed(() => this.nbDestinataires() > 1);
  formulaireModifie = computed(() => !!(this.objet() || this.message() || this.selection().size || this.mode() === 'selection'));

  libelleDestinataires = computed(() => this.mode() === 'tous'
    ? `Tous les chefs de projet (${this.pl(this.nbDestinataires(), 'personne')})`
    : this.pl(this.nbDestinataires(), 'destinataire sélectionné', 'destinataires sélectionnés'));

  ngOnInit() {
    this.chargerChefs();
  }

  chargerChefs() {
    this.chargementChefs.set(true);
    this.erreurChefs.set(false);
    this.notificationService.getChefsProjet().subscribe({
      next: (data) => {
        this.chefs.set([...data].sort((a, b) => a.username.localeCompare(b.username)));
        this.chargementChefs.set(false);
      },
      error: () => {
        this.erreurChefs.set(true);
        this.chargementChefs.set(false);
      }
    });
  }

  // ==================== Destinataires ====================

  choisirMode(mode: Mode) {
    this.mode.set(mode);
    if (mode === 'selection' && !this.selection().size) {
      this.ouvrirPicker();
    } else {
      this.pickerOuvert.set(false);
    }
  }

  basculerPicker() {
    this.pickerOuvert() ? this.fermerPicker(false) : this.ouvrirPicker();
  }

  private ouvrirPicker() {
    this.pickerOuvert.set(true);
    // La recherche n'existe qu'une fois le panneau affiché
    setTimeout(() => this.champRecherche()?.nativeElement.focus());
  }

  fermerPicker(rendreFocus: boolean) {
    this.pickerOuvert.set(false);
    this.recherche.set('');
    if (rendreFocus) setTimeout(() => this.boutonAjouter()?.nativeElement.focus());
  }

  /** Un clic en dehors de la zone des destinataires referme le panneau. */
  @HostListener('document:click', ['$event'])
  clicExterieur(event: MouseEvent) {
    if (!this.pickerOuvert()) return;
    const zone = this.zoneDestinataires()?.nativeElement;
    // composedPath : reste juste même si l'élément cliqué a été retiré du DOM (étiquette supprimée)
    if (zone && !event.composedPath().includes(zone)) this.fermerPicker(false);
  }

  basculer(id: string) {
    const suivante = new Set(this.selection());
    suivante.has(id) ? suivante.delete(id) : suivante.add(id);
    this.selection.set(suivante);
  }

  retirer(id: string) {
    const suivante = new Set(this.selection());
    suivante.delete(id);
    this.selection.set(suivante);
  }

  /** Coche d'un coup tous les chefs visibles (avec email) dans la liste filtrée. */
  toutSelectionnerVisibles() {
    const suivante = new Set(this.selection());
    this.chefsFiltres().filter(c => c.email).forEach(c => suivante.add(c.id));
    this.selection.set(suivante);
  }

  viderSelection() {
    this.selection.set(new Set());
  }

  initiales(nom: string): string {
    const parts = nom.split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
  }

  // ==================== Envoi ====================

  demanderEnvoi() {
    if (this.envoiEnCours()) return;
    this.tentative.set(true);
    this.retour.set(null);

    if (!this.formulaireValide()) {
      this.focusPremiereErreur();
      return;
    }
    if (this.envoiCollectif()) {
      this.ouvrirConfirmation('envoi');
    } else {
      this.envoyer();
    }
  }

  demanderEffacement() {
    if (!this.formulaireModifie()) return;
    if (this.objet() || this.message()) {
      this.ouvrirConfirmation('effacer');
    } else {
      this.effacer();
    }
  }

  confirmer() {
    const action = this.confirmation();
    this.fermerConfirmation();
    if (action === 'envoi') this.envoyer();
    if (action === 'effacer') this.effacer();
  }

  fermerConfirmation() {
    this.dialog()?.nativeElement.close();
    this.confirmation.set(null);
  }

  private ouvrirConfirmation(action: Confirmation) {
    this.confirmation.set(action);
    // Afficher le contenu avant l'ouverture : le navigateur place alors le focus sur « Annuler » (autofocus)
    this.cdr.detectChanges();
    this.dialog()?.nativeElement.showModal();
  }

  private envoyer() {
    if (this.envoiEnCours()) return;
    this.envoiEnCours.set(true);
    const objet = this.objet().trim();
    const message = this.message().trim();

    if (this.mode() === 'tous') {
      const nb = this.nbDestinataires();
      this.notificationService.envoyerEmailPersonnalise('', objet, message).subscribe({
        next: () => this.terminer({ type: 'ok', texte: `Message envoyé à ${this.pl(nb, 'chef de projet', 'chefs de projet')}.` }),
        error: (err) => this.terminer({ type: 'erreur', texte: this.messageErreur(err) })
      });
      return;
    }

    // Sélection : une requête par destinataire, l'une après l'autre
    const cibles = this.chefsSelectionnes().filter(c => c.email);
    from(cibles).pipe(
      concatMap(chef => this.notificationService.envoyerEmailPersonnalise(chef.id, objet, message).pipe(
        map(() => ({ chef, ok: true })),
        catchError(() => of({ chef, ok: false }))
      )),
      toArray()
    ).subscribe(resultats => {
      const echecs = resultats.filter(r => !r.ok).map(r => r.chef.username);
      const reussis = resultats.length - echecs.length;
      if (!echecs.length) {
        this.terminer({ type: 'ok', texte: `Message envoyé à ${this.pl(reussis, 'destinataire')}.` });
      } else if (reussis) {
        this.terminer({ type: 'partiel', texte: `Message envoyé à ${reussis} sur ${this.pl(resultats.length, 'destinataire')}. Échec pour : ${echecs.join(', ')}.` }, false);
      } else {
        this.terminer({ type: 'erreur', texte: 'L\'envoi a échoué pour tous les destinataires. Vérifiez votre connexion puis réessayez.' });
      }
    });
  }

  private terminer(retour: Retour, reinitialiser = retour.type === 'ok') {
    this.envoiEnCours.set(false);
    this.retour.set(retour);
    if (reinitialiser) this.effacer(false);
  }

  private messageErreur(err: any): string {
    if (err?.status === 0) return 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.';
    return err?.error?.message || 'L\'envoi a échoué. Réessayez dans quelques instants.';
  }

  effacer(effacerRetour = true) {
    this.objet.set('');
    this.message.set('');
    this.selection.set(new Set());
    this.recherche.set('');
    this.pickerOuvert.set(false);
    this.mode.set('tous');
    this.tentative.set(false);
    if (effacerRetour) this.retour.set(null);
  }

  private focusPremiereErreur() {
    if (this.erreurDestinataires() && this.mode() === 'selection') {
      this.ouvrirPicker();
    } else if (this.erreurObjet()) {
      this.champObjet()?.nativeElement.focus();
    } else if (this.erreurMessage()) {
      this.champMessage()?.nativeElement.focus();
    }
  }

  /** Prévient avant de quitter la page si un message est en cours de rédaction. */
  @HostListener('window:beforeunload', ['$event'])
  avantDeQuitter(event: BeforeUnloadEvent) {
    if (this.objet() || this.message()) event.preventDefault();
  }

  /** Accord simple : pl(1, 'chef') → « 1 chef », pl(3, 'chef') → « 3 chefs ». */
  pl(n: number, singulier: string, pluriel = singulier + 's'): string {
    return `${n} ${n > 1 ? pluriel : singulier}`;
  }
}
