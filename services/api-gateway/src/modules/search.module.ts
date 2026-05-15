import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { SearchController } from "../presentation/http/search.controller";
import { AbstractSearchService } from "../domain/ports/search.service.port";
import { SearchGatewayService } from "../domain/search.service";

@Module({
  imports: [HttpModule.register({ timeout: 10000, maxRedirects: 0 })],
  controllers: [SearchController],
  providers: [{ provide: AbstractSearchService, useClass: SearchGatewayService }],
})
export class SearchModule {}
