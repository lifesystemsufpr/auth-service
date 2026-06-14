import {
  ConflictException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Prisma, SystemRole } from "@prisma/client";
import { UserService } from "./user.service";

jest.mock("src/shared/functions/hash-password", () => ({
  hashPassword: jest.fn(async () => "HASHED"),
}));

function build() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  return { service: new UserService(prisma as any), prisma };
}

beforeEach(() => jest.clearAllMocks());

describe("UserService.createUser", () => {
  it("exige CPF ou e-mail", async () => {
    const { service } = build();
    await expect(
      service.createUser({ fullName: "Ana", password: "pw" } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  // BUG encontrado pela IA (adversarial): a checagem de duplicidade lança ConflictException
  // DENTRO do try, e o catch a reembrulha em InternalServerErrorException — a exceção de
  // negócio (409) é mascarada como 500. it.failing documenta o comportamento desejado sem
  // tocar o código de produto; quando o bug for corrigido (mover as checagens p/ fora do try
  // ou re-lançar HttpException no catch), estes testes passam e o .failing deve ser removido.
  it.failing(
    "deveria rejeitar CPF já em uso com Conflict (hoje mascara como 500)",
    async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValueOnce({ id: "x" }); // por cpf
      await expect(
        service.createUser({
          fullName: "Ana",
          password: "pw",
          cpf: "123",
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  it.failing(
    "deveria rejeitar e-mail já em uso com Conflict (hoje mascara como 500)",
    async () => {
      const { service, prisma } = build();
      prisma.user.findUnique.mockResolvedValueOnce({ id: "x" }); // por email
      await expect(
        service.createUser({
          fullName: "Ana",
          password: "pw",
          email: "a@b.com",
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );

  // Comportamento ATUAL (documentado): duplicidade vira 500 — cobre o branch e fixa a regressão.
  it("hoje converte duplicidade em 500 (comportamento atual, ver bug acima)", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValueOnce({ id: "x" });
    await expect(
      service.createUser({
        fullName: "Ana",
        password: "pw",
        cpf: "123",
      } as any),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it("cria usuário, hasheia senha, normaliza nome e omite senha do retorno", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: "1",
      fullName: "José Águeda",
      password: "HASHED",
      email: "a@b.com",
    });

    const result = await service.createUser({
      fullName: "José Águeda",
      password: "pw",
      email: "a@b.com",
    } as any);

    expect((result as Record<string, unknown>).password).toBeUndefined();
    const createArg = prisma.user.create.mock.calls[0][0];
    expect(createArg.data.password).toBe("HASHED");
    expect(createArg.data.fullName_normalized).toBe("jose agueda");
    expect(createArg.data.active).toBe(true);
  });

  it("mapeia violação de unicidade do Prisma (P2002) para Conflict", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "7",
      } as any),
    );
    await expect(
      service.createUser({
        fullName: "Ana",
        password: "pw",
        email: "a@b.com",
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("converte erro desconhecido em InternalServerError", async () => {
    const { service, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockRejectedValueOnce(new Error("boom"));
    await expect(
      service.createUser({
        fullName: "Ana",
        password: "pw",
        email: "a@b.com",
      } as any),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});

describe("UserService.update", () => {
  it("hasheia a senha quando fornecida e normaliza o nome", async () => {
    const { service, prisma } = build();
    prisma.user.update.mockResolvedValue({});
    await service.update("1", { password: "nova", fullName: "Ângela" } as any);
    const arg = prisma.user.update.mock.calls[0][0];
    expect(arg.data.password).toBe("HASHED");
    expect(arg.data.fullName_normalized).toBe("angela");
  });

  it("não toca na senha quando não fornecida", async () => {
    const { service, prisma } = build();
    prisma.user.update.mockResolvedValue({});
    await service.update("1", { fullName: "Bia" } as any);
    expect(prisma.user.update.mock.calls[0][0].data.password).toBeUndefined();
  });
});

describe("UserService consultas e remoção", () => {
  it("findOne / findByCpf / findByEmail / findAllByRole / remove delegam ao prisma", async () => {
    const { service, prisma } = build();
    await service.findOne("1");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "1" } });
    await service.findByCpf("123");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { cpf: "123" },
    });
    await service.findByEmail("a@b.com");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
    });
    service.findAllByRole(SystemRole.RESEARCHER);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: SystemRole.RESEARCHER },
    });
    service.remove("1");
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: "1" } });
  });
});
