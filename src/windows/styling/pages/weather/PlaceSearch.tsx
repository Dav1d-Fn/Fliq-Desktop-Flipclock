import { useEffect, useRef, useState } from "react";
import { Autocomplete } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useAtomValue } from "jotai";
import { useStrings } from "../../../../i18n/useStrings";
import { ATOMS } from "../../../../settings/atoms";
import type { WeatherPlace } from "../../../../weather/WeatherPlace";
import { WeatherService } from "../../../../weather/WeatherService";

interface PlaceSearchProps
{
    location: string;
    onPick: (place: WeatherPlace) => void;
    onFreeText: (text: string) => void;
}

const SEARCH_DELAY_MS = 350;

// City field with suggestions from the geocoding API while typing. Picking one saves the place
// with its coordinates; text left in the field without picking (blur, or Enter with no
// suggestion) is saved as free text, like before the search existed.
export function PlaceSearch({ location, onPick, onFreeText }: PlaceSearchProps)
{
    const text = useStrings().weather;
    const language = useAtomValue(ATOMS.UI_LANGUAGE);
    const [draft, setDraft] = useState(location);
    const [searchText] = useDebouncedValue(draft, SEARCH_DELAY_MS);
    const [places, setPlaces] = useState<WeatherPlace[]>([]);
    const [searchedText, setSearchedText] = useState("");
    const [searchFailed, setSearchFailed] = useState(false);
    // Refs, because Enter commits a tick later and must see a pick made in between.
    const draftRef = useRef(location);
    const committedRef = useRef(location);

    // A change from outside (reset, tuxhub) replaces the draft.
    useEffect(() =>
    {
        setDraft(location);
        draftRef.current = location;
        committedRef.current = location;
    }, [location]);

    useEffect(() =>
    {
        const name = searchText.trim();
        // No search for the saved value itself, or for one letter.
        if (name.length < 2 || searchText === committedRef.current)
        {
            setPlaces([]);
            setSearchedText("");
            setSearchFailed(false);
            return;
        }

        const controller = new AbortController();
        WeatherService.searchPlaces(name, language, controller.signal)
            .then((found) =>
            {
                setPlaces(found);
                setSearchedText(searchText);
                setSearchFailed(false);
            })
            .catch((error) =>
            {
                if (!controller.signal.aborted)
                {
                    console.error("City search failed:", error);
                    setPlaces([]);
                    setSearchFailed(true);
                }
            });
        return () => controller.abort();
    }, [searchText, language]);

    function changeDraft(value: string)
    {
        draftRef.current = value;
        setDraft(value);
    }

    function pickLabel(label: string)
    {
        const place = places.find((candidate) => candidate.label === label);
        if (place)
        {
            pick(place);
        }
    }

    function pick(place: WeatherPlace)
    {
        changeDraft(place.label);
        committedRef.current = place.label;
        setPlaces([]);
        onPick(place);
    }

    // Enter takes the top suggestion when none was highlighted (they often arrive after the
    // last key, too late for the dropdown to mark one), and saves free text when there is none.
    function commitOnEnter()
    {
        if (draftRef.current === committedRef.current)
        {
            return;
        }
        if (places.length > 0)
        {
            pick(places[0]);
            return;
        }
        commitFreeText();
    }

    function commitFreeText()
    {
        if (draftRef.current !== committedRef.current)
        {
            committedRef.current = draftRef.current;
            onFreeText(draftRef.current);
        }
    }

    let error: string | undefined;
    if (searchFailed)
    {
        error = text.searchFailed;
    }
    else if (searchedText !== "" && searchedText === draft && places.length === 0)
    {
        error = text.noPlaceFound;
    }

    // The dropdown needs unique entries; two places with the same label are the same to the user.
    const labels = [...new Set(places.map((place) => place.label))];

    return (
        <Autocomplete
            aria-label={text.cityLabel}
            placeholder={text.cityPlaceholder}
            value={draft}
            onChange={changeDraft}
            data={labels}
            // The API already matched the names (Köln for Cologne), so show every result.
            filter={({ options }) => options}
            selectFirstOptionOnChange
            onOptionSubmit={pickLabel}
            onBlur={commitFreeText}
            onKeyDown={(event) =>
            {
                if (event.key === "Enter")
                {
                    // After the dropdown had its turn: Enter on a highlighted suggestion picks it.
                    setTimeout(commitOnEnter, 0);
                }
            }}
            error={error}
            spellCheck={false}
            w={280}
            comboboxProps={{ withinPortal: true }}
        />
    );
}
