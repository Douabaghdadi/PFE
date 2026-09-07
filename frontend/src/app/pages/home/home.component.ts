import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="py-lg-13 py-8 bg-white position-relative" id="hero">
      <div class="circle-bg d-none d-lg-block"></div>
      <div class="container">
        <div class="row align-items-center gy-8">
          <div class="col-lg-6">
            <div class="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill mb-2" style="background: linear-gradient(135deg, #f0fdf4, #dcfce7); border: 1.5px solid #86efac;">
              <span class="rounded-circle bg-primary d-inline-block" style="width:8px;height:8px;flex-shrink:0;box-shadow:0 0 0 3px rgba(22,163,74,.2);"></span>
              <span class="text-primary fw-semibold small">Nouveau Système Disponible</span>
            </div>
            <h1 class="display-4 fw-bold mt-4">
              Suivi des Processus
              <span class="text-primary">Qualité</span>
              Simplifié
            </h1>
            <p class="my-6 lead fw-normal">
              Gérez vos projets qualité, suivez l'évolution en temps réel et générez des rapports KPI automatiquement.
            </p>
            <div class="d-flex flex-md-row flex-column justify-content-start gap-3">
              <a routerLink="/login"
                class="d-inline-flex align-items-center gap-2 px-5 py-3 fw-semibold text-white text-decoration-none rounded-pill"
                style="background: linear-gradient(135deg, #16a34a, #15803d); box-shadow: 0 4px 14px rgba(22,163,74,.4); transition: all .25s;"
                onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 20px rgba(22,163,74,.45)'"
                onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 14px rgba(22,163,74,.4)'">
                Commencer
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </a>
              <a href="#features"
                class="d-inline-flex align-items-center gap-2 px-5 py-3 fw-semibold text-decoration-none rounded-pill"
                style="background: white; border: 1.5px solid #e5e7eb; color: #374151; box-shadow: 0 2px 8px rgba(0,0,0,.06); transition: all .25s;"
                onmouseover="this.style.borderColor='#16a34a';this.style.color='#16a34a';this.style.transform='translateY(-2px)'"
                onmouseout="this.style.borderColor='#e5e7eb';this.style.color='#374151';this.style.transform='translateY(0)'">
                En savoir plus
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 8 16 12 12 16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </a>
            </div>
            <div class="d-flex gap-6 mt-8">
              <div class="d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                  <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                </svg>
                <small class="mb-0"><span class="fw-bold">Multi-utilisateurs</span></small>
              </div>
              <div class="d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                  <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" /><path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                  <path d="M3 6l0 13" /><path d="M12 6l0 13" /><path d="M21 6l0 13" />
                </svg>
                <small class="mb-0"><span class="fw-bold">Rapports KPI</span></small>
              </div>
              <div class="d-flex align-items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                  <path d="M12 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" />
                </svg>
                <small class="mb-0"><span class="fw-bold">Sécurisé</span></small>
              </div>
            </div>
          </div>
          <div class="col-lg-6">
            <div class="card p-3 rounded-5 shadow-sm">
              <img src="assets/images/hero-img.jpg" alt="Quality Management" class="rounded-5 img-fluid" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="py-lg-13 py-8 bg-light" id="features">
      <div class="container">
        <div class="row text-center">
          <div class="col-lg-6 mx-auto">
            <div class="mb-10">
              <span class="text-primary text-uppercase small fw-semibold" style="letter-spacing: .125rem;">Fonctionnalités</span>
              <h2 class="fw-bold mt-4 mb-4">Tout ce dont vous avez <span class="text-primary">besoin</span></h2>
              <p class="mb-0">Une solution complète pour gérer vos processus qualité efficacement.</p>
            </div>
          </div>
        </div>
        <div class="row g-4">

          <!-- Gestion des Projets -->
          <div class="col-lg-4 col-md-6">
            <div class="card h-100 border-0 shadow rounded-4 p-4 feature-card">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="icon-shape icon-lg rounded-circle bg-primary bg-opacity-10 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>
                  </svg>
                </div>
                <span class="badge bg-primary bg-opacity-10 text-primary">Disponible</span>
              </div>
              <h4 class="fw-bold">Gestion des Projets</h4>
              <p class="text-muted">Créez et gérez vos fiches projet avec responsable, dates, statut et équipe assignée.</p>
            </div>
          </div>

          <!-- Fiches de Suivi -->
          <div class="col-lg-4 col-md-6">
            <div class="card h-100 border-0 shadow rounded-4 p-4 feature-card">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="icon-shape icon-lg rounded-circle bg-success bg-opacity-10 text-success">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3l8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>
                  </svg>
                </div>
                <span class="badge bg-success bg-opacity-10 text-success">Disponible</span>
              </div>
              <h4 class="fw-bold">Fiches de Suivi</h4>
              <p class="text-muted">Suivez l'avancement de chaque projet avec des fiches de suivi périodiques et un historique complet.</p>
            </div>
          </div>

          <!-- Rapports KPI Intelligents -->
          <div class="col-lg-4 col-md-6">
            <div class="card h-100 border-0 shadow rounded-4 p-4 feature-card" style="border-top: 3px solid #f59e0b !important;">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div class="icon-shape icon-lg rounded-circle" style="background: rgba(245,158,11,0.1); color: #f59e0b;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-6"/><circle cx="19" cy="10" r="1" fill="currentColor"/>
                  </svg>
                </div>
                <span class="badge" style="background: rgba(245,158,11,0.1); color: #f59e0b;">IA ✨</span>
              </div>
              <h4 class="fw-bold">Rapports KPI Intelligents</h4>
              <p class="text-muted">Analysez automatiquement vos indicateurs de performance avec l'IA et obtenez des recommandations pour améliorer vos projets.</p>
            </div>
          </div>

        </div>

        <!-- Bouton voir toutes les fonctionnalités -->
        <div class="text-center mt-8">
          <a routerLink="/features" class="d-inline-flex align-items-center gap-3 text-decoration-none px-5 py-3 rounded-pill fw-semibold" style="background: white; border: 2px solid #e5e7eb; color: #111827; transition: all .25s; box-shadow: 0 2px 8px rgba(0,0,0,.06);" onmouseover="this.style.borderColor='#16a34a';this.style.color='#16a34a';this.style.boxShadow='0 4px 16px rgba(22,163,74,.15)'" onmouseout="this.style.borderColor='#e5e7eb';this.style.color='#111827';this.style.boxShadow='0 2px 8px rgba(0,0,0,.06)'">
            <span>Voir toutes les fonctionnalités</span>
            <span class="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style="width:28px;height:28px;flex-shrink:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </span>
          </a>
        </div>

      </div>
    </section>
  `
})
export class HomeComponent {}
