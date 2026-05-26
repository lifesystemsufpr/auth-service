import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecurityConfig } from 'src/shared/config/config.interface';
import { JwtPayload, Payload } from '../interfaces/auth.interface';
import { UserService } from 'src/modules/users/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<SecurityConfig>('security').jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<Payload> {
    const user = await this.userService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (!user.active) throw new UnauthorizedException('Conta desativada');
    return { id: user.id, cpf: user.cpf ?? undefined, email: user.email ?? undefined, fullName: user.fullName, role: user.role };
  }
}
