import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

interface User {
  id: string;
  username: string;
  email: string;
  roles: string[];
  createdAt?: string;
}

interface NewUser {
  username: string;
  email: string;
  password: string;
  roles: string[];
}

/** Rôles proposés dans le formulaire : valeur attendue par l'API, rôle renvoyé par l'API, libellé. */
const ROLES = [
  { valeur: 'chef', role: 'ROLE_CHEF_PROJET', label: 'Chef de projet', pluriel: 'chefs de projet', aide: 'Crée ses fiches projet et ses fiches de suivi.' },
  { valeur: 'pilote', role: 'ROLE_PILOTE_QUALITE', label: 'Pilote qualité', pluriel: 'pilotes qualité', aide: 'Supervise le suivi et consulte les indicateurs des projets.' },
  { valeur: 'admin', role: 'ROLE_ADMIN', label: 'Administrateur', pluriel: 'administrateurs', aide: 'Gère les comptes et la nomenclature.' },
];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['../../pilote-qualite/pilote-ui.css', '../../shared/projets-ui.css', '../admin-ui.css', './admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private readonly api = `${environment.apiUrl}/api/admin/users`;

  @ViewChild('formDialog') formDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('suppressionDialog') suppressionDialog?: ElementRef<HTMLDialogElement>;

  readonly roles = ROLES;

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  /** Confirmation affichée après un ajout, une modification ou une suppression. */
  message = signal('');
  private messageTimer?: ReturnType<typeof setTimeout>;

  searchTerm = '';
  filterRole = '';

  // Pagination côté client : 10 comptes par page
  readonly pageSize = 10;
  currentPage = signal(1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));
  pages = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });
  // Bornes du texte « Comptes 1 à 10 sur 14 »
  rangeStart = computed(() => this.filteredUsers().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1);
  rangeEnd = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredUsers().length));

  /** Phrase d'en-tête : « 14 comptes : 9 chefs de projet, 3 pilotes qualité, 2 administrateurs. » */
  resume = computed(() => {
    const parRole = ROLES
      .map(r => ({ r, n: this.users().filter(u => u.roles.includes(r.role)).length }))
      .filter(x => x.n > 0)
      .map(x => `${x.n} ${x.n > 1 ? x.r.pluriel : x.r.label.toLowerCase()}`);
    return this.pl(this.users().length, 'compte') + (parRole.length ? ' : ' + parRole.join(', ') : '') + '.';
  });

  // Formulaire d'ajout et de modification
  newUser: NewUser = this.formulaireVide();
  isCreating = signal(false);
  createError = signal('');
  showPassword = signal(false);
  /** Compte en cours de modification ; null pour un ajout. */
  enEdition = signal<User | null>(null);
  isEditMode = computed(() => this.enEdition() !== null);
  /** Les champs manquants ne sont signalés qu'après une tentative d'enregistrement. */
  tentative = signal(false);

  // Suppression : confirmation dans une boîte de dialogue
  aSupprimer = signal<User | null>(null);
  suppressionEnCours = signal(false);
  erreurSuppression = signal('');

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    // Le jeton est ajouté par authInterceptor
    this.http.get<User[]>(this.api).subscribe({
      next: (data) => {
        this.users.set(data || []);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage.set('Impossible de charger la liste des comptes.');
        this.isLoading.set(false);
      }
    });
  }

  filterUsers() {
    this.currentPage.set(1);
    this.applyFilters();
  }

  resetFilters() {
    this.searchTerm = '';
    this.filterRole = '';
    this.filterUsers();
  }

  get filtresActifs(): boolean {
    return !!this.searchTerm.trim() || !!this.filterRole;
  }

  /** Applique la recherche et le filtre par rôle ; reste sur une page qui existe encore (ex. après une suppression). */
  private applyFilters() {
    let filtered = this.users();

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      filtered = filtered.filter(u =>
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term)
      );
    }

    if (this.filterRole) {
      filtered = filtered.filter(u => u.roles.includes(this.filterRole));
    }

    this.filteredUsers.set(filtered);
    this.goToPage(this.currentPage());
  }

  goToPage(page: number) {
    this.currentPage.set(Math.min(Math.max(page, 1), this.totalPages()));
  }

  /** Initiales d'un nom de compte (« mehdi.bouaziz » → MB, « chefprojet » → CH). */
  getInitials(nom: string): string {
    const parts = (nom || '').split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0]).toUpperCase();
  }

  getRoleLabel(role: string): string {
    return ROLES.find(r => r.role === role)?.label ?? role;
  }

  roleClass(role: string): string {
    switch (role) {
      case 'ROLE_ADMIN': return 'role-admin';
      case 'ROLE_PILOTE_QUALITE': return 'role-pilote';
      default: return 'role-chef';
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  /** Le compte connecté ne peut pas se supprimer lui-même. */
  estMoi(user: User): boolean {
    return user.id === this.authService.currentUser()?.id;
  }

  pl(n: number, singulier: string, pluriel = singulier + 's'): string {
    return `${n} ${n > 1 ? pluriel : singulier}`;
  }

  // ==================== Ajout et modification ====================

  openCreate() {
    this.enEdition.set(null);
    this.newUser = this.formulaireVide();
    this.ouvrirFormulaire();
  }

  editUser(user: User) {
    this.enEdition.set(user);
    // Rôles renvoyés par l'API (ROLE_ADMIN…) convertis en valeurs du formulaire (admin…)
    this.newUser = {
      username: user.username,
      email: user.email,
      password: '',
      roles: ROLES.filter(r => user.roles.includes(r.role)).map(r => r.valeur),
    };
    this.ouvrirFormulaire();
  }

  private ouvrirFormulaire() {
    this.createError.set('');
    this.tentative.set(false);
    this.showPassword.set(false);
    const dialog = this.formDialog?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
      setTimeout(() => dialog.querySelector<HTMLElement>('#u-nom')?.focus());
    }
  }

  toggleRole(role: string) {
    const index = this.newUser.roles.indexOf(role);
    if (index > -1) {
      this.newUser.roles.splice(index, 1);
    } else {
      this.newUser.roles.push(role);
    }
  }

  // Erreurs des champs, affichées après une tentative d'enregistrement
  erreurNom(): string {
    const nom = this.newUser.username.trim();
    if (!nom) return 'Saisissez un nom d\'utilisateur.';
    if (nom.length < 3) return 'Le nom d\'utilisateur doit compter au moins 3 caractères.';
    return '';
  }

  erreurEmail(): string {
    const email = this.newUser.email.trim();
    if (!email) return 'Saisissez une adresse email.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Cette adresse email n\'est pas valide.';
    return '';
  }

  erreurMotDePasse(): string {
    if (this.isEditMode()) return '';
    if (!this.newUser.password) return 'Saisissez un mot de passe.';
    if (!this.isPasswordValid(this.newUser.password)) return 'Au moins 8 caractères, dont 1 majuscule et 1 chiffre.';
    return '';
  }

  erreurRoles(): string {
    return this.newUser.roles.length === 0 ? 'Choisissez au moins un rôle.' : '';
  }

  createUser() {
    this.tentative.set(true);
    if (this.erreurNom() || this.erreurEmail() || this.erreurMotDePasse() || this.erreurRoles()) {
      this.createError.set('');
      return;
    }

    this.createError.set('');
    this.isCreating.set(true);
    const enEdition = this.enEdition();
    const username = this.newUser.username.trim();
    const corps = enEdition
      // En modification, le mot de passe n'est pas envoyé : il reste celui du compte
      ? { username, email: this.newUser.email.trim(), roles: this.newUser.roles }
      : { ...this.newUser, username, email: this.newUser.email.trim() };
    const requete = enEdition ? this.http.put(`${this.api}/${enEdition.id}`, corps) : this.http.post(this.api, corps);

    requete.subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeForm();
        this.loadUsers();
        this.afficherMessage(enEdition ? `Compte « ${username} » modifié.` : `Compte « ${username} » créé.`);
      },
      error: (error) => {
        this.isCreating.set(false);
        console.error('Error saving user:', error);
        // Le serveur répond en anglais : on traduit les refus attendus
        const brut: string = error?.error?.message || '';
        if (brut.includes('Username already exists')) {
          this.createError.set('Ce nom d\'utilisateur est déjà pris.');
        } else if (brut.includes('Email already exists')) {
          this.createError.set('Cette adresse email est déjà utilisée par un autre compte.');
        } else {
          this.createError.set(enEdition ? 'La modification n\'a pas pu être enregistrée.' : 'Le compte n\'a pas pu être créé.');
        }
      }
    });
  }

  // Mêmes règles que le mot de passe de la page d'inscription
  isPasswordValid(password: string): boolean {
    return password.length >= 8 && /^(?=.*[A-Z])(?=.*[0-9]).+$/.test(password);
  }

  closeForm() {
    const dialog = this.formDialog?.nativeElement;
    if (dialog?.open) dialog.close();
    this.onFormClosed();
  }

  /** Appelé aussi à la fermeture native (touche Échap). */
  onFormClosed() {
    if (this.isCreating()) return;
    this.newUser = this.formulaireVide();
    this.enEdition.set(null);
    this.createError.set('');
    this.tentative.set(false);
    this.showPassword.set(false);
  }

  // ==================== Suppression ====================

  deleteUser(user: User) {
    if (this.estMoi(user)) return;
    this.aSupprimer.set(user);
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
    const user = this.aSupprimer();
    if (!user || this.suppressionEnCours()) return;
    this.suppressionEnCours.set(true);
    this.erreurSuppression.set('');

    this.http.delete(`${this.api}/${user.id}`).subscribe({
      next: () => {
        this.suppressionEnCours.set(false);
        this.annulerSuppression();
        this.loadUsers();
        this.afficherMessage(`Compte « ${user.username} » supprimé.`);
      },
      error: (error) => {
        console.error('Error deleting user:', error);
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

  private formulaireVide(): NewUser {
    return { username: '', email: '', password: '', roles: [] };
  }
}
