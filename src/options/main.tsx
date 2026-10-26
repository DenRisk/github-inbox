import { render } from "preact";
import { createChromeStore } from "../storage/key-value-store";
import { OptionsForm } from "./OptionsForm";
import "./options.css";

render(
  <OptionsForm store={createChromeStore()} fetchFn={(input, init) => fetch(input, init)} />,
  document.getElementById("app")!,
);
