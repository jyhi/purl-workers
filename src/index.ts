// A Persistent URL (PURL) service running on Cloudflare Workers
// Copyright (C) 2021 Junde Yhi <junde@yhi.moe>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

declare const KV_PURL: KVNamespace;

type Entry = {
  status?: number;
  statusText?: string;
  location?: string;
};

type Metadata = {
  contentType?: string;
};

const handler = async (request: Request): Promise<Response> => {
  const urlIn = new URL(request.url);
  const value = await KV_PURL.getWithMetadata(urlIn.pathname, "arrayBuffer");

  const entry = value.value;
  const metadata: Metadata | null = value.metadata as Metadata;

  if (!entry) {
    return new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  if (metadata) {
    return new Response(entry, {
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "Content-Type": metadata.contentType ?? "application/octet-stream",
      }),
    });
  }

  const decoder = new TextDecoder();
  const entryText = decoder.decode(entry);

  let entryObject: Entry | null;
  try {
    entryObject = JSON.parse(entryText);
  } catch {
    entryObject = null;
  }

  if (!entryObject) {
    let urlOut: URL | null;
    try {
      urlOut = new URL(entryText);
    } catch {
      urlOut = null;
    }

    if (urlOut) {
      return new Response(null, {
        status: 302,
        statusText: "Found",
        headers: new Headers({
          Location: urlOut.toString(),
        }),
      });
    } else {
      return new Response(entry, {
        status: 200,
        statusText: "OK",
        headers: new Headers({
          "Content-Type": "application/octet-stream",
        }),
      });
    }
  }

  if (!entryObject.status) {
    return new Response(null, {
      status: 204,
      statusText: "No Content",
    });
  }

  const headers = new Headers();

  if (entryObject.location) {
    headers.append("Location", entryObject.location);
  }

  return new Response(null, {
    status: entryObject.status,
    statusText: entryObject.statusText,
    headers: headers,
  });
};

addEventListener("fetch", (event) => {
  event.respondWith(handler(event.request));
});
