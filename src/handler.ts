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
 *
 */
async function resolve(
  v: KVNamespaceGetWithMetadataResult<ArrayBuffer, unknown>
): Promise<KVNamespaceGetWithMetadataResult<ArrayBuffer, unknown>> {
  if (!v.value) {
    return v;
  }

  let vParsed;
  try {
    vParsed = JSON.parse(new TextDecoder().decode(v.value)) as Entry;
  } catch {
    vParsed = null;
  }

  if (!vParsed || !vParsed.is) {
    return v;
  }

  return resolve(await kv.getWithMetadata(vParsed.is, "arrayBuffer"));
}

/**
 *
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

  if (text === "") {
    return new Response(null, {
      status: 204,
      statusText: "No Content",
    });
  }

  let url;
  try {
    url = new URL(text);
  } catch {
    url = null;
  }

  if (url) {
    return new Response(null, {
      status: 302,
      statusText: "Found",
      headers: new Headers({
        location: url.toString(),
      }),
    });
  }

  let entry;
  try {
    entry = JSON.parse(text) as Entry;
  } catch {
    entry = null;
  }

  if (!entry) {
    return new Response(v.value, {
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "content-type": "application/octet-stream",
      }),
    });
  }

  if (Object.keys(entry).length === 0) {
    return new Response(null, {
      status: 204,
      statusText: "No Content",
    });
  }

  const content = entry.content
    ? entry.contentBase64Decode
      ? atob(entry.content)
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
