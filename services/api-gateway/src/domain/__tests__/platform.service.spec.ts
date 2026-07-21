import { ForbiddenException } from "@nestjs/common";
import { of } from "rxjs";
import { PlatformService } from "../platform.service";

describe("PlatformService", () => {
  const httpService = { get: jest.fn(), post: jest.fn() };
  const jwtService = { sign: jest.fn().mockReturnValue("platform-token") };
  const subscriptionsGateway = {
    getCurrentSubscription: jest.fn(),
  };

  let service: PlatformService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PLATFORM_STAFF_EMAILS = "mail@benoistbabin.fr";
    process.env.PLATFORM_STAFF_EMAIL_DOMAINS = "planwise.fr";
    service = new PlatformService(
      httpService as never,
      jwtService as never,
      subscriptionsGateway as never,
    );
  });

  it("rejects non-staff login", async () => {
    await expect(
      service.login({ email: "client@acme.fr", password: "secret" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("issues a platform token for allowlisted staff", async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          id: "staff-1",
          email: "mail@benoistbabin.fr",
          name: "Benoist",
          status: "active",
        },
        status: 200,
      }),
    );

    const result = await service.login({
      email: "mail@benoistbabin.fr",
      password: "secret",
    });

    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "platform", sub: "staff-1" }),
      { expiresIn: "8h" },
    );
    expect(result.user.email).toBe("mail@benoistbabin.fr");
    expect(result.accessToken).toBe("platform-token");
  });

  it("creates an audited impersonation session", async () => {
    httpService.get
      .mockReturnValueOnce(
        of({
          data: {
            id: "user-1",
            email: "client@acme.fr",
            organizationId: "org-1",
            role: "admin",
            status: "active",
            name: "Client",
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          data: [
            {
              id: "m1",
              userId: "user-1",
              organizationId: "org-1",
              role: "admin",
              membershipStatus: "active",
            },
          ],
        }),
      );
    httpService.post.mockReturnValue(of({ data: { id: "audit-1" } }));
    jwtService.sign.mockReturnValue("impersonation-token");

    const result = await service.startImpersonation(
      { id: "staff-1", email: "mail@benoistbabin.fr" },
      {
        userId: "user-1",
        organizationId: "org-1",
        reason: "Ticket support #123 — accès facture",
      },
    );

    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining("/users/platform/impersonation-audits"),
      expect.objectContaining({
        impersonatorUserId: "staff-1",
        targetUserId: "user-1",
        reason: "Ticket support #123 — accès facture",
      }),
    );
    expect(result.user.impersonatorId).toBe("staff-1");
    expect(result.accessToken).toBe("impersonation-token");
  });

  it("rejects short impersonation reasons", async () => {
    await expect(
      service.startImpersonation(
        { id: "staff-1", email: "mail@benoistbabin.fr" },
        { userId: "u1", organizationId: "o1", reason: "court" },
      ),
    ).rejects.toThrow(/motif support/i);
  });
});
