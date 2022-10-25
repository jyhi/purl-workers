/* PURL-Workers: A Persistent URL (PURL) service running on Cloudflare Workers.
 * Copyright (C) 2021-2022 Junde Yhi <junde@yhi.moe>
 *
 * Type definitions.
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

/**
 * A type to define bindings assigned.
 */
export interface Environment {
  /** The binding of Workers KV. */
  kv?: KVNamespace;

  /** Other bindings may be configured and present or not. */
  [x: symbol | string]: unknown;
}

/**
 * A responder accepts the request and asynchronously produces a response.
 *
 * The parameters are the same for the fetch handler in the module worker
 * syntax. See: <https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-module-worker>.
 */
export type Responder = (
  req: Request,
  env: Environment,
  ctx: ExecutionContext
) => Promise<Response>;

/**
 * Different types of data that can be an entry.
 */
export type Entry = Responder | ResponseInit | string;

/**
 * A record (dictionary) of {@link Entry}.
 *
 * Used in the hard-coded entry list in the configuration file.
 */
export type Entries = Record<string | number | symbol, Entry>;

/**
 * PURL-Workers configuration options.
 */
export interface Config {
  /**
   * The status code to use when returning a temporary redirect.
   *
   * The default is 302.
   */
  temporaryRedirect?: number;

  /**
   * The status code to use when returning a permanent redirect.
   *
   * The default is 301.
   */
  permanentRedirect?: number;
}
