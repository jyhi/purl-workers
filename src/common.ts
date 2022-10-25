/* PURL-Workers: A Persistent URL (PURL) service running on Cloudflare Workers.
 * Copyright (C) 2022 Junde Yhi <junde@yhi.moe>
 *
 * Commonly used utility functions.
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
 * Type predicate to tell if a variable is `undefined` or `null`.
 */
export function isUndef(x: unknown): x is undefined | null {
  return x === undefined || x === null;
}

/**
 * Type predicate to tell if a variable is not `undefined` nor `null`.
 */
export function isDef<T>(x: T): x is NonNullable<T> {
  return !isUndef(x);
}

/**
 * Type predicate to tell if a variable is an _object_ (`{}`) or not.
 */
export function isObject(x: unknown): x is NonNullable<object> {
  return isDef(x) && x.constructor === Object;
}
