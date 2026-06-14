import { normalizeString } from "./normalize-string";

// Testes derivados do contrato observável de normalizeString (regra 60-testing: AAA + adversarial).
describe("normalizeString", () => {
  it("remove acentos e baixa a caixa", () => {
    expect(normalizeString("Açaí Café")).toBe("acai cafe");
  });

  it("mantém string já normalizada inalterada", () => {
    expect(normalizeString("joao silva")).toBe("joao silva");
  });

  it("trata maiúsculas com diacríticos compostos", () => {
    expect(normalizeString("JOSÉ ÂNGELO")).toBe("jose angelo");
  });

  // Adversarial: entradas vazias/nulas não podem quebrar nem virar "undefined" string.
  it.each([
    ["", undefined],
    [null, undefined],
    [undefined, undefined],
  ])("retorna undefined para entrada vazia/nula (%p)", (input, expected) => {
    expect(normalizeString(input as string | null | undefined)).toBe(expected);
  });

  it("preserva espaços internos e números", () => {
    expect(normalizeString("Unidade 12 — Á")).toBe("unidade 12 — a");
  });
});
