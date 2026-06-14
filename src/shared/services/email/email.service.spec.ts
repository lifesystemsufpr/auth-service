const sendMailMock = jest.fn();
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({ sendMail: sendMailMock })),
}));

import { EmailService } from "./email.service";

function build() {
  const configService = {
    getOrThrow: jest.fn(() => ({
      host: "smtp.test",
      port: 587,
      user: "u",
      password: "p",
      from: "no-reply@test",
      fromName: "Lab",
    })),
  };
  return { service: new EmailService(configService as any), configService };
}

beforeEach(() => jest.clearAllMocks());

describe("EmailService.sendPasswordRecoveryEmail", () => {
  it("envia e-mail com o nome do usuário e o link de recuperação", async () => {
    const { service } = build();
    await service.sendPasswordRecoveryEmail(
      "a@b.com",
      "Ana",
      "https://app.test/reset?token=xyz",
    );

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    const arg = sendMailMock.mock.calls[0][0];
    expect(arg.to).toBe("a@b.com");
    expect(arg.subject).toMatch(/Recupera/i);
    expect(arg.html).toContain("Ana");
    expect(arg.html).toContain("https://app.test/reset?token=xyz");
    expect(arg.from).toContain("no-reply@test");
  });

  // Adversarial: falha do transporte deve propagar, não ser engolida.
  it("repropaga erro quando o envio falha", async () => {
    const { service } = build();
    sendMailMock.mockRejectedValueOnce(new Error("SMTP down"));
    await expect(
      service.sendPasswordRecoveryEmail(
        "a@b.com",
        "Ana",
        "https://app.test/reset?token=xyz",
      ),
    ).rejects.toThrow("SMTP down");
  });
});
