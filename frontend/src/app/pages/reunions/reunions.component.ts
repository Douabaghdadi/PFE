import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import {
  ListeReunions, ParticipantPossible, ProjetPossible, Reunion, ReunionService
} from '../../services/reunion.service';
import { JOURS_SEMAINE, JourCalendrier, cleDate, premierDuMois, semainesDuMois, titreDuMois } from '../shared/calendrier-mois';

/** La limite d'un compte Google gratuit : le serveur la contrôle aussi. */
const DUREES_MINUTES = [15, 30, 45, 60];
const DUREE_PAR_DEFAUT = 30;

/** Les plus anciennes restent visibles dans le calendrier. */
const NOMBRE_TERMINEES_LISTEES = 5;

/**
 * Page « Réunions », ouverte depuis la barre de navigation. Chacun y voit les réunions qu'il organise et celles où il
 * est invité. Le chef de projet planifie sur l'un de ses projets ; le pilote qualité réunit des chefs de projet, sans
 * projet. Seul l'organisateur annule. Le serveur garde le dernier mot sur tous ces droits.
 */
@Component({
  selector: 'app-reunions',
  standalone: true,
  templateUrl: './reunions.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/projets-ui.css', './reunions.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReunionsComponent implements OnInit {
  private service = inject(ReunionService);
  private auth = inject(AuthService);

  private dialoguePlanifier = viewChild<ElementRef<HTMLDialogElement>>('dialoguePlanifier');
  private dialogueAnnuler = viewChild<ElementRef<HTMLDialogElement>>('dialogueAnnuler');
  private boutonPlanifier = viewChild<ElementRef<HTMLButtonElement>>('boutonPlanifier');
  private champProjet = viewChild<ElementRef<HTMLSelectElement>>('champProjet');
  private champTitre = viewChild<ElementRef<HTMLInputElement>>('champTitre');

  /** Le chef de projet choisit un projet ; le pilote qualité n'en a pas à lui. */
  readonly avecProjet = !this.auth.hasRole('ROLE_PILOTE_QUALITE');
  readonly titreGroupe = this.avecProjet ? 'Pilotes qualité' : 'Chefs de projet';

  readonly durees = DUREES_MINUTES;

  readonly reunions = signal<Reunion[]>([]);
  readonly peutPlanifier = signal(false);
  readonly planificationActive = signal(false);
  readonly chargement = signal(true);
  /** Faux si la liste n'a pas pu être lue : rien n'est alors affiché à sa place. */
  readonly listeChargee = signal(false);
  readonly erreur = signal('');
  readonly annonce = signal('');

  /** La plus proche en tête. */
  readonly aVenir = computed(() => this.reunions()
    .filter(reunion => !this.estTerminee(reunion))
    .sort((a, b) => a.debut.localeCompare(b.debut)));

  /** La plus récente en tête. */
  readonly terminees = computed(() => this.reunions()
    .filter(reunion => this.estTerminee(reunion))
    .sort((a, b) => b.debut.localeCompare(a.debut)));

  /** Mise en avant en haut de page ; les suivantes sont listées dessous. */
  readonly prochaine = computed(() => this.aVenir()[0] ?? null);
  readonly ensuite = computed(() => this.aVenir().slice(1));
  readonly recentes = computed(() => this.terminees().slice(0, NOMBRE_TERMINEES_LISTEES));

  // Calendrier
  readonly joursSemaine = JOURS_SEMAINE;
  readonly moisAffiche = signal(premierDuMois(new Date()));

  readonly titreMois = computed(() => titreDuMois(this.moisAffiche()));

  /** Semaines du mois affiché, avec les réunions de chaque jour. */
  readonly semaines = computed<JourCalendrier<Reunion>[][]>(() => {
    const parJour = new Map<string, Reunion[]>();
    for (const reunion of [...this.reunions()].sort((a, b) => a.debut.localeCompare(b.debut))) {
      const cle = reunion.debut.slice(0, 10);
      parJour.set(cle, [...(parJour.get(cle) ?? []), reunion]);
    }
    return semainesDuMois(this.moisAffiche(), parJour);
  });

  // Formulaire de planification
  readonly projets = signal<ProjetPossible[]>([]);
  readonly projetId = signal('');
  readonly titre = signal('');
  readonly debut = signal('');
  readonly duree = signal(DUREE_PAR_DEFAUT);
  readonly description = signal('');
  /** Proposés pour toute réunion : les pilotes qualité pour un chef de projet, les chefs de projet pour un pilote. */
  readonly participants = signal<ParticipantPossible[]>([]);
  /** L'équipe du projet choisi. */
  readonly equipe = signal<ParticipantPossible[]>([]);
  readonly membresSansEmail = signal(0);
  readonly chargementEquipe = signal(false);
  readonly erreurEquipe = signal('');
  readonly choisis = signal<ReadonlySet<string>>(new Set());
  readonly debutMinimum = signal('');
  readonly chargementFormulaire = signal(false);
  readonly planificationEnCours = signal(false);
  readonly erreurFormulaire = signal('');

  readonly recherche = signal('');

  readonly formulaireComplet = computed(() => (!this.avecProjet || this.projetId().length > 0) && this.titre().trim().length > 0
    && this.debut().length > 0 && this.choisis().size > 0);

  readonly pilotesAffiches = computed(() => filtrer(this.participants(), this.recherche()));
  readonly equipeAffichee = computed(() => filtrer(this.equipe(), this.recherche()));

  /** Google a besoin d'une adresse : ces membres ne sont invitables qu'une fois la fiche projet complétée. */
  readonly noteSansEmail = computed(() => {
    const nombre = this.membresSansEmail();
    if (!nombre) return '';
    return nombre === 1
      ? '1 membre n\'a pas d\'adresse email : complétez la fiche projet pour l\'inviter.'
      : `${nombre} membres n'ont pas d'adresse email : complétez la fiche projet pour les inviter.`;
  });

  /** Dit ce qui manque tant que le bouton « Planifier » reste grisé. */
  readonly aideEnvoi = computed(() => {
    if (this.avecProjet && !this.projets().length) return '';
    const manque = [
      !this.avecProjet || this.projetId() ? '' : 'projet',
      this.titre().trim() ? '' : 'titre',
      this.debut() ? '' : 'date',
      this.choisis().size ? '' : 'participants'
    ].filter(Boolean);
    if (manque.length) return `À compléter : ${manque.join(', ')}.`;
    const nombre = this.choisis().size;
    return `Google enverra l'invitation à ${nombre} participant${nombre > 1 ? 's' : ''} et à vous.`;
  });

  // Annulation
  readonly aAnnuler = signal<Reunion | null>(null);
  readonly annulationEnCours = signal(false);

  ngOnInit() {
    this.service.lister().subscribe({
      next: (etat) => {
        this.appliquer(etat);
        this.listeChargee.set(true);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Les réunions n\'ont pas pu être chargées. Rechargez la page.');
        this.chargement.set(false);
      }
    });
  }

  ouvrirPlanification() {
    this.projetId.set('');
    this.titre.set('');
    this.debut.set('');
    this.duree.set(DUREE_PAR_DEFAUT);
    this.description.set('');
    this.choisis.set(new Set());
    this.recherche.set('');
    this.equipe.set([]);
    this.membresSansEmail.set(0);
    this.chargementEquipe.set(false);
    this.erreurEquipe.set('');
    this.erreurFormulaire.set('');
    this.erreur.set('');
    this.debutMinimum.set(valeurChampDate(new Date()));
    this.dialoguePlanifier()?.nativeElement.showModal();

    this.chargementFormulaire.set(true);
    const projets$ = this.avecProjet ? this.service.mesProjets() : of<ProjetPossible[]>([]);
    forkJoin({ projets: projets$, participants: this.service.participants() }).subscribe({
      next: ({ projets, participants }) => {
        this.projets.set(projets);
        this.participants.set(participants);
        // Un seul projet : inutile de le faire choisir
        if (projets.length === 1) this.choisirProjet(projets[0].id);
        this.chargementFormulaire.set(false);
        // Les champs n'existent qu'une fois les listes chargées : le focus y est placé ensuite
        setTimeout(() => (this.champProjet() ?? this.champTitre())?.nativeElement.focus());
      },
      error: () => {
        this.chargementFormulaire.set(false);
        this.erreurFormulaire.set('Le formulaire n\'a pas pu être préparé. Fermez-le et réessayez.');
      }
    });
  }

  /** L'équipe dépend du projet : les membres cochés pour un autre projet ne restent pas invités. */
  choisirProjet(id: string) {
    this.projetId.set(id);
    const pilotes = new Set(this.participants().map(pilote => pilote.email));
    this.choisis.set(new Set([...this.choisis()].filter(email => pilotes.has(email))));
    this.equipe.set([]);
    this.membresSansEmail.set(0);
    this.erreurEquipe.set('');
    this.chargementEquipe.set(true);
    this.service.equipe(id).subscribe({
      next: (equipe) => {
        // Un autre projet a pu être choisi pendant le chargement
        if (this.projetId() !== id) return;
        this.equipe.set(equipe.membres);
        this.membresSansEmail.set(equipe.sansEmail);
        this.chargementEquipe.set(false);
      },
      error: () => {
        if (this.projetId() !== id) return;
        this.chargementEquipe.set(false);
        this.erreurEquipe.set('L\'équipe de ce projet n\'a pas pu être chargée. Choisissez de nouveau le projet.');
      }
    });
  }

  basculerParticipant(email: string, coche: boolean) {
    const choisis = new Set(this.choisis());
    if (coche) {
      choisis.add(email);
    } else {
      choisis.delete(email);
    }
    this.choisis.set(choisis);
  }

  planifier() {
    if (!this.formulaireComplet() || this.planificationEnCours()) return;
    const titre = this.titre().trim();
    this.erreurFormulaire.set('');
    this.planificationEnCours.set(true);
    const reunion = {
      titre,
      description: this.description().trim(),
      debut: this.debut(),
      dureeMinutes: this.duree(),
      participantEmails: [...this.choisis()]
    };
    const envoi = this.avecProjet ? this.service.planifier(this.projetId(), reunion) : this.service.planifierSansProjet(reunion);
    envoi.subscribe({
      next: (etat) => {
        this.planificationEnCours.set(false);
        this.fermerPlanification();
        this.appliquer(etat);
        this.annonce.set(`Réunion ${titre} planifiée. Google envoie les invitations.`);
      },
      error: (err) => {
        this.planificationEnCours.set(false);
        this.erreurFormulaire.set(err?.error?.message || 'La réunion n\'a pas pu être planifiée. Réessayez.');
      }
    });
  }

  fermerPlanification() {
    const dialogue = this.dialoguePlanifier()?.nativeElement;
    if (dialogue?.open) dialogue.close();
  }

  /** Un clic sur le fond assombri ferme la fenêtre, sauf pendant l'envoi. */
  onPlanificationClick(evenement: MouseEvent) {
    if (evenement.target === this.dialoguePlanifier()?.nativeElement && !this.planificationEnCours()) {
      this.fermerPlanification();
    }
  }

  demanderAnnulation(reunion: Reunion) {
    this.erreur.set('');
    this.aAnnuler.set(reunion);
    this.dialogueAnnuler()?.nativeElement.showModal();
  }

  confirmerAnnulation() {
    const reunion = this.aAnnuler();
    if (!reunion || this.annulationEnCours()) return;
    this.annulationEnCours.set(true);
    this.service.annuler(reunion.id).subscribe({
      next: (etat) => {
        this.annulationEnCours.set(false);
        this.fermerAnnulation();
        this.appliquer(etat);
        this.annonce.set(`Réunion ${reunion.titre} annulée.`);
        // La ligne du bouton utilisé a disparu : le focus revient sur l'action principale
        setTimeout(() => this.boutonPlanifier()?.nativeElement.focus());
      },
      error: (err) => {
        this.annulationEnCours.set(false);
        this.fermerAnnulation();
        this.erreur.set(err?.error?.message || 'La réunion n\'a pas pu être annulée. Réessayez.');
      }
    });
  }

  fermerAnnulation() {
    const dialogue = this.dialogueAnnuler()?.nativeElement;
    if (dialogue?.open) dialogue.close();
    this.aAnnuler.set(null);
  }

  onAnnulationClick(evenement: MouseEvent) {
    if (evenement.target === this.dialogueAnnuler()?.nativeElement && !this.annulationEnCours()) {
      this.fermerAnnulation();
    }
  }

  private appliquer(etat: ListeReunions) {
    this.reunions.set(etat.reunions);
    this.peutPlanifier.set(etat.peutPlanifier);
    this.planificationActive.set(etat.planificationActive);
  }

  estTerminee(reunion: Reunion): boolean {
    return new Date(reunion.debut).getTime() + reunion.dureeMinutes * 60000 < Date.now();
  }

  jour(reunion: Reunion): string {
    return new Date(reunion.debut).toLocaleDateString('fr-FR', { day: 'numeric' });
  }

  mois(reunion: Reunion): string {
    return new Date(reunion.debut).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  }

  /** « Jeudi 12 novembre ». */
  jourLong(reunion: Reunion): string {
    return majuscule(new Date(reunion.debut).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
  }

  /** « Jeu. 12 nov. ». */
  jourCourt(reunion: Reunion): string {
    return majuscule(new Date(reunion.debut).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
  }

  heure(reunion: Reunion): string {
    return new Date(reunion.debut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  /** « 10:30 – 11:15 ». */
  plage(reunion: Reunion): string {
    const fin = new Date(new Date(reunion.debut).getTime() + reunion.dureeMinutes * 60000);
    return `${this.heure(reunion)} – ${fin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }

  /** « Prochaine réunion, dans 4 jours ». */
  echeance(reunion: Reunion): string {
    if (new Date(reunion.debut).getTime() <= Date.now()) return 'Réunion en cours';
    const jours = Math.round(
      (Date.parse(`${reunion.debut.slice(0, 10)}T00:00:00`) - Date.parse(`${cleDate(new Date())}T00:00:00`)) / 86400000
    );
    if (jours === 0) return 'Prochaine réunion, aujourd\'hui';
    if (jours === 1) return 'Prochaine réunion, demain';
    return `Prochaine réunion, dans ${jours} jours`;
  }

  /** Les personnes de la réunion, l'organisateur d'abord : quatre pastilles au plus. */
  personnesAffichees(reunion: Reunion): string[] {
    return [reunion.organisateurNom, ...reunion.participantNoms].slice(0, 4);
  }

  personnesEnPlus(reunion: Reunion): number {
    return Math.max(0, reunion.participantNoms.length + 1 - 4);
  }

  initiales(nom: string): string {
    const parties = (nom || '').split(/[\s._-]+/).filter(Boolean);
    if (parties.length >= 2) return (parties[0][0] + parties[1][0]).toUpperCase();
    return (parties[0] || '?').slice(0, 2).toUpperCase();
  }

  changerMois(ecart: number) {
    const courant = this.moisAffiche();
    this.moisAffiche.set(new Date(courant.getFullYear(), courant.getMonth() + ecart, 1));
  }

  /** « Organisée par sami.trabelsi, avec amel.bensalah et ines.gharbi ». */
  personnes(reunion: Reunion): string {
    const invites = reunion.participantNoms;
    const avec = invites.length > 1
      ? `${invites.slice(0, -1).join(', ')} et ${invites[invites.length - 1]}`
      : invites.join('');
    return `Organisée par ${reunion.organisateurNom}${avec ? `, avec ${avec}` : ''}`;
  }
}

/** La valeur attendue par un champ datetime-local : l'heure locale, sans fuseau. */
function valeurChampDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/** Les personnes dont l'adresse contient le texte recherché. */
function filtrer(personnes: ParticipantPossible[], recherche: string): ParticipantPossible[] {
  const cherche = recherche.trim().toLowerCase();
  return personnes.filter(personne => personne.email.toLowerCase().includes(cherche));
}

function majuscule(texte: string): string {
  return `${texte.charAt(0).toUpperCase()}${texte.slice(1)}`;
}
