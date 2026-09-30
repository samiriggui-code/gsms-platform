import type { IncomingMessage } from "node:http";
import {
	BadRequestException,
	Controller,
	Headers,
	HttpCode,
	Ip,
	Post,
	Req,
	UseGuards,
} from "@nestjs/common";
import {
	ApiHeader,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
	ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";
import { AllowAnonymous } from "../auth/session";
import { PublicApiKeyGuard } from "./public-api-key.guard";
import { PUBLIC_API_KEY_HEADER } from "./public.constants";
import { PublicIntakeService } from "./public-intake.service";
import {
	auditRequestBodySchema,
	contactRequestBodySchema,
	tenderRequestBodySchema,
} from "./public.schemas";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) {
		chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
	}
	const raw = Buffer.concat(chunks).toString("utf8").trim();
	if (!raw) return undefined;
	try {
		return JSON.parse(raw) as unknown;
	} catch {
		throw new BadRequestException("Invalid JSON body");
	}
}

@ApiTags("Public")
@Controller("api/public")
@UseGuards(PublicApiKeyGuard)
export class PublicController {
	constructor(private readonly intake: PublicIntakeService) {}

	@Post("tender-request")
	@AllowAnonymous()
	@HttpCode(200)
	@ApiOperation({
		summary: "GSMS Public AO intake → Company + Contact + Deal (+ Eve)",
	})
	@ApiHeader({ name: PUBLIC_API_KEY_HEADER, required: true })
	@ApiOkResponse({ description: "Deal id (created or idempotent replay)" })
	@ApiUnauthorizedResponse({ description: "Missing/invalid public API key" })
	async tenderRequest(
		@Req() req: Request,
		@Ip() ip: string,
		@Headers("x-forwarded-for") forwarded: string | undefined,
	) {
		// Nest bodyParser is disabled globally — read the stream ourselves.
		const raw = await readJsonBody(req);
		const parsed = tenderRequestBodySchema.safeParse(raw);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.flatten());
		}

		const bucket =
			forwarded?.split(",")[0]?.trim() ||
			ip ||
			req.socket.remoteAddress ||
			"unknown";

		return this.intake.tenderRequest(parsed.data, `tender:${bucket}`);
	}

	@Post("audit-request")
	@AllowAnonymous()
	@HttpCode(200)
	@ApiOperation({
		summary: "GSMS Public audit intake → Company + Contact + Deal (+ Eve)",
	})
	@ApiHeader({ name: PUBLIC_API_KEY_HEADER, required: true })
	@ApiOkResponse({ description: "Deal id (created or idempotent replay)" })
	@ApiUnauthorizedResponse({ description: "Missing/invalid public API key" })
	async auditRequest(
		@Req() req: Request,
		@Ip() ip: string,
		@Headers("x-forwarded-for") forwarded: string | undefined,
	) {
		const raw = await readJsonBody(req);
		const parsed = auditRequestBodySchema.safeParse(raw);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.flatten());
		}

		const bucket =
			forwarded?.split(",")[0]?.trim() ||
			ip ||
			req.socket.remoteAddress ||
			"unknown";

		return this.intake.auditRequest(parsed.data, `audit:${bucket}`);
	}

	@Post("contact")
	@AllowAnonymous()
	@HttpCode(200)
	@ApiOperation({
		summary: "GSMS Public contact form → Contact + Activity (+ Eve)",
	})
	@ApiHeader({ name: PUBLIC_API_KEY_HEADER, required: true })
	@ApiOkResponse({ description: "Activity id (created or idempotent replay)" })
	@ApiUnauthorizedResponse({ description: "Missing/invalid public API key" })
	async contactRequest(
		@Req() req: Request,
		@Ip() ip: string,
		@Headers("x-forwarded-for") forwarded: string | undefined,
	) {
		const raw = await readJsonBody(req);
		const parsed = contactRequestBodySchema.safeParse(raw);
		if (!parsed.success) {
			throw new BadRequestException(parsed.error.flatten());
		}

		const bucket =
			forwarded?.split(",")[0]?.trim() ||
			ip ||
			req.socket.remoteAddress ||
			"unknown";

		return this.intake.contactRequest(parsed.data, `contact:${bucket}`);
	}
}
