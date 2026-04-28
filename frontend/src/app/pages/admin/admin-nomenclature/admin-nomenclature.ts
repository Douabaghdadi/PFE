import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-admin-nomenclature',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes shimmer {
      0% { background-position: -1000px 0; }
      100% { background-position: 1000px 0; }
    }

    .modal-content {
      animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .form-control:focus {
      transform: translateY(-2px);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .glass-effect {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .luxury-input {
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 2px solid #e5e7eb;
      background: linear-gradient(to bottom, #ffffff, #f9fafb);
    }

    .luxury-input:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1), 0 8px 16px rgba(16, 185, 129, 0.15);
      background: white;
    }

    .luxury-btn {
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .luxury-btn::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 0;
      height: 0;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      transform: translate(-50%, -50%);
      transition: width 0.6s, height 0.6s;
    }

    .luxury-btn:hover::before {
      width: 300px;
      height: 300px;
    }

    .luxury-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(16, 185, 129, 0.4);
    }

    .luxury-btn:active {
      transform: translateY(0);
    }
  `],
  templateUrl: './admin-nomenclature.html',
  styleUrl: './admin-nomenclature.css',
})
export class AdminNomenclature implements OnInit {
  http = inject(HttpClient);

  nomenclatures = signal<Nomenclature[]>([]);
  filteredNomenclatures = signal<Nomenclature[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');
  
  searchTerm = '';
  filterType = '';

  // Propriétés pour la création/modification
  newNomenclature: NomenclatureRequest = {
    type: '',
    code: '',
    libelle: '',
    description: '',
    actif: true
  };
  isCreating = signal(false);
  createError = signal('');
  isEditMode = signal(false);
  editingNomenclatureId = signal<string>('');

  // Types de nomenclature disponibles
  nomenclatureTypes = [
    { value: 'TYPE_FICHE', label: 'Type de Fiche' },
    { value: 'STATUT', label: 'Statut' },
    { value: 'CATEGORIE_PROJET', label: 'Catégorie de Projet' }
  ];

  ngOnInit() {
    this.loadNomenclatures();
  }

  loadNomenclatures() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      this.errorMessage.set('Vous devez être connecté');
      this.isLoading.set(false);
      return;
    }

    this.http.get<Nomenclature[]>('http://localhost:8081/api/admin/nomenclatures', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).subscribe({
      next: (data) => {
        this.nomenclatures.set(data);
        this.filteredNomenclatures.set(data);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading nomenclatures:', error);
        this.errorMessage.set(`Erreur lors du chargement des nomenclatures: ${error.status} - ${error.error?.message || error.message}`);
        this.isLoading.set(false);
      }
    });
  }

  filterNomenclatures() {
    let filtered = this.nomenclatures();

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        n.code?.toLowerCase().includes(term) ||
        n.libelle?.toLowerCase().includes(term) ||
        n.description?.toLowerCase().includes(term)
      );
    }

    if (this.filterType) {
      filtered = filtered.filter(n => n.type === this.filterType);
    }

    this.filteredNomenclatures.set(filtered);
  }

  getTypeLabel(type: string): string {
    const found = this.nomenclatureTypes.find(t => t.value === type);
    return found ? found.label : type;
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'TYPE_FICHE': return 'bg-blue-100 text-blue-800';
      case 'STATUT': return 'bg-green-100 text-green-800';
      case 'CATEGORIE_PROJET': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  editNomenclature(id: string) {
    const nomenclature = this.nomenclatures().find(n => n.id === id);
    if (nomenclature) {
      this.isEditMode.set(true);
      this.editingNomenclatureId.set(id);
      
      this.newNomenclature.type = nomenclature.type;
      this.newNomenclature.code = nomenclature.code;
      this.newNomenclature.libelle = nomenclature.libelle;
      this.newNomenclature.description = nomenclature.description || '';
      this.newNomenclature.actif = nomenclature.actif;
      
      const modalElement = document.getElementById('createNomenclatureModal');
      if (modalElement) {
        const modal = new (window as any).bootstrap.Modal(modalElement);
        modal.show();
      }
    }
  }

  deleteNomenclature(id: string) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette nomenclature ?')) {
      const token = localStorage.getItem('token');
      this.http.delete(`http://localhost:8081/api/admin/nomenclatures/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.loadNomenclatures();
          alert('Nomenclature supprimée avec succès!');
        },
        error: (error) => {
          console.error('Error deleting nomenclature:', error);
          alert('Erreur lors de la suppression de la nomenclature');
        }
      });
    }
  }

  createNomenclature() {
    if (!this.newNomenclature.type || !this.newNomenclature.code || !this.newNomenclature.libelle) {
      this.createError.set('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.createError.set('');
    this.isCreating.set(true);

    const token = localStorage.getItem('token');
    
    if (this.isEditMode()) {
      this.http.put(`http://localhost:8081/api/admin/nomenclatures/${this.editingNomenclatureId()}`, this.newNomenclature, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.isCreating.set(false);
          this.closeModal();
          this.loadNomenclatures();
          alert('Nomenclature modifiée avec succès!');
        },
        error: (error) => {
          this.isCreating.set(false);
          console.error('Error updating nomenclature:', error);
          
          if (error.error && error.error.message) {
            this.createError.set(error.error.message);
          } else {
            this.createError.set('Erreur lors de la modification de la nomenclature');
          }
        }
      });
    } else {
      this.http.post('http://localhost:8081/api/admin/nomenclatures', this.newNomenclature, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).subscribe({
        next: () => {
          this.isCreating.set(false);
          this.closeModal();
          this.loadNomenclatures();
          alert('Nomenclature créée avec succès!');
        },
        error: (error) => {
          this.isCreating.set(false);
          console.error('Error creating nomenclature:', error);
          
          if (error.error && error.error.message) {
            this.createError.set(error.error.message);
          } else {
            this.createError.set('Erreur lors de la création de la nomenclature');
          }
        }
      });
    }
  }

  closeModal() {
    const modalElement = document.getElementById('createNomenclatureModal');
    const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }

    this.newNomenclature = {
      type: '',
      code: '',
      libelle: '',
      description: '',
      actif: true
    };
    this.isEditMode.set(false);
    this.editingNomenclatureId.set('');
    this.createError.set('');
  }
}

