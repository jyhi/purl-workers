/* PURL-Workers: A Persistent URL (PURL) service running on Cloudflare Workers.
 * Copyright (C) 2021-2022 Junde Yhi <junde@yhi.moe>
 *
 * The handler processing requests and producing responses.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { isDef, isObject, isUndef } from "./common";
import { Environment, Responder } from "./types";
import { config, entries as entriesFromConfig } from "../purl-workers.config";

/**
 * A {@link Responder} function accepting a {@link ResponseInit} object and
 * return a {@link Response}.
 *
 * This function is automatically used upon an object in an entry.
 *
 * @param init The `{@link ResponseInit}` object.
 * @param body A value that should be returned in the body as a payload.
 * @returns A {@link Response}.
 */
function respondFromResponseInit(
  init: ResponseInit,
  body?: BodyInit | undefined | null
): Response {
  return new Response(body, init);
}

/**
 * A {@link Responder} function accepting a string and return a {@link Response}.
 *
 * This function is automatically used upon a string shortcut in an entry.
 *
 * @param str A string. The function tries to parse it and create a response
 *            from it.
 * @param req The incoming request.
 * @param env The environment object containing worker bindings.
 * @param ctx An object containing Workers platform related operations.
 * @returns A promise of {@link Response}.
 */
async function respondFromString(
  str: string,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const url = new URL(str);
    return new Response(null, {
      status: config.temporaryRedirect ?? 302,
      headers: {
        Location: url.toString(),
      },
    });
  } catch {} // eslint-disable-line no-empty

  if (str[0] === "!") {
    try {
      const url = new URL(str.slice(1));
      return new Response(null, {
        status: config.permanentRedirect ?? 301,
        headers: {
          Location: url.toString(),
        },
      });
    } catch {} // eslint-disable-line no-empty
  }

  const aliasResponder = await findResponder(str, req, env, ctx);
  if (isDef(aliasResponder)) {
    return await aliasResponder(req, env, ctx);
  }

  return new Response(str, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}

/**
 * Construct a {@link Responder} function from a value.
 *
 * @param x A value. The function type checks it and decide on how to wrap it
 *          into a {@link Responder} function.
 * @param body A value that should be returned in the body as a payload.
 * @param req The incoming request.
 * @param env The environment object containing worker bindings.
 * @param ctx An object containing Workers platform related operations.
 * @returns A {@link Responder} function.
 */
function getResponderFromUnknown(
  x: unknown,
  body: ArrayBuffer | undefined | null,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Responder {
  if (typeof x === "function") {
    return <Responder>x;
  }

  if (isObject(x)) {
    // respondFromResponseInit() is indeed synchronous, sorry.
    // eslint-disable-next-line @typescript-eslint/require-await
    return async () => respondFromResponseInit(x, body);
  }

  if (typeof x === "string") {
    return async () => await respondFromString(x, req, env, ctx);
  }

  // respondFromResponseInit() is indeed synchronous, sorry.
  // eslint-disable-next-line @typescript-eslint/require-await
  return async () =>
    respondFromResponseInit(
      {
        headers: {
          "Content-Type": "application/octet-stream",
        },
      },
      body
    );
}

/**
 * Look for a responder from a KV entry (that has already been fetched).
 *
 * @param kvResult The result of getting from Workers KV.
 * @param req The incoming request.
 * @param env The environment object containing worker bindings.
 * @param ctx An object containing Workers platform related operations.
 * @returns A {@link Responder} function.
 */
function getResponderFromKVResult(
  kvResult: KVNamespaceGetWithMetadataResult<ArrayBuffer, unknown>,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Responder {
  if (isDef(kvResult.metadata)) {
    return getResponderFromUnknown(
      kvResult.metadata,
      kvResult.value,
      req,
      env,
      ctx
    );
  }

  if (isUndef(kvResult.value)) {
    // respondFromResponseInit() is indeed synchronous, sorry.
    // eslint-disable-next-line @typescript-eslint/require-await
    return async () =>
      respondFromResponseInit({
        status: 404,
      });
  }

  let entryFromKVValue: unknown = undefined;

  // The try block below tries to parse the value from KV as either text or
  // object. In any case, they'll be handled by getResponderFromUnknown().

  try {
    // First try decoding the value as text.
    entryFromKVValue = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: false,
    }).decode(kvResult.value);

    // Then try parsing the text as an object in JSON.
    entryFromKVValue = JSON.parse(<string>entryFromKVValue);
  } catch {} // eslint-disable-line no-empty

  return getResponderFromUnknown(
    entryFromKVValue,
    isUndef(entryFromKVValue) ? kvResult.value : undefined,
    req,
    env,
    ctx
  );
}

/**
 * Look for a responder.
 *
 * @param name The (key) name used to look for a responder.
 * @param req The incoming request.
 * @param env The environment object containing worker bindings.
 * @param ctx An object containing Workers platform related operations.
 * @returns A promise. If found, it's a {@link Responder} function. If not
 *          found, it's `undefined`.
 */
async function findResponder(
  name: string,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Promise<Responder | undefined> {
  // Look for a responder from the configuration file.
  const entryFromConfig = entriesFromConfig[name];
  if (isDef(entryFromConfig)) {
    return getResponderFromUnknown(entryFromConfig, undefined, req, env, ctx);
  }

  // Look for a responder from the Workers KV.
  const kvResult = await env.kv?.getWithMetadata(name, "arrayBuffer");
  if (isDef(kvResult) && (isDef(kvResult.metadata) || isDef(kvResult.value))) {
    const responder = getResponderFromKVResult(kvResult, req, env, ctx);
    if (isDef(responder)) {
      return responder;
    }
  }

  // Nothing is found.
  return undefined;
}

/**
 * The main responder function.
 *
 * @param req The incoming request.
 * @param env The environment object containing worker bindings.
 * @param ctx An object containing Workers platform related operations.
 * @returns A promise of {@link Response}.
 */
async function respond(
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Promise<Response> {
  const name = new URL(req.url).pathname;
  const responder = await findResponder(name, req, env, ctx);

  if (isUndef(responder)) {
    return new Response(null, { status: 404 });
  }

  return responder(req, env, ctx);
}

/**
 * The `fetch` handler for registering with Cloudflare Workers in the Module
 * Workers syntax.
 *
 * It's just an alias of `respond`, because we also define a responder function
 * to be in the exact shape of the `fetch` handler, and we don't want to call
 * _the_ handler recursively (which looks like calling the `main` function
 * recursively in C).
 */
export const fetchHandler = respond;
