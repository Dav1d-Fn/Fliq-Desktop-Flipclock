// Importing necessary libraries and styles
import "../styles/styles.css";
import "@mantine/core/styles.css";
import { LOCALE_OPTIONS, DATETIME_FORMATS, SLIDER_CONFIGS, WEATHER_FORMATS, TEMPERATURE_UNIT_OPTIONS, FONT_OPTIONS } from "../definitions";
import { MantineProvider, ColorInput, Slider, Text, TextInput, Stack, Divider, Group, Anchor, Select, Switch, Textarea, Card, Space, ThemeIcon, Title, ScrollArea, Code, Badge, Table, Collapse, ActionIcon, rem, SelectProps} from "@mantine/core";
import { useAtom } from "jotai";
import { ATOMS } from "./atoms";
import { ReactNode, useEffect, useState } from "react";
import { IconBrandGithub, IconChevronDown, IconChevronRight, IconExternalLink, IconReload } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

/**
 * StylingMenu component - Handles all visual customization settings
 * Uses Jotai atoms for persistent state management and Mantine for UI components
 */
export default function StylingMenu() {
  // State management using Jotai atoms
  const [boxBgColor, setBoxBgColor] = useAtom(ATOMS.BOX_BACKGROUND);
  const [boxRadius, setBoxRadius] = useAtom(ATOMS.BOX_RADIUS);
  const [flipcardBg, setFlipcardBg] = useAtom(ATOMS.FLIPCARD_BACKGROUND);
  const [clockTextColor, setClockTextColor] = useAtom(ATOMS.CLOCK_TEXT_COLOR);
  const [clockTextSize, setClockTextSize] = useAtom(ATOMS.CLOCK_TEXT_SIZE);
  const [clockSeparatorColor, setClockSeparatorColor] = useAtom(ATOMS.CLOCK_SEPARATOR_COLOR);
  const [flipcardRadius, setFlipcardRadius] = useAtom(ATOMS.FLIPCARD_RADIUS);
  const [clockPadding, setClockPadding] = useAtom(ATOMS.CLOCK_PADDING);
  const [format, setFormat] = useAtom(ATOMS.TIME_FORMAT);
  const [separatorString, setSeparatorString] = useAtom(ATOMS.SEPARATOR_STRING);
  const [language, setLanguage] = useAtom(ATOMS.LANGUAGE);

  // Text related settings
  const [textFont, setTextFont] = useAtom(ATOMS.TEXT_FONT);
  const [textColor, setTextColor] = useAtom(ATOMS.TEXT_COLOR);

  // Weather related
  const [weatherLocation, setWeatherLocation] = useAtom(ATOMS.WEATHER_LOCATION);
  const [weatherUnit, setWeatherUnit] = useAtom(ATOMS.WEATHER_UNIT);

  // Second row settings
  const [secondRowEnabled, setSecondRowEnabled] = useAtom(ATOMS.SECOND_ROW_ENABLED);
  const [secondRowClockTextSize, setSecondRowClockTextSize] = useAtom(ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE);
  const [secondRowTimeFormat, setSecondRowTimeFormat] = useAtom(ATOMS.SECOND_ROW_TIME_FORMAT);
  const [secondRowGap, setSecondRowGap] = useAtom(ATOMS.SECOND_ROW_GAP);

  // Temporary states for input validation
  const [tempFormat, setTempFormat] = useState(format);
  const [tempWeatherLocation, setTempWeatherLocation] = useState(weatherLocation);
  const [tempSecondRowTimeFormat, setTempSecondRowTimeFormat] = useState(secondRowTimeFormat);
  const [tempSeparatorString, setTempSeparatorString] = useState(separatorString);

  // Local states for smooth slider interactions
  const [textSizeSlider, setTextSizeSlider] = useState(clockTextSize);
  const [paddingSlider, setPaddingSlider] = useState(clockPadding);

  /** Sync local states with atom values on mount */
  useEffect(() => {
    setTempFormat(format);
    setTempSecondRowTimeFormat(secondRowTimeFormat);
    setTempSeparatorString(separatorString);
    setTextSizeSlider(clockTextSize);
    setPaddingSlider(clockPadding);
  }, [format, separatorString, clockTextSize, clockPadding, secondRowTimeFormat]);

  // Render für jede Option im Dropdown
  const renderFontOption: SelectProps['renderOption'] = ({ option }) => (
    <Group style={{ fontFamily: option.value }} flex="1" gap="xs">
      {option.label}
    </Group>
  );

  function DisplayFormatHelpCard() {
    const [opened, { toggle }] = useDisclosure(false);

    return (
      <Card shadow="sm" radius="md" withBorder>
        <Group align="center">
          <Title order={4}>Display Format Help</Title>
          <ActionIcon
            onClick={toggle}
            variant="subtle"
            aria-label="Toggle help section"
          >
            {opened ? (
              <IconChevronDown color="green" style={{ width: rem(18), height: rem(18) }} />
            ) : (
              <IconChevronRight color="green" style={{ width: rem(18), height: rem(18) }} />
            )}
          </ActionIcon>
        </Group>
        <Collapse in={opened}>
        <Divider my="sm" />
          <Stack>
            <Text size="sm">
              You can customize the clock display by combining fixed text with dynamic placeholders.
            </Text>

            <Divider label="Available Placeholders" labelPosition="left" my="xs" />

            <Group mb="xs" wrap="wrap">
              <Badge variant="light" color="blue">
                $TIME(format)
              </Badge>
              <Badge variant="light" color="blue">
                $FLIPTIME(format)
              </Badge>
              <Badge variant="light" color="green">
                $TEXT(content)
              </Badge>
              <Badge variant="light" color="orange">
                $WEATHER(key)
              </Badge>
            </Group>

            <Text size="sm">
              Example:{' '}
              <Code>$FLIPTIME(HH:mm:ss) $TEXT(My Clock) $WEATHER(tempEmoji)</Code>
            </Text>

            <Divider label="$TIME / $FLIPTIME Formats (Day.js)" labelPosition="left" mt="md" />

            <ScrollArea h={200}>
              <Table striped highlightOnHover withColumnBorders>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Format</Table.Th>
                    <Table.Th>Output</Table.Th>
                    <Table.Th>Description</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {DATETIME_FORMATS.map((row) => (
                    <Table.Tr key={row.format}>
                      <Table.Td>
                        <Code>{row.format}</Code>
                      </Table.Td>
                      <Table.Td>{row.output}</Table.Td>
                      <Table.Td>{row.description}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            {/* Day.js Documentation Link */}
            <CustomAnchor
              url="https://day.js.org/docs/en/display/format"
              text="Official Day.js Documentation"
              icon={<IconExternalLink size={16} />}
            />
            
            <Divider label="$WEATHER format keys" labelPosition="left" mt="md" />
            <ScrollArea h={200}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Key</Table.Th>
                    <Table.Th>Example Output</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {WEATHER_FORMATS.map((row) => (
                    <Table.Tr key={row.key}>
                      <Table.Td>
                        <Code>{row.key}</Code>
                      </Table.Td>
                      <Table.Td>{row.example}</Table.Td>
                      <Table.Td>{row.description}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Stack>
        </Collapse>
      </Card>
    );
  }

  return (
    <div style={{ margin: "15px 30px 0"}}>
      <MantineProvider>
        {/* <SimpleGrid cols={1} spacing="xl" verticalSpacing="50px" mt={30}> */}
          {/* Left Column - Color Inputs and Format Settings */}
          <Stack gap="lg">
            {/* General Settings */}
            <Card shadow="sm" radius="md" withBorder>
              <Title order={4}>General Settings</Title>
              <Divider my="sm" />
              <Group grow mt={"md"}>
                <Select
                  label="Language"
                  value={language}
                  onChange={(value) => {
                    if (value) setLanguage(value);
                  }}
                  data={LOCALE_OPTIONS.map((loc) => ({ value: loc.code, label: loc.name }))}
                  labelProps={{ style: { marginBottom: 12 } }}
                />
                <ColorInput
                  label="Background Color"
                  value={boxBgColor}
                  onChangeEnd={setBoxBgColor}
                  format="hexa"
                  aria-label="Container background color picker"
                  labelProps={{ style: { marginBottom: 12 } }}
                />
              </Group>
              <Group grow mt={"md"}>
                <SliderControl
                  label="Background Rounding"
                  value={boxRadius}
                  onChange={setBoxRadius}
                  {...SLIDER_CONFIGS.RADIUS}
                />
                <SliderControl
                  label="Padding"
                  value={paddingSlider}
                  onChange={setClockPadding}
                  onChangeEnd={setClockPadding}
                  {...SLIDER_CONFIGS.PADDING}
                />
              </Group>
              <Space h="xs" />
              <Group grow mt={"md"}>
                {/* Font input */}
                <Select
                  label="Text Font"
                  value={textFont}
                  onChange={(value) => value && setTextFont(value)}
                  data={FONT_OPTIONS}
                  renderOption={renderFontOption}
                  labelProps={{ style: { marginBottom: 12 } }}
                />
                {/* Text Color Input */}
                <ColorInput
                  label="Text Color"
                  value={textColor}
                  onChangeEnd={setTextColor}
                  format="hexa"
                  aria-label="Separator color picker"
                  labelProps={{ style: { marginBottom: 12 } }}
                />
              </Group>  
            </Card>
            {/* Display Format Help Card */}
            {DisplayFormatHelpCard()}
            {/* First Line Settings */}
            <Card shadow="sm" radius="md" withBorder>
              <Title order={4}>First Line Settings</Title>
              <Divider my="sm" />
              {/* <Group grow align="start"> */}
                {/* First Line Size */}
                <SliderControl
                  label="Size"
                  value={textSizeSlider}
                  onChange={setClockTextSize}
                  onChangeEnd={setClockTextSize}
                  {...SLIDER_CONFIGS.TEXT_SIZE}
                />
                <Space h="xl" />
                {/* First Line Display Format Input */}
                <div>
                  <Group align="center" mb={6} style={{ gap: 10 }}>
                    <Text size="sm" fw={500} style={{ lineHeight: 1 }}>
                      Display Format
                    </Text>
                    <ActionIcon
                      size="xs"
                      color="green"
                      variant="white"
                      onClick={() => setFormat('$FLIPTIME(HH:mm:ss)')}
                      aria-label="Restore default format"
                      title="Restore default format"
                    >
                      <IconReload size={14} />
                    </ActionIcon>
                  </Group>
                  <Space h="xs" />
                  <Textarea
                    value={tempFormat}
                    onChange={(event) => setTempFormat(event.currentTarget.value)}
                    onBlur={() => setFormat(tempFormat)}
                    aria-label="Display Format"
                  />
                </div>
              {/* </Group> */}
            </Card>
            {/* Second Line Settings */}
            <Card shadow="sm" radius="md" withBorder>
              <Title order={4}>Second Line Settings</Title>
              <Divider my="sm" />
              <Switch
                checked={secondRowEnabled}
                onChange={(event) => setSecondRowEnabled(event.currentTarget.checked)}
                color="teal"
                size="sm"
                label="Enable Second Row"
                mb="md"
              />
              <Group grow>
                {/* Gap to Second Row Slider */}
                <SliderControl
                  label="Gap Size"
                  value={secondRowGap}
                  onChange={setSecondRowGap}
                  onChangeEnd={setSecondRowGap}
                  disabled={!secondRowEnabled}
                  {...SLIDER_CONFIGS.PADDING}
                />
                {/* Second Line Size Slider */}
                <SliderControl
                  label="Size"
                  value={secondRowClockTextSize}
                  onChange={setSecondRowClockTextSize}
                  onChangeEnd={setSecondRowClockTextSize}
                  disabled={!secondRowEnabled}
                  {...SLIDER_CONFIGS.TEXT_SIZE}
                />
              </Group>

              <Space h="lg" />

              <div>
                <Space h="lg" />
                <Group align="center" mb={6} style={{ gap: 10 }}>
                  <Text size="sm" fw={500} style={{ lineHeight: 1 }}>
                    Display Format
                  </Text>
                  <ActionIcon
                    size="xs"
                    color="green"
                    variant="white"
                    disabled={!secondRowEnabled}
                    onClick={() => setSecondRowTimeFormat('$TIME(dddd, DD.MM) $TEXT( ) $WEATHER(feelsLikeEmoji) $TEXT( ) $WEATHER(nextSun)')}
                    aria-label="Restore default format"
                    title="Restore default format"
                  >
                    <IconReload size={14} />
                  </ActionIcon>
                </Group>
                <Textarea
                  value={tempSecondRowTimeFormat}
                  onChange={(event) => setTempSecondRowTimeFormat(event.currentTarget.value)}
                  onBlur={() => setSecondRowTimeFormat(tempSecondRowTimeFormat)}
                  aria-label="Time format input"
                  disabled={!secondRowEnabled}
                  minRows={4}
                />
              </div>
            </Card>
            {/* Flipcard Settings */}
            <Card shadow="sm" radius="md" withBorder>
              <Title order={4}>$FLIPTIME Settings</Title>
              <Divider my="sm" />
              <Group grow>
                {/* Separator Color Input */}
                <ColorInput
                  label="Separator Color"
                  value={clockSeparatorColor}
                  onChangeEnd={setClockSeparatorColor}
                  format="hexa"
                  aria-label="Separator color picker"
                  labelProps={{ style: { marginBottom: 12 } }}
                />
                {/* Text Color */}
                <ColorInput
                  label="Text Color"
                  value={clockTextColor}
                  onChangeEnd={setClockTextColor}
                  format="hexa"
                  aria-label="Text color picker"
                  labelProps={{ style: { marginBottom: 12 } }}
                />
                <ColorInput
                  label="Flip Card Background"
                  value={flipcardBg}
                  onChangeEnd={setFlipcardBg}
                  format="hexa"
                  aria-label="Flip card background color picker"
                  labelProps={{ style: { marginBottom: 12 } }}
                />
              </Group>
              <Group grow mt="md">
                <SliderControl
                  label="Rounding (%)"
                  value={flipcardRadius}
                  onChange={setFlipcardRadius}
                  {...SLIDER_CONFIGS.RADIUS}
                />
                {/* Separator Character Input */}
                <div>
                  <Text mb={10} size="sm" fw={500}>Separator Characters</Text>
                  <TextInput
                    value={tempSeparatorString}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setTempSeparatorString(e.currentTarget.value)
                    }
                    onBlur={() => setSeparatorString(tempSeparatorString)}
                    aria-label="Separator characters input"
                    labelProps={{ style: { marginBottom: 12 } }}
                  />
                </div>
              </Group>
              <Space h="sm" />
            </Card>
            {/* Weather Settings */}
            <Card shadow="sm" radius="md" withBorder>
              <Title order={4}>$WEATHER Settings</Title>
              <Divider my="sm" />
              <Group grow>
                <Select
                  label="Weather Unit"
                  value={weatherUnit}
                  onChange={(value) => {
                    if (value) setWeatherUnit(value);
                  }}
                  data={TEMPERATURE_UNIT_OPTIONS.map((unit) => ({ value: unit.value, label: unit.label }))}
                  labelProps={{ style: { marginBottom: 12 } }}
                />
                <TextInput
                  label="Location"
                  labelProps={{ style: { marginBottom: 12 } }} 
                  placeholder="Leave empty for automatic detection."
                  value={tempWeatherLocation}
                  onChange={(event) => setTempWeatherLocation(event.currentTarget.value)}
                  onBlur={() => setWeatherLocation(tempWeatherLocation)}
                />
              </Group>
            </Card>
            <Group grow>
              {/* Koffin Link */}
              <CustomAnchor
                url="https://ko-fi.com/davidfn"
                text="Support on Ko-fi"
                icon={
                  <img
                    src="/KofiPour_112.png"
                    alt="Ko-fi"
                    style={{ width: 16, height: 16 }}
                  />
                }
              />
              {/* GitHub Link */}
              <CustomAnchor
                url="https://github.com/Dav1d-Fn/desktop-flipclock"
                text="View on GitHub"
                version="1.2.0"
                icon={<IconBrandGithub size={16} />}
              />
            </Group>
            <Space h="xs" />
          </Stack>
      </MantineProvider>
    </div>
  );
}

/**
 * Reusable slider component with consistent configuration
 */
interface SliderControlProps {
  label: string;
  unit: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  min: number;
  max: number;
  marks: number[];
}

function SliderControl({
  label,
  unit,
  value,
  onChange,
  onChangeEnd,
  min,
  max,
  marks,
  disabled = false
}: SliderControlProps) {
  return (
    <div >
      <Text mb={10} size="sm" fw={500}>{label}</Text>
      <Slider
        value={value}
        onChange={onChange}
        onChangeEnd={onChangeEnd}
        disabled={disabled}
        min={min}
        max={max}
        color="green"
        size="lg"
        marks={marks.map(value => ({
          value,
          label: `${value}${unit}`
        }))}
        aria-label={`${label} control`}
      />
    </div>
  );
}

interface CustomAnchorProps {
  url: string;
  text: string;
  version?: string;
  icon: ReactNode; // Icon als React-Komponente
}

export function CustomAnchor({ url, text, version, icon }: CustomAnchorProps) {
  return (
    <Anchor
      href={url}
      target="_blank"
      underline="never"
      style={{
        display: 'inline-block',
        padding: '8px 12px',
        borderRadius: 8,
        backgroundColor: '#f9f9f9',
        transition: 'background-color 0.2s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f0f0f0';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#f9f9f9';
      }}
    >
      <Group justify="flex-end">
        <ThemeIcon variant="light" radius="xl" size={24}>
          {icon}
        </ThemeIcon>
        <Text size="sm" color="dimmed">
          {text}
        </Text>
        {version && (
          <Text size="sm" fw={700} color="gray">
            {version}
          </Text>
        )}
      </Group>
    </Anchor>
  );
}