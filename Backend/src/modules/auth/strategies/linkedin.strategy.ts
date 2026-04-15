import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LinkedinStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = configService.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackURL = configService.get<string>('LINKEDIN_CALLBACK_URL');

    console.log('LINKEDIN_CLIENT_ID =', clientID);
    console.log('LINKEDIN_CLIENT_SECRET =', clientSecret ? 'loaded' : 'missing');
    console.log('LINKEDIN_CALLBACK_URL =', callbackURL);

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
    issuer: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<void> {
    try {
      console.log('LinkedIn profile =', profile);

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