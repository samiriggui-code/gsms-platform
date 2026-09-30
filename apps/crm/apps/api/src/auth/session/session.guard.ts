import {
	type CanActivate,
	type ExecutionContext,
	Injectable,
	UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ALLOW_ANONYMOUS_KEY, OPTIONAL_AUTH_KEY } from "./session.decorators";
import type { RequestWithSession } from "./session.types";

/** Replaces `@thallesp/nestjs-better-auth`'s AuthGuard: same AllowAnonymous/OptionalAuth semantics. */
@Injectable()
export class SessionGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		if (context.getType() !== "http") return true;

		const targets = [context.getHandler(), context.getClass()];

		if (this.reflector.getAllAndOverride<boolean>(ALLOW_ANONYMOUS_KEY, targets)) {
			return true;
		}

		const request = context.switchToHttp().getRequest<RequestWithSession>();

		if (request.session?.user) return true;

		if (this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, targets)) {
			return true;
		}

		throw new UnauthorizedException("No valid session.");
	}
}
