import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { AuthModule } from "../auth/auth.module";
import { CompaniesModule } from "../companies/companies.module";
import { BackfillService } from "./backfill.service";
import { ImageMirrorService } from "./image-mirror.service";

@Module({
	imports: [AgentModule, CompaniesModule, AuthModule],
	providers: [BackfillService, ImageMirrorService],
	exports: [BackfillService],
})
export class BackfillModule {}
