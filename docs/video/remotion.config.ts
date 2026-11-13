// Remotion settings for the showreel (reel/). The recorded clips, stills and sound are in out/,
// which is not committed: render-reel.sh fetches and records what is missing.
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./reel/index.ts");
Config.setPublicDir("./out");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
if (process.env.CHROME)
{
    Config.setBrowserExecutable(process.env.CHROME);
}
