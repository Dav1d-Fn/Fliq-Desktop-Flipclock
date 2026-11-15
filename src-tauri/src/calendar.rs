//! Downloads calendar feeds (secret ICS links). Fetched here because the calendar hosts do not
//! allow the webview's origin (CORS). The links are secrets: they are never logged, and errors
//! sent back carry a short code instead of reqwest's message, which would contain the URL.

use std::time::Duration;

/// Larger feeds are refused; a busy calendar over many years is a few MB.
const MAX_BYTES: usize = 20 * 1024 * 1024;
const TIMEOUT: Duration = Duration::from_secs(20);

/// `webcal://` (what "subscribe" buttons hand out) is https; anything but http(s) is refused.
fn normalized_url(url: &str) -> Result<reqwest::Url, String> {
    let trimmed = url.trim();
    let rewritten = match trimmed.get(..9) {
        Some(prefix) if prefix.eq_ignore_ascii_case("webcal://") => {
            format!("https://{}", &trimmed[9..])
        }
        _ => trimmed.to_string(),
    };
    let parsed = reqwest::Url::parse(&rewritten).map_err(|_| "invalid-url".to_string())?;
    match parsed.scheme() {
        "http" | "https" if parsed.host_str().is_some() => Ok(parsed),
        _ => Err("invalid-url".to_string()),
    }
}

/// The feed's text. Errors: "invalid-url", "offline" (no connection, DNS, timeout),
/// "http-<status>", "too-large", "not-text".
#[tauri::command]
pub async fn fetch_calendar(url: String) -> Result<String, String> {
    let url = normalized_url(&url)?;
    // reqwest is built without a default crypto provider (no aws-lc build); ring is enough.
    let _ = rustls::crypto::ring::default_provider().install_default();
    let client = reqwest::Client::builder()
        .timeout(TIMEOUT)
        .user_agent("Fliq calendar")
        .build()
        .map_err(|_| "offline".to_string())?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|_| "offline".to_string())?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("http-{}", status.as_u16()));
    }
    if response
        .content_length()
        .is_some_and(|length| length as usize > MAX_BYTES)
    {
        return Err("too-large".to_string());
    }
    let bytes = response.bytes().await.map_err(|_| "offline".to_string())?;
    if bytes.len() > MAX_BYTES {
        return Err("too-large".to_string());
    }
    String::from_utf8(bytes.to_vec()).map_err(|_| "not-text".to_string())
}

#[cfg(test)]
mod tests {
    use super::{fetch_calendar, normalized_url};

    /// Needs the internet: `cargo test -- --ignored`. Google's public holiday calendar.
    #[test]
    #[ignore]
    fn fetches_a_public_calendar() {
        let url = "https://calendar.google.com/calendar/ical/de.german%23holiday%40group.v.calendar.google.com/public/basic.ics";
        let text = tauri::async_runtime::block_on(fetch_calendar(url.to_string())).unwrap();
        assert!(text.contains("BEGIN:VCALENDAR"));
        let missing = tauri::async_runtime::block_on(fetch_calendar(
            "https://calendar.google.com/calendar/ical/nobody/basic.ics".to_string(),
        ));
        assert!(matches!(missing, Err(code) if code.starts_with("http-")));
    }

    #[test]
    fn webcal_becomes_https() {
        let url = normalized_url(" webcal://example.com/basic.ics ").unwrap();
        assert_eq!(url.as_str(), "https://example.com/basic.ics");
    }

    #[test]
    fn only_http_and_https() {
        assert!(normalized_url("https://calendar.google.com/x/basic.ics").is_ok());
        assert!(normalized_url("http://nextcloud.local/remote.php/dav").is_ok());
        assert!(normalized_url("file:///etc/passwd").is_err());
        assert!(normalized_url("not a url").is_err());
        assert!(normalized_url("").is_err());
    }
}
