import { hashPassword, comparePassword } from "./hash-password";

// Usa bcrypt real (round-trip) — verifica comportamento observável, não implementação.
describe("hashPassword / comparePassword", () => {
  it("gera um hash diferente da senha original", async () => {
    const hash = await hashPassword("s3nh@-forte");
    expect(hash).not.toBe("s3nh@-forte");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("comparePassword aceita a senha correta", async () => {
    const hash = await hashPassword("s3nh@-forte");
    await expect(comparePassword("s3nh@-forte", hash)).resolves.toBe(true);
  });

  it("comparePassword rejeita senha errada (adversarial)", async () => {
    const hash = await hashPassword("s3nh@-forte");
    await expect(comparePassword("senha-errada", hash)).resolves.toBe(false);
  });

  it("dois hashes da mesma senha diferem (salt aleatório)", async () => {
    const [a, b] = await Promise.all([
      hashPassword("igual"),
      hashPassword("igual"),
    ]);
    expect(a).not.toBe(b);
  });
});
