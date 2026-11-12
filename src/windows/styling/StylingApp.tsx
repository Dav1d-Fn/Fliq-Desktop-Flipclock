import "../../styles/styles.css";
import "@mantine/core/styles.css";
import "./styling.css";

import { MantineProvider, Space, Stack } from "@mantine/core";
import { FirstRowSection } from "./sections/FirstRowSection";
import { FlipCardSection } from "./sections/FlipCardSection";
import { FormatHelpSection } from "./sections/FormatHelpSection";
import { GeneralSection } from "./sections/GeneralSection";
import { LinksSection } from "./sections/LinksSection";
import { SecondRowSection } from "./sections/SecondRowSection";
import { WeatherSection } from "./sections/WeatherSection";

// The styling window. Every section reads and writes the settings atoms directly; the clock
// window follows through the shared localStorage.
export default function StylingApp()
{
    return (
        <div style={{ margin: "15px 30px 0" }}>
            <MantineProvider>
                <Stack gap="lg">
                    <GeneralSection />
                    <FormatHelpSection />
                    <FirstRowSection />
                    <SecondRowSection />
                    <FlipCardSection />
                    <WeatherSection />
                    <LinksSection />
                    <Space h="xs" />
                </Stack>
            </MantineProvider>
        </div>
    );
}
