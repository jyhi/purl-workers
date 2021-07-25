// A (very simple) Persistent URL (PURL) service running on Cloudflare Workers
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

type InfoObject = {
  status?: number;
  statusText?: string;
  location?: string;
  content?: string;
  contentType?: string;
  contentKey?: string;
};

const handler = async (request: Request): Promise<Response> => {
  const urlIn = new URL(request.url);
  const value: string | null = await KV_PURL.get(urlIn.pathname);

  if (!value) {
    return new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  let obj: InfoObject;
  try {
    obj = JSON.parse(value);
  } catch {
    return new Response(value, {
      status: 200,
      statusText: "OK",
      headers: new Headers({
        "Content-Type": "text/plain; charset=utf-8",
      }),
    });
  }

  if (!obj.status) {
    return new Response(null, {
      status: 204,
      statusText: "No Content",
    });
  }

  const headers = new Headers();
  if (obj.location) {
    headers.append("Location", obj.location);
  }
  if (obj.contentType) {
    headers.append("Content-Type", obj.contentType);
  }

  let content: ArrayBuffer | string | null | undefined = null;
  if (obj.contentKey) {
    content = await KV_PURL.get(obj.contentKey, "arrayBuffer");
  } else {
    content = obj.content;
  }

  return new Response(content, {
    status: obj.status,
    statusText: obj.statusText,
    headers: headers,
  });
};

addEventListener("fetch", (event) => {
  event.respondWith(handler(event.request));
});
