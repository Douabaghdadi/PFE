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
            <span class="badge bg-primary bg-opacity-10 text-primary px-4 py-3 fw-normal border border-primary rounded-pill">
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 3.34a10 10 0 1 1 -4.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 4.995 -8.336z" />
                </svg>
              </span>
              <span class="ms-1">Nouveau Système Disponible</span>
            </span>
            <h1 class="display-4 fw-bold mt-4">
              Suivi des Processus
              <span class="text-primary">Qualité</span>
              Simplifié
            </h1>

            <p class="my-6 lead fw-normal">
              Gérez vos projets qualité, suivez l'évolution en temps réel et générez des rapports KPI automatiquement.
            </p>
            <div class="d-flex flex-md-row flex-column justify-content-start gap-3">
              <a routerLink="/login" class="btn btn-primary">
                <span>Commencer</span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ms-2">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <line x1="13" y1="18" x2="19" y2="12"></line>
                    <line x1="13" y1="6" x2="19" y2="12"></line>
                  </svg>
                </span>
              </a>
              <a href="#features" class="btn btn-light">
                <span>En savoir plus</span>
              </a>
            </div>
            <div class="d-flex gap-6 mt-8">
              <div class="d-flex align-items-center gap-2">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" class="text-primary">
                    <circle cx="9" cy="7" r="4" />
                    <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                  </svg>
                </span>
                <small class="mb-0"><span class="fw-bold">Multi-utilisateurs</span></small>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" class="text-primary">
                    <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                    <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                    <path d="M3 6l0 13" />
                    <path d="M12 6l0 13" />
                    <path d="M21 6l0 13" />
                  </svg>
                </span>
                <small class="mb-0"><span class="fw-bold">Rapports KPI</span></small>
              </div>
              <div class="d-flex align-items-center gap-2">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" class="text-primary">
                    <path d="M12 9m-6 0a6 6 0 1 0 12 0a6 6 0 1 0 -12 0" />
                  </svg>
                </span>
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
              <p class="mb-0">
                Une solution complète pour gérer vos processus qualité efficacement.
              </p>
            </div>
          </div>
        </div>
        <div class="row g-4">
          <div class="col-lg-4 col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4">
              <div class="icon-shape icon-lg rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                  <path d="M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0" />
                  <path d="M3 6l0 13" />
                </svg>
              </div>
              <h4 class="fw-bold">Gestion des Projets</h4>
              <p class="text-muted">Créez et gérez vos fiches projet avec toutes les informations nécessaires.</p>
            </div>
          </div>
          <div class="col-lg-4 col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4">
              <div class="icon-shape icon-lg rounded-circle bg-success bg-opacity-10 text-success mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11l3 3l8 -8" />
                  <path d="M20 12v6a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h9" />
                </svg>
              </div>
              <h4 class="fw-bold">Suivi en Temps Réel</h4>
              <p class="text-muted">Suivez l'avancement de vos projets avec des fiches de suivi détaillées.</p>
            </div>
          </div>
          <div class="col-lg-4 col-md-6">
            <div class="card h-100 border-0 shadow-sm rounded-4 p-4">
              <div class="icon-shape icon-lg rounded-circle bg-warning bg-opacity-10 text-warning mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3v18h18" />
                  <path d="M20 18v3" />
                  <path d="M16 16v5" />
                  <path d="M12 13v8" />
                  <path d="M8 16v5" />
                </svg>
              </div>
              <h4 class="fw-bold">Rapports KPI</h4>
              <p class="text-muted">Générez des rapports de performance automatiquement.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {}
