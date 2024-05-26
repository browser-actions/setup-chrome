import fs from "node:fs";
import path from "node:path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
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

  async checkInstalled(version: string): Promise<InstallResult | undefined> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }
    const root = await cache.find("chromium", version);
    if (root) {
      return { root, bin: "Contents/MacOS/chrome" };
    }
  }

  async downloadBrowser(version: string): Promise<DownloadResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }

    const url = (() => {
      switch (version) {
        case "stable":
          return "https://dl.google.com/chrome/mac/universal/stable/GGRO/googlechrome.dmg";
        default:
          return `https://dl.google.com/chrome/mac/universal/${version}/googlechrome${version}.dmg`;
      }
    })();

    core.info(`Acquiring ${version} from ${url}`);
    const archive = await tc.downloadTool(url);
    return { archive };
  }

  async installBrowser(
    version: string,
    archive: string,
  ): Promise<InstallResult> {
    if (!isReleaseChannelName(version)) {
      throw new Error(`Unexpected version: ${version}`);
    }
    const mountpoint = path.join("/Volumes", path.basename(archive));
    await exec.exec("hdiutil", [
      "attach",
      "-quiet",
      "-noautofsck",
      "-noautoopen",
      "-mountpoint",
      mountpoint,
      archive,
    ]);

    let root = (() => {
      switch (version) {
        case "stable":
          return path.join(mountpoint, "Google Chrome.app");
        case "beta":
          return path.join(mountpoint, "Google Chrome Beta.app");
        case "dev":
          return path.join(mountpoint, "Google Chrome Dev.app");
        case "canary":
          return path.join(mountpoint, "Google Chrome Canary.app");
      }
    })();
    const bin = (() => {
      switch (version) {
        case "stable":
          return "Contents/MacOS/Google Chrome";
        case "beta":
          return "Contents/MacOS/Google Chrome Beta";
        case "dev":
          return "Contents/MacOS/Google Chrome Dev";
        case "canary":
          return "Contents/MacOS/Google Chrome Canary";
      }
    })();
    const bin2 = path.join(path.dirname(bin), "chrome");

    root = await cache.cacheDir(root, "chromium", version);
    await fs.promises.symlink(path.basename(bin), path.join(root, bin2));
    core.info(`Successfully Installed chromium to ${root}`);

    return { root, bin: bin2 };
  }

  async downloadDriver(version: string): Promise<DownloadResult> {
    const resolved = await this.versionResolver.resolve(version);
    if (!resolved) {
      throw new Error(
        `Version ${version} not found in the known good versions`,
      );
    }

    core.info(
      `Acquiring ${resolved.version} from ${resolved.driverDownloadURL}`,
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
