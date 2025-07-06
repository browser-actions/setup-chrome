<p>
  <a href="https://github.com/browser-actions/setup-chrome/actions"><img alt="typescript-action status" src="https://github.com/browser-actions/setup-chrome/workflows/build-test/badge.svg"></a>
</p>

# setup-chrome

This action sets-up Google Chrome/Chromium for GitHub Actions. This action supports the following features:

- Install and setup the Google Chrome onto the runner.
- Install a specific version of Google Chrome/Chromium by the version number, commit position, and release channel.
- Cross-platform runner support (Windows, macOS, Linux) and self-hosted runner support.
- Install the compatible versions of ChromeDriver with the browser.

## Usage

Here is a basic usage.
The action installs the stable version of Chrome for Testing by default.

```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
  - run: chrome --version
```

To install a specific channel, use `chrome-version` input.

```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
    with:
      chrome-version: 120
```

The action support installing the compatible ChromeDriver with the browser.
You can use the `install-chromedriver` to install the ChromeDriver.

```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
    with:
      chrome-version: 120
      install-chromedriver: true
```

If you use the self-hosted runner, your runner may not have the required dependencies on the system.
You can install the dependencies by using the `install-dependencies` parameter.
It installs the required dependencies for the Google Chrome/Chromium to run automatically.

```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
    with:
      chrome-version: 120
      install-dependencies: true
```

### Supported version formats

The action supports the following version formats:

- The latest snapshot `latest`.
- Commit positions like `1295939`.  You can find commit positions from [here][snapshots].
- Google Chrome release channels: `stable` (default), `beta`, `dev` and `canary`
- Specific versions: `119`, `120.0.6099`, `121.0.6100.0`.  The version are resolved by [Chrome for Testing][].

[Chrome for Testing]: https://googlechromelabs.github.io/chrome-for-testing/

### Installed path

The installed binary name is not always `chrome` or `chromium`.
It depends on your installation spec and OS.

To get the installed binary path, use `chrome-path` output of the action:

```yaml
steps:
  - uses: browser-actions/setup-chrome@v1
    id: setup-chrome
  - run: |
      ${{ steps.setup-chrome.outputs.chrome-path }} --version
```

## Parameters

### Inputs

- `chrome-version`: *(Optional)* The Google Chrome/Chromium version to be installed.
  Default: `latest`
- `install-dependencies`: *(Optional)* Install the required dependencies for the Google Chrome/Chromium to run.
  Default: `false`
- `install-chromedriver`: *(Optional)* Install the compatible ChromeDriver with the browser.
  Default: `false`
- `no-sudo`: *(Optional)* Do not use sudo to install Google Chrome/Chromium (Linux only).
  Default: `false`

### Outputs

- `chrome-path`: The installed Google Chrome/Chromium binary path.
- `chrome-version`: The installed Google Chrome/Chromium version.
- `chromedriver-path`: The installed ChromeDriver binary path.
- `chromedriver-version`: The installed ChromeDriver version.

[snapshots]: https://commondatastorage.googleapis.com/chromium-browser-snapshots/index.html

## License

[MIT](LICENSE)
