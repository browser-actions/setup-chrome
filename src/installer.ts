import { Platform, OS } from "./platform";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import path from "path";
import fs from "fs";
import { SnapshotDownloader } from "./snapshot";
import { ChannelDownloaderFactory, ChannelInstallerFactory } from "./channel";

export const install = async (
  platform: Platform,
  version: string
): Promise<string> => {
  const toolPath = tc.find("chromium", version);
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  }

  let { root, bin } = await (async () => {
    switch (version) {
      case "latest":
        return installLatest(platform, version);
      case "stable":
      case "beta":
      case "dev":
      case "canary":
        return installChannel(platform, version);
      default:
        return await installSnapshot(platform, version);
    }
  })();

  core.info("Adding to the cache ...");
  const cachedDir = await tc.cacheDir(root, "chromium", version);
  core.info(`Successfully cached chromium to ${cachedDir}`);

  if (platform.os === OS.DARWIN) {
    // Create symlink "chrome"
    const bin2 = path.join(path.dirname(bin), "chrome");
    await fs.promises.symlink(path.basename(bin), path.join(cachedDir, bin2));
    bin = bin2;
  }

  return path.join(cachedDir, bin);
};

export const installLatest = async (
  platform: Platform,
  version: string
): Promise<{ root: string; bin: string }> => {
  const downloader = new SnapshotDownloader(platform);

  core.info(`Attempting to download ${version}...`);
  const archivePath = await downloader.downloadLatest();

  core.info("Extracting chromium...");
  const extPath = await tc.extractZip(archivePath);

  core.info(`Successfully extracted chromium to ${extPath}`);
  const root = (() => {
    switch (platform.os) {
      case OS.DARWIN:
        return path.join(extPath, "chrome-mac");
      case OS.LINUX:
        return path.join(extPath, "chrome-linux");
      case OS.WINDOWS:
        return path.join(extPath, "chrome-win");
    }
  })();
  const bin = (() => {
    switch (platform.os) {
      case OS.DARWIN:
        return "Chromium.app/Contents/MacOS/Chromium";
      case OS.LINUX:
        return "chrome";
      case OS.WINDOWS:
        return "chrome.exe";
    }
  })();
  return { root, bin };
};

export const installSnapshot = async (
  platform: Platform,
  version: string
): Promise<{ root: string; bin: string }> => {
  const downloader = new SnapshotDownloader(platform);

  core.info(`Attempting to download ${version}...`);
  const archivePath = await downloader.downloadSnapshot(version);

  core.info("Extracting chromium...");
  const extPath = await tc.extractZip(archivePath);

  core.info(`Successfully extracted chromium to ${extPath}`);
  const root = (() => {
    switch (platform.os) {
      case OS.DARWIN:
        return path.join(extPath, "chrome-mac");
      case OS.LINUX:
        return path.join(extPath, "chrome-linux");
      case OS.WINDOWS:
        return path.join(extPath, "chrome-win");
    }
  })();
  const bin = (() => {
    switch (platform.os) {
      case OS.DARWIN:
        return "Chromium.app/Contents/MacOS/Chromium";
      case OS.LINUX:
        return "chrome";
      case OS.WINDOWS:
        return "chrome.exe";
    }
  })();
  return { root, bin };
};

export const installChannel = async (
  platform: Platform,
  version: "stable" | "beta" | "dev" | "canary"
): Promise<{ root: string; bin: string }> => {
  const downloader = new ChannelDownloaderFactory().create(platform);
  const installer = new ChannelInstallerFactory().create(platform);

  core.info(`Attempting to download ${version}...`);
  const archivePath = await downloader.download(version);

  core.info("Extracting chromium...");
  const { root, bin } = await installer.install(version, archivePath);

  core.info(`Successfully extracted chromium to ${root}`);
  return { root, bin };
};
