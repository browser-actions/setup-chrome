<p>
  <a href="https://github.com/browser-actions/setup-chrome/actions"><img alt="typescript-action status" src="https://github.com/browser-actions/setup-chrome/workflows/build-test/badge.svg"></a>
</p>

# setup-chrome

This action sets by Google Chrome/Chromium for use in actions by:

- [X] Install and setup latest Chromium
- [X] Cross platform runner (macOS, Linux, Windows)
- [X] Install Google Chrome by channel (stable, beta, dev, and canary)
- [ ] Install by version number (88.0.4324, or 88.0)

## Usage

See [action.yml](action.yml)

Basic usage:

```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
  - run: chrome --version
```

Install Google Chrome Beta
```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
    with:
      chrome-version: beta
    id: setup-chrome
  - run: |
      echo Installed chromium version: ${{ steps.setup-chrome.outputs.chrome-version }}
      chrome --version
```

**Note that the installed binary depends on your installation spec.**

The installed binary name depends on the version you specify and your platform.
The summarized binary names are the following:

| OS \ installed version | `latest` (default) | commit position (e.g. `848897`) | channel name (e.g. `dev`) |
| ---                    | ---                | ---                             | ---                       |
| Windows                | chrome             | chrome                          | chrome                    |
| macOS                  | chromium           | chromium                        | chrome                    |
| Linux                  | chrome             | chrome                          | chrome                    |



Be sure to pass a full-path to `chrome` or `chromium` to your test system if
the system expects that `chromium` exists in PATH such as [karma-chromium-runner][]:

[karma-chromium-runner]: https://github.com/karma-runner/karma-chrome-launcher

```sh
CHROMIUM_BIN=$(which chrome) npm run test
```

## Parameters

- `chrome-version`: *(Optional)* The Google Chrome/Chromium version to be installed.  Available value is one of the following:
    - Chromium by a commit position like `848897`.  You can find commit positions from [here][snapshots].
    - Chromium latest snapshot `latest`
    - Google Chrome release channels: `stable`, `beta`, `dev` and `canary`

  Default: `latest`

[snapshots]: https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html

## License

[MIT](LICENSE)
