import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { cacheDir, find } from "../src/cache";

const mkdir = (dir: string) => fs.promises.mkdir(dir, { recursive: true });
const touch = (file: string) => fs.promises.writeFile(file, "");
const expectDir = async (dir: string) =>
  expect((await fs.promises.stat(dir)).isDirectory()).toBeTruthy();
const expectFile = async (file: string) =>
  expect((await fs.promises.stat(file)).isFile()).toBeTruthy();

describe("find", () => {
  let tempToolCacheDir: string;
  beforeEach(async () => {
    tempToolCacheDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "setup-chrome-"),
    );
    process.env.RUNNER_TOOL_CACHE = tempToolCacheDir;
  });

  afterEach(async () => {
    await fs.promises.rm(tempToolCacheDir, { recursive: true });
  });

  describe("when several versions are cached", () => {
    beforeEach(async () => {
      const caches = [
        ["100.0.1.0", "x64"],
        ["100.1.0.0", "x64"],
        ["100.1.1.0", "x64"],
        ["100.2.0.0", "x64"],
        ["latest", "x64"],
        ["canary", "x64"],
        ["123456", "x64"],
        ["200000", "x64"],
        ["300000", "arm64"],
      ];
      for (const [version, arch] of caches) {
        const dir = path.join(
          tempToolCacheDir,
          "setup-chrome",
          "chrome",
          version,
          arch,
        );
        await mkdir(dir);
        await touch(`${dir}.complete`);
      }
    });

    test.each`
      version        | arch       | subdir
      ${"100.0.1.0"} | ${"x64"}   | ${"100.0.1.0/x64"}
      ${"100.1"}     | ${"x64"}   | ${"100.1.1.0/x64"}
      ${"100"}       | ${"x64"}   | ${"100.2.0.0/x64"}
      ${"latest"}    | ${"x64"}   | ${"latest/x64"}
      ${"canary"}    | ${"x64"}   | ${"canary/x64"}
      ${"123456"}    | ${"x64"}   | ${"123456/x64"}
      ${"300000"}    | ${"arm64"} | ${"300000/arm64"}
      ${"200"}       | ${"x64"}   | ${undefined}
      ${"stable"}    | ${"x64"}   | ${undefined}
    `("finds a tool in the cache", async ({ version, arch, subdir }) => {
      expect(await find("chrome", version, arch)).toBe(
        subdir && path.join(tempToolCacheDir, "setup-chrome", "chrome", subdir),
      );
    });
  });

  describe("when cache is empty", () => {
    test("cache is not found", async () => {
      expect(await find("chrome", "100", "x64")).toBeUndefined();
    });
  });

  describe("when cache includes corrupted cache", () => {
    beforeEach(async () => {
      const dir = path.join(tempToolCacheDir, "setup-chrome", "chrome");
      await mkdir(path.join(dir, "100.0.0.0", "x64"));
      await mkdir(`${path.join(dir, "100.0.0.0", "x64")}.complete`);
      await mkdir(path.join(dir, "100.1.0.0", "x64"));
      await mkdir(`${path.join(dir, "100.1.0.0", "x64")}.complete`);
      await mkdir(path.join(dir, "100.2.0.0", "x64"));
    });

    test("cache is not found", async () => {
      expect(await find("chrome", "100.2.0.0", "x64")).toBeUndefined();
    });

    test("corrupted cache is ignored", async () => {
      expect(await find("chrome", "100", "x64")).toBe(
        path.join(
          tempToolCacheDir,
          "setup-chrome",
          "chrome",
          "100.1.0.0",
          "x64",
        ),
      );
    });
  });
});

describe("cacheDir", () => {
  let tempToolCacheDir: string;
  let workspaceDir: string;
  beforeEach(async () => {
    tempToolCacheDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "setup-chrome-"),
    );
    workspaceDir = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "setup-chrome-"),
    );
    process.env.RUNNER_TOOL_CACHE = tempToolCacheDir;
  });

  afterEach(async () => {
    await fs.promises.rm(workspaceDir, { recursive: true });
    await fs.promises.rm(tempToolCacheDir, { recursive: true });
  });

  test("saves a tool in the cache", async () => {
    const caches = [
      ["100.0.0.0", "x64"],
      ["100.1.0.0", "arm64"],
      ["latest", "x64"],
    ];
    for (const [version, arch] of caches) {
      const src = path.join(workspaceDir, version);
      await mkdir(src);
      await touch(path.join(src, "file"));

      await cacheDir(src, "chrome", version, arch);
    }

    const prefix = path.join(tempToolCacheDir, "setup-chrome", "chrome");
    await expectDir(path.join(prefix, "100.0.0.0", "x64"));
    await expectFile(path.join(prefix, "100.0.0.0", "x64", "file"));
    await expectFile(`${path.join(prefix, "100.0.0.0", "x64")}.complete`);
    await expectDir(path.join(prefix, "100.1.0.0", "arm64"));
    await expectFile(path.join(prefix, "100.1.0.0", "arm64", "file"));
    await expectFile(`${path.join(prefix, "100.1.0.0", "arm64")}.complete`);
    await expectDir(path.join(prefix, "latest", "x64"));
    await expectFile(path.join(prefix, "latest", "x64", "file"));
  });
});
