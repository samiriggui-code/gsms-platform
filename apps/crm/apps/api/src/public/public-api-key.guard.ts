import {
	CanActivate,
	ExecutionContext,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { EnvironmentVariables } from "../config/env.validation";
import { PUBLIC_API_KEY_HEADER } from "./public.constants";

@Injectable()
export class PublicApiKeyGuard implements CanActivate {
	constructor(
		private readonly config: ConfigService<EnvironmentVariables, true>,
	) {}

	canActivate(context: ExecutionContext): boolean {
		const expected = this.config.get("GSMS_PUBLIC_API_KEY", { infer: true });
		if (!expected) {
			throw new ServiceUnavailableException(
				"Public adapters disabled — set GSMS_PUBLIC_API_KEY",
			);
		}

		const req = context.switchToHttp().getRequest<Request>();
		const header = req.header(PUBLIC_API_KEY_HEADER);
		const bearer = req.header("authorization");
		const token =
			header?.trim() ||
			(bearer?.toLowerCase().startsWith("bearer ")
				? bearer.slice(7).trim()
				: undefined);

		if (!token || token !== expected) {
			throw new UnauthorizedException("Invalid public API key");
		}

		return true;
	}
}
