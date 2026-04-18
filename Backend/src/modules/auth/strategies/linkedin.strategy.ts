import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

const OpenIdConnectStrategy = require('passport-openidconnect')
  .Strategy as new (...args: any[]) => any;

type LinkedinProfile = {
  email?: string;
  given_name?: string;
  family_name?: string;
  sub?: string;
};

type LinkedinValidateDone = (error: unknown, user?: unknown) => void;

@Injectable()
export class LinkedinStrategy extends PassportStrategy(
  OpenIdConnectStrategy,
  'linkedin',
) {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');

    super({
      issuer: 'https://www.linkedin.com',
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      userInfoURL: 'https://api.linkedin.com/v2/userinfo',
      clientID: clientID!,
      clientSecret: clientSecret!,
      callbackURL: callbackURL!,
      scope: ['openid', 'profile', 'email'],
    });
  }

  async validate(
    _issuer: string,
    profile: LinkedinProfile,
    done: LinkedinValidateDone,
  ): Promise<void> {
    try {
      const user = {
        email: profile?.email,
        firstname: profile?.given_name || '',
        lastname: profile?.family_name || '',
        provider: 'linkedin',
        providerId: profile?.sub,
      };

      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }
}
