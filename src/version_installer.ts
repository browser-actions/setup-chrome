import path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import { KnownGoodVersionResolver } from "./chrome_for_testing";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import { OS, type Platform } from "./platform";

export class KnownGoodVersionInstaller implements Installer {
  private readonly platform: Platform;
  private readonly resolveBrowserVersionOnly: boolean;
  private readonly versionResolver: KnownGoodVersionResolver;

  constructor(
    platform: Platform,
    { resolveBrowserVersionOnly }: { resolveBrowserVersionOnly: boolean },
  ) {
    this.platform = platform;
    this.resolveBrowserVersionOnly = resolveBrowserVersionOnly;
    this.versionResolver = new KnownGoodVersionResolver(this.platform);
  }

  async checkInstalledBrowser(
    version: string,
  ): Promise<InstallResult | undefined> {
    const root = await cache.find("chrome", version);
    if (root) {
      return { root, bin: "chrome" };
    }
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    const resolved = this.resolveBrowserVersionOnly
      ? await this.versionResolver.resolveBrowserOnly(version)
      : await this.versionResolver.resolveBrowserAndDriver(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in known good versions for ${this.platform.os} ${this.platform.arch}`,
      );
    }

    core.info(
      `Acquiring chrome ${resolved.version} from ${resolved.browserDownloadURL}`,
    );
    const archive = await tc.downloadTool(resolved.browserDownloadURL);
    return { archive };
  }

  async installBrowser(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    const resolved = this.resolveBrowserVersionOnly
      ? await this.versionResolver.resolveBrowserOnly(version)
      : await this.versionResolver.resolveBrowserAndDriver(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in known good versions for ${this.platform.os} ${this.platform.arch}`,
      );
    }
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chrome-${this.versionResolver.platformString}`,
    );

    const root = await cache.cacheDir(extAppRoot, "chrome", resolved.version);
    core.info(`Successfully Installed chrome to ${root}`);
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
        case OS.LINUX:
          return "chrome";
        case OS.WINDOWS:
          return "chrome.exe";
      }
    })();
    return { root: root, bin };
  }

  async checkInstalledDriver(
    version: string,
  ): Promise<InstallResult | undefined> {
    const root = await cache.find("chromedriver", version);
    if (root) {
      return { root, bin: "chromedriver" };
    }
  }

  async downloadDriver(version: string): Promise<DownloadResult> {
    if (this.resolveBrowserVersionOnly) {
      throw new Error("Unexpectedly trying to download chromedriver");
    }

    const resolved =
      await this.versionResolver.resolveBrowserAndDriver(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in known good versions for ${this.platform.os} ${this.platform.arch}`,
      );
    }

    core.info(
      `Acquiring chromedriver ${resolved.version} from ${resolved.driverDownloadURL}`,
    );
    const archive = await tc.downloadTool(resolved.driverDownloadURL);
    return { archive };
  }

  async installDriver(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    if (this.resolveBrowserVersionOnly) {
      throw new Error("Unexpectedly trying to install chromedriver");
    }

    const resolved =
      await this.versionResolver.resolveBrowserAndDriver(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in known good versions for ${this.platform.os} ${this.platform.arch}`,
      );
    }
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chromedriver-${this.versionResolver.platformString}`,
    );

    const root = await cache.cacheDir(
      extAppRoot,
      "chromedriver",
      resolved.version,
    );
    core.info(`Successfully Installed chromedriver to ${root}`);
    const bin = (() => {
      switch (this.platform.os) {
        case OS.DARWIN:
          return "chromedriver";
        case OS.LINUX:
          return "chromedriver";
        case OS.WINDOWS:
          return "chromedriver.exe";
      }
    })();
    return { root: root, bin };
  }
}
