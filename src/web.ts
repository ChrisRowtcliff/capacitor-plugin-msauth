import { PublicClientApplication } from '@azure/msal-browser';
import { WebPlugin } from '@capacitor/core';

import type { BaseOptions, MsAuthPlugin } from './definitions';
enum InteractionMethod {
  Popup,
  Redirect
}
interface WebBaseOptions extends BaseOptions {
  redirectUri?: string;
}

interface WebLoginOptions extends WebBaseOptions {
  scopes: string[];
  interactionMethod: InteractionMethod;
}

type WebLogoutOptions = WebBaseOptions;

interface AuthResult {
  accessToken: string;
  idToken: string;
  scopes: string[];
}

export class MsAuth extends WebPlugin implements MsAuthPlugin {
  async login(options: WebLoginOptions): Promise<AuthResult> {
    const context = this.createContext(options);

    try {
      return await this.acquireTokenSilently(context, options.scopes).catch(() =>
        this.acquireTokenInteractively(context, options.scopes, options.interactionMethod = InteractionMethod.Popup)
      );
    } catch (error) {
      console.error('MSAL: Error occurred while logging in', error);

      throw error;
    }
  }

  logout(options: WebLogoutOptions): Promise<void> {
    const context = this.createContext(options);

    if (!context.getAllAccounts()[0]) {
      return Promise.reject(new Error('Nothing to sign out from.'));
    } else {
      return context.logoutPopup();
    }
  }

  private createContext(options: WebBaseOptions) {
    const config = {
      auth: {
        clientId: options.clientId,
        domainHint: options.domainHint,
        authority: options.authorityUrl ?? `https://login.microsoftonline.com/${options.tenant ?? 'common'}`,
        knownAuthorities: options.knownAuthorities,
        redirectUri: options.redirectUri ?? this.getCurrentUrl(),
      },
      cache: {
        cacheLocation: 'localStorage',
      },
    };

    return new PublicClientApplication(config);
  }

  private getCurrentUrl(): string {
    return window.location.href.split(/[?#]/)[0];
  }

  private async acquireTokenInteractively(context: PublicClientApplication, scopes: string[], interactionMethod: InteractionMethod): Promise<AuthResult> {
    const request = {
      scopes,
      prompt: 'select_account',
    };

    const { accessToken, idToken } = interactionMethod === InteractionMethod.Popup ? await context.acquireTokenPopup(request) : await context.acquireTokenRedirect(request);

    return { accessToken, idToken, scopes };
  }

  private async acquireTokenSilently(context: PublicClientApplication, scopes: string[]): Promise<AuthResult> {
    const { accessToken, idToken } = await context.acquireTokenSilent({
      scopes,
      account: context.getAllAccounts()[0],
    });

    return { accessToken, idToken, scopes };
  }
}
