import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { AuthController } from "../presentation/http/auth.controller";
import { AuthService } from "../domain/auth.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: 5000, maxRedirects: 0 }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "syncora-dev-secret-change-in-production",
      signOptions: { expiresIn: "7d" }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
