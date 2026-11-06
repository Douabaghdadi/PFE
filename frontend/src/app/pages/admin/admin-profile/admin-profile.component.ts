import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile.component.html',
  // La carte d'identité et la liste d'informations sont celles de la page /profile
  styleUrls: ['../../pilote-qualite/pilote-ui.css', '../../shared/projets-ui.css', '../admin-ui.css', '../../profile/profile.component.css']
})
export class AdminProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private http = inject(HttpClient);

  @ViewChild('profilDialog') profilDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('mdpDialog') mdpDialog?: ElementRef<HTMLDialogElement>;

  user = this.authService.currentUser;
  initiales = computed(() => {
    const parts = (this.user()?.username || '').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
  });
  /** Le rôle le plus élevé du compte, dans le même ordre que le tableau de bord. */
  role = computed(() => {
    const roles = this.user()?.roles || [];
    if (roles.includes('ROLE_ADMIN')) return 'Administrateur';
    if (roles.includes('ROLE_PILOTE_QUALITE')) return 'Pilote qualité';
    if (roles.includes('ROLE_CHEF_PROJET')) return 'Chef de projet';
    return roles[0] || 'Non défini';
  });

  /** La session ne garde pas la date d'inscription : elle est lue sur le compte côté serveur. */
  membreDepuis = signal<string | null>(null);
  /** Confirmation affichée après une modification. */
  message = signal('');
  private messageTimer?: ReturnType<typeof setTimeout>;

  // Modifier le profil
  profil = { username: '', email: '' };
  profilEnCours = signal(false);
  profilErreur = signal('');
  profilTentative = signal(false);

  // Changer le mot de passe
  mdp = { actuel: '', nouveau: '', confirmation: '' };
  mdpEnCours = signal(false);
  mdpErreur = signal('');
  mdpTentative = signal(false);
  voirActuel = signal(false);
  voirNouveau = signal(false);

  ngOnInit() {
    const id = this.user()?.id;
    if (!id) return;
    this.userService.getUserById(id).subscribe({
      next: (compte) => this.membreDepuis.set(this.formatDate(compte.createdAt)),
      error: (error) => console.error('Erreur lors du chargement de la date d\'inscription:', error)
    });
  }

  private formatDate(date?: string): string | null {
    if (!date) return null;
    return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ==================== Modifier le profil ====================

  ouvrirProfil() {
    const user = this.user();
    this.profil = { username: user?.username || '', email: user?.email || '' };
    this.profilErreur.set('');
    this.profilTentative.set(false);
    this.ouvrir(this.profilDialog, '#p-nom');
  }

  erreurNom(): string {
    const nom = this.profil.username.trim();
    if (!nom) return 'Saisissez un nom d\'utilisateur.';
    if (nom.length < 3) return 'Le nom d\'utilisateur doit compter au moins 3 caractères.';
    return '';
  }

  erreurEmail(): string {
    const email = this.profil.email.trim();
    if (!email) return 'Saisissez une adresse email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Cette adresse email n\'est pas valide.';
    return '';
  }

  /** La session est liée à l'email : en le changeant, il faut se reconnecter. */
  emailModifie(): boolean {
    const email = this.profil.email.trim();
    return !!email && email !== this.user()?.email;
  }

  enregistrerProfil() {
    this.profilTentative.set(true);
    const user = this.user();
    if (!user || this.erreurNom() || this.erreurEmail()) return;

    const corps = { username: this.profil.username.trim(), email: this.profil.email.trim() };
    const reconnexion = this.emailModifie();
    this.profilErreur.set('');
    this.profilEnCours.set(true);

    // Route de la page Utilisateurs : sans « roles » ni « password », le rôle et le mot de passe ne changent pas
    this.http.put(`${environment.apiUrl}/api/admin/users/${user.id}`, corps).subscribe({
      next: () => {
        this.profilEnCours.set(false);
        this.fermerProfil();
        if (reconnexion) {
          // Le jeton de la session portait l'ancien email : il n'est plus valable
          this.authService.logout();
          return;
        }
        this.authService.setCurrentUser({ ...user, ...corps });
        this.afficherMessage('Profil mis à jour.');
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du profil:', error);
        this.profilEnCours.set(false);
        // Le serveur répond en anglais : on traduit les refus attendus
        const brut: string = error?.error?.message || '';
        if (brut.includes('Username already exists')) {
          this.profilErreur.set('Ce nom d\'utilisateur est déjà pris.');
        } else if (brut.includes('Email already exists')) {
          this.profilErreur.set('Cette adresse email est déjà utilisée par un autre compte.');
        } else {
          this.profilErreur.set('Le profil n\'a pas pu être mis à jour.');
        }
      }
    });
  }

  fermerProfil() {
    const dialog = this.profilDialog?.nativeElement;
    if (dialog?.open) dialog.close();
  }

  // ==================== Changer le mot de passe ====================

  ouvrirMdp() {
    this.mdp = { actuel: '', nouveau: '', confirmation: '' };
    this.mdpErreur.set('');
    this.mdpTentative.set(false);
    this.voirActuel.set(false);
    this.voirNouveau.set(false);
    this.ouvrir(this.mdpDialog, '#m-actuel');
  }

  // Mêmes règles que le mot de passe de la page d'inscription
  mdpValide(): boolean {
    return this.mdp.nouveau.length >= 8 && /^(?=.*[A-Z])(?=.*[0-9]).+$/.test(this.mdp.nouveau);
  }

  erreurActuel(): string {
    return this.mdp.actuel ? '' : 'Saisissez votre mot de passe actuel.';
  }

  erreurNouveau(): string {
    if (!this.mdp.nouveau) return 'Saisissez un nouveau mot de passe.';
    return this.mdpValide() ? '' : 'Au moins 8 caractères, dont 1 majuscule et 1 chiffre.';
  }

  erreurConfirmation(): string {
    if (!this.mdp.confirmation) return 'Confirmez le nouveau mot de passe.';
    return this.mdp.confirmation === this.mdp.nouveau ? '' : 'Les deux mots de passe ne correspondent pas.';
  }

  enregistrerMdp() {
    this.mdpTentative.set(true);
    const user = this.user();
    if (!user || this.erreurActuel() || this.erreurNouveau() || this.erreurConfirmation()) return;

    this.mdpErreur.set('');
    this.mdpEnCours.set(true);
    const corps = { currentPassword: this.mdp.actuel, newPassword: this.mdp.nouveau };

    this.http.post(`${environment.apiUrl}/api/auth/change-password`, corps).subscribe({
      next: () => {
        this.mdpEnCours.set(false);
        this.fermerMdp();
        this.afficherMessage('Mot de passe modifié.');
      },
      error: (error) => {
        console.error('Erreur lors du changement de mot de passe:', error);
        this.mdpEnCours.set(false);
        this.mdpErreur.set(error?.error?.message || 'Le mot de passe n\'a pas pu être modifié.');
      }
    });
  }

  fermerMdp() {
    const dialog = this.mdpDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    // Les mots de passe ne restent pas en mémoire une fois la fenêtre fermée
    this.mdp = { actuel: '', nouveau: '', confirmation: '' };
  }

  // ==================== Boîtes de dialogue ====================

  private ouvrir(ref: ElementRef<HTMLDialogElement> | undefined, champ: string) {
    const dialog = ref?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
      setTimeout(() => dialog.querySelector<HTMLElement>(champ)?.focus());
    }
  }

  /**
   * Un clic sur le fond assombri (donc sur la boîte elle-même, pas sur son contenu) ferme la fenêtre,
   * sauf pendant un envoi : une erreur doit rester visible.
   */
  onDialogClick(event: MouseEvent, dialog: HTMLDialogElement) {
    if (event.target !== dialog || this.profilEnCours() || this.mdpEnCours()) return;
    if (dialog === this.profilDialog?.nativeElement) this.fermerProfil();
    else this.fermerMdp();
  }

  private afficherMessage(texte: string) {
    clearTimeout(this.messageTimer);
    this.message.set(texte);
    this.messageTimer = setTimeout(() => this.message.set(''), 5000);
  }
}
