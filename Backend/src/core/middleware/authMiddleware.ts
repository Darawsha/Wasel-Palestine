import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    // API routes that don't require a token
    private readonly publicPaths = [
        '/auth/signin',
        '/auth/signup',
        '/auth/google',
        '/auth/linkedin',
        '/auth/linkedin/callback',
        '/map/incidents',
        '/map/checkpoints',
        '/map/reports',
        '/routes/estimate',
        '/weather/current',
    ];

    use(req: Request, res: Response, next: NextFunction) {
        const url = req.originalUrl || req.url;

        // Allow public API paths through without a token
        const isPublic = this.publicPaths.some(path => url.includes(path));
        if (isPublic) {
            return next();
        }

        const authHeader = req.headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // For API requests, always return 401 if token is missing
            return res.status(401).json({
                message: 'No token provided',
                error: 'Unauthorized'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const secret = this.configService.get<string>('JWT_SECRET') || 'mySecretKey';
            const payload = this.jwtService.verify(token, { secret });
            // Attach a normalized user id for controllers that read req.user directly.
            (req as any).user = {
                ...(typeof payload === 'object' && payload ? payload : {}),
                userId: (payload as any)?.userId ?? (payload as any)?.sub,
            };
            next();
        } catch {
            return res.status(401).json({
                message: 'Invalid or expired token',
                error: 'Unauthorized'
            });
        }
    }
}
