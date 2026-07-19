import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import type { AuthUser, CommentResponse } from "@planwise/shared";
import { CasesGatewayService } from "../cases.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";

describe("CasesGatewayService comments", () => {
  let service: CasesGatewayService;
  let scopedHttp: { request: jest.Mock };

  const adminUser: AuthUser = {
    id: "admin-1",
    email: "admin@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin",
  };

  const memberUser: AuthUser = {
    id: "user-1",
    email: "tech@example.com",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: [],
    name: "Tech",
  };

  const comment: CommentResponse = {
    id: "c-1",
    organizationId: "org-1",
    entityType: "case",
    entityId: "case-1",
    caseId: "case-1",
    body: "Note terrain",
    authorId: "user-1",
    authorName: "Tech",
    createdAt: "2026-01-01T10:00:00.000Z",
  };

  beforeEach(async () => {
    scopedHttp = {
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesGatewayService,
        { provide: OrganizationScopedHttpClient, useValue: scopedHttp },
        {
          provide: AbstractCustomersGatewayService,
          useValue: {},
        },
        {
          provide: HttpService,
          useValue: { get: jest.fn(), post: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(CasesGatewayService);
  });

  it("creates a comment and records history", async () => {
    scopedHttp.request.mockImplementation(async (opts: { path?: string; method?: string }) => {
      if (opts.path === "/comments" && opts.method === "post") return comment;
      if (opts.path?.includes("/history")) return { id: "hist-1" };
      return {};
    });

    const result = await service.createComment(memberUser, {
      entityType: "case",
      entityId: "case-1",
      body: "Note terrain",
    });

    expect(result.id).toBe("c-1");
    expect(scopedHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        path: "/comments",
      }),
    );
    // history is best-effort / fire-and-forget
    await Promise.resolve();
    expect(scopedHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        path: "/cases/case-1/history",
        body: expect.objectContaining({ action: "comment_added" }),
      }),
    );
  });

  it("lists comments for an entity", async () => {
    scopedHttp.request.mockResolvedValueOnce([comment]);

    const result = await service.listComments(memberUser, "intervention", "int-1");

    expect(result).toHaveLength(1);
    expect(scopedHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "get",
        path: "/comments",
        query: expect.objectContaining({
          entityType: "intervention",
          entityId: "int-1",
        }),
      }),
    );
  });

  it("allows author to update own comment", async () => {
    scopedHttp.request.mockImplementation(async (opts: { path?: string; method?: string }) => {
      if (opts.method === "get" && opts.path === "/comments/c-1") return comment;
      if (opts.method === "patch") return { ...comment, body: "Updated" };
      if (opts.path?.includes("/history")) return { id: "hist-2" };
      return {};
    });

    const result = await service.updateComment(memberUser, "c-1", { body: "Updated" });

    expect(result.body).toBe("Updated");
  });

  it("forbids member from updating someone else's comment", async () => {
    scopedHttp.request.mockResolvedValueOnce({
      ...comment,
      authorId: "other-user",
    });

    await expect(service.updateComment(memberUser, "c-1", { body: "Hack" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("allows admin to delete any comment", async () => {
    scopedHttp.request.mockImplementation(async (opts: { path?: string; method?: string }) => {
      if (opts.method === "get") return { ...comment, authorId: "other-user" };
      if (opts.method === "delete") return { deleted: true };
      if (opts.path?.includes("/history")) return { id: "hist-3" };
      return {};
    });

    const result = await service.deleteComment(adminUser, "c-1");
    expect(result).toEqual({ deleted: true });
  });
});
