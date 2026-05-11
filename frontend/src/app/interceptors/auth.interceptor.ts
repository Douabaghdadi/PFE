import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Liste des URLs qui ne nécessitent pas d'authentification
  const publicUrls = [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ];
  
  // Vérifier si l'URL est publique
  const isPublicUrl = publicUrls.some(url => req.url.includes(url));
  
  // Récupérer le token depuis localStorage
  const token = localStorage.getItem('token');
  
  // Log pour déboguer
  console.log('🔐 Interceptor - Token exists:', !!token);
  console.log('🔐 Interceptor - Request URL:', req.url);
  console.log('🔐 Interceptor - Is public URL:', isPublicUrl);
  
  // Si le token existe ET que ce n'est pas une URL publique, ajouter l'en-tête Authorization
  if (token && !isPublicUrl) {
    const clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('🔐 Interceptor - Authorization header added');
    
    return next(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log('🔐 Interceptor - Error caught:', error.status, error.message);
        
        // NE PAS supprimer le token ni rediriger automatiquement
        // Laisser les composants gérer les erreurs
        // L'intercepteur ne fait que logger l'erreur
        
        if (error.status === 401 || error.status === 403) {
          const errorMessage = error.error?.message || error.message || '';
          console.log('🔐 Interceptor - Auth error detected but NOT redirecting:', errorMessage);
          console.log('🔐 Interceptor - Let the component handle this error');
        }
        
        return throwError(() => error);
      })
    );
  }
  
  console.log('🔐 Interceptor - No token or public URL, request sent without Authorization header');
  
  // Si pas de token OU URL publique, continuer avec la requête originale
  return next(req);
};
