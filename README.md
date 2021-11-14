# PURL Service Running on Cloudflare Workers

A [Persistent URL][purl] service running on [Cloudflare Workers][cfwkrs]. Can also be used as a URL shortening service.

Features include:

- Serverless
- Customizable HTTP redirection
- Direct content return

## Deploy

Assuming [Cloudflare][cf] experience:

1. Go to Worker \> KV and create a KV database. It can be arbitrarily named.
2. Install [Wrangler]. Log in with `wrangler login`.
3. Configure a worker in `wrangler.toml` by filling the private options.
4. `wrangler publish`.

## Use

At present there's no direct support for updating the database; one needs to manually edit entries via either [Wrangler], the Web interface, or the API.

Upon an incoming HTTP request, the path (with `/` prepended) will be used as a key to find an entry in the associated Workers KV. The value can be:

- An [entry object](#the-entry-object).
- An URL; this will be returned in a `Location` header with HTTP 302 Found.
- Any arbitrary content; this will be returned with HTTP 200 OK and `Content-Type: application/octet-stream`. Associate metadata to this entry to change the status code and content type; see [The Metadata Object](#the-metadata-object) for details.

### Examples

Using [Wrangler]:

- To create a (temporal) redirection from `/foo` to `https://www.youtube.com/watch?v=dQw4w9WgXcQ`:

```shell
wrangler kv:key put --binding KV_PURL '/foo' 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
```

- To create a permanent redirection instead:

```shell
wrangler kv:key put --binding KV_PURL '/foo' '{"status": 308, "location": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

- To place a PDF file at `/test.pdf`, with the correct content type be associated:

```shell
wrangler kv:key put --binding KV_PURL --path --metadata '{"contentType": "application/pdf"}' '/test.pdf' path/to/pdf/file
```

## The Entry Object

The entry object has the following shape:

```json
{
  "is": "<path>",
  "status": 123,
  "statusText": "<reason phrase>",
  "location": "uri:redirect:target",
  "contentType": "mime/type",
  "contentBase64Decode": false,
  "content": "Lorem ipsum dolor sit amet..."
}
```

Every field is optional, but some have higher precedence and thus may be regarded as exclusive:

- `is` creates an alias; see [Alias](#alias)
- `status` creates a response; see [Redirection](#redirection)

When multiple of the above are simultaneously specified, purl-workers processes from the start of the above list (that is, `is` has the highest precedence). Note that [The Metadata Object](#the-metadata-object) always creates a direct return, regardless of what is specified in the value.

### Alias

`is` creates an alias from the current key to a specified key. For example, the following object creates an alias to `/foo`:

```json
{"is": "/foo"}
```

If it is the value of key `/bar`, then `/foo` will be read upon a request to `/bar`. If the alias target is also an alias, then purl-workers will continue resolving it recursively, until a non-alias object is found. It is therefore very easy to create an endless loop; pay attention not to creating one!

### Redirection

Specify a 3xx (redirection) HTTP status code with `status` to create a redirection. For example, the following object creates a temporary redirection using HTTP 307:

```json
{
  "status": 307,
  "statusText": "Temporary Redirect",
  "location": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

`statusText` and `location` are optional. However, returning a 3xx (redirection) status code without a `location` can confuse the client.

As a shortcut, for a simple `302 Found`, one can simply put the location (target) URL in the value; see [Examples](#examples).

### Direct Return

Use `content` to insert a payload into the response. Meanwhile, use a non-3xx (non-redirection) `status` to make the payload meaningful. As `content` can only be a text string, for binary payloads, a Base64-encoded string can be used along with `contentBase64Decode` set to `true`, telling purl-workers to first decode it. For example, the following object creates a HTTP 402 Payment Required response with a Base64-encoded plain-text payload:

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

### Empty

An object without either a `status` or an `is` will create a HTTP 204 No Content response:

```json
{}
```

A completely empty value also creates a HTTP 204 No Content response.

## The Metadata Object

Metadata is a functionality offered by Workers KV, allowing an arbitrary JSON object be associated with a KV entry. The metadata object that purl-workers recognizes has the following shape:

```json
{
  "status": 123,
  "statusText": "<reason phrase>",
  "contentType": "mime/type"
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

Of course, the metadata object itself is also optional. If a value _is not_ associated with a metadata object, purl-workers try parsing the value as an [entry object](#the-entry-object) or the various shortcuts. If a metadata object _is_ associated with a value, a direct return will always be created, regardless of what is specified inside.

See [Examples](#examples) for how to upload a file with a metadata object associated.

## Build

[Wrangler] can automatically build the project. To manually build this project:

```shell
# Install dependencies
npm install

# Invoke TypeScript compiler
npx tsc
```

The compiled JavaScript file will be located under `dist/`.

## License

This software is licensed under the GNU Affero General Public License; see [COPYING](COPYING) for details.

[purl]: https://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
[cfwkrs]: https://workers.cloudflare.com/
[cf]: https://www.cloudflare.com/
[Wrangler]: https://github.com/cloudflare/wrangler
[Cargo]: https://doc.rust-lang.org/cargo/
