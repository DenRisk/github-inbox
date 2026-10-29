import { render } from "preact";
import { OptionsForm } from "../options/OptionsForm";
import "../options/options.css";
import { createWebStorageStore } from "../storage/key-value-store";
import { Icon } from "../ui/Icon";
import "./settings.css";

render(
  <>
    <nav class="back">
      <a class="secondary-button" href="./">
        <Icon name="back" small />
        Zur Übersicht
      </a>
    </nav>
    <OptionsForm store={createWebStorageStore(localStorage)} fetchFn={(input, init) => fetch(input, init)} />
  </>,
  document.getElementById("app")!,
);
