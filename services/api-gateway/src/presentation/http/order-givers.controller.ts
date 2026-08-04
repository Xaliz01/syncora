import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AbstractOrderGiversGatewayService } from "../../domain/ports/order-givers.service.port";
import type {
  CreateOrderGiverForOrgBody,
  UpdateOrderGiverForOrgBody,
} from "../../domain/ports/order-givers.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import { parsePaginationQueryParams } from "@planwise/shared";
import type { AuthUser } from "@planwise/shared";

@Controller("order-givers")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class OrderGiversController {
  constructor(private readonly orderGiversService: AbstractOrderGiversGatewayService) {}

  @Post()
  @RequirePermissions("order_givers.create")
  @NotifyEntity({ type: "order_giver", labelField: "displayName" })
  async createOrderGiver(@CurrentUser() user: AuthUser, @Body() body: CreateOrderGiverForOrgBody) {
    return this.orderGiversService.createOrderGiver(user, body);
  }

  @Get()
  @RequirePermissions("order_givers.read")
  async listOrderGivers(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.orderGiversService.listOrderGivers(user, { search, ...pagination });
  }

  @Get(":orderGiverId")
  @RequirePermissions("order_givers.read")
  async getOrderGiver(@CurrentUser() user: AuthUser, @Param("orderGiverId") orderGiverId: string) {
    return this.orderGiversService.getOrderGiver(user, orderGiverId);
  }

  @Patch(":orderGiverId")
  @RequirePermissions("order_givers.update")
  @NotifyEntity({ type: "order_giver", labelField: "displayName" })
  async updateOrderGiver(
    @CurrentUser() user: AuthUser,
    @Param("orderGiverId") orderGiverId: string,
    @Body() body: UpdateOrderGiverForOrgBody,
  ) {
    return this.orderGiversService.updateOrderGiver(user, orderGiverId, body);
  }

  @Delete(":orderGiverId")
  @RequirePermissions("order_givers.delete")
  @NotifyEntity({ type: "order_giver", idParam: "orderGiverId" })
  async deleteOrderGiver(
    @CurrentUser() user: AuthUser,
    @Param("orderGiverId") orderGiverId: string,
  ) {
    return this.orderGiversService.deleteOrderGiver(user, orderGiverId);
  }
}
