import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Gender, SystemRole } from "@prisma/client";
import { CreateUserDto } from "./create-user.dto";
import { UpdateUserDto } from "./update-user.dto";

async function errorsFor<T extends object>(cls: new () => T, payload: unknown) {
  return validate(plainToInstance(cls, payload) as object);
}
const props = (errs: { property: string }[]) => errs.map((e) => e.property);

describe("CreateUserDto", () => {
  const base = {
    fullName: "Ana",
    role: SystemRole.RESEARCHER,
    password: "12345678",
  };

  it("aceita usuário válido com e-mail", async () => {
    expect(
      await errorsFor(CreateUserDto, { ...base, email: "a@b.com" }),
    ).toHaveLength(0);
  });

  it("aceita usuário válido com CPF de 11 dígitos", async () => {
    expect(
      await errorsFor(CreateUserDto, { ...base, cpf: "12345678901" }),
    ).toHaveLength(0);
  });

  it("aceita campos opcionais (phone, gender, active)", async () => {
    const errs = await errorsFor(CreateUserDto, {
      ...base,
      email: "a@b.com",
      phone: "41999999999",
      gender: Gender.FEMALE,
      active: false,
    });
    expect(errs).toHaveLength(0);
  });

  // Adversarial / bordas:
  it("rejeita CPF com tamanho diferente de 11 (borda)", async () => {
    expect(
      props(await errorsFor(CreateUserDto, { ...base, cpf: "123" })),
    ).toContain("cpf");
  });

  it("rejeita senha com menos de 8 caracteres (borda)", async () => {
    expect(
      props(
        await errorsFor(CreateUserDto, {
          ...base,
          email: "a@b.com",
          password: "1234567",
        }),
      ),
    ).toContain("password");
  });

  it("rejeita role fora do enum", async () => {
    expect(
      props(
        await errorsFor(CreateUserDto, {
          ...base,
          email: "a@b.com",
          role: "HACKER",
        }),
      ),
    ).toContain("role");
  });

  it("rejeita quando faltam CPF e e-mail juntos", async () => {
    const errs = props(
      await errorsFor(CreateUserDto, {
        fullName: "Ana",
        role: SystemRole.RESEARCHER,
        password: "12345678",
      }),
    );
    expect(errs.some((p) => p === "cpf" || p === "email")).toBe(true);
  });
});

describe("UpdateUserDto (PartialType)", () => {
  it("aceita payload parcial (só fullName)", async () => {
    expect(
      await errorsFor(UpdateUserDto, { fullName: "Novo Nome" }),
    ).toHaveLength(0);
  });

  it("aceita payload vazio", async () => {
    expect(await errorsFor(UpdateUserDto, {})).toHaveLength(0);
  });

  it("ainda valida regras herdadas (senha curta)", async () => {
    expect(
      props(await errorsFor(UpdateUserDto, { password: "123" })),
    ).toContain("password");
  });
});
