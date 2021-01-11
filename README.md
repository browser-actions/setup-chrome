<p>
  <a href="https://github.com/browser-actions/setup-chromium/actions"><img alt="typescript-action status" src="https://github.com/browser-actions/setup-chromium/workflows/build-test/badge.svg"></a>
</p>

# setup-chromium

This action sets by Chromium for use in actions by:

- downloading and caching a version of Chromium by version and add to PATH

## Usage

See [action.yml](action.yml)

Basic usage:

```yaml
steps:
  - uses: browser-actions/setup-chromium@latest
  - run: chrome --version
```

**Note that the installed binary is `chrome` but not `chromium` on Linux and
Windows.** Be sure to pass a full-path to `chrome` to your test system if the
system expects that `chromium` exists in PATH such as [karma-chromium-runner][]:

[karma-chromium-runner]: https://github.com/karma-runner/karma-chrome-launcher

```sh
CHROMIUM_BIN=$(which chrome) npm run test
```

## License

[MIT](LICENSE)
