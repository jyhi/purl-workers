# PURL Service Running on Cloudflare Workers

A (very simple) [Persistent URL][purl] service running on [Cloudflare Workers][cfwkrs]. Can also be used as a URL shortening service.

Features include:

- Serverless
- Customizable HTTP redirection
- Direct content return support

## Deploy

Assuming [Cloudflare][cf] experience:

1. Go to Worker \> KV and create a KV database. It can be arbitrarily named.
1. Install [Wrangler]. Log in with `wrangler login`.
2. Configure a worker in `wrangler.toml` by filling the private options.
3. `wrangler publish`.

## Use

At present there's no entry addition support; one needs to manually add entries via either [Wrangler], the Web interface, or the API.

Upon an incoming HTTP request, the path component (with `/` prepended) will be used as a key to find an entry in KV. The value should be a JSON string; if it isn't then it's returned directly as `text/plain`.

To specify a HTTP temporary redirect (which is the intended use case), set `status` and `location`:

```json
{
  "status": 307,
  "location": "http://example.com/"
}
```

This project also supports direct return by specifying a non-redirect HTTP `status`, `contentType`, and `content`. Note that this is only applicable to strings.

```json
{
  "status": 200,
  "contentType": "application/json",
  "content": "{\"example\": true}"
}
```

To directly return binary data, specify `contentKey` instead. This will initiate a second search in the KV database with the specified value as the key. The value retrieved is then sent as-is.

```json
{
  "status": 200,
  "contentType": "image/jpg",
  "contentKey": "example.jpg"
}
```

By not even specifying a `status`, a `HTTP 204 No Content` will be returned.

```json
{}
```

## Build

[Wrangler] automatically builds the project already; the compiled JavaScript file is located under `dist/`. To manually build this project:

```shell
# Install dependencies
npm install

# Invoke TypeScript compiler
npx tsc
```

## License

This software is licensed under the GNU Affero General Public License; see [COPYING](COPYING) for details.

[purl]: https://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
[cfwkrs]: https://workers.cloudflare.com/
[cf]: https://www.cloudflare.com/
[Wrangler]: https://github.com/cloudflare/wrangler
[Cargo]: https://doc.rust-lang.org/cargo/
