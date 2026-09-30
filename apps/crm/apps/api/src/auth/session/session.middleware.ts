import { sessionFromHeaders } from "@crm/auth";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Response } from "express";
import type { RequestWithSession } from "./session.types";

/** Resolves and attaches `request.session` before SessionGuard (or any handler) runs. */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
	async use(request: RequestWithSession, _response: Response, next: NextFunction): Promise<void> {
		request.session = await sessionFromHeaders(request.headers);
		next();
	}
}
