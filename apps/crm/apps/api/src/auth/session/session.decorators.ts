import { createParamDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common";
import type { RequestWithSession } from "./session.types";

export const ALLOW_ANONYMOUS_KEY = "session:allowAnonymous";
export const OPTIONAL_AUTH_KEY = "session:optionalAuth";

/** Exempts a route/controller from the global SessionGuard entirely. */
export const AllowAnonymous = () => SetMetadata(ALLOW_ANONYMOUS_KEY, true);

/** Lets a route/controller proceed even without a session. */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);

/** Parameter decorator: the resolved session, or null when OptionalAuth let an anonymous request through. */
export const Session = createParamDecorator((_data: unknown, context: ExecutionContext) => {
	const request = context.switchToHttp().getRequest<RequestWithSession>();
	return request.session ?? null;
});
