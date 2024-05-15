import path from "node:path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { installDependencies } from "./dependencies";
import * as installer from "./installer";
import { OS, type Platform, getPlatform } from "./platform";

const hasErrorMessage = (e: unknown): e is { message: string | Error } => {
  return typeof e === "object" && e !== null && "message" in e;
};

const testVersion = async (
  platform: Platform,
  bin: string,
): Promise<string> => {
  if (platform.os === OS.WINDOWS) {
    const output = await exec.getExecOutput("powershell", [
      "-Command",
      `(Get-Item (Get-Command '${bin}').Source).VersionInfo.ProductVersion`,
    ]);
    if (output.exitCode !== 0) {
      throw new Error(
        `shell exits with status ${output.exitCode}: ${output.stderr}`,
      );
    }
    return output.stdout.trimStart().trimEnd();
  }

  const output = await exec.getExecOutput(`"${bin}"`, ["--version"], {});
  if (output.exitCode !== 0) {
    throw new Error(
      `chromium exits with status ${output.exitCode}: ${output.stderr}`,
    );
  }
  if (
    !output.stdout.startsWith("Chromium ") &&
    !output.stdout.startsWith("Google Chrome ")
  ) {
    throw new Error(`chromium outputs unexpected results: ${output.stdout}`);
  }
  return output.stdout
    .replace("Chromium ", "")
    .replace("Google Chrome ", "")
    .split(" ", 1)[0];
};

async function run(): Promise<void> {
  try {
    const version = core.getInput("chrome-version") || "latest";
    const platform = getPlatform();
    const flagInstallDependencies =
      core.getInput("install-dependencies") === "true";
    const noSudo = core.getInput("no-sudo") === "true";

    if (flagInstallDependencies) {
      core.info("Installing dependencies");
      await installDependencies(platform, { noSudo });
    }

    core.info(`Setup chromium ${version}`);

    const binPath = await installer.install(platform, version);
    const installDir = path.dirname(binPath);

    core.addPath(path.join(installDir));

    const actualVersion = await testVersion(platform, binPath);

    core.info(`Successfully setup chromium version ${actualVersion}`);

    core.setOutput("chrome-version", actualVersion);
    core.setOutput("chrome-path", binPath);
  } catch (error) {
    if (hasErrorMessage(error)) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();
