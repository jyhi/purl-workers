# _[PURL]-Workers_

**This project has been deprecated.** Write your own serverless application instead.

A serverless [URL redirection] service running on [Cloudflare Workers], with a few bells and whistles.

## Deploy

You may:

- [![Deploy with Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lmy441900/purl-workers)
- Use [Wrangler]:
    1. Ensure that you have Node.js installed.
    2. Complete `wrangler.toml` by adding appropriate options; see <https://developers.cloudflare.com/workers/wrangler/configuration/> for how to do this.
    3. Run `npm install` to install dependencies.
    4. Run `npm run deploy` to compile, upload, and configure the worker on Cloudflare.
- Copy \& Paste:
    1. Ensure that you have Node.js installed.
    2. Go to Cloudflare Dashboard \> Workers \> Overview, press the "Create a Service" button (the starter template doesn't matter), then configure any necessary options.
    3. Run `npm install` to install dependencies.
    4. Run `npm run build` to compile PURL-workers.
    5. Press the "Quick edit" button, remove any residual content in the editor, copy the content of `dist/index.js`, paste it to the editor, then press the "Save and Deploy" button.

## Use

PURL-workers uses the path name of the incoming URL to look for an [entry](#entry), which describes how to respond to the request:

```
http://www.example.com/foo/bar?q=baz&z#ch1
                      ~~~~~~~~ path name
```

Use [Wrangler] to add, edit, or remove [entries](#entry) in Workers KV. For example, to put the content of file `403.html` under the current working directory to key `/example/forbidden` that will be returned in a HTTP 403 Forbidden response:

```sh
npx wrangler kv:key put \
  --binding kv --preview false \
  --metadata '{"status":"403"}' \
  --path ./403.html \
  '/example/forbidden'
```

To remove it:

```sh
npx wrangler kv:key delete \
  --preview false \
  '/example/forbidden'
```

Run `npx wrangler kv:key --help` for more information on how to use [Wrangler] to interact with a Workers KV.

## Entry

An entry is indexed by a string as key and can be:

1. A string shortcut.
2. [A `ResponseInit` object](#responseinit-object).
3. [A responder function](#responder-function).
4. A raw value.

A string shortcut may be further interpreted as a:

- [Temporary redirection](#temporary-redirection)
- [Permanent redirection](#permanent-redirection)
- [Alias](#alias)
- Raw string

There are two ways to define entries:

1. _Build-time configuration:_ fill the `entries` object in `purl-workers.config.js`. Entries specified in this way:
    - are much faster than those in Workers KV;
    - take precedence (that is, if `/key` is defined in both places, then the one in the configuration file will be chosen);

    These entries will also be bundled together with PURL-worker during compile time; see [The Configuration File](#the-configuration-file) for more information.

2. _Run-time configuration:_ use Workers KV. Each key corresponds to a value and a metadata, both of which can be set with [Wrangler]:
    - For a KV entry with metadata, the value will be returned directly (without any processing) based on what the metadata specified, regardless of the shape of value. The metadata must be a `ResponseInit` object[^1].
    - For a KV entry without metadata, PURL-workers will first try parsing it as an entry (can be a string shortcut or a `ResponseInit` object in JSON). If parsing fails, then the value will be returned directly as a binary blob.

    Entries specified in this way:

    - can be raw (binary) and larger
    - can have metadata attached
    - can be added and removed without re-deploying the worker

### Temporary Redirection

A temporary redirection tells the HTTP client to visit the URL in the `Location` header, but without remembering (caching) this redirection. Most often, this is what you want.

```
https://www.example.com/redir/temp
```

### Permanent Redirection

Prepend an exclamation mark (`!`) before the URL to create a permanent redirection instead, hinting HTTP clients to remember (cache) this redirection.

```
!https://www.example.com/redir/perm
```

### [`ResponseInit`] Object

The object will be used to create a `Response` (as the `option` parameter of its constructor). This is convenient for creating header-only responses without a body.

```json
{
  "status": 300,
  "statusText": "Multiple Choice",
  "headers": {
    "Link": "</foo>; rel=alternate, </bar>; rel=alternate, </baz>; rel=alternate"
  }
}
```

### Alias

Specify any string that can possibly be a key name. If a string cannot be parsed into a URL redirection or an object, then it is used as a key to find another entry to respond.

```
/alias/maybe
```

### Responder Function

A responder function is just a Cloudflare Workers `fetch` handler function. This enables running any logic without losing the support of PURL-workers shortcuts. It's obvious that a responder function can only be specified in [the configuration file](#the-configuration-file).

See <https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-module-worker> for the definition of a `fetch` handler function in the module worker syntax (which PURL-workers uses).

```javascript
{
  "/uwu": async (req, env) => {
    const key = req.headers.get("API-Key");
    if (key !== "Suki") {
      return new Response("Kirai", { status: 406 });
    }

    const himitsu = await env.kv?.get("_senpai", "stream");
    if (!himitsu) {
      return new Response("Zannen", { status: 404 });
    }

    return new Response(himitsu);
  }
}
```

## The Configuration File

[`purl-workers.config.js`](purl-workers.config.js) is the configuration file (script, actually) for PURL-workers. It's a ECMAScript (JavaScript) module that is imported into the source code of PURL-workers, so code in the file will be bundled together with PURL-worker during compile time.

Two variables are expected from the file:

- `entries`: an object of entries in key-value pairs.
- `config`: an object of options.

See [The `entries` Object](#the-entries-object) for configuring `entries`. The `config` object supports the following options:

- `temporaryRedirect`: specify what status code should be used to indicate a temporary redirection. Optional. The default is `302`.
- `permanentRedirect`: specify what status code should be used to indicate a permanenet redirection. Optional. The default is `301`.

## License

This software is licensed under the GNU Affero General Public License; see [COPYING](COPYING) for details.

[PURL]: https://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
[URL redirection]: https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections
[Cloudflare Workers]: https://workers.cloudflare.com/
[Wrangler]: https://github.com/cloudflare/wrangler
[`ResponseInit`]: https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#options

[^1]: https://developers.cloudflare.com/workers/runtime-apis/kv/#metadata
