import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { tap } from "rxjs";
import type { JwtPayload, NotificationAction } from "@syncora/shared";
import { NOTIFY_ENTITY_KEY, type NotifyEntityMetadata } from "./notify-entity.decorator";

export interface SyncoraDomainEvent {
  organizationId: string;
  actorId: string;
  actorName?: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  action: NotificationAction;
}

const METHOD_ACTION_MAP: Record<string, NotificationAction> = {
  POST: "created",
  PUT: "updated",
  PATCH: "updated",
  DELETE: "deleted"
};

@Injectable()
export class NotifyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly eventEmitter: EventEmitter2
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const meta = this.reflector.get<NotifyEntityMetadata | undefined>(
      NOTIFY_ENTITY_KEY,
      context.getHandler()
    );
    if (!meta) return next.handle();

    const request = context.switchToHttp().getRequest<{
      user?: JwtPayload;
      method: string;
      params: Record<string, string>;
    }>();
    const jwt = request.user;
    if (!jwt) return next.handle();

    const action = meta.action ?? METHOD_ACTION_MAP[request.method] ?? "updated";

    return next.handle().pipe(
      tap((responseBody) => {
        const entityId =
          (responseBody as Record<string, unknown>)?.id as string | undefined ??
          (meta.idParam ? request.params[meta.idParam] : undefined);

        if (!entityId) return;

        const labelField = meta.labelField;
        const entityLabel = labelField
          ? ((responseBody as Record<string, unknown>)?.[labelField] as string | undefined)
          : undefined;

        const event: SyncoraDomainEvent = {
          organizationId: jwt.organizationId,
          actorId: jwt.sub,
          actorName: jwt.name ?? jwt.email,
          entityType: meta.type,
          entityId,
          entityLabel,
          action
        };

        this.eventEmitter.emit("syncora.entity.changed", event);
      })
    );
  }
}
