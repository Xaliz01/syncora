import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import type { AuthUser, CommentResponse } from "@planwise/shared";
import { CasesGatewayService } from "../cases.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "../ports/order-givers.service.port";
import { AbstractCasesService } from "../cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../cases/ports/interventions.service.port";
import { AbstractQuotesService } from "../cases/ports/quotes.service.port";
import { AbstractCommentsService } from "../cases/ports/comments.service.port";
import { AbstractCaseHistoryService } from "../cases/ports/case-history.service.port";
import { AbstractDashboardService } from "../cases/ports/dashboard.service.port";
import { AbstractCaseTemplatesService } from "../cases/ports/case-templates.service.port";
import { AbstractInterventionTypesService } from "../cases/ports/intervention-types.service.port";

describe("CasesGatewayService comments", () => {
  let service: CasesGatewayService;
  let commentsService: Record<string, jest.Mock>;
  let caseHistoryService: Record<string, jest.Mock>;

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
    commentsService = {
      createComment: jest.fn(),
      listComments: jest.fn(),
      getComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn(),
    };
    caseHistoryService = {
      addCaseHistory: jest.fn().mockResolvedValue({}),
      listCaseHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CasesGatewayService,
        { provide: AbstractCasesService, useValue: {} },
        { provide: AbstractInterventionsService, useValue: {} },
        { provide: AbstractQuotesService, useValue: {} },
        { provide: AbstractCommentsService, useValue: commentsService },
        { provide: AbstractCaseHistoryService, useValue: caseHistoryService },
        { provide: AbstractDashboardService, useValue: {} },
        { provide: AbstractCaseTemplatesService, useValue: {} },
        { provide: AbstractInterventionTypesService, useValue: {} },
        { provide: OrganizationScopedHttpClient, useValue: { request: jest.fn() } },
        {
          provide: AbstractCustomersGatewayService,
          useValue: {},
        },
        {
          provide: AbstractOrderGiversGatewayService,
          useValue: {
            getOrderGiver: jest.fn(),
            listOrderGiversByIds: jest.fn().mockResolvedValue([]),
          },
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
    commentsService.createComment.mockResolvedValue(comment);

    const result = await service.createComment(memberUser, {
      entityType: "case",
      entityId: "case-1",
      body: "Note terrain",
    });

    expect(result.id).toBe("c-1");
    expect(commentsService.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        entityType: "case",
        entityId: "case-1",
        body: "Note terrain",
        authorId: "user-1",
        authorName: "Tech",
      }),
    );
    await Promise.resolve();
    expect(caseHistoryService.addCaseHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "comment_added", caseId: "case-1" }),
    );
  });

  it("lists comments for an entity", async () => {
    commentsService.listComments.mockResolvedValue([comment]);

    const result = await service.listComments(memberUser, "intervention", "int-1");

    expect(result).toHaveLength(1);
    expect(commentsService.listComments).toHaveBeenCalledWith("org-1", "intervention", "int-1");
  });

  it("allows author to update own comment", async () => {
    commentsService.getComment.mockResolvedValue(comment);
    commentsService.updateComment.mockResolvedValue({ ...comment, body: "Updated" });

    const result = await service.updateComment(memberUser, "c-1", { body: "Updated" });

    expect(result.body).toBe("Updated");
  });

  it("forbids member from updating someone else's comment", async () => {
    commentsService.getComment.mockResolvedValue({
      ...comment,
      authorId: "other-user",
    });

    await expect(service.updateComment(memberUser, "c-1", { body: "Hack" })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("allows admin to delete any comment", async () => {
    commentsService.getComment.mockResolvedValue({ ...comment, authorId: "other-user" });
    commentsService.deleteComment.mockResolvedValue({ deleted: true });

    const result = await service.deleteComment(adminUser, "c-1");
    expect(result).toEqual({ deleted: true });
  });
});
