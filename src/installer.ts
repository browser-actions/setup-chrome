import { Platform, OS } from "./platform";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import path from "path";
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

  const extPath = await (async () => {
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
  const cachedDir = await tc.cacheDir(extPath, "chromium", version);
  core.info(`Successfully cached chromium to ${cachedDir}`);

  switch (platform.os) {
    case OS.DARWIN:
      return path.join(cachedDir, "Chromium.app/Contents/MacOS/Chromium");
    case OS.LINUX:
      return path.join(cachedDir, "chrome");
    case OS.WINDOWS:
      return path.join(cachedDir, "chrome.exe");
  }
};

export const installLatest = async (
  platform: Platform,
  version: string
): Promise<string> => {
  const downloader = new SnapshotDownloader(platform);

  core.info(`Attempting to download ${version}...`);
  const archivePath = await downloader.downloadLatest();

  core.info("Extracting chromium...");
  const extPath = await tc.extractZip(archivePath);

  core.info(`Successfully extracted chromium to ${extPath}`);
  switch (platform.os) {
    case OS.DARWIN:
      return path.join(extPath, "chrome-mac");
    case OS.LINUX:
      return path.join(extPath, "chrome-linux");
    case OS.WINDOWS:
      return path.join(extPath, "chrome-win");
  }
};

export const installSnapshot = async (
  platform: Platform,
  version: string
): Promise<string> => {
  const downloader = new SnapshotDownloader(platform);

  core.info(`Attempting to download ${version}...`);
  const archivePath = await downloader.downloadSnapshot(version);

  core.info("Extracting chromium...");
  const extPath = await tc.extractZip(archivePath);

  core.info(`Successfully extracted chromium to ${extPath}`);
  switch (platform.os) {
    case OS.DARWIN:
      return path.join(extPath, "chrome-mac");
    case OS.LINUX:
      return path.join(extPath, "chrome-linux");
    case OS.WINDOWS:
      return path.join(extPath, "chrome-win");
  }
};

export const installChannel = async (
  platform: Platform,
  version: "stable" | "beta" | "dev" | "canary"
): Promise<string> => {
  const downloader = new ChannelDownloaderFactory().create(platform);
  const installer = new ChannelInstallerFactory().create(platform);

  core.info(`Attempting to download ${version}...`);
  const archivePath = await downloader.download(version);

  core.info("Extracting chromium...");
  const extPath = await installer.install(version, archivePath);

  core.info(`Successfully extracted chromium to ${extPath}`);
  return extPath;
};
