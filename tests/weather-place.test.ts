// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { WeatherPlaces, type WeatherPlace } from "../src/weather/WeatherPlace.ts";

const cologne: WeatherPlace = WeatherPlaces.fromGeocoding({
    id: 2886242,
    name: "Köln",
    admin1: "Nordrhein-Westfalen",
    country: "Deutschland",
    latitude: 50.93333,
    longitude: 6.95,
});

test("label joins name, region and country, without repeating the name", () =>
{
    assert.equal(cologne.label, "Köln, Nordrhein-Westfalen, Deutschland");
    const berlin = WeatherPlaces.fromGeocoding({ id: 2, name: "Berlin", admin1: "Berlin", country: "Deutschland", latitude: 52.5, longitude: 13.4 });
    assert.equal(berlin.label, "Berlin, Deutschland");
    const noRegion = WeatherPlaces.fromGeocoding({ id: 3, name: "Monaco", latitude: 43.7, longitude: 7.4 });
    assert.equal(noRegion.label, "Monaco");
});

test("a picked place is asked for by coordinates", () =>
{
    assert.equal(WeatherPlaces.query(cologne.label, cologne), "50.9333,6.9500");
});

test("old free-text locations keep working", () =>
{
    assert.equal(WeatherPlaces.query("Berlin", null), "Berlin");
    assert.equal(WeatherPlaces.query("  Berlin ", null), "Berlin");
    assert.equal(WeatherPlaces.query("", null), "");
});

test("text changed outside the search (tuxhub) wins over a stale place", () =>
{
    assert.equal(WeatherPlaces.query("Hamburg", cologne), "Hamburg");
});

test("searches in two languages merge by id, UI language first, biggest first", () =>
{
    const german = [{ id: 1, name: "Cologne", admin1: "Lombardei", country: "Italien", population: 7032, latitude: 45.6, longitude: 10.0 }];
    const english = [
        { id: 2886242, name: "Cologne", admin1: "North Rhine-Westphalia", country: "Germany", population: 1024621, latitude: 50.9, longitude: 6.9 },
        { id: 1, name: "Cologne", admin1: "Lombardy", country: "Italy", population: 7032, latitude: 45.6, longitude: 10.0 },
    ];
    const labels = WeatherPlaces.merged([german, english]).map((place) => place.label);
    assert.deepEqual(labels, ["Cologne, North Rhine-Westphalia, Germany", "Cologne, Lombardei, Italien"]);
});
