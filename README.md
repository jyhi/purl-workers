# PURL Service Running on Cloudflare Workers

A [Persistent URL][purl] (or a URL shortening) service running on [Cloudflare Workers][cfwkrs], plus a few bells and whistles.

[![Deploy with Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lmy441900/purl-workers)

## Deploy

Assuming [Cloudflare][cf] experience:

1. Go to Worker \> KV and create a KV database. It can be arbitrarily named.
2. Install [Wrangler]. Log in with `wrangler login`.
3. Configure a worker in `wrangler.toml` by filling the private options.
4. `wrangler publish`.

## Use

At present there's no direct support for updating the database; one needs to manually edit entries via either [Wrangler], the Web interface, or the API.

Upon an incoming HTTP request, the URL path will be used as a key to find an entry in the associated Workers KV. The value can be:

- An [entry object](#the-entry-object).
- An URL; this will be returned in a `Location` header with HTTP `302 Found`.
- Any arbitrary content; this will be returned with configurations from the associated [metadata object](#the-metadata-object).

### Examples

Using [Wrangler]:

- To create a (temporal) redirection from `/foo`:

```shell
wrangler kv:key put --binding kv '/foo' 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
```

- To create a permanent redirection instead:

```shell
wrangler kv:key put --binding kv \
  '/foo' '{"status": 308, "location": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

- To place a PDF file at `/test.pdf`, with the correct content type:

```shell
wrangler kv:key put --binding kv \
  --metadata '{"contentType": "application/pdf"}' \
  --path '/test.pdf' path/to/pdf/file
```

## The Entry Object

The entry object is represented in JSON, with the following shape:

```json
{
  "is": "<key>",
  "status": 204,
  "statusText": "<reason phrase>",
  "location": "http://www.example.com",
  "auth": "Basic cHVybDp3b3JrZXI=",
  "contentType": "application/x-example",
  "contentBase64Decode": false,
  "content": "Lorem ipsum dolor sit amet..."
}
```

Every field is optional. If `"is"` is present, it will be used to resolve [alias](#alias) regardless of other fields. Note that if a [metadata object](#the-metadata-object) is associated to the value, then it always takes precedence, creating a direct return, regardless of what is specified in the value.

### Alias

`"is"` creates an alias from the current key to a specified key. For example, the following object creates an alias to `/foo`:

```json
{
  "is": "/foo"
}
```

Chained aliases are resolved recursively, until an entry object without `"is"` or a non-entry-object is found. It is therefore very easy to create an endless loop; pay attention not to create one!

### Redirection

Specify a 3xx (redirection) HTTP status code with `"status"` to create a redirection. For example, the following object creates a temporary redirection using `HTTP 307`:

```json
{
  "status": 307,
  "statusText": "Temporary Redirect",
  "location": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

`"statusText"` and `"location"` are optional. However, returning a 3xx (redirection) status code without a `"location"` can confuse the client.

As a shortcut, for a simple `302 Found`, one can simply put the location (target) URL in the value; see [Examples](#examples).

### Direct Return

Use `"content"` to insert a payload into the response. Meanwhile, use a non-3xx (non-redirection) `"status"` to make the payload meaningful. As `"content"` can only be a text string, for binary payloads, a Base64-encoded string can be used along with `"contentBase64Decode"` set to `true`, telling purl-workers to first decode it. For example, the following object creates a HTTP 402 Payment Required response with a Base64-encoded plain-text payload:

```json
{
  "status": 402,
  "statusText": "Payment Required",
  "contentType": "text/plain; charset=utf-8",
  "contentBase64Decode": true,
  "content": "TW9uZXkgbW9uZXkgbW9uZXkuLi4="
}
```

As a shortcut, for a simple `200 OK` with an arbitrary payload, one can simply put the payload in binary into a value and make use of the metadata functionality of Workers KV; see [The Metadata Object](#the-metadata-object) for what can be put into the metadata object.

### Authorization

Use `"auth"` to make an entry private, requiring an `Authorization:` HTTP header to view. `"auth"` accepts either a string or an array of string. The strings should be the exact value of the HTTP `Authorization:` header. For example, a `Basic` authorization with user name `purl` and password `workers` would require:

```json
{
  "auth": "Basic cHVybDp3b3JrZXJz"
}
```

Multiple authorization options can be put into an array:

```json
{
  "auth": [
    "Basic cHVybDp3b3JrZXJz",
    "Bearer 158ea011-a482-48e7-bb6e-8bb292717382"
  ]
}
```

This can also be put in [The Metadata Object](#the-metadata-object); see below.

## The Metadata Object

Metadata is a functionality offered by Workers KV, allowing an arbitrary JSON object be associated with a KV entry. The metadata object that purl-workers recognizes has the following shape:

```json
{
  "status": 123,
  "statusText": "<reason phrase>",
  "contentType": "application/x-example",
  "auth": "Basic cHVybDp3b3JrZXI="
}
```

Every field is optional. An empty metadata object (`{}`) will result in the following default settings:

```json
{
  "status": 200,
  "statusText": "OK",
  "contentType": "application/octet-stream"
}
```

`"auth"` will be `undefined`, meaning no authorization. Most often, only `"contentType"` needs to be specified:

```json
{
  "contentType": "image/jpeg"
}
```

The association of metadata object is also optional. If a value _is not_ associated with a metadata object, purl-workers try parsing the value first. If a metadata object _is_ associated with a value, a direct return will always be created, regardless of what is specified inside.

See [Examples](#examples) for how to upload a file with a metadata object associated.

## Build

[Wrangler] can automatically build the project:

```shell
wrangler build
```

To manually build this project:

```shell
npm install && npm run build
```

The compiled and bundled JavaScript file will be at `dist/bundle.js`.

## License

This software is licensed under the GNU Affero General Public License; see [COPYING](COPYING) for details.

[purl]: https://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
[cfwkrs]: https://workers.cloudflare.com/
[cf]: https://www.cloudflare.com/
[Wrangler]: https://github.com/cloudflare/wrangler
[Cargo]: https://doc.rust-lang.org/cargo/
