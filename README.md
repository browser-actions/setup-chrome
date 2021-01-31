<p>
  <a href="https://github.com/browser-actions/setup-chromium/actions"><img alt="typescript-action status" src="https://github.com/browser-actions/setup-chromium/workflows/build-test/badge.svg"></a>
</p>

# setup-chromium

This action sets by Chromium for use in actions by:

- [X] Install and setup latest Chromium
- [X] Cross platform runner (macOS, Linux, Windows)
- [ ] Install by channel (stable, beta, dev, and canary)
- [ ] Install by version number (88.0.4324, or 88.0)

## Usage

See [action.yml](action.yml)

Basic usage:

```yaml
steps:
  - uses: browser-actions/setup-chromium@latest
  - run: chrome --version
    with:
      chromium-version: latest
```

**Note that the installed binary is `chrome` but not `chromium` on Linux and
Windows.** Be sure to pass a full-path to `chrome` to your test system if the
system expects that `chromium` exists in PATH such as [karma-chromium-runner][]:

[karma-chromium-runner]: https://github.com/karma-runner/karma-chrome-launcher

```sh
CHROMIUM_BIN=$(which chrome) npm run test
```

## Parameters

- `chromium-version`:
*(Optional)* The Chromium version to be installed.  Available value is commit position like `848897` or `latest`.
You can find commit positions from [here][snapshots].
Default: `latest`

[snapshots]: https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html

## License

[MIT](LICENSE)
