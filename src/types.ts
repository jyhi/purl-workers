/* A Persistent URL (PURL) service running on Cloudflare Workers
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
 * A predicate expression.
 *
 * Basic elements are in `string`s, while function invocations are in arrays of `Expression`s. The
 * first `string` is the name of function, and all the latter are arguments to it.
 */
export type Expression = (string | Expression)[];

/**
 * The Entry Object.
 */
export interface Entry {
  /**
   * A predicate / expression declaring conditions to access the entry.
   */
  if?: Expression;

  /**
   * A branch to take when `{@link if}` evaluates to `true`.
   *
   * Can be a key as an alias or an entry object.
   */
  then?: string | Entry;

  /**
   * A branch to take when `{@link if}` evaluates to `false`.
   *
   * Can be a key as an alias or an entry object.
   */
  else?: string | Entry;

  /**
   * A HTTP status code to use in the response.
   */
  status?: number;

  /**
   * A HTTP reason phrase to use in the response.
   */
  statusText?: string;

  /**
   * An URL to use in the HTTP Location header of the response.
   */
  location?: string;

  /**
   * A MIME type to use in the HTTP Content-Type header of the response.
   */
  contentType?: string;

  /**
   * Whether `{@link content}` should be Base64-decoded before we send it back.
   */
  contentBase64Decode?: boolean;

  /**
   * A payload to be appended to the response.
   */
  content?: string;
}

/**
 * The Metadata Object.
 */
export interface Metadata {
  /**
   * A predicate / expression declaring conditions to access the entry.
   */
  if?: Expression;

  /**
   * A HTTP status code to use in the response.
   */
  status?: number;

  /**
   * A HTTP reason phrase to use in the response.
   */
  statusText?: string;

  /**
   * A MIME type to use in the HTTP Content-Type header of the response.
   */
  contentType?: string;
}
