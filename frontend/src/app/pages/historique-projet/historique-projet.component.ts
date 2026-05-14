import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HistoriqueService, HistoriqueModification } from '../../services/historique.service';

@Component({
  selector: 'app-historique-projet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historique-projet.component.html',
  styleUrls: ['./historique-projet.component.css']
})
export class HistoriqueProjetComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private historiqueService = inject(HistoriqueService);

  projetId: string = '';
  historique: HistoriqueModification[] = [];
  loading = true;
  error = '';
  expandedItems: Set<string> = new Set();

  ngOnInit() {
    this.projetId = this.route.snapshot.paramMap.get('id') || '';
    if (this.projetId) {
      this.loadHistorique();
    }
  }

  loadHistorique() {
    this.loading = true;
    this.historiqueService.getHistoriqueCompletProjet(this.projetId).subscribe({
      next: (data) => {
        this.historique = data;
        console.log('Historique chargé:', data);
        // Vérifier si entityName est présent
        data.forEach(item => {
          console.log(`Item ${item.id}: entityName = ${item.entityName}`);
        });
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement de l\'historique';
        this.loading = false;
        console.error(err);
      }
    });
  }

  getActionLabel(action: string): string {
    const labels: { [key: string]: string } = {
      'CREATION': 'Création',
      'MODIFICATION': 'Modification',
      'SUPPRESSION': 'Suppression'
    };
    return labels[action] || action;
  }

  getActionClass(action: string): string {
    const classes: { [key: string]: string } = {
      'CREATION': 'bg-green-100 text-green-800',
      'MODIFICATION': 'bg-blue-100 text-blue-800',
      'SUPPRESSION': 'bg-red-100 text-red-800'
    };
    return classes[action] || 'bg-gray-100 text-gray-800';
  }

  goBack() {
    this.router.navigate(['/projets', this.projetId]);
  }

  getChangedKeys(item: HistoriqueModification): string[] {
    const keys = new Set<string>();
    
    // Récupérer toutes les clés
    const allKeys = new Set<string>();
    if (item.anciennesValeurs) {
      Object.keys(item.anciennesValeurs).forEach(k => allKeys.add(k));
    }
    if (item.nouvellesValeurs) {
      Object.keys(item.nouvellesValeurs).forEach(k => allKeys.add(k));
    }
    
    // Ne garder que les clés dont les valeurs ont changé
    allKeys.forEach(key => {
      const oldValue = item.anciennesValeurs?.[key];
      const newValue = item.nouvellesValeurs?.[key];
      
      // Comparer les valeurs (conversion en JSON pour les objets/tableaux)
      const oldValueStr = JSON.stringify(oldValue);
      const newValueStr = JSON.stringify(newValue);
      
      if (oldValueStr !== newValueStr) {
        keys.add(key);
      }
    });
    
    return Array.from(keys);
  }

  formatValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  getCountByAction(action: string): number {
    return this.historique.filter(item => item.action === action).length;
  }

  toggleDetails(itemId: string): void {
    if (this.expandedItems.has(itemId)) {
      this.expandedItems.delete(itemId);
    } else {
      this.expandedItems.add(itemId);
    }
  }

  isExpanded(itemId: string): boolean {
    return this.expandedItems.has(itemId);
  }

  hasChanges(item: HistoriqueModification): boolean {
    return !!((item.anciennesValeurs && Object.keys(item.anciennesValeurs).length > 0) ||
           (item.nouvellesValeurs && Object.keys(item.nouvellesValeurs).length > 0));
  }
}
