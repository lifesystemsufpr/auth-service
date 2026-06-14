import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from "@nestjs/common";
import { SystemRole } from "@prisma/client";
import { AuthService } from "./auth.service";

// Mocka as funções de hash (efeito colateral) — DI por módulo.
jest.mock("src/shared/functions/hash-password", () => ({
  hashPassword: jest.fn(async () => "HASHED"),
  comparePassword: jest.fn(),
}));
import { comparePassword } from "src/shared/functions/hash-password";

const compareMock = comparePassword as jest.Mock;

function build() {
  const prisma = {
    user: { findUnique: jest.fn(), update: jest.fn() },
    researcher: { findUnique: jest.fn() },
    healthProfessional: { findUnique: jest.fn() },
  };
  const jwtService = {
    signAsync: jest.fn(async () => "token"),
    verifyAsync: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === "security")
        return {
          jwtSecret: "s",
          jwtRefreshSecret: "r",
          jwtExpirationTime: 900,
          jwtRefreshExpirationTime: 3600,
        };
      if (key === "passwordRecovery")
        return { tokenExpiryHours: 24, frontendBaseUrl: "https://app.test" };
      throw new Error(`unexpected key ${key}`);
    }),
  };
  const emailService = {
    sendPasswordRecoveryEmail: jest.fn(async () => undefined),
  };
  const service = new AuthService(
    prisma as any,
    jwtService as any,
    configService as any,
    emailService as any,
  );
  return { service, prisma, jwtService, configService, emailService };
}

beforeEach(() => jest.clearAllMocks());

describe("AuthService.validateCredentials", () => {
  it("retorna usuário sem senha no caminho feliz", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      fullName: "Ana",
      cpf: null,
      email: "a@b.com",
      role: SystemRole.RESEARCHER,
      password: "h",
      active: true,
    });
    compareMock.mockResolvedValue(true);

    const result = await service.validateCredentials("a@b.com", "pw");

    expect(result).toMatchObject({ id: "1", email: "a@b.com" });
    expect((result as Record<string, unknown>).password).toBeUndefined();
  });

  it("usa CPF quando o identifier não tem @", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      fullName: "Ana",
      cpf: "123",
      email: null,
      role: SystemRole.PARTICIPANT,
      password: "h",
      active: true,
    });
    compareMock.mockResolvedValue(true);
    await service.validateCredentials("12345678900", "pw");
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cpf: "12345678900" } }),
    );
  });

  it("lança Unauthorized quando o usuário não existe", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.validateCredentials("a@b.com", "pw"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("lança Forbidden quando a conta está desativada", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      active: false,
      password: "h",
      role: SystemRole.PARTICIPANT,
    });
    await expect(
      service.validateCredentials("a@b.com", "pw"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // Adversarial: senha errada não pode autenticar.
  it("lança Unauthorized quando a senha é inválida", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      active: true,
      password: "h",
      role: SystemRole.PARTICIPANT,
    });
    compareMock.mockResolvedValue(false);
    await expect(
      service.validateCredentials("a@b.com", "bad"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("converte erro inesperado em InternalServerError", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockRejectedValue(new Error("db down"));
    await expect(
      service.validateCredentials("a@b.com", "pw"),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe("AuthService.signIn", () => {
  it("emite access e refresh token", async () => {
    const { service } = build();
    const tokens = await service.signIn({
      id: "1",
      fullName: "Ana",
      email: "a@b.com",
      role: SystemRole.RESEARCHER,
    } as any);
    expect(tokens).toEqual({ access_token: "token", refresh_token: "token" });
  });

  it("deriva audience ivcf para usuário com e-mail e tecnoaging para CPF", async () => {
    const { service, jwtService } = build();
    await service.signIn({
      id: "1",
      fullName: "Ana",
      cpf: "123",
      role: SystemRole.PARTICIPANT,
    } as any);
    const accessCall = (jwtService.signAsync as jest.Mock).mock.calls[0][1] as {
      audience: string[];
    };
    expect(accessCall.audience).toEqual(["tecnoaging"]);
  });
});

describe("AuthService.validateRefreshToken", () => {
  it("retorna usuário ativo no caminho feliz", async () => {
    const { service, prisma, jwtService } = build();
    jwtService.verifyAsync.mockResolvedValue({ sub: "1", persistent: true });
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      fullName: "Ana",
      cpf: null,
      email: "a@b.com",
      role: SystemRole.RESEARCHER,
      active: true,
    });
    const out = await service.validateRefreshToken("tok");
    expect(out.persistent).toBe(true);
    expect(out.user.id).toBe("1");
  });

  it("lança Unauthorized para token inválido (adversarial)", async () => {
    const { service, jwtService } = build();
    jwtService.verifyAsync.mockRejectedValue(new Error("jwt malformed"));
    await expect(service.validateRefreshToken("lixo")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("lança Unauthorized quando o usuário do token está inativo", async () => {
    const { service, prisma, jwtService } = build();
    jwtService.verifyAsync.mockResolvedValue({ sub: "1" });
    prisma.user.findUnique.mockResolvedValue({ id: "1", active: false });
    await expect(service.validateRefreshToken("tok")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe("AuthService.initiatePasswordRecovery", () => {
  it("responde genérico e não envia e-mail quando não há usuário (anti-enumeração)", async () => {
    const { service, prisma, emailService } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.researcher.findUnique.mockResolvedValue(null);
    prisma.healthProfessional.findUnique.mockResolvedValue(null);
    const out = await service.initiatePasswordRecovery("x@y.com");
    expect(out.message).toMatch(/instruções/i);
    expect(emailService.sendPasswordRecoveryEmail).not.toHaveBeenCalled();
  });

  it("não envia e-mail para PARTICIPANT", async () => {
    const { service, prisma, emailService } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      email: "p@y.com",
      role: SystemRole.PARTICIPANT,
      fullName: "P",
    });
    await service.initiatePasswordRecovery("p@y.com");
    expect(emailService.sendPasswordRecoveryEmail).not.toHaveBeenCalled();
  });

  it("gera token, persiste e envia e-mail para usuário elegível", async () => {
    const { service, prisma, emailService } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      email: "r@y.com",
      role: SystemRole.RESEARCHER,
      fullName: "R",
    });
    prisma.user.update.mockResolvedValue({});
    await service.initiatePasswordRecovery("r@y.com");
    expect(prisma.user.update).toHaveBeenCalled();
    expect(emailService.sendPasswordRecoveryEmail).toHaveBeenCalledWith(
      "r@y.com",
      "R",
      expect.stringContaining("reset-password?token="),
    );
  });
});

describe("AuthService.resetPassword", () => {
  it("redefine a senha no caminho feliz", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      passwordResetToken: "h",
      passwordResetExpiresAt: new Date(Date.now() + 1e6),
      passwordResetUsedAt: null,
    });
    prisma.user.update.mockResolvedValue({});
    const out = await service.resetPassword("raw", "novaSenha123");
    expect(out.message).toMatch(/sucesso/i);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("rejeita token inexistente", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.resetPassword("x", "novaSenha123"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejeita token expirado (borda temporal)", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      passwordResetToken: "h",
      passwordResetExpiresAt: new Date(Date.now() - 1000),
      passwordResetUsedAt: null,
    });
    await expect(
      service.resetPassword("x", "novaSenha123"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejeita token já utilizado (replay)", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({
      id: "1",
      passwordResetToken: "h",
      passwordResetExpiresAt: new Date(Date.now() + 1e6),
      passwordResetUsedAt: new Date(),
    });
    await expect(
      service.resetPassword("x", "novaSenha123"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
