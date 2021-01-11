import { Platform, OS, Arch } from "./platform";
import * as tc from "@actions/tool-cache";
import * as core from "@actions/core";
import * as httpm from "@actions/http-client";
import path from "path";

export const install = async (
  platform: Platform,
  version: string
): Promise<string> => {
  if (version === "latest") {
    const http = new httpm.HttpClient("setup-chromium");
    const resp = await http.get(makeLatestVersionURL(platform));
    if (resp.message.statusCode !== httpm.HttpCodes.OK) {
      throw new Error(
        `Failed to get latest version: server returns ${resp.message.statusCode}`
      );
    }
    version = await resp.readBody();
  }

  const toolPath = tc.find("chromium", version);
  if (toolPath) {
    core.info(`Found in cache @ ${toolPath}`);
    return toolPath;
  }
  core.info(`Attempting to download ${version}...`);

  const url = makeDownloadURL(platform, version);
  core.info(`Acquiring ${version} from ${url}`);

  const archivePath = await tc.downloadTool(url);
  core.info("Extracting chromium...");
  let extPath = await tc.extractZip(archivePath);
  switch (platform.os) {
    case OS.DARWIN:
      extPath = path.join(extPath, "chrome-mac");
      break;
    case OS.LINUX:
      extPath = path.join(extPath, "chrome-linux");
      break;
    case OS.WINDOWS:
      extPath = path.join(extPath, "chrome-win");
      break;
  }
  core.info(`Successfully extracted chromium to ${extPath}`);

  core.info("Adding to the cache ...");
  const cachedDir = await tc.cacheDir(extPath, "chromium", version);
  core.info(`Successfully cached chromium to ${cachedDir}`);

  return cachedDir;
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

const makeLatestVersionURL = (platform: Platform): string => {
  return `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
    platform
  )}%2FLAST_CHANGE?alt=media`;
};
const makeDownloadURL = (platform: Platform, version: string): string => {
  return `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${makePlatformPart(
    platform
  )}%2F${version}%2F${makeBasename(platform)}?alt=media`;
};
