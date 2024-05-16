import "./styles.css";
import '@mantine/core/styles.css';

import { atomWithStorage } from 'jotai/utils'
import { MantineProvider, ColorInput } from "@mantine/core";
import { useAtom } from "jotai";

const boxBackgroundColorAtom = atomWithStorage('boxBackgroundColor', '#00000000')
const flipCardBackgroundAtom = atomWithStorage('flipCardBackground', '#000000ff')
const textColorAtom = atomWithStorage('textColor', '#ffffffff')
const seperationColorAtom = atomWithStorage('seperationColor', '#000000ff')

export default function ColorPickMenu() {
    
    const [boxBackgroundColor, setboxBackgroundColor] = useAtom(boxBackgroundColorAtom);
    const [boxflipCardBackgroundAtom, setFlipCardBackgroundAtom] = useAtom(flipCardBackgroundAtom);
    const [textColor, setTextColor] = useAtom(textColorAtom);
    const [seperationColor, setSeperationColor] = useAtom(seperationColorAtom);

    return (
    <div style={{ marginLeft: '30px', marginRight: '30px', marginTop: '15px'  }}>
        <MantineProvider>
                <ColorInput
                    label="Box Background"
                    placeholder="Pick color"
                    value={boxBackgroundColor}
                    onChangeEnd={setboxBackgroundColor}
                    format="hexa"
                />
                <ColorInput
                    style={{ marginTop: '10px' }}
                    label="Flip Card Background"
                    value={boxflipCardBackgroundAtom}
                    onChangeEnd={setFlipCardBackgroundAtom}
                    placeholder="Pick color"
                    format="hexa"

                />
                <ColorInput
                    style={{ marginTop: '10px' }}
                    label="Text Color"
                    value={textColor}
                    onChangeEnd={setTextColor}
                    placeholder="Pick color"
                    format="hexa"
                />
                <ColorInput
                    style={{ marginTop: '10px' }}
                    label="Seperation Color"
                    value={seperationColor}
                    onChangeEnd={setSeperationColor}
                    placeholder="Pick color"
                    format="hexa"
                />
        </MantineProvider>
    </div>
    );
}

