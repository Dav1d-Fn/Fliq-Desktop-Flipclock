import "./styles.css";
import '@mantine/core/styles.css';

import { atomWithStorage } from 'jotai/utils'
import { MantineProvider, ColorInput, SimpleGrid, Slider, Text } from "@mantine/core";
import { useAtom } from "jotai";

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#1a1a1a00')
const boxRoundedAtom = atomWithStorage('boxRounded', 20)
const flipCardBackgroundAtom = atomWithStorage('flipCardBackground', '#000000ff')
const textColorAtom = atomWithStorage('textColor', '#ffffffff')
const seperationColorAtom = atomWithStorage('seperationColor', '#000000ff')
const flipcardRoundedAtom = atomWithStorage('flipcardRounded', 20)
const clockPaddingAtom = atomWithStorage('clockPadding', 0)

export default function ColorPickMenu() {
    
    const [boxBackgroundColor, setboxBackgroundColor] = useAtom(boxBackgroundColorAtom);
    const [boxRounded, setBoxRounded] = useAtom(boxRoundedAtom);
    const [flipCardBackground, setFlipCardBackgroundAtom] = useAtom(flipCardBackgroundAtom);
    const [textColor, setTextColor] = useAtom(textColorAtom);
    const [seperationColor, setSeperationColor] = useAtom(seperationColorAtom);
    const [flipcardRounded, setFlipcardRounded] = useAtom(flipcardRoundedAtom);
    const [clockPadding, setClockPadding] = useAtom(clockPaddingAtom);

    return (
    <div style={{ marginLeft: '30px', marginRight: '30px', marginTop: '15px'  }}>
        <MantineProvider>
            <SimpleGrid style={{marginTop: "30px"}} cols={2} spacing="lg" verticalSpacing="lg">
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
                            { value: 20, label: '20%' },
                            { value: 50, label: '50%' },
                            { value: 80, label: '80%' },
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
            </SimpleGrid>
        </MantineProvider>
    </div>
    );
}

