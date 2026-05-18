import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { SystemRole, User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { hashPassword, comparePassword } from 'src/shared/functions/hash-password';
import { EmailService } from 'src/shared/services/email/email.service';
import { SecurityConfig, PasswordRecoveryConfig } from 'src/shared/config/config.interface';
import { AccessToken, JwtPayload, Payload, RefreshPayload } from './interfaces/auth.interface';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SERVICE_NAME = 'auth-service';
const TOKEN_AUDIENCES = ['ivcf', 'tecnoaging'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly isProd = process.env.NODE_ENV === 'production';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async validateCredentials(identifier: string, password: string): Promise<Partial<User> | null> {
    try {
      const isEmail = identifier.includes('@');
      const where = isEmail ? { email: identifier } : { cpf: identifier };

      const user = await this.prisma.user.findUnique({
        where,
        select: { id: true, fullName: true, cpf: true, email: true, role: true, password: true, active: true },
      });

      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      if (!user.active) {
        throw new ForbiddenException('Conta desativada');
      }

      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciais inválidas');
      }

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      this.logger.error('Unexpected error during credential validation', error);
      throw new InternalServerErrorException('Erro interno ao validar credenciais');
    }
  }

  async signIn(user: Payload, keepMeLoggedIn = false): Promise<AccessToken> {
    const { jwtSecret, jwtExpirationTime, jwtRefreshExpirationTime } =
      this.configService.getOrThrow<SecurityConfig>('security');

    const accessPayload: Omit<JwtPayload, 'iss' | 'aud'> = {
      sub: user.id,
      username: user.fullName,
      ...(user.cpf ? { cpf: user.cpf } : {}),
      ...(user.email ? { email: user.email } : {}),
      role: user.role,
    };

    const refreshPayload: RefreshPayload = {
      sub: user.id,
      persistent: keepMeLoggedIn,
    };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: jwtSecret,
        expiresIn: jwtExpirationTime,
        issuer: SERVICE_NAME,
        audience: TOKEN_AUDIENCES,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: jwtSecret,
        expiresIn: keepMeLoggedIn ? THIRTY_DAYS_MS / 1000 : jwtRefreshExpirationTime,
        issuer: SERVICE_NAME,
      }),
    ]);

    return { access_token, refresh_token };
  }

  async validateRefreshToken(token: string): Promise<{ user: Payload; persistent: boolean }> {
    const { jwtSecret } = this.configService.getOrThrow<SecurityConfig>('security');

    try {
      const payload = await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret: jwtSecret,
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, fullName: true, cpf: true, role: true, active: true },
      });

      if (!user || !user.active) {
        throw new UnauthorizedException('Sessão inválida');
      }

      return {
        user: { id: user.id, cpf: user.cpf, fullName: user.fullName, role: user.role },
        persistent: payload.persistent ?? false,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn('Invalid refresh token attempt');
      throw new UnauthorizedException('Token de refresh inválido ou expirado');
    }
  }

  async initiatePasswordRecovery(email: string): Promise<{ message: string }> {
    const user = await this.findUserByEmail(email);

    if (!user) {
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve' };
    }

    if (user.role === SystemRole.PARTICIPANT) {
      return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve' };
    }

    try {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = hashSha256(rawToken);

      const { tokenExpiryHours } =
        this.configService.getOrThrow<PasswordRecoveryConfig>('passwordRecovery');

      const expiresAt = new Date(Date.now() + tokenExpiryHours * 60 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: expiresAt,
          passwordResetUsedAt: null,
        },
      });

      const recoveryLink = this.buildRecoveryLink(rawToken);
      await this.emailService.sendPasswordRecoveryEmail(email, user.fullName, recoveryLink);

      this.logger.log(`Password recovery initiated for user ${user.id}`);
    } catch (error) {
      this.logger.error('Error initiating password recovery', error);
    }

    return { message: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = hashSha256(token);

    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: tokenHash },
    });

    if (!user || !user.passwordResetToken) {
      throw new BadRequestException('Token de recuperação inválido');
    }

    if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException('Token de recuperação expirado');
    }

    if (user.passwordResetUsedAt) {
      throw new BadRequestException('Token de recuperação já utilizado');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordResetUsedAt: new Date(),
      },
    });

    this.logger.log(`Password reset completed for user ${user.id}`);
    return { message: 'Senha redefinida com sucesso' };
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const directUser = await this.prisma.user.findUnique({ where: { email } });
    if (directUser) return directUser;

    const researcher = await this.prisma.researcher.findUnique({
      where: { email },
      select: { id: true },
    });
    if (researcher) {
      return this.prisma.user.findUnique({ where: { id: researcher.id } });
    }

    const healthProfessional = await this.prisma.healthProfessional.findUnique({
      where: { email },
      select: { id: true },
    });
    if (healthProfessional) {
      return this.prisma.user.findUnique({ where: { id: healthProfessional.id } });
    }

    return null;
  }

  private buildRecoveryLink(rawToken: string): string {
    const { frontendBaseUrl } =
      this.configService.getOrThrow<PasswordRecoveryConfig>('passwordRecovery');
    return `${frontendBaseUrl}/reset-password?token=${rawToken}`;
  }
}

function hashSha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
