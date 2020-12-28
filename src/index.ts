import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as installer from "./installer";
import { getPlatform } from "./platform";
import path from "path";

async function run(): Promise<void> {
  try {
    const version = core.getInput("chromium-version") || "latest";
    const platform = getPlatform();

    core.info(`Setup chromium ${version}`);

    const installDir = await installer.install(platform, version);

    core.addPath(path.join(installDir));
    core.info(`Successfully setup chromium version ${version}`);

    await exec.exec("chromium", ["--version"]);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
