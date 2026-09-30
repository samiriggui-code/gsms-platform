import type { Session } from "@crm/auth";
import type { Request } from "express";

export type RequestWithSession = Request & { session?: Session | null };
