/**
 * This module is an another implementation of the cache module in GitHub Actions.
 * The original tool-cache can cache with only semver format. This module can cache
 * with chrome version format, e.g., "120.0.6099.5", "123456", "latest".
 *
 * The cacheDir function copies the contents of a source directory to the cache
 * directory. The find function looks-up a cached directory by the tool name and
 * version spec. The cache directory is located in the sub-directory under
 * RUNNER_TOOL_CACHE.
 *
 * /opt/hostedtoolcache/setup-chrome/${toolName}/${version}/${arch}/...
 */

import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ok } from "assert";
import { parse } from "./version";

export async function cacheDir(
  sourceDir: string,
  tool: string,
  version: string,
  arch: string = os.arch(),
): Promise<string> {
  core.debug(`Caching tool ${tool} ${version} ${arch}`);
  core.debug(`source dir: ${sourceDir}`);
  if (!(await fs.promises.stat(sourceDir)).isDirectory()) {
    throw new Error(`cacheDir: sourceDir is not a directory`);
  }

  const destPath: string = await _createToolPath(tool, version, arch);
  for (const itemName of await fs.promises.readdir(sourceDir)) {
    const s = path.join(sourceDir, itemName);
    const d = path.join(destPath, itemName);
    await fs.promises.cp(s, d, { recursive: true });
    core.debug(`cacheDir: copied ${s} to ${d}`);
  }

  _completeToolPath(tool, version, arch);

  return destPath;
}

export const find = async (
  toolName: string,
  versionSpec: string,
  arch: string = os.arch(),
): Promise<string | undefined> => {
  if (!toolName) {
    throw new Error("toolName parameter is required");
  }

  if (!versionSpec) {
    throw new Error("versionSpec parameter is required");
  }

  // attempt to resolve an explicit version
  const spec = parse(versionSpec);
  const toolPath = path.join(_getCacheDirectory(), toolName);
  if (!fs.existsSync(toolPath)) {
    core.debug(`Cache directory not found ${toolPath}`);
    return undefined;
  }

  const versions = await fs.promises.readdir(toolPath);
  let cachePath: string | undefined;
  for (const v of versions) {
    if (!spec.satisfies(v) || spec.lt(v)) {
      continue;
    }

    const p = path.join(toolPath, v, arch);
    const markerPath = `${p}.complete`;
    if (!fs.existsSync(p) || !fs.existsSync(markerPath)) {
      continue;
    }
    cachePath = p;
  }

  if (cachePath) {
    core.debug(`Found tool in cache ${cachePath}`);
  } else {
    core.debug(
      `Unable to find tool in cache ${toolName} ${versionSpec} ${arch}`,
    );
  }
  return cachePath;
};

async function _createToolPath(
  tool: string,
  version: string,
  arch: string,
): Promise<string> {
  const folderPath = path.join(
    _getCacheDirectory(),
    tool,
    version.toString(),
    arch,
  );
  const markerPath = `${folderPath}.complete`;
  await fs.promises.rm(folderPath, { recursive: true, force: true });
  core.debug(`_createToolPath: removed ${folderPath}`);
  await fs.promises.rm(markerPath, { force: true });
  core.debug(`_createToolPath: removed ${markerPath}`);
  await fs.promises.mkdir(folderPath, { recursive: true });
  core.debug(`_createToolPath: created ${folderPath}`);
  return folderPath;
}

const _completeToolPath = async (
  tool: string,
  version: string,
  arch?: string,
): Promise<void> => {
  const folderPath = path.join(_getCacheDirectory(), tool, version, arch || "");
  const markerPath = `${folderPath}.complete`;
  await fs.promises.writeFile(markerPath, "");
  core.debug(`_completeToolPath: created ${markerPath}`);
};

/**
 * Gets cache directory prefix. The directory is located in the sub-directory
 * under RUNNER_TOOL_CACHE to avoid conflicts with tool-cache action.
 */
function _getCacheDirectory(): string {
  const cacheDirectory = process.env["RUNNER_TOOL_CACHE"] || "";
  ok(cacheDirectory, "Expected RUNNER_TOOL_CACHE to be defined");
  return path.join(cacheDirectory, "setup-chrome");
}
