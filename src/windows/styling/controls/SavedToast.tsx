import { useEffect } from "react";
import { Notification } from "@mantine/core";

interface SavedToastProps
{
    // Shown while not null. A new message object restarts the timer.
    message: { text: string } | null;
    onClose: () => void;
}

const VISIBLE_MS = 3000;

// Short confirmation in the bottom-right corner that hides itself after a few seconds.
export function SavedToast({ message, onClose }: SavedToastProps)
{
    useEffect(() =>
    {
        if (!message)
        {
            return;
        }
        const timeoutId = setTimeout(onClose, VISIBLE_MS);
        return () => clearTimeout(timeoutId);
    }, [message, onClose]);

    if (!message)
    {
        return null;
    }

    return (
        <Notification
            color="teal"
            onClose={onClose}
            role="status"
            style={{ position: "fixed", right: 16, bottom: 16, zIndex: 1000, maxWidth: 360 }}
        >
            {message.text}
        </Notification>
    );
}
