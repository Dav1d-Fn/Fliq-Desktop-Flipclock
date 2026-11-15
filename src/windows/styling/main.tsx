import ReactDOM from "react-dom/client";
import { NativeSettingsHost } from "./host/NativeSettingsHost";
import StylingApp from "./StylingApp";

ReactDOM.createRoot(document.getElementById("colorpicker-root") as HTMLElement).render(
    <StylingApp host={new NativeSettingsHost()} />
);
