import { SystemRole } from "@prisma/client";
import { RoleGuard } from "./role-guard.guard";
import { Roles } from "../decorators/roles.decorator";

function contextWith(user: { role: SystemRole }) {
  return {
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe("RoleGuard", () => {
  let reflector: { get: jest.Mock };
  let guard: RoleGuard;

  beforeEach(() => {
    reflector = { get: jest.fn() };
    guard = new RoleGuard(reflector as any);
  });

  it("libera quando a rota não declara papéis", () => {
    reflector.get.mockReturnValue(undefined);
    expect(
      guard.canActivate(contextWith({ role: SystemRole.PARTICIPANT })),
    ).toBe(true);
  });

  it("libera quando a lista de papéis é vazia", () => {
    reflector.get.mockReturnValue([]);
    expect(
      guard.canActivate(contextWith({ role: SystemRole.PARTICIPANT })),
    ).toBe(true);
  });

  it("libera MANAGER para qualquer rota (bypass)", () => {
    reflector.get.mockReturnValue([SystemRole.RESEARCHER]);
    expect(guard.canActivate(contextWith({ role: SystemRole.MANAGER }))).toBe(
      true,
    );
  });

  it("libera quando o papel do usuário está na lista", () => {
    reflector.get.mockReturnValue([SystemRole.RESEARCHER]);
    expect(
      guard.canActivate(contextWith({ role: SystemRole.RESEARCHER })),
    ).toBe(true);
  });

  // Adversarial: papel fora da lista deve ser negado.
  it("nega quando o papel do usuário não está na lista", () => {
    reflector.get.mockReturnValue([SystemRole.RESEARCHER]);
    expect(
      guard.canActivate(contextWith({ role: SystemRole.PARTICIPANT })),
    ).toBe(false);
  });

  it("usa o decorator Roles como chave de metadata", () => {
    reflector.get.mockReturnValue([SystemRole.RESEARCHER]);
    guard.canActivate(contextWith({ role: SystemRole.RESEARCHER }));
    expect(reflector.get).toHaveBeenCalledWith(Roles, expect.anything());
  });
});
