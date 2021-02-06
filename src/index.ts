import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as io from "@actions/io";
import * as installer from "./installer";
import fs from "fs";
import { getPlatform, OS } from "./platform";
import path from "path";

async function run(): Promise<void> {
  try {
    const version = core.getInput("chromium-version") || "latest";
    const platform = getPlatform();

    core.info(`Setup chromium ${version}`);

    const binPath = await installer.install(platform, version);
    const installDir = path.dirname(binPath);
    const binName = path.basename(binPath);

    core.addPath(path.join(installDir));
    core.info(`Successfully setup chromium version ${version}`);

    if (platform.os === OS.WINDOWS) {
      // Unable to run with command-line option on windows
      await io.which("chrome", true);
    } else if (platform.os === OS.DARWIN || platform.os === OS.LINUX) {
      await exec.exec(binName, ["--version"]);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
