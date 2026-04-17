import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { PasswordService } from '../../core/services/password/password.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/signup.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SafeUserResponse, toSafeUserResponse } from '../users/users.constants';

type AuthTokenResponse = {
  access_token: string;
  user: SafeUserResponse;
};

type SocialLoginUser = {
  email: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  provider: string;
  providerId?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private configService: ConfigService,
  ) {}

  /**
   * Sign in user and return JWT token
   */
  async signIn(
    email: string,
    password: string,
  ): Promise<AuthTokenResponse> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.compare(
      password,
      user.passwordHash || '',
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  /**
   * Register new user and return JWT token
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<AuthTokenResponse> {
    const user = await this.usersService.create({
      email: registerDto.email,
      password: registerDto.password,
      firstname: registerDto.firstname,
      lastname: registerDto.lastname,
      phone: registerDto.phone,
      address: registerDto.address,
    });

    return this.generateToken(user);
  }

  private generateToken(user: User): AuthTokenResponse {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: this.toAuthUserResponse(user),
    };
  }

  async googleLogin(accessToken: string) {
    try {
      const googleResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const googleUser = googleResponse.data;

      return this.socialLogin({
        email: googleUser?.email,
        firstname: googleUser?.given_name || '',
        lastname: googleUser?.family_name || '',
        name: googleUser?.name || '',
        provider: 'google',
        providerId: googleUser?.sub,
      });
    } catch (error: any) {
      console.error(
        'Google login error:',
        error?.response?.data || error.message,
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Google authentication failed');
    }
  }

  getLinkedinAuthorizationUrl(origin: string): string {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    if (!clientId) {
      throw new InternalServerErrorException(
        'LinkedIn authentication is not configured',
      );
    }

    const providerRedirectUri = this.resolveLinkedinProviderRedirectUri(origin);
    const state = this.jwtService.sign(
      {
        purpose: 'linkedin_oauth_state',
        appOrigin: origin,
        providerRedirectUri,
        nonce: randomBytes(16).toString('hex'),
      },
      {
        expiresIn: '10m',
      },
    );

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: providerRedirectUri,
      state,
      scope: 'openid profile email',
      prompt: 'login',
      enable_extended_login: 'true',
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  getLinkedinFrontendCallbackUrl(code?: string, state?: string): string {
    if (!code || !state) {
      throw new BadRequestException('Missing LinkedIn authorization response');
    }

    const { appOrigin } = this.verifyLinkedinState(state);
    const params = new URLSearchParams({ code, state });

    return `${appOrigin}/features/public/auth/linkedin-callback.html?${params.toString()}`;
  }

  async linkedinLogin(code: string, state: string) {
    const { clientId, clientSecret } = this.getLinkedinConfig();
    const { providerRedirectUri } = this.verifyLinkedinState(state);

    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: providerRedirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      });

      const tokenResponse = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const providerAccessToken = tokenResponse.data?.access_token;
      if (!providerAccessToken) {
        throw new UnauthorizedException('LinkedIn access token not returned');
      }

      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${providerAccessToken}`,
          },
        },
      );

      const linkedinUser = profileResponse.data;

      return this.socialLogin({
        email: linkedinUser?.email,
        firstname: linkedinUser?.given_name || '',
        lastname: linkedinUser?.family_name || '',
        name: linkedinUser?.name || '',
        provider: 'linkedin',
        providerId: linkedinUser?.sub,
      });
    } catch (error: any) {
      console.error(
        'LinkedIn login error:',
        error?.response?.data || error.message,
      );

      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new UnauthorizedException('LinkedIn authentication failed');
    }
  }

  async socialLogin(
    socialUser: SocialLoginUser,
  ): Promise<AuthTokenResponse> {
    if (!socialUser?.email) {
      throw new UnauthorizedException(
        `${this.getProviderName(socialUser?.provider)} email not found`,
      );
    }

    const { firstname, lastname } = this.resolveSocialNames(socialUser);
    const user = await this.usersService.resolveSocialLoginUser({
      firstname,
      lastname,
      email: socialUser.email,
      provider: socialUser.provider,
      providerId: socialUser.providerId,
    });

    return this.generateToken(user);
  }

  async getProfile(userId: number): Promise<SafeUserResponse> {
    const user = await this.usersService.findOneOrFail(userId);
    return this.toAuthUserResponse(user);
  }

  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<SafeUserResponse> {
    const user = await this.usersService.updateCurrentUser(
      userId,
      updateProfileDto,
    );
    return this.toAuthUserResponse(user);
  }

  private getLinkedinConfig(): { clientId: string; clientSecret: string } {
    const clientId = this.configService.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret =
      this.configService.get<string>('LINKEDIN_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'LinkedIn authentication is not configured',
      );
    }

    return { clientId, clientSecret };
  }

  private resolveLinkedinProviderRedirectUri(origin: string): string {
    const configuredRedirectUri = this.configService
      .get<string>('LINKEDIN_CALLBACK_URL')
      ?.trim();

    if (configuredRedirectUri) {
      return configuredRedirectUri;
    }

    return `${origin}/api/v1/auth/linkedin/callback`;
  }

  private verifyLinkedinState(state: string): {
    appOrigin: string;
    providerRedirectUri: string;
  } {
    try {
      const payload = this.jwtService.verify<{
        purpose?: string;
        appOrigin?: string;
        providerRedirectUri?: string;
      }>(state);

      if (
        payload?.purpose !== 'linkedin_oauth_state' ||
        !payload.appOrigin ||
        !payload.providerRedirectUri
      ) {
        throw new BadRequestException('Invalid LinkedIn state');
      }

      return {
        appOrigin: payload.appOrigin,
        providerRedirectUri: payload.providerRedirectUri,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Invalid or expired LinkedIn state');
    }
  }

  private getProviderName(provider?: string): string {
    if (!provider) {
      return 'Social';
    }

    return provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  private resolveSocialNames(socialUser: SocialLoginUser): {
    firstname: string;
    lastname: string;
  } {
    const firstname = socialUser.firstname?.trim() || '';
    const lastname = socialUser.lastname?.trim() || '';

    if (firstname || lastname) {
      return { firstname, lastname };
    }

    const fullName = socialUser.name?.trim() || '';
    if (fullName) {
      const segments = fullName.split(/\s+/).filter(Boolean);
      return {
        firstname: segments.shift() || '',
        lastname: segments.join(' '),
      };
    }

    const emailName = socialUser.email.split('@')[0]?.trim() || 'User';
    return {
      firstname: emailName,
      lastname: '',
    };
  }

  private toAuthUserResponse(user: User): SafeUserResponse {
    return toSafeUserResponse(user);
  }
}
