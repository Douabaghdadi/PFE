import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="bg-white py-lg-13 py-8">
      <div class="container">

        <!-- Header -->
        <div class="text-center mb-12">
          <span class="text-primary text-uppercase small fw-semibold" style="letter-spacing:.125rem;">Fonctionnalités</span>
          <h2 class="fw-bold mt-3 mb-3">Toutes les fonctionnalités <span class="text-primary">disponibles</span></h2>
          <p class="text-muted mx-auto" style="max-width:520px;">Une solution complète pour gérer vos processus qualité efficacement.</p>
        </div>

        <!-- Grid features -->
        <div class="row g-4">

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 border h-100 feature-card">
              <div class="fs-1 lh-1">📁</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Gestion des Projets</h5>
                  <span class="badge bg-primary bg-opacity-10 text-primary" style="font-size:.7rem;">Disponible</span>
                </div>
                <p class="text-muted small mb-0">Créez et gérez vos fiches projet avec responsable, dates, statut et équipe assignée.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 border h-100 feature-card">
              <div class="fs-1 lh-1">📋</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Fiches de Suivi</h5>
                  <span class="badge bg-success bg-opacity-10 text-success" style="font-size:.7rem;">Disponible</span>
                </div>
                <p class="text-muted small mb-0">Suivez l'avancement de chaque projet avec des fiches périodiques et un historique complet.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 border h-100 feature-card">
              <div class="fs-1 lh-1">📊</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Rapports KPI</h5>
                  <span class="badge bg-warning bg-opacity-10 text-warning" style="font-size:.7rem;">Disponible</span>
                </div>
                <p class="text-muted small mb-0">Visualisez les indicateurs clés de performance et générez des rapports automatiquement.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 border h-100 feature-card">
              <div class="fs-1 lh-1">🕐</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Historique des Projets</h5>
                  <span class="badge bg-info bg-opacity-10 text-info" style="font-size:.7rem;">Disponible</span>
                </div>
                <p class="text-muted small mb-0">Consultez l'historique complet des modifications et évolutions de chaque projet.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 border h-100 feature-card">
              <div class="fs-1 lh-1">🔔</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Notifications & Alertes</h5>
                  <span class="badge bg-danger bg-opacity-10 text-danger" style="font-size:.7rem;">Disponible</span>
                </div>
                <p class="text-muted small mb-0">Envoyez des alertes email aux chefs de projet en retard et des emails personnalisés à votre équipe.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 h-100 feature-card" style="border: 2px solid #8b5cf6; background: #faf5ff;">
              <div class="fs-1 lh-1">👥</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Suggestion d'Équipe IA</h5>
                  <span class="badge" style="background:rgba(139,92,246,0.12);color:#8b5cf6;font-size:.7rem;">IA ✨</span>
                </div>
                <p class="text-muted small mb-0">Obtenez une composition d'équipe intelligente basée sur le type, la complexité et le budget du projet.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 h-100 feature-card" style="border: 2px solid #06b6d4; background: #ecfeff;">
              <div class="fs-1 lh-1">🤖</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Chatbot IA</h5>
                  <span class="badge" style="background:rgba(6,182,212,0.12);color:#06b6d4;font-size:.7rem;">IA ✨</span>
                </div>
                <p class="text-muted small mb-0">Posez vos questions sur vos projets et obtenez des réponses intelligentes instantanément.</p>
              </div>
            </div>
          </div>

          <div class="col-12 col-md-6">
            <div class="d-flex gap-4 p-4 rounded-4 h-100 feature-card" style="border: 2px solid #f59e0b; background: #fffbeb;">
              <div class="fs-1 lh-1">🧠</div>
              <div>
                <div class="d-flex align-items-center gap-2 mb-1">
                  <h5 class="fw-bold mb-0">Rapports KPI Intelligents</h5>
                  <span class="badge" style="background:rgba(245,158,11,0.12);color:#f59e0b;font-size:.7rem;">IA ✨</span>
                </div>
                <p class="text-muted small mb-0">Analysez vos indicateurs avec l'IA et obtenez des recommandations pour améliorer vos projets.</p>
              </div>
            </div>
          </div>

        </div>

        <div class="text-center mt-10">
          <a routerLink="/" class="btn btn-outline-secondary px-6">
            ← Retour à l'accueil
          </a>
        </div>

      </div>
    </div>
  `
})
export class FeaturesComponent {}
