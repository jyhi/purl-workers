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

function respondFromResponseInit(
  init: ResponseInit,
  body?: BodyInit | undefined | null
): Response {
  return new Response(body, init);
}

async function respondFromString(
  str: string,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Promise<Response> {
  try {
    const url = new URL(str);
    return new Response(undefined, {
      status: config.temporaryRedirect ?? 302,
      headers: {
        location: url.toString(),
      },
    });
  } catch {} // eslint-disable-line no-empty

  if (str[0] === "!") {
    try {
      const url = new URL(str.slice(1));
      return new Response(undefined, {
        status: config.permanentRedirect ?? 301,
        headers: {
          location: url.toString(),
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
    // Yes, we are returning an async function...
    // eslint-disable-next-line @typescript-eslint/require-await
    return async () => respondFromResponseInit(x, body);
  }

  if (typeof x === "string") {
    return async () => await respondFromString(x, req, env, ctx);
  }

  // Yes, we are returning an async function...
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

function getResponderFromKVResult(
  kvResult: KVNamespaceGetWithMetadataResult<ArrayBuffer, unknown>,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Responder {
  if (isDef(kvResult.metadata)) {
    return getResponderFromUnknown(
      kvResult.metadata,
      isDef(kvResult.value) ? kvResult.value : undefined,
      req,
      env,
      ctx
    );
  }

  if (isUndef(kvResult.value)) {
    // Yes, we are returning an async function...
    // eslint-disable-next-line @typescript-eslint/require-await
    return async () =>
      respondFromResponseInit({
        status: 404,
      });
  }

  let entryFromKVValue: unknown = undefined;

  try {
    entryFromKVValue = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: false,
    }).decode(kvResult.value);

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

async function findResponder(
  name: string,
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Promise<Responder | undefined> {
  const entryFromConfig = entriesFromConfig[name];
  if (isDef(entryFromConfig)) {
    return getResponderFromUnknown(entryFromConfig, undefined, req, env, ctx);
  }

  const kvResult = await env?.kv?.getWithMetadata(name, "arrayBuffer");
  if (isDef(kvResult) && (isDef(kvResult.metadata) || isDef(kvResult.value))) {
    const responder = getResponderFromKVResult(kvResult, req, env, ctx);
    if (isDef(responder)) {
      return responder;
    }
  }

  return undefined;
}

async function respond(
  req: Request,
  env: Environment,
  ctx: ExecutionContext
): Promise<Response> {
  const name = new URL(req.url).pathname;
  const responder = await findResponder(name, req, env, ctx);

  if (isUndef(responder)) {
    return new Response(null, {
      status: 404,
    });
  }

  return responder(req, env, ctx);
}

export const fetchHandler = respond;
