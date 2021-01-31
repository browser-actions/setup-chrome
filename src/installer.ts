import { Platform, OS, Arch } from "./platform";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import * as httpm from "@actions/http-client";
import path from "path";
import { Downloader } from "./downloader";

export const install = async (
  platform: Platform,
  version: string
): Promise<string> => {
  const toolPath = tc.find("chromium", version);
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  }
  core.info(`Attempting to download ${version}...`);

  const downloader = new Downloader(platform);
  const archivePath = await (async () => {
    if (version === "latest") {
      return await downloader.downloadLatest();
    } else {
      return await downloader.downloadSnapshot(version);
    }
  })();

  core.info("Extracting chromium...");
  const extPath = await tc.extractZip(archivePath);
  core.info(`Successfully extracted chromium to ${extPath}`);

  core.info("Adding to the cache ...");
  const cachedDir = await tc.cacheDir(extPath, "chromium", version);
  core.info(`Successfully cached chromium to ${cachedDir}`);

  switch (platform.os) {
    case OS.DARWIN:
      return path.join(
        cachedDir,
        "chrome-mac",
        "Chromium.app/Contents/MacOS/Chromium"
      );
    case OS.LINUX:
      return path.join(cachedDir, "chrome-linux", "chrome");
    case OS.WINDOWS:
      return path.join(cachedDir, "chrome-win", "chrome.exe");
  }
};

const makePlatformPart = ({ os, arch }: Platform): string => {
  if (os === OS.DARWIN && arch === Arch.AMD64) {
    return "Mac";
  } else if (os === OS.LINUX && arch === Arch.I686) {
    return "Linux";
  } else if (os === OS.LINUX && arch === Arch.AMD64) {
    return "Linux_x64";
  } else if (os === OS.WINDOWS && arch === Arch.I686) {
    return "Win";
  } else if (os === OS.WINDOWS && arch === Arch.AMD64) {
    return "Win_x64";
  }
  throw new Error(`Unsupported platform "${os}" "${arch}"`);
};

const makeBasename = ({ os }: Platform): string => {
  switch (os) {
    case OS.DARWIN:
      return "chrome-mac.zip";
    case OS.LINUX:
      return "chrome-linux.zip";
    case OS.WINDOWS:
      return "chrome-win.zip";
  }
};
