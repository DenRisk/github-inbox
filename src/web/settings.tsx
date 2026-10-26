import { render } from "preact";
import { OptionsForm } from "../options/OptionsForm";
import "../options/options.css";
import { createWebStorageStore } from "../storage/key-value-store";
import "./settings.css";

render(
  <>
    <a class="back" href="./">
      ← Zur Übersicht
    </a>
    <OptionsForm store={createWebStorageStore(localStorage)} fetchFn={(input, init) => fetch(input, init)} />
  </>,
  document.getElementById("app")!,
);
