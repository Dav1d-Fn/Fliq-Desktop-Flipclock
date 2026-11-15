// `window.tuxhub`, as tuxhub's bridge script provides it to a tool page. Only what the
// embedded settings page uses. https://github.com/SirSnolte/tuxhub/blob/master/docs/tool-development.md
export interface TuxhubPageBridge
{
    // Sends a request over Fliq's live socket; rejects with the message of a refusal.
    call: (method: string, params?: Record<string, unknown>) => Promise<unknown>;
    // Notifications of the socket, plus "theme" and "closed" from tuxhub itself.
    on: (event: string, listener: (params: unknown) => void) => () => void;
}

declare global
{
    interface Window
    {
        tuxhub?: TuxhubPageBridge;
    }
}
