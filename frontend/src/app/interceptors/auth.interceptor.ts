import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Ajoute le jeton JWT à toutes les requêtes, sauf sur les routes publiques.
 * Les erreurs ne sont pas interceptées : chaque composant reste responsable de son message.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const publicUrls = [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/forgot-password',
    '/api/auth/reset-password'
  ];

  const isPublicUrl = publicUrls.some(url => req.url.includes(url));
  const token = localStorage.getItem('token');

  if (!token || isPublicUrl) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
