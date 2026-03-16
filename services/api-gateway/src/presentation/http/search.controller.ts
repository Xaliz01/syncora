import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { AbstractSearchService } from "../../domain/ports/search.service.port";
import type { AuthUser } from "@syncora/shared";

@Controller("search")
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: AbstractSearchService) {}

  @Get()
  async search(
    @CurrentUser() user: AuthUser,
    @Query("q") query?: string
  ) {
    return this.searchService.search(user, query ?? "");
  }
}
