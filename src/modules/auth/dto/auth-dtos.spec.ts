import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "./login.dto";
import { ResetPasswordDto } from "./reset-password.dto";
import { RequestPasswordRecoveryDto } from "./request-password-recovery.dto";

async function errorsFor<T extends object>(cls: new () => T, payload: unknown) {
  const dto = plainToInstance(cls, payload);
  return validate(dto as object);
}

describe("LoginDto", () => {
  it("aceita identifier + password válidos", async () => {
    expect(
      await errorsFor(LoginDto, { identifier: "a@b.com", password: "x" }),
    ).toHaveLength(0);
  });

  it("aceita keepMeLoggedIn booleano opcional", async () => {
    expect(
      await errorsFor(LoginDto, {
        identifier: "a@b.com",
        password: "x",
        keepMeLoggedIn: true,
      }),
    ).toHaveLength(0);
  });

  // Adversarial: campos obrigatórios ausentes / tipo errado.
  it("rejeita identifier vazio", async () => {
    const errs = await errorsFor(LoginDto, { identifier: "", password: "x" });
    expect(errs.some((e) => e.property === "identifier")).toBe(true);
  });

  it("rejeita keepMeLoggedIn não-booleano", async () => {
    const errs = await errorsFor(LoginDto, {
      identifier: "a",
      password: "x",
      keepMeLoggedIn: "sim",
    });
    expect(errs.some((e) => e.property === "keepMeLoggedIn")).toBe(true);
  });
});

describe("ResetPasswordDto", () => {
  it("aceita token + senha com 8+ caracteres", async () => {
    expect(
      await errorsFor(ResetPasswordDto, {
        token: "t",
        newPassword: "12345678",
      }),
    ).toHaveLength(0);
  });

  it("rejeita senha curta (< 8) — borda", async () => {
    const errs = await errorsFor(ResetPasswordDto, {
      token: "t",
      newPassword: "1234567",
    });
    expect(errs.some((e) => e.property === "newPassword")).toBe(true);
  });

  it("rejeita token ausente", async () => {
    const errs = await errorsFor(ResetPasswordDto, { newPassword: "12345678" });
    expect(errs.some((e) => e.property === "token")).toBe(true);
  });
});

describe("RequestPasswordRecoveryDto", () => {
  it("aceita e-mail válido", async () => {
    expect(
      await errorsFor(RequestPasswordRecoveryDto, { email: "a@b.com" }),
    ).toHaveLength(0);
  });

  it.each(["nao-email", "a@", "@b.com", ""])(
    "rejeita e-mail inválido (%p)",
    async (email) => {
      const errs = await errorsFor(RequestPasswordRecoveryDto, { email });
      expect(errs.some((e) => e.property === "email")).toBe(true);
    },
  );
});
