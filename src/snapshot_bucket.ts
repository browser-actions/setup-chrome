import * as httpm from "@actions/http-client";
import { Arch, OS, type Platform } from "./platform";

export const resolveLatestVersion = async (
  platform: Platform,
): Promise<string> => {
  const url = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
    platform,
  )}%2FLAST_CHANGE?alt=media`;

  const http = new httpm.HttpClient("setup-chrome");
  const resp = await http.get(url);
  if (resp.message.statusCode !== httpm.HttpCodes.OK) {
    throw new Error(
      `Failed to get latest version: server returns ${resp.message.statusCode}`,
    );
  }
  return resp.readBody();
};

export const browserDownloadURL = (
  platform: Platform,
  version: string,
): string => {
  return `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
    platform,
  )}%2F${version}%2F${browserFileName(platform)}?alt=media`;
};

export const driverDownloadURL = (
  platform: Platform,
  version: string,
): string => {
  return `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
    platform,
  )}%2F${version}%2F${driverFileName(platform)}?alt=media`;
};

const browserFileName = ({ os }: Platform): string => {
  switch (os) {
    case OS.DARWIN:
      return "chrome-mac.zip";
    case OS.LINUX:
      return "chrome-linux.zip";
    case OS.WINDOWS:
      return "chrome-win.zip";
  }
};

const driverFileName = ({ os, arch }: Platform): string => {
  switch (os) {
    case OS.DARWIN:
      return "chromedriver_mac64.zip";
    case OS.LINUX:
      return "chromedriver_linux64.zip";
    case OS.WINDOWS:
      return arch === Arch.ARM64
        ? "chromedriver_win64.zip"
        : "chromedriver_win32.zip";
  }
};

const makePlatformPart = ({ os, arch }: Platform): string => {
  if (os === OS.DARWIN && arch === Arch.AMD64) {
    return "Mac";
  } else if (os === OS.DARWIN && arch === Arch.ARM64) {
    return "Mac_Arm";
  } else if (os === OS.LINUX && arch === Arch.I686) {
    return "Linux";
  } else if (os === OS.LINUX && arch === Arch.AMD64) {
    return "Linux_x64";
  } else if (os === OS.WINDOWS && arch === Arch.I686) {
    return "Win";
  } else if (os === OS.WINDOWS && arch === Arch.AMD64) {
    return "Win_x64";
  } else if (os === OS.WINDOWS && arch === Arch.ARM64) {
    return "Win_Arm64";
  }
  throw new Error(`Unsupported platform "${os}" "${arch}"`);
};
