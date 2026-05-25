import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

/**
 * Registers JwtModule once, globally, so JwtService is injectable everywhere:
 * AuthService (to sign tokens) and JwtAuthGuard (to verify them) live in
 * different modules, and every tenant controller uses the guard.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev-secret',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1d' },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtConfigModule {}
