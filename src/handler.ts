/* A Persistent URL (PURL) service running on Cloudflare Workers
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

import { evaluateExpression } from "./expression";
import type { Entry, Metadata } from "./types";

/**
 * Create a response from the entry, without branching.
 *
 * This function disregards `{@link Entry.if}`, `{@link Entry.then}`, and `{@link Entry.else}` and
 * creates a response from other fields.
 *
 * @param entry The entry object to create a response from.
 */
function respondFromEntry(entry: Entry): Response {
  const content = entry.content
    ? entry.contentBase64Decode
      ? Buffer.from(entry.content, "base64")
      : entry.content
    : null;

  const headers = new Headers();

  if (entry.location) {
    headers.append("location", entry.location);
  }

  if (entry.contentType) {
    headers.append("content-type", entry.contentType);
  }

  return new Response(content, {
    status: entry.status,
    statusText: entry.statusText,
    headers: headers,
  });
}

/**
 * Create a response with the entry, branch and resolve entry objects.
 *
 * This function evaluates `{@link Entry.if}` and respond with different strategies.
 *
 * @param entry The entry object to create a response from.
 * @param request The request received, working as a context.
 */
async function respondWithEntry(
  entry: Entry,
  request: Request
): Promise<Response> {
  const predicate = entry.if ? evaluateExpression(entry.if, request) : true;

  if (predicate) {
    if (entry.then) {
      if (typeof entry.then === "string") {
        return respondWithKey(entry.then, request);
      } else if (typeof entry.then === "object") {
        return respondWithEntry(entry.then, request);
      } else {
        // This should not happen.
        throw null;
      }
    } else {
      return respondFromEntry(entry);
    }
  } else {
    if (entry.else) {
      if (typeof entry.else === "string") {
        return respondWithKey(entry.else, request);
      } else if (typeof entry.else === "object") {
        return respondWithEntry(entry.else, request);
      } else {
        // This should not happen.
        throw null;
      }
    } else {
      return new Response(null, {
        status: 403,
        statusText: "Forbidden",
      });
    }
  }
}

/**
 * Create a response with a string as a key to search from the KV database.
 *
 * - If `kvKey` doesn't exist, 404 will be returned.
 * - If metadata exist, the value will be returned along with the associated data.
 * - If the value can be parsed as a URL, it'll be returned with 302.
 * - If the value can be parsed as a JSON entry object, it'll be parsed and returned.
 * - If none of the above applies, the raw value will be returned.
 *
 * @param kvKey The key to KV database.
 * @param request The request received, working as a context.
 */
async function respondWithKey(
  kvKey: string,
  request: Request
): Promise<Response> {
  const kvEntry = await kv.getWithMetadata(kvKey, "arrayBuffer");

  // The value could be non-existent.
  if (!kvEntry.value) {
    return new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  // Metadata takes precedence.
  if (kvEntry.metadata) {
    const metadata = kvEntry.metadata as Metadata;
    const predicate = metadata.if
      ? evaluateExpression(metadata.if, request)
      : true;

    if (!predicate) {
      return new Response(null, {
        status: 403,
        statusText: "Forbidden",
      });
    }

    return new Response(kvEntry.value, {
      status: metadata.status,
      statusText: metadata.statusText,
      headers: new Headers({
        "content-type": metadata.contentType ?? "application/octet-stream",
      }),
    });
  }

  // Try to parse the value as text, preparing for further processing.
  const textValue = new TextDecoder().decode(kvEntry.value);

  // Try to parse the text value as a URL.
  try {
    return new Response(null, {
      status: 302,
      statusText: "Found",
      headers: new Headers({
        location: new URL(textValue).toString(),
      }),
    });
  } catch {} // eslint-disable-line no-empty

  // Try to parse the text value as a JSON entry object.
  try {
    return respondWithEntry(JSON.parse(textValue) as Entry, request);
  } catch {} // eslint-disable-line no-empty

  // Otherwise, we don't recognize the value. Returning it as a raw value.
  return new Response(kvEntry.value, {
    status: 200,
    statusText: "OK",
    headers: new Headers({
      "content-type": "application/octet-stream",
    }),
  });
}

/**
 * The Cloudflare "fetch" event listener handler.
 *
 * @param request The request received.
 */
export async function handler(request: Request): Promise<Response> {
  return respondWithKey(new URL(request.url).pathname, request);
}
