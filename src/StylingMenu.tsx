import "./styles.css";
import '@mantine/core/styles.css';

import { atomWithStorage } from 'jotai/utils'
import { MantineProvider, ColorInput, SimpleGrid, Slider, Text, TextInput, Stack, HoverCard, Button, Divider, List, Group, Anchor } from "@mantine/core";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#1a1a1a00')
const boxRoundedAtom = atomWithStorage('boxRounded', 20)
const flipCardBackgroundAtom = atomWithStorage('flipCardBackground', '#000000ff')
const textColorAtom = atomWithStorage('textColor', '#ffffffff')
const seperationColorAtom = atomWithStorage('seperationColor', '#000000ff')
const flipcardRoundedAtom = atomWithStorage('flipcardRounded', 20)
const clockPaddingAtom = atomWithStorage('clockPadding', 0)
//clockWidth is an integer with represents the width of the window
const clockWidthAtom = atomWithStorage('clockWidth', 100)
const formatAtom = atomWithStorage("format","hhmmss")

export default function StylingMenu() {
    
    const [boxBackgroundColor, setboxBackgroundColor] = useAtom(boxBackgroundColorAtom);
    const [boxRounded, setBoxRounded] = useAtom(boxRoundedAtom);
    const [flipCardBackground, setFlipCardBackgroundAtom] = useAtom(flipCardBackgroundAtom);
    const [textColor, setTextColor] = useAtom(textColorAtom);
    const [seperationColor, setSeperationColor] = useAtom(seperationColorAtom);
    const [flipcardRounded, setFlipcardRounded] = useAtom(flipcardRoundedAtom);
    const [clockPadding, setClockPadding] = useAtom(clockPaddingAtom);
    const [clockWidth, setClockWidth] = useAtom(clockWidthAtom);
    
    const [format, setFormat] = useAtom(formatAtom);

    //const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => setFormat(event.currentTarget.value);
    const [tempFormat, setTempFormat] = useState(format);


    const dateFormat = [
        { format: 'YY', output: '18', description: 'Two-digit year' },
        { format: 'YYYY', output: '2018', description: 'Four-digit year' },
        { format: 'M', output: '1-12', description: 'The month, beginning at 1' },
        { format: 'MM', output: '01-12', description: 'The month, 2-digits' },
        { format: 'MMM', output: 'Jan-Dec', description: 'The abbreviated month name' },
        { format: 'MMMM', output: 'January-December', description: 'The full month name' },
        { format: 'D', output: '1-31', description: 'The day of the month' },
        { format: 'DD', output: '01-31', description: 'The day of the month, 2-digits' },
        { format: 'd', output: '0-6', description: 'The day of the week, with Sunday as 0' },
        { format: 'dd', output: 'Su-Sa', description: 'The min name of the day of the week' },
        { format: 'ddd', output: 'Sun-Sat', description: 'The short name of the day of the week' },
        { format: 'dddd', output: 'Sunday-Saturday', description: 'The name of the day of the week' },
        { format: 'H', output: '0-23', description: 'The hour' },
        { format: 'HH', output: '00-23', description: 'The hour, 2-digits' },
        { format: 'h', output: '1-12', description: 'The hour, 12-hour clock' },
        { format: 'hh', output: '01-12', description: 'The hour, 12-hour clock, 2-digits' },
        { format: 'm', output: '0-59', description: 'The minute' },
        { format: 'mm', output: '00-59', description: 'The minute, 2-digits' },
        { format: 's', output: '0-59', description: 'The second' },
        { format: 'ss', output: '00-59', description: 'The second, 2-digits' },
        { format: 'SSS', output: '', description: 'The millisecond, 3-digits' },
        { format: 'A', output: 'AM PM', description: 'The AM/PM designation' },
        { format: 'a', output: 'am pm', description: 'The lowercase AM/PM designation' },
    ];

    useEffect(() => {
        if (format) {
            setTempFormat(format);
        }
    }, [format]); // Update tempFormat whenever format changes

    const handleBlur = () => {
        setFormat(tempFormat);
    };
    
    return (
    <div style={{ marginLeft: '30px', marginRight: '30px', marginTop: '15px'  }}>
        <MantineProvider>
            <SimpleGrid style={{marginTop: "30px"}} cols={2} spacing="xl" verticalSpacing="lg">
                <Stack
                    gap="lg"
                >
                <div>
                    <HoverCard width={570}>
                        <HoverCard.Target>
                            <div>
                            <Text style={{marginBottom: "10px", color: "black"}} size="sm" fw={500}>Format</Text>
                            <TextInput
                                value={tempFormat}
                                onChange={(event) => setTempFormat(event.currentTarget.value)}
                                onBlur={handleBlur}
                            />
                            </div>
                        </HoverCard.Target>
                         <HoverCard.Dropdown>

                        <Group>
                        <Text size="sm" fw={500}>Date/Time Format Codes</Text>
                        </Group>
                        <Anchor href="https://day.js.org/docs/en/display/format" target="_blank">
                            Official Documentation (Day.JS)
                        </Anchor>
                        <Divider my="sm" />

                        <List spacing="xs">
                        <SimpleGrid cols={2} spacing="xs" verticalSpacing="xs">
                        {dateFormat.map((item) => (
                            <List.Item key={item.format}>
                                <Text>
                                    <b>{item.format}</b> - {item.output}
                                </Text>
                                <Text size="sm">
                                    {item.description}
                                </Text>
                            </List.Item>
                        ))}
                        </SimpleGrid>
                        </List>
                        </HoverCard.Dropdown>
                    </HoverCard>
                    
                </div>
                <ColorInput
                    label="Box Background"
                    placeholder="Pick color"
                    value={boxBackgroundColor}
                    onChangeEnd={setboxBackgroundColor}
                    format="hexa"
                />
                <ColorInput
                    label="Text Color"
                    value={textColor}
                    onChangeEnd={setTextColor}
                    placeholder="Pick color"
                    format="hexa"
                />
                <ColorInput
                    label="Flip Card Background"
                    value={flipCardBackground}
                    onChangeEnd={setFlipCardBackgroundAtom}
                    placeholder="Pick color"
                    format="hexa"

                />
                <ColorInput
                    label="Seperation Color"
                    value={seperationColor}
                    onChangeEnd={setSeperationColor}
                    placeholder="Pick color"
                    format="hexa"
                />
                </Stack>
                <Stack
                    gap="lg"
                >
                <div>
                    <Text style={{marginBottom: "10px", color: "black"}} size="sm" fw={500}>Clock Size</Text>
                    <Slider
                        value={clockWidth} 
                        onChange={setClockWidth} 
                        color="blue"
                        size="lg"
                        marks={[
                            { value: 20, label: '20%' },
                            { value: 50, label: '50%' },
                            { value: 80, label: '80%' },
                        ]}
                    />
                </div>
                <div>
                    <Text style={{marginBottom: "10px", color: "black"}} size="sm" fw={500}>Flip Card rounded</Text>
                    <Slider
                        value={flipcardRounded} 
                        onChange={setFlipcardRounded} 
                        color="blue"
                        size="lg"
                        marks={[
                            { value: 20, label: '20%' },
                            { value: 50, label: '50%' },
                            { value: 80, label: '80%' },
                        ]}
                    />
                </div>
                <div>
                    <Text style={{marginBottom: "10px", color: "black"}} size="sm" fw={500}>Box Background rounded</Text>
                    <Slider
                        value={boxRounded} 
                        onChange={setBoxRounded}
                        color="blue"
                        size="lg"
                        marks={[
                            { value: 20, label: '20px' },
                            { value: 50, label: '50px' },
                            { value: 80, label: '80px' },
                        ]}
                    />
                </div>
                <div>
                    <Text style={{marginBottom: "10px", color: "black"}} size="sm" fw={500}>Box Margin</Text>
                    <Slider
                        value={clockPadding} 
                        onChange={setClockPadding} 
                        color="blue"
                        size="lg"
                        marks={[
                            { value: 20, label: '20%' },
                            { value: 50, label: '50%' },
                            { value: 80, label: '80%' },
                        ]}
                    />
                </div>
                </Stack>
            </SimpleGrid>
        </MantineProvider>
    </div>
    );
}

