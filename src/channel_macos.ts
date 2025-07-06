import path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as cache from "./cache";
import { LastKnownGoodVersionResolver } from "./chrome_for_testing";
import type { DownloadResult, InstallResult, Installer } from "./installer";
import type { Platform } from "./platform";
import { isReleaseChannelName } from "./version";

export class MacOSChannelInstaller implements Installer {
  private readonly versionResolver: LastKnownGoodVersionResolver;

  constructor(platform: Platform) {
    if (platform.os !== "darwin") {
      throw new Error(`Unexpected OS: ${platform.os}`);
    }

    this.versionResolver = new LastKnownGoodVersionResolver(platform);
  }

  async checkInstalledBrowser(
    version: string,
  ): Promise<InstallResult | undefined> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }
    const root = await cache.find("chrome", version);
    if (root) {
      return { root, bin: "Contents/MacOS/Google Chrome for Testing" };
    }
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }

    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in chrome for testing versions`,
      );
    }

    core.info(
      `Acquiring chrome ${version} from ${resolved.browserDownloadURL}`,
    );
    const archive = await tc.downloadTool(resolved.browserDownloadURL);
    return { archive };
  }

  async installBrowser(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }

    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chrome-${this.versionResolver.platformString}`,
      "Google Chrome for Testing.app",
    );

    const root = await cache.cacheDir(extAppRoot, "chrome", version);
    core.info(`Successfully Installed chrome to ${root}`);

    return { root, bin: "Contents/MacOS/Google Chrome for Testing" };
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
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in chrome for testing versions`,
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
    const extPath = await tc.extractZip(archive);
    const extAppRoot = path.join(
      extPath,
      `chromedriver-${this.versionResolver.platformString}`,
    );

    const root = await cache.cacheDir(extAppRoot, "chromedriver", version);
    core.info(`Successfully Installed chromedriver to ${root}`);
    return { root, bin: "chromedriver" };
  }
}
