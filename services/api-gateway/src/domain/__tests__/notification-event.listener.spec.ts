import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { NotificationEventListener } from "../notification-event.listener";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import type { PlanwiseDomainEvent } from "../../infrastructure/notify.interceptor";

describe("NotificationEventListener", () => {
  let listener: NotificationEventListener;
  let mockHttpService: { post: jest.Mock; get: jest.Mock };
  let mockSubscriptionsGateway: { getCurrentSubscription: jest.Mock };

  const baseEvent: PlanwiseDomainEvent = {
    organizationId: "org-1",
    actorId: "actor-1",
    actorName: "Alice",
    entityType: "case",
    entityId: "case-1",
    entityLabel: "Dossier test",
    action: "created",
  };

  beforeEach(async () => {
    mockHttpService = {
      post: jest.fn().mockReturnValue(of({ data: {} })),
      get: jest.fn().mockImplementation((url: string) => {
        if (url.includes("/users")) {
          return of({ data: [{ id: "user-2" }] });
        }
        return of({
          data: {
            preferences: {
              events: {},
              reminderLeadTime: 30,
            },
          },
        });
      }),
    };
    mockSubscriptionsGateway = {
      getCurrentSubscription: jest.fn().mockResolvedValue({ hasAccess: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationEventListener,
        { provide: HttpService, useValue: mockHttpService },
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: mockSubscriptionsGateway,
        },
      ],
    }).compile();

    listener = module.get(NotificationEventListener);
  });

  it("should skip all notifications when organization has no active subscription", async () => {
    mockSubscriptionsGateway.getCurrentSubscription.mockResolvedValue({ hasAccess: false });

    await listener.handleEntityChanged(baseEvent);

    expect(mockSubscriptionsGateway.getCurrentSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1" }),
    );
    expect(mockHttpService.post).not.toHaveBeenCalled();
    expect(mockHttpService.get).not.toHaveBeenCalled();
  });

  it("should send notifications when organization has active subscription", async () => {
    await listener.handleEntityChanged(baseEvent);

    expect(mockSubscriptionsGateway.getCurrentSubscription).toHaveBeenCalled();
    expect(mockHttpService.post).toHaveBeenCalled();
  });
});
