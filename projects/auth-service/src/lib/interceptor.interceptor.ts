import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth-service.service';

// Đặt các biến toàn cục bên ngoài interceptor
let isRefreshing = false;
const refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(
  null
);

export const Interceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const OauthService = inject(OAuthService);
  const authToken = OauthService.getAccessToken();

  if (authToken) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${authToken}` } });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return handle401Error(req, next, authService);
      } else {
        return throwError(() => error);
      }
    })
  );
};

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);
    return from(authService.config.refreshFunctionOfInterceptor()).pipe(
      switchMap((token: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(token.token);
        return next(
          request.clone({
            setHeaders: { Authorization: `Bearer ${token.token}` },
          })
        );
      }),
      catchError((err) => {
        isRefreshing = false;
        // authService.logout(); // Tùy chỉnh việc đăng xuất người dùng nếu làm mới token thất bại
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((jwt) => {
        return next(
          request.clone({ setHeaders: { Authorization: `Bearer ${jwt}` } })
        );
      })
    );
  }
}
