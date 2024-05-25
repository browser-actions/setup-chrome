import * as fs from "node:fs";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import { afterEach, describe, expect, test, vi } from "vitest";
import { WindowsChannelInstaller } from "../src/channel_windows";

const fsStatSpy = vi.spyOn(fs.promises, "stat");
const fsRenameSpy = vi.spyOn(fs.promises, "rename");
const tcDownloadToolSpy = vi.spyOn(tc, "downloadTool");
const execSpy = vi.spyOn(exec, "exec");

afterEach(() => {
  vi.resetAllMocks();
});

describe("WindowsChannelInstaller", () => {
  const installer = new WindowsChannelInstaller({
    os: "windows",
    arch: "amd64",
  });

  describe("checkInstalled", () => {
    test("returns undefined if the root directory does not exist", async () => {
      const result = await installer.checkInstalled("stable");
      expect(result).toBe(undefined);
    });

    test("returns the root directory and bin path if the root directory exists", async () => {
      fsStatSpy.mockResolvedValue(undefined);

      const result = await installer.checkInstalled("stable");
      expect(result).toEqual({
        root: "C:\\Program Files\\Google\\Chrome\\Application",
        bin: "chrome.exe",
      });
      expect(fsStatSpy).toHaveBeenCalledWith(
        "C:\\Program Files\\Google\\Chrome\\Application",
      );
    });
  });

  describe("downloadBrowser", () => {
    test("throws an error if the version is not a release channel name", async () => {
      await expect(installer.downloadBrowser("foo")).rejects.toThrow(
        "Unexpected version: foo",
      );
    });

    test("downloads the stable version of Chrome", async () => {
      tcDownloadToolSpy.mockResolvedValue("C:\\path\\to\\downloaded\\file");
      fsRenameSpy.mockResolvedValue(undefined);

      await installer.downloadBrowser("stable");
      expect(tcDownloadToolSpy).toHaveBeenCalled();
    });
  });

  describe("installBrowser", () => {
    test("throws an error if the version is not a release channel name", async () => {
      expect(() =>
        installer.installBrowser(
          "foo",
          "C:\\path\\to\\downloaded\\installer.exe",
        ),
      ).rejects.toThrow("Unexpected version: foo");
    });

    test("install the stable version of Chrome", async () => {
      execSpy.mockResolvedValue(undefined);
      fsRenameSpy.mockResolvedValue(undefined);

      const result = await installer.installBrowser(
        "stable",
        "C:\\path\\to\\downloaded\\installer.exe",
      );
      expect(result).toEqual({
        root: "C:\\Program Files\\Google\\Chrome\\Application",
        bin: "chrome.exe",
      });
      expect(execSpy).toHaveBeenCalledWith(
        "C:\\path\\to\\downloaded\\installer.exe",
        ["/silent", "/install"],
      );
    });
  });

  describe("unsupported platform", () => {
    test("throws an error if the platform is not supported", async () => {
      const installer2 = new WindowsChannelInstaller({
        os: "windows",
        arch: "arm64",
      });
      await expect(installer2.downloadBrowser("stable")).rejects.toThrow(
        'Chrome stable not supported for platform "windows" "arm64"',
      );
    });
  });
});
