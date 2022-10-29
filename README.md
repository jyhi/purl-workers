# [PURL]-Workers

A serverless URL redirection service running on [Cloudflare Workers], with a few bells and whistles.

## Deploy

You may:

- [![Deploy with Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/lmy441900/purl-workers)

- Use [Wrangler]:

  1. Complete `wrangler.toml` by adding appropriate options; see <https://developers.cloudflare.com/workers/wrangler/configuration/> for details.
  2. `npm install && npm run deploy`.

- Copy-paste:

  1. Go to Cloudflare Dashboard \> Workers \> Overview, press the "Create a Service" button (the starter template doesn't matter), then configure any necessary options.
  2. `npm install && npm run build`
  3. Press the "Quick edit" button, copy the content of `build/purl-workers.bundle.js`, paste it to the editor, then press the "Save and Deploy" button.

## Use

PURL-workers uses the path name of the incoming URL to look for an entry, which describes how to respond to the request:

```
http://www.example.com/foo/bar?q=baz&z#ch1
                      ~~~~~~~~ path name
```

There are two ways to define entries:

1. Fill the `entries` object in `purl-workers.config.js` (build-time configuration).
2. Use Workers KV (run-time configuration).

PURL-workers hasn't yet supported adding, editing, or removing entries; use [Wrangler] for these.

### The `entries` Object

The `entries` object is a dictionary (record) with strings as keys and the following "responders" recognized as values:

1. A string shortcut.
2. A [`ResponseInit`] object.
3. A responder function.

A string shortcut may be interpreted as a:

- Temporary redirection
- Permanent redirection
- Alias
- Raw value

If a string is not a URL nor an alias, then it'll be returned directly. Note that aliases are resolved internally and recursvely. Be ware not to create a loop!

A [`ResponseInit`] object will be directly supplied to the constructor of `Response`, creating the final response that the Workers platform can send. This is convenient for creating header-only responses without a body (which cannot be specified in this way).

A responder function will be invoked with all the parameters available from the Workers platform (Module Worker syntax). This is almost identical to writing a `fetch` handler, so responder functions can do anything.

Entries defined in this way will become a part of the code and cannot be mutated in runtime. See [The Configuration File](#the-configuration-file) for details.

### Workers KV

Each key corresponds to a value and a metadata, both of which can be set with [Wrangler].

1. For a KV entry with metadata, the value will be returned directly (without any processing) based on what the metadata specified, regardless of the shape of value. The metadata must be a `ResponseInit` object[^1].
2. For a KV entry without metadata, PURL-workers will first try parsing it as an entry (can be a string shortcut or a `ResponseInit` object in JSON). If parsing fails, then the value will be returned directly.

## Entries

### Temporary Redirect

A temporary redirection tells the HTTP client to visit the URL in the `Location` header instead, but without remembering (caching) this redirection for future faster visits. Most often, this should be used.

```
https://www.example.com/redir/temp
```

### Permanent Redirect

Prepend an exclamation mark (`!`) before the URL to create a permanent redirection instead, hinting HTTP clients to remember (cache) this redirection.

```
!https://www.example.com/redir/perm
```

### Alias

Specify any string that can possibly be a key name. If a string cannot be parsed into a URL redirection or an object, then it is used as a key to find another entry to respond.

```
/redir/maybe
```

### [`ResponseInit`] Object

The object will be used to create a `Response`.

```json
{
  "status": 204,
  "statusText": "No Content",
  "headers": {
    "Server": "PURL-workers/0"
  }
}
```

### Responder Function

In the `entries` object (see [above](#the-entries-object)), one can supply a Cloudflare Workers `fetch` handler function. This enables running any logic without losing the support of PURL-workers shortcuts (described above).

```javascript
{
  "/204": async () => {
    return new Response({
      status: 204
    });
  };
}
```

## The Configuration File

The configuration file defines two immutable variables as objects:

- `entries`: a dictionary (record) of entries
- `config`: build-time options tweaking the behavior of PURL-workers

See [The `entries` Object](#the-entries-object) for configuring `entries`. The `config` object supports the following options:

- `temporaryRedirect`: specify what status code should be used to indicate a temporary redirection; the default is 302.
- `permanentRedirect`: specify what status code should be used to indicate a permanenet redirection; the default is 301.

## License

This software is licensed under the GNU Affero General Public License; see [COPYING](COPYING) for details.

[PURL]: https://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
[Cloudflare Workers]: https://workers.cloudflare.com/
[Wrangler]: https://github.com/cloudflare/wrangler
[`ResponseInit`]: https://developer.mozilla.org/en-US/docs/Web/API/Response/Response#options

[^1]: https://developers.cloudflare.com/workers/runtime-apis/kv/#metadata
