import { Global, type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { SessionGuard } from "./session.guard";
import { SessionMiddleware } from "./session.middleware";

/** Replaces `BetterAuthModule.forRoot(...)`: attaches `request.session`, guards every route by default. */
@Global()
@Module({
	providers: [{ provide: APP_GUARD, useClass: SessionGuard }],
})
export class SessionModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(SessionMiddleware).forRoutes("*");
	}
}
