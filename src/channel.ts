export type ChannelName = "stable" | "beta" | "dev" | "canary";
export const isChannelName = (version: string): version is ChannelName => {
  return (
    version === "stable" ||
    version === "beta" ||
    version === "dev" ||
    version === "canary"
  );
};
