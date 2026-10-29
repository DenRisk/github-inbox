import { render } from "preact";
import { createChromeStore } from "../storage/key-value-store";
import { applyStartTheme } from "../ui/theme";
import { OptionsForm } from "./OptionsForm";
import "./options.css";

applyStartTheme();

render(
  <OptionsForm store={createChromeStore()} fetchFn={(input, init) => fetch(input, init)} />,
  document.getElementById("app")!,
);
