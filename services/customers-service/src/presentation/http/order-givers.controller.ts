import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { parsePaginationQueryParams } from "@planwise/shared";
import type { CreateOrderGiverBody, UpdateOrderGiverBody } from "@planwise/shared";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractOrderGiversService } from "../../domain/ports/order-givers.service.port";

@Controller("order-givers")
export class OrderGiversController {
  constructor(private readonly orderGiversService: AbstractOrderGiversService) {}

  @Post()
  async createOrderGiver(@Body() body: CreateOrderGiverBody) {
    return this.orderGiversService.createOrderGiver(body);
  }

  @Get()
  async listOrderGivers(
    @Query("organizationId") organizationId: string,
    @Query("search") search?: string,
    @Query("ids") idsCsv?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const ids = idsCsv
      ? idsCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.orderGiversService.listOrderGivers(orgId, {
      search,
      ids: ids?.length ? ids : undefined,
      ...pagination,
    });
  }

  @Get(":id")
  async getOrderGiver(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    return this.orderGiversService.getOrderGiver(id, parseOrganizationIdQuery(organizationId));
  }

  @Patch(":id")
  async updateOrderGiver(@Param("id") id: string, @Body() body: UpdateOrderGiverBody) {
    return this.orderGiversService.updateOrderGiver(id, body);
  }

  @Delete(":id")
  async deleteOrderGiver(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    return this.orderGiversService.deleteOrderGiver(id, parseOrganizationIdQuery(organizationId));
  }
}
