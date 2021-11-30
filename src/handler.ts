/* A Persistent URL (PURL) service running on Cloudflare Workers
 * Copyright (C) 2021 Junde Yhi <junde@yhi.moe>
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

import type { Entry, Metadata } from "./types";

/**
 * An Entry Object alias resolver.
 *
 * This function uses the {@link Entry.is} key in {@link v} to recursively
 * search for an entry without it and returns it.
 *
 * @param v A result from Cloudflare KV's `getWithMetadata`.
 * @returns A result from Cloudflare KV's `getWithMetadata` (but is guaranteed
 * not to be an alias (without an {@link Entry.is} key)).
 */
async function resolve(
  v: KVNamespaceGetWithMetadataResult<ArrayBuffer, unknown>
): Promise<KVNamespaceGetWithMetadataResult<ArrayBuffer, unknown>> {
  if (!v.value) {
    return v;
  }

  const vParsed = (() => {
    try {
      return JSON.parse(new TextDecoder().decode(v.value)) as Entry;
    } catch {
      return undefined;
    }
  })();

  if (!vParsed || !vParsed.is) {
    return v;
  }

  return resolve(await kv.getWithMetadata(vParsed.is, "arrayBuffer"));
}

/**
 * The handler function receiving requests from Workers producing responses.
 */
export async function handler(request: Request): Promise<Response> {
  const k = new URL(request.url).pathname;
  const v = await resolve(await kv.getWithMetadata(k, "arrayBuffer"));

  if (!v.value) {
    return new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  if (v.metadata) {
    const metadata = v.metadata as Metadata;

    return new Response(v.value, {
      status: metadata.status,
      statusText: metadata.statusText,
      headers: new Headers({
        "content-type": metadata.contentType ?? "application/octet-stream",
      }),
    });
  }

  const text = new TextDecoder().decode(v.value);

  const url = (() => {
    try {
      return new URL(text);
    } catch {
      return undefined;
    }
  })();

  if (url) {
    return new Response(null, {
      status: 302,
      statusText: "Found",
      headers: new Headers({
        location: url.toString(),
      }),
    });
  }

  const entry = (() => {
    try {
      return JSON.parse(text) as Entry;
    } catch {
      return undefined;
    }
  })();

  if (!entry) {
    return new Response(v.value, {
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "content-type": "application/octet-stream",
      }),
    });
  }

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
