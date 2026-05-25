import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, SystemRole, User } from '@prisma/client';
import { PrismaService } from 'src/shared/prisma/prisma.service';
import { hashPassword } from 'src/shared/functions/hash-password';
import { normalizeString } from 'src/shared/functions/normalize-string';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(
    dto: CreateUserDto,
    tx?: Prisma.TransactionClient,
  ): Promise<Omit<User, 'password'>> {
    const db = tx ?? this.prisma;
    const { password, fullName, ...rest } = dto;

    if (!rest.cpf && !rest.email) {
      throw new ConflictException('É necessário informar CPF ou e-mail');
    }

    try {
      if (rest.cpf) {
        const existingByCpf = await db.user.findUnique({ where: { cpf: rest.cpf } });
        if (existingByCpf) {
          throw new ConflictException('CPF já está em uso');
        }
      }

      if (rest.email) {
        const existingByEmail = await db.user.findUnique({ where: { email: rest.email } });
        if (existingByEmail) {
          throw new ConflictException('E-mail já está em uso');
        }
      }

      const user = await db.user.create({
        data: {
          ...rest,
          fullName,
          fullName_normalized: normalizeString(fullName) ?? '',
          password: await hashPassword(password),
          active: dto.active ?? true,
        },
      });

      const { password: _, ...result } = user;
      return result;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('CPF ou e-mail já está em uso');
      }
      throw new InternalServerErrorException('Não foi possível criar o usuário');
    }
  }

  findAllByRole(role: SystemRole) {
    return this.prisma.user.findMany({ where: { role } });
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByCpf(cpf: string) {
    return this.prisma.user.findUnique({ where: { cpf } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, dto: UpdateUserDto, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    const data: Prisma.UserUpdateInput = { ...dto };

    if (dto.password) {
      data.password = await hashPassword(dto.password);
    }

    if (dto.fullName) {
      data.fullName_normalized = normalizeString(dto.fullName);
    }

    return db.user.update({ where: { id }, data });
  }

  remove(id: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.user.delete({ where: { id } });
  }
}
