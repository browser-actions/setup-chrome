import { isReleaseChannelName, parse } from "../src/version";

describe("isReleaseChannelName", () => {
  test("return true if the version is a release channel name", () => {
    expect(isReleaseChannelName("stable")).toBe(true);
    expect(isReleaseChannelName("beta")).toBe(true);
    expect(isReleaseChannelName("dev")).toBe(true);
    expect(isReleaseChannelName("canary")).toBe(true);
    expect(isReleaseChannelName("latest")).toBe(false);
    expect(isReleaseChannelName("unknown")).toBe(false);
  });
});

describe("parse", () => {
  test.each([
    [
      "119.0.6045.123",
      { type: "four-parts", major: 119, minor: 0, build: 6045, patch: 123 },
    ],
    ["119.0.6045", { type: "four-parts", major: 119, minor: 0, build: 6045 }],
    ["119.0", { type: "four-parts", major: 119, minor: 0 }],
    ["119", { type: "four-parts", major: 119 }],
    ["119.0.6045.x", { type: "four-parts", major: 119, minor: 0, build: 6045 }],
    ["119.0.x", { type: "four-parts", major: 119, minor: 0 }],
    ["119.x", { type: "four-parts", major: 119 }],
    ["latest", { type: "latest" }],
    ["beta", { type: "channel", channel: "beta" }],
    ["stable", { type: "channel", channel: "stable" }],
    ["canary", { type: "channel", channel: "canary" }],
    ["123456", { type: "snapshot", snapshot: 123456 }],
  ])("parse %s", (version, expected) => {
    const v = parse(version);
    expect(v.value).toEqual(expected);
  });

  test.each([
    ["119.0.6045.beta"],
    ["119.0.x.123"],
    ["x"],
    ["119.0.6045.123.456"],
    ["119.0.6045.-123"],
    [""],
    ["invalid"],
  ])("throw an error for %s", (version) => {
    expect(() => parse(version)).toThrow(`Invalid version: ${version}`);
  });
});

describe("VersionSpec", () => {
  describe("toString", () => {
    test.each([
      ["119.0.6045.123", "119.0.6045.123"],
      ["119", "119"],
      ["latest", "latest"],
      ["123456", "123456"],
    ])("return %s for %s", (spec, expected) => {
      const v = parse(spec);
      expect(v.toString()).toBe(expected);
    });
  });

  describe("satisfies", () => {
    test.each`
      spec                | target              | satisfies
      ${"119.0.6045.123"} | ${"119.0.6045.123"} | ${true}
      ${"119.0.6045"}     | ${"119.0.6045.123"} | ${true}
      ${"119"}            | ${"119.0.6045.123"} | ${true}
      ${"119.0.6045.123"} | ${"119.0.6045.100"} | ${false}
      ${"119.0.6000"}     | ${"119.0.6045.100"} | ${false}
      ${"120"}            | ${"119.0.6045.100"} | ${false}
      ${"latest"}         | ${"119.0.6045.100"} | ${false}
      ${"latest"}         | ${"latest"}         | ${true}
      ${"123456"}         | ${"123456"}         | ${true}
      ${"123456"}         | ${"123457"}         | ${false}
    `("return if $spec satisfies $target", ({ spec, target, satisfies }) => {
      const v = parse(spec);
      expect(v.satisfies(target)).toBe(satisfies);
    });
  });

  describe("compare", () => {
    test.each`
      a                   | b                   | gt       | lt
      ${"119.0.6045.123"} | ${"119.0.6045.123"} | ${false} | ${false}
      ${"119.0.6045.123"} | ${"119.0.6045.100"} | ${true}  | ${false}
      ${"119.0.6045.123"} | ${"119.0.6045.200"} | ${false} | ${true}
      ${"119.0.6045.123"} | ${"119.0.7000.100"} | ${false} | ${true}
      ${"119.0.6045.123"} | ${"119.0.5000.100"} | ${true}  | ${false}
      ${"119.0.6045.123"} | ${"119.1.6045.100"} | ${false} | ${true}
      ${"119.0.6045.123"} | ${"120.0.6045.100"} | ${false} | ${true}
      ${"119.0.6045.123"} | ${"118.0.6045.100"} | ${true}  | ${false}
      ${"119.0.6045.123"} | ${"119.0.6045.122"} | ${true}  | ${false}
      ${"119"}            | ${"119.0.6045.123"} | ${false} | ${false}
      ${"123456"}         | ${"123456"}         | ${false} | ${false}
      ${"123456"}         | ${"123457"}         | ${false} | ${true}
      ${"latest"}         | ${"latest"}         | ${false} | ${false}
      ${"latest"}         | ${"stable"}         | ${false} | ${false}
      ${"119.0.6045.123"} | ${"latest"}         | ${false} | ${false}
    `('compare "$a" and "$b"', ({ a, b, gt, lt }) => {
      const v1 = parse(a);

      expect(v1.gt(b)).toBe(gt);
      expect(v1.lt(b)).toBe(lt);
    });
  });
});
