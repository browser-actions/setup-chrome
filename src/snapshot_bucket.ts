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

export const downloadURL = (platform: Platform, version: string): string => {
  return `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
    platform,
  )}%2F${version}%2F${makeBasename(platform)}?alt=media`;
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
  }
  throw new Error(`Unsupported platform "${os}" "${arch}"`);
};
