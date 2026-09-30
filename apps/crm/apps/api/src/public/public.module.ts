import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { PublicApiKeyGuard } from "./public-api-key.guard";
import { PublicController } from "./public.controller";
import { PublicIntakeService } from "./public-intake.service";

@Module({
	imports: [AgentModule],
	controllers: [PublicController],
	providers: [PublicIntakeService, PublicApiKeyGuard],
	exports: [PublicIntakeService],
})
export class PublicModule {}
