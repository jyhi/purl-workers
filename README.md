# PURL Service Running on Cloudflare Workers

A [Persistent URL][purl] service running on [Cloudflare Workers][cfwkrs]. Can also be used as a URL shortening service.

Features include:

- Serverless
- Customizable HTTP redirection
- Direct content return

## Deploy

Assuming [Cloudflare][cf] experience:

1. Go to Worker \> KV and create a KV database. It can be arbitrarily named.
1. Install [Wrangler]. Log in with `wrangler login`.
2. Configure a worker in `wrangler.toml` by filling the private options.
3. `wrangler publish`.

## Use

At present there's no entry addition support; one needs to manually add entries via either [Wrangler], the Web interface, or the API.

Upon an incoming HTTP request, the path (with `/` prepended) will be used as a key to find an entry in KV. The value can be in the following forms:

- A JSON object of type `Entry` recording a HTTP response. See [The Entry Object](#the-entry-object) for details.
- A URL. This will be returned in a `Location` header with HTTP 302 Found.
- Any arbitrary content. This will be returned with HTTP 200 OK and `Content-Type: application/octet-stream`. Associate metadata to this entry to change the content type; see [The Metadata Object](#the-metadata-object) for details.

### Examples

- To create a (temporal) redirection from `/foo` to `https://www.youtube.com/watch?v=dQw4w9WgXcQ` using [Wrangler]:

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
  "status": 307,
  "statusText": "Temporary Redirect",
  "location": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

Each field is optional. The above example already shows how to temporarily redirect a request using HTTP 307 Temporary Redirect (instead of 302 Found).

An object without `status` will create a HTTP 204 No Content response.

## The Metadata Object

Metadata is a functionality offered by Workers KV, allowing an arbitrary JSON object be associated with a KV entry. The metadata object has the following shape:

```json
{
  "contentType": "application/json"
}
```

Although `contentType` is optional (in which case `octet-stream` will be returned), it's not recommended to do this. Use [Wrangler] to associate metadata with a KV entry; there isn't such support on the Web interface yet.

## Build

[Wrangler] can automatically build the project. To manually build this project:

```shell
# Install dependencies
npm install

# Invoke TypeScript compiler
npx tsc
```

The compiled JavaScript file is located under `dist/`.

## License

This software is licensed under the GNU Affero General Public License; see [COPYING](COPYING) for details.

[purl]: https://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
[cfwkrs]: https://workers.cloudflare.com/
[cf]: https://www.cloudflare.com/
[Wrangler]: https://github.com/cloudflare/wrangler
[Cargo]: https://doc.rust-lang.org/cargo/
