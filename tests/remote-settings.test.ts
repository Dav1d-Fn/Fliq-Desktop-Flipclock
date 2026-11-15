// Runs with `npm test` (node --test, no extra dependency).
import { test } from "node:test";
import assert from "node:assert/strict";
import { RemoteSettingsBackend, type SettingsTransport } from "../src/tuxhub/RemoteSettingsBackend.ts";

interface SentCall
{
    key: string;
    value: unknown;
    resolve: (applied: unknown) => void;
    reject: (error: Error) => void;
}

// A transport whose answers the test gives by hand, in any order.
function manualTransport(): { transport: SettingsTransport; sent: SentCall[] }
{
    const sent: SentCall[] = [];
    const transport: SettingsTransport = {
        set: (key, value) => new Promise((resolve, reject) =>
        {
            sent.push({ key, value, resolve, reject });
        }),
    };
    return { transport, sent };
}

// Lets the promise callbacks of the backend run.
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

function backendWith(values: Record<string, unknown>)
{
    const { transport, sent } = manualTransport();
    const refusals: string[] = [];
    const backend = new RemoteSettingsBackend(transport, (key, message) => refusals.push(`${key}: ${message}`));
    backend.load(values);
    const seen: (string | null)[] = [];
    backend.subscribe("clockScale", (value) => seen.push(value));
    return { backend, sent, refusals, seen };
}

test("loaded values read back as the JSON atomWithStorage expects", () =>
{
    const { backend } = backendWith({ clockScale: 75, lang: "de", clockLayout: { columns: 4 } });
    assert.equal(backend.getItem("clockScale"), "75");
    assert.equal(backend.getItem("lang"), "\"de\"");
    assert.equal(backend.getItem("clockLayout"), "{\"columns\":4}");
    assert.equal(backend.getItem("missing"), null);
});

test("a write is readable at once and goes out as one settings.set", () =>
{
    const { backend, sent } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "120");
    assert.equal(backend.getItem("clockScale"), "120");
    assert.deepEqual(sent.map((call) => [call.key, call.value]), [["clockScale", 120]]);
});

test("writing the value it already holds sends nothing", () =>
{
    const { backend, sent } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "75");
    assert.equal(sent.length, 0);
});

test("a refused value is taken back and reported", async () =>
{
    const { backend, sent, refusals, seen } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "9000");
    sent[0].reject(new Error("Choose a value from 30 to 300."));
    await settled();
    assert.equal(backend.getItem("clockScale"), "75");
    assert.deepEqual(seen, ["75"]);
    assert.deepEqual(refusals, ["clockScale: Choose a value from 30 to 300."]);
});

test("the value as Fliq applied it replaces the one written", async () =>
{
    const { backend, sent, seen } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "120.4");
    sent[0].resolve(120);
    await settled();
    assert.equal(backend.getItem("clockScale"), "120");
    assert.deepEqual(seen, ["120"]);
});

test("only the answer to the latest write of a key counts", async () =>
{
    const { backend, sent, refusals, seen } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "80");
    backend.setItem("clockScale", "90");
    // The older write fails late: the newer value must stay.
    sent[1].resolve(90);
    sent[0].reject(new Error("too late"));
    await settled();
    assert.equal(backend.getItem("clockScale"), "90");
    assert.deepEqual(seen, []);
    assert.deepEqual(refusals, []);
});

test("a refusal goes back to the last value Fliq confirmed", async () =>
{
    const { backend, sent } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "80");
    backend.setItem("clockScale", "9000");
    sent[0].resolve(80);
    sent[1].reject(new Error("out of range"));
    await settled();
    assert.equal(backend.getItem("clockScale"), "80");
});

test("changes from Fliq arrive, except for a key that is being written", async () =>
{
    const { backend, sent, seen } = backendWith({ clockScale: 75, lang: "en" });
    const languages: (string | null)[] = [];
    backend.subscribe("lang", (value) => languages.push(value));

    backend.setItem("clockScale", "80");
    backend.applyRemote({ clockScale: 50, lang: "de" });
    assert.equal(backend.getItem("clockScale"), "80", "the value in flight wins");
    assert.deepEqual(languages, ["\"de\""]);

    sent[0].resolve(80);
    await settled();
    backend.applyRemote({ clockScale: 50 });
    assert.equal(backend.getItem("clockScale"), "50");
    assert.deepEqual(seen, ["50"]);
});

test("an unsubscribed listener hears nothing more", () =>
{
    const { backend } = backendWith({ lang: "en" });
    const heard: (string | null)[] = [];
    const unsubscribe = backend.subscribe("lang", (value) => heard.push(value));
    unsubscribe();
    backend.applyRemote({ lang: "de" });
    assert.deepEqual(heard, []);
});

test("removing a key (a reset) only forgets the local copy", () =>
{
    const { backend, sent, seen } = backendWith({ clockScale: 75 });
    backend.removeItem("clockScale");
    assert.equal(backend.getItem("clockScale"), null);
    assert.equal(sent.length, 0);
    assert.deepEqual(seen, [null]);
});

test("a late answer to an older write does not replace a newer confirmed value", async () =>
{
    const { backend, sent } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "80");
    backend.setItem("clockScale", "90");
    sent[1].resolve(90);
    await settled();
    sent[0].resolve(80);
    await settled();
    backend.setItem("clockScale", "9000");
    sent[2].reject(new Error("out of range"));
    await settled();
    assert.equal(backend.getItem("clockScale"), "90");
});

test("an older write answered after a newer one was refused shows what the clock holds", async () =>
{
    const { backend, sent } = backendWith({ clockScale: 75 });
    backend.setItem("clockScale", "80");
    backend.setItem("clockScale", "9000");
    sent[1].reject(new Error("out of range"));
    await settled();
    assert.equal(backend.getItem("clockScale"), "75");
    sent[0].resolve(80);
    await settled();
    assert.equal(backend.getItem("clockScale"), "80");
});
