import Tick from "@pqina/flip";
import "@pqina/flip/dist/flip.min.css";
import "../styles/flipclockstyles.css";
import React, { useEffect, useRef, useState } from "react";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";
import { ATOMS } from "./atoms";
import dayjs from "dayjs";

// language imports:
import 'dayjs/locale/en';
import 'dayjs/locale/de';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import 'dayjs/locale/it';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh';
import 'dayjs/locale/ja';
import 'dayjs/locale/sv';
import 'dayjs/locale/pl';

export default function FlipClock({ format, secondRowTimeFormat }) {
  // State management using Jotai atoms
  const [boxBgColor, setBoxBgColor] = useAtom(ATOMS.BOX_BACKGROUND);
  const [boxRadius, setBoxRadius] = useAtom(ATOMS.BOX_RADIUS);
  const [flipcardBg, setFlipcardBg] = useAtom(ATOMS.FLIPCARD_BACKGROUND);
  const [clockTextColor, setClockTextColor] = useAtom(ATOMS.CLOCK_TEXT_COLOR);
  const [clockTextSize, setClockTextSize] = useAtom(ATOMS.CLOCK_TEXT_SIZE);
  const [clockSeparatorColor, setClockSeparatorColor] = useAtom(ATOMS.CLOCK_SEPARATOR_COLOR);
  const [flipcardRadius, setFlipcardRadius] = useAtom(ATOMS.FLIPCARD_RADIUS);
  const [clockPadding, setClockPadding] = useAtom(ATOMS.CLOCK_PADDING);
  const [separatorString, setSeparatorString] = useAtom(ATOMS.SEPARATOR_STRING);
  const [language, setLanguage] = useAtom(ATOMS.LANGUAGE);
  dayjs.locale(language);

  // Second row settings (if applicable)
  const [secondRowEnabled, setSecondRowEnabled] = useAtom(ATOMS.SECOND_ROW_ENABLED);
  const [secondRowClockTextSize, setSecondRowClockTextSize] = useAtom(ATOMS.SECOND_ROW_CLOCK_TEXT_SIZE);
  const [secondRowGap, setSecondRowGap] = useAtom(ATOMS.SECOND_ROW_GAP);

  // Text related settings
  const [textFont, setTextFont] = useAtom(ATOMS.TEXT_FONT);
  const [textColor, setTextColor] = useAtom(ATOMS.TEXT_COLOR);

  // Weather related
  const [weatherData, setWeatherData] = useAtom(ATOMS.WEATHER_DATA);
  const [location, setLocation] = useAtom(ATOMS.WEATHER_LOCATION);
  const [weatherUnit, setWeatherUnit] = useAtom(ATOMS.WEATHER_UNIT);
  const [sunTimes, setSunTimes] = useAtom(ATOMS.SUN_TIMES);
  
  // Refs for Tick.js instance
  const tickRef = useRef();
  const [flipRoundingPX, setFlipRoundingPX] = useState(0);

  // Checks if a character is a separator
  function isSeparator(char) {
    return separatorString.includes(char);
  }

  function parseTemplateString(template) {
    const supportedTypes = ["TIME", "FLIPTIME", "TEXT", "WEATHER"];
    const result = [];
    const regex = /\$([A-Z]+)\(([^)]*)\)/g;

    // console.log("Original template:", JSON.stringify(template)); // Debug

    let match;
    while ((match = regex.exec(template)) !== null) {
      // console.log("Full match:", JSON.stringify(match[0])); // Debug
      // console.log("Type:", JSON.stringify(match[1])); // Debug
      // console.log("Value:", JSON.stringify(match[2])); // Debug

      const [, type, value] = match;
      if (supportedTypes.includes(type)) {
        result.push({ type, value });
      }
    }

    if (result.length === 0) {
      // If no valid types found, treat the entire template as a TEXT type
      result.push({ type: "TEXT", value: "Please update your Template String!" });
    }

    return result;
  } 

  const parsedTemplate = parseTemplateString(format);
  const parsedSecondRowTemplate = parseTemplateString(secondRowTimeFormat);

  function renderFlipClock(format, prefix, style) {
    if(style === "flip") {
      return dayjs()
      .format(format)
      .split("")
      .map((char, index) =>
        isSeparator(char) ? (
          <span
            key={`span${index}`}
            data-key={`${prefix}${index}`}
            className="tick-text-inline"
            data-view="text"
          >
            {char}
          </span>
        ) : (
          <span
            key={`span${index}`}
            data-key={`${prefix}${index}`}
            data-transform="pad(0)"
            data-view="flip"
          >
            {char}
          </span>
        )
    );
    }
    else if(style === "text") {
      return dayjs()
      .format(format)
      .split("")
      .map((char, index) =>
        <span
            key={`span${index}`}
            data-key={`${prefix}${index}`}
            className="normal-text-settings"
            data-view="text"
          >
            {char}
          </span>
    );
    }
  }

  function getWeatherEmoji(descEn) {
    const desc = descEn.toLowerCase();

    let isDay = true; // default fallback

    if (sunTimes && sunTimes.sunrise && sunTimes.sunset) {
      const now = new Date();
      isDay = now >= sunTimes.sunrise && now < sunTimes.sunset;
    } else {
      // fallback falls sunTimes nicht vorhanden: ca. 6-21 Uhr
      const hour = new Date().getHours();
      isDay = hour >= 6 && hour < 21;
    }

    if (desc.includes("sun") || desc.includes("clear")) {
      return isDay ? "☀️" : "🌕";
    }
    if (desc.includes("partly cloudy")) {
      return isDay ? "🌤️" : "☁️🌙"; 
    }

    if (desc.includes("cloud") || desc.includes("overcast")) return "☁️";
    if (desc.includes("rain") || desc.includes("drizzle")) return "🌧️";
    if (desc.includes("thunder") || desc.includes("storm")) return "⛈️";
    if (desc.includes("snow") || desc.includes("blizzard")) return "❄️";
    if (desc.includes("fog") || desc.includes("mist")) return "🌫️";
    if (desc.includes("hail")) return "🌨️";

    return "🌡️"; // fallback
  }

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=${language}`);
        const data = await res.json();

        const current = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        if (!current || !area) {
          console.error("Wetterdaten oder Bereich fehlen");
          return;
        }

        // 2. Sonnenauf-/untergangsdaten von sunrise-sunset.org holen
        const lat = area.latitude;
        const lon = area.longitude;

        const resSun = await fetch(
          `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`
        );
        const dataSun = await resSun.json();
        //console.log("Sonnenzeiten:", dataSun);

        if (dataSun.status !== "OK") {
          console.error("Sonnenzeiten konnten nicht geladen werden");
          setSunTimes(null);
        } else {
          const newSunTimes = {
            sunrise: new Date(dataSun.results.sunrise),
            sunset: new Date(dataSun.results.sunset),
            // ggf. weitere Zeiten
          };


          let hasSuntimeChanged = true;

          if (sunTimes?.sunrise && sunTimes?.sunset) {
            const oldSunrise = new Date(sunTimes.sunrise);
            const oldSunset = new Date(sunTimes.sunset);

            hasSuntimeChanged =
              oldSunrise.getTime() !== newSunTimes.sunrise.getTime() ||
              oldSunset.getTime() !== newSunTimes.sunset.getTime();
          }

          if (hasSuntimeChanged) {
            setSunTimes(newSunTimes);
          }
        }

        const englishDesc = current.weatherDesc?.[0]?.value;
        const translatedDesc = current[`lang_${language}`]?.[0]?.value;
        const description = translatedDesc || englishDesc;

        const isCelsius = weatherUnit === "C";
        const temperatureValue = isCelsius ? current.temp_C : current.temp_F;
        const feelsLikeValue = isCelsius ? current.FeelsLikeC : current.FeelsLikeF;
        const temperature = `${temperatureValue} °${weatherUnit}`;
        const feelsLikeTemperature = `${feelsLikeValue} °${weatherUnit}`;

        const newWeatherData = {
          temperature,
          feelsLikeTemperature,
          description,
          emoji: getWeatherEmoji(englishDesc),
        };

        // Nur updaten, wenn sich etwas geändert hat
        const hasChanged =
          !weatherData ||
          weatherData.temperature !== newWeatherData.temperature ||
          weatherData.feelsLikeTemperature !== newWeatherData.feelsLikeTemperature ||
          weatherData.description !== newWeatherData.description ||
          weatherData.emoji !== newWeatherData.emoji;

        if (hasChanged) {
          setWeatherData(newWeatherData);
        }

      } catch (error) {
        console.error("Wetter konnte nicht geladen werden:", error);
      }
    }

    fetchWeather(); // Initial fetch

    const intervalId = setInterval(fetchWeather, 60000); // alle 60 Sekunden

    return () => clearInterval(intervalId);
  }, [location, language]);

function formatTime(date) {
  console.log("formatTime called with:", date, "Type:", typeof date);

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return "–";

  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

  function getNextSunEvent(sunTimes) {
    if (!sunTimes?.sunrise || !sunTimes?.sunset) return null;

    const now = new Date();

    if (now < sunTimes.sunrise) {
      return { type: "sunrise", time: sunTimes.sunrise, emoji: "🌅" };
    } else if (now < sunTimes.sunset) {
      return { type: "sunset", time: sunTimes.sunset, emoji: "🌇" };
    } else {
      // Wenn Sonnenuntergang schon vorbei, nächster Sonnenaufgang ist morgen – hier könntest du ggf. morgen berechnen
      // Für einfachheit nehmen wir heute Sonnenaufgang als nächstes (kann man erweitern)
      return { type: "sunrise", time: sunTimes.sunrise, emoji: "🌅" };
    }
  }

  // Function to render the flip clock
  function renderLine(lineIndex) {
    
    var prefix;
    var selectedTemplate;
    if (lineIndex === 1) {
      prefix = "fliqWord";
      selectedTemplate = parsedTemplate;
    } else if (lineIndex === 2) {
      prefix = "2ndRowFliqWord";
      selectedTemplate = parsedSecondRowTemplate;
    }
    //console.log("renderLine", lineIndex, "weatherData:", weatherData);
    var timeKeyIndex = 0;
    return selectedTemplate.map(({ type, value }, idx) => {
      if (type === "FLIPTIME") {
        timeKeyIndex++;
        return renderFlipClock(value, `${prefix}${timeKeyIndex-1}Character`, "flip");
      } else if (type === "TIME") {
        timeKeyIndex++;
        return renderFlipClock(value, `${prefix}${timeKeyIndex-1}Character`, "text");
      } else if (type === "TEXT") {
        return (
          <span
            className="normal-text-settings"
            key={`text-${idx}`}
            data-key={`text-${idx}`}
            style={{
              whiteSpace: "pre",       // Behält Leerzeichen bei
              display: "inline-block", // Verhindert Zeilenumbrüche
              unicodeBidi: "plaintext" // Bessere Behandlung von Leerzeichen
            }}
          >
            {value}
          </span>
        );
      } else if (type === "WEATHER") {
        let display = null;

        if (!weatherData) {
        display = "Wetter wird geladen...";
        } else {
          switch (value.toLowerCase()) {
            case "emoji":
              display = `${weatherData.emoji}`;
              break;
            case "temp":
              display = `${weatherData.temperature}`;
              break;
            case "tempemoji":
              display = `${weatherData.emoji} ${weatherData.temperature}`;
              break;
            case "feelslike":
              display = `${weatherData.feelsLikeTemperature}`;
              break;
            case "feelslikeemoji":
              display = `${weatherData.emoji} ${weatherData.feelsLikeTemperature}`;
              break;
            case "desc":
              display = `${weatherData.description}`;
              break;
            case "descemoji":
              display = `${weatherData.emoji} ${weatherData.description}`;
              break;
            case "full":
              display = `${weatherData.temperature} – ${weatherData.description}`;
              break;
            case "fullemoji":
              display = `${weatherData.emoji} ${weatherData.temperature} – ${weatherData.description}`;
              break;
            // sunrise mit Emoji und Zeit
            case "sunrise":
              if (sunTimes?.sunrise) {
                console.log("Sunrise time:", sunTimes.sunrise);
                display = `🌅 ${formatTime(sunTimes.sunrise)}`;
              } else {
                display = "–";
              }
              break;
            // sunrise ohne Emoji
            case "sunrise_noemoji":
              if (sunTimes?.sunrise) {
                display = `${formatTime(sunTimes.sunrise)}`;
              } else {
                display = "–";
              }
              break;
            // sunset mit Emoji und Zeit
            case "sunset":
              if (sunTimes?.sunset) {
                display = `🌇 ${formatTime(sunTimes.sunset)}`;
              } else {
                display = "–";
              }
              break;
            // sunset ohne Emoji
            case "sunset_noemoji":
              if (sunTimes?.sunset) {
                display = `${formatTime(sunTimes.sunset)}`;
              } else {
                display = "–";
              }
              break;
            // dynamisch: nächstes Ereignis mit Emoji und Zeit
            case "nextsun":
              const nextEvent = getNextSunEvent(sunTimes);
              if (nextEvent) {
                display = `${nextEvent.emoji} ${formatTime(nextEvent.time)}`;
              } else {
                display = "–";
              }
              break;
            // dynamisch ohne Emoji
            case "nextsun_noemoji":
              const nextEventNoEmoji = getNextSunEvent(sunTimes);
              if (nextEventNoEmoji) {
                display = `${formatTime(nextEventNoEmoji.time)}`;
              } else {
                display = "–";
              }
              break;
            default:
              display = `${weatherData.emoji} ${weatherData.temperature} – ${weatherData.description}`;
          }
        }

        return (
          <span
            className="normal-text-settings"
            key={`weather-${idx}`}
            data-key={`weather-${idx}`}
            style={{
              // fontFamily: "emoji, system-ui",
              whiteSpace: "pre",       // Behält Leerzeichen bei
              display: "inline-block", // Verhindert Zeilenumbrüche
              // unicodeBidi: "plaintext" // Bessere Behandlung von Leerzeichen  
            }}
          >
            {display}
          </span>
        );
      }
    });
  }

  // Effect to initialize Tick.js and update the clock every second
  useEffect(() => {
    // Initialize Tick.js instance
    const tick = Tick.DOM.create(tickRef.current);
    Tick.DOM.parse(document.body);
    
    // Update the clock every second
    const intervalId = Tick.helper.interval(() => 
    {
      const values = {};
      var timeKeyIndex = 0;
      parsedTemplate.forEach(({ type, value }) => {
        
        if (type === "FLIPTIME") {
          // Assign each character to a key for Tick.js
          const currentDateTimeString = dayjs().format(value);
          for (let i = 0; i < currentDateTimeString.length; i++) {
            values[`fliqWord${timeKeyIndex}Character${i}`] = currentDateTimeString.charAt(i);
          }
          timeKeyIndex++;
        } else if (type === "TIME") {
          // Assign each character to a key for Tick.js
          const currentDateTimeString = dayjs().format(value);
          for (let i = 0; i < currentDateTimeString.length; i++) {
            values[`fliqWord${timeKeyIndex}Character${i}`] = currentDateTimeString.charAt(i);
          }
          timeKeyIndex++;
        }
      });
      timeKeyIndex = 0;
      parsedSecondRowTemplate.forEach(({ type, value }) => {
        if (type === "FLIPTIME") {
          // Assign each character to a key for Tick.js
          const currentDateTimeString = dayjs().format(value);
          for (let i = 0; i < currentDateTimeString.length; i++) {
            values[`2ndRowFliqWord${timeKeyIndex}Character${i}`] = currentDateTimeString.charAt(i);
          }
          timeKeyIndex++;
        } else if (type === "TIME") {
          // Assign each character to a key for Tick.js
          const currentDateTimeString = dayjs().format(value);
          for (let i = 0; i < currentDateTimeString.length; i++) {
            values[`2ndRowFliqWord${timeKeyIndex}Character${i}`] = currentDateTimeString.charAt(i);
          }
          timeKeyIndex++;
        }
      });

      tick.value = values;
    });

    // Cleanup function on unmount
    return () => {
      Tick.DOM.destroy(tickRef.current);
      clearInterval(intervalId);
    };
  }, [format, secondRowTimeFormat]);

  useEffect(() => {
    setTimeout(() => {
      const clock = document.querySelector("#flipclock");
      if (clock) {
        const rect = clock.getBoundingClientRect();
        const minSide = Math.min(rect.width, rect.height);
        setFlipRoundingPX((minSide * (flipcardRadius / 100)) / 2);
      }
    }, 0); 
    setTimeout(() => {
      const clock = document.querySelector("#flipclock-second-row");
      if (clock) {
        const rect = clock.getBoundingClientRect();
        const minSide = Math.min(rect.width, rect.height);
        setFlipRoundingPX((minSide * (flipcardRadius / 100)) / 2);
      }
    }, 0);
  }, [flipcardRadius]);

  return (
    <div
      id="flipclock-container"
      style={{
        padding: `${clockPadding}px`,
        backgroundColor: boxBgColor,
        borderRadius: `${boxRadius/2}vmin`,
        "--flipcard-bg-color": flipcardBg,
        "--clock-text-color": clockTextColor,
        "--seperator-color": clockSeparatorColor,
        "--flipcard-rounded": `${flipRoundingPX}px`,
        "--clock-text-size": `${clockTextSize}px`,
        "--second-row-clock-text-size": `${secondRowClockTextSize}px`,
        "--text-color": textColor,
        "--text-font": textFont,
      }}
    >
      <div
        ref={tickRef}
        data-credits="false"
        className="tick"
      >
        <div id="flipclock">
          {renderLine(1)}
        </div>
        { secondRowEnabled &&
        (
          <div style={{ marginTop: secondRowGap }}>
              <div id="flipclock-second-row">
                {renderLine(2)}
              </div>
          </div>
        )
      }
      </div>
    </div>
  );
}
