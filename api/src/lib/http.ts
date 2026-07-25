import { zValidator } from "@hono/zod-validator";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ZodType } from "zod";
import type { ApiError } from "../types.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Throw an `{ error }` JSON response from anywhere in a handler. */
export function fail(status: 400 | 401 | 403 | 404 | 409 | 500 | 501, message: string): never {
  const body: ApiError = { error: message };
  throw new HTTPException(status, { res: Response.json(body, { status }) });
}

export function requireUuid(value: string | undefined, label: string): string {
  if (!value || !UUID_RE.test(value)) fail(400, `${label} must be a UUID`);
  return value;
}

const formatIssues = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
  error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .join("; ");

/** zod-validated JSON body; 400 with the `{ error }` shape on failure. */
export const jsonBody = <T extends ZodType>(schema: T) =>
  zValidator("json", schema, (result, c: Context) => {
    if (!result.success) {
      return c.json<ApiError>({ error: `Invalid request body — ${formatIssues(result.error)}` }, 400);
    }
    return undefined;
  });

/** zod-validated query string; 400 with the `{ error }` shape on failure. */
export const queryParams = <T extends ZodType>(schema: T) =>
  zValidator("query", schema, (result, c: Context) => {
    if (!result.success) {
      return c.json<ApiError>({ error: `Invalid query — ${formatIssues(result.error)}` }, 400);
    }
    return undefined;
  });
