import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/form-ui.css']
})
export class EditProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);

  editProfileForm: FormGroup;
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor() {
    this.editProfileForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['']
    });
  }

  get username() { return this.editProfileForm.get('username')!; }
  get email() { return this.editProfileForm.get('email')!; }

  /** La session est liée à l'email : en le changeant, il faut se reconnecter. */
  get emailModifie(): boolean {
    const email = (this.email.value || '').trim();
    return !!email && email !== this.authService.currentUser()?.email;
  }

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.editProfileForm.patchValue({
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber || ''
      });
    }
  }

  onSubmit() {
    if (!this.editProfileForm.valid) {
      // Les champs obligatoires restés vides sont signalés plutôt que de laisser le bouton sans effet
      this.editProfileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const user = this.authService.currentUser();
    const reconnexion = this.emailModifie;
    const payload = {
      id: user?.id,
      ...this.editProfileForm.value
    };

    this.http.put(`${environment.apiUrl}/api/users/profile`, payload)
      .subscribe({
        next: (response: any) => {
          this.isLoading = false;

          if (reconnexion) {
            // Le jeton de la session portait l'ancien email : il n'est plus valable
            this.successMessage = 'Profil mis à jour. Reconnectez-vous avec votre nouvelle adresse.';
            setTimeout(() => this.authService.logout(), 2000);
            return;
          }

          this.successMessage = 'Profil mis à jour avec succès ! Redirection...';

          // Mettre à jour l'utilisateur dans le service
          if (user) {
            const updatedUser = {
              id: user.id,
              username: response.username,
              email: response.email,
              phoneNumber: response.phoneNumber,
              roles: user.roles,
              token: user.token
            };
            this.authService.setCurrentUser(updatedUser);
          }

          setTimeout(() => {
            this.router.navigate(['/profile']);
          }, 2000);
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour du profil';
        }
      });
  }
}
