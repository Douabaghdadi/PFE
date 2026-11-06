import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrls: ['../pilote-qualite/pilote-ui.css', '../shared/detail-ui.css', './profile.component.css']
})
export class ProfileComponent implements OnInit {
  authService = inject(AuthService);

  user: User | null = null;

  ngOnInit() {
    this.user = this.authService.currentUser();
  }

  getRoleLabel(roles: string[] | string | undefined): string {
    // Si c'est un tableau, prendre le premier rôle
    const role = Array.isArray(roles) ? roles[0] : roles;

    const roleMap: { [key: string]: string } = {
      'ROLE_ADMIN': 'Administrateur',
      'ROLE_CHEF_PROJET': 'Chef de Projet',
      'ROLE_PILOTE_QUALITE': 'Pilote Qualité'
    };
    return role ? (roleMap[role] || role) : 'Non défini';
  }

  getInitials(username: string): string {
    if (!username) return '?';
    return username.substring(0, 2).toUpperCase();
  }
}
