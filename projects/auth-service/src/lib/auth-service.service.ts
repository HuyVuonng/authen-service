import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { OAuthService } from 'angular-oauth2-oidc';
import { lastValueFrom, Observable } from 'rxjs';
interface AuthConfig {
  loginURl: string;
  refreshTokenURL: string;
  logoutURL?: string | undefined;
  timeToRefreshToken?: number;
}
@Injectable({
  providedIn: 'root',
})
export class AuthServiceService {
  _http = inject(HttpClient);
  idTimeOut: any;
  config: AuthConfig = {
    loginURl: '',
    refreshTokenURL: '',
    logoutURL: '',
    timeToRefreshToken: 60000,
  };
  constructor(
    private jwtHelper: JwtHelperService,
    private oauthService: OAuthService
  ) {}

  private login(userName: string, password: string): Observable<any> {
    return this._http.post<any>(this.config.loginURl, {
      username: userName,
      password: password,
    });
  }

  private refreshToken(): Observable<any> {
    return this._http.post<any>(this.config.refreshTokenURL, {
      token: localStorage.getItem('refresh_token'),
    });
  }
  private logout(): Observable<any> {
    return this._http.post<any>(this.config.logoutURL!, {
      token: localStorage.getItem('refresh_token'),
    });
  }
  async loginNoAuth2(userName: string, password: string): Promise<any> {
    const data = await lastValueFrom(this.login(userName, password));
    const userInfor = { ...data };
    delete userInfor.token;
    delete userInfor.refreshToken;
    localStorage.clear();
    localStorage.setItem('access_token', data.token);
    localStorage.setItem('refresh_token', data.refreshToken);
    localStorage.setItem(
      'expires_at',
      (this.jwtHelper.decodeToken(data.token).exp * 1000).toString()
    );
    localStorage.setItem('userInfor', JSON.stringify(userInfor));
    return true;
  }

  refreshTokenNoAuth2() {
    this.refreshToken().subscribe(
      (data) => {
        localStorage.setItem('access_token', data.token);
        localStorage.setItem('refresh_token', data.refreshToken);
        localStorage.setItem(
          'expires_at',
          (this.jwtHelper.decodeToken(data.token).exp * 1000).toString()
        );
        this.silentRefreshToken();
      },
      (err) => {
        console.log(err);
      }
    );
  }
  // Schedule token refresh
  silentRefreshToken() {
    clearTimeout(this.idTimeOut);
    const expiresIn =
      this.oauthService.getAccessTokenExpiration() -
      Date.now() -
      (this.config.timeToRefreshToken || 900000); // Refresh 1m before expiration
    this.idTimeOut = setTimeout(() => {
      this.refreshTokenNoAuth2();
    }, expiresIn);
  }

  logOutNoAuth2() {
    clearTimeout(this.idTimeOut);
    this.logout().subscribe(
      () => {
        localStorage.clear();
      },
      (err) => {
        console.error(err);
      }
    );
  }
}
