import { useEffect, useState } from "preact/hooks";
import { GithubError, type FetchFn } from "../github/graphql-client";
import { validateToken } from "../github/validate-token";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from "../settings/settings";
import type { KeyValueStore } from "../storage/key-value-store";

interface FormValues {
  token: string;
  organization: string;
  reviewsProject: string;
  reviewsQuery: string;
  tasksProject: string;
  tasksQuery: string;
}

type Feedback = { tone: "ok" | "warn" | "error"; lines: string[] };

const POSITIVE_INTEGER = /^[1-9]\d*$/;

function boardValues(settings: Settings): Omit<FormValues, "token"> {
  return {
    organization: settings.organization,
    reviewsProject: String(settings.reviews.projectNumber),
    reviewsQuery: settings.reviews.query,
    tasksProject: String(settings.tasks.projectNumber),
    tasksQuery: settings.tasks.query,
  };
}

function toSettings(values: FormValues, token: string | null): Settings {
  return {
    token,
    organization: values.organization.trim(),
    reviews: { projectNumber: Number(values.reviewsProject), query: values.reviewsQuery.trim() },
    tasks: { projectNumber: Number(values.tasksProject), query: values.tasksQuery.trim() },
  };
}

async function checkAndSave(values: FormValues, store: KeyValueStore, fetchFn: FetchFn): Promise<Feedback> {
  if (![values.reviewsProject, values.tasksProject].every((project) => POSITIVE_INTEGER.test(project.trim()))) {
    return { tone: "error", lines: ["Projektnummern müssen positive ganze Zahlen sein."] };
  }
  const token = values.token.trim();
  if (!token) {
    await saveSettings(store, toSettings(values, null));
    return { tone: "warn", lines: ["Gespeichert, aber ohne Token lädt die Erweiterung nichts."] };
  }
  try {
    const { login, missingScopes } = await validateToken({ token, organization: values.organization.trim(), fetchFn });
    await saveSettings(store, toSettings(values, token));
    const lines = [`Angemeldet als ${login}.`];
    if (missingScopes === null) lines.push("Berechtigungen nicht prüfbar (kein Classic-Token?).");
    else if (missingScopes.length) lines.push(`Fehlende Berechtigungen: ${missingScopes.join(", ")}`);
    return { tone: lines.length > 1 ? "warn" : "ok", lines };
  } catch (error) {
    return { tone: "error", lines: [error instanceof GithubError ? error.message : String(error)] };
  }
}

function TextField(props: { label: string; value: string; secret?: boolean; onInput: (value: string) => void }) {
  const onInput = (event: { currentTarget: HTMLInputElement }) => props.onInput(event.currentTarget.value);
  return (
    <label class="field">
      <span>{props.label}</span>
      {props.secret ? (
        <input type="password" value={props.value} autocomplete="off" onInput={onInput} />
      ) : (
        <input type="text" value={props.value} autocomplete="off" spellcheck={false} onInput={onInput} />
      )}
    </label>
  );
}

export function OptionsForm({ store, fetchFn }: { store: KeyValueStore; fetchFn: FetchFn }) {
  const [values, setValues] = useState<FormValues | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadSettings(store).then((settings) => setValues({ token: settings.token ?? "", ...boardValues(settings) }));
  }, [store]);

  if (!values) return null;

  const set = (key: keyof FormValues) => (value: string) => setValues({ ...values, [key]: value });

  async function onSubmit(event: Event) {
    event.preventDefault();
    setBusy(true);
    setFeedback(await checkAndSave(values!, store, fetchFn));
    setBusy(false);
  }

  return (
    <form class="options" onSubmit={onSubmit}>
      <p class="eyebrow">GitHub Inbox · Einstellungen</p>
      <h1 class="headline">
        Verbinde <b>deine Inbox</b> mit GitHub.
      </h1>
      <TextField label="GitHub-Token" secret value={values.token} onInput={set("token")} />
      <p class="hint">Personal Access Token (classic) mit repo, read:org, read:project.</p>
      <TextField label="Organisation" value={values.organization} onInput={set("organization")} />
      <fieldset>
        <legend>Reviews</legend>
        <TextField label="Reviews: GitHub-Suche" value={values.reviewsQuery} onInput={set("reviewsQuery")} />
        <TextField label="Reviews: Board für Status und Deadline" value={values.reviewsProject} onInput={set("reviewsProject")} />
      </fieldset>
      <fieldset>
        <legend>Aufgaben</legend>
        <TextField label="Aufgaben: Projektnummer" value={values.tasksProject} onInput={set("tasksProject")} />
        <TextField label="Aufgaben: Filter" value={values.tasksQuery} onInput={set("tasksQuery")} />
      </fieldset>
      <div class="actions">
        <button type="submit" class="primary-button" disabled={busy}>
          Speichern und prüfen
        </button>
        <button type="button" class="secondary-button" onClick={() => setValues({ ...values, ...boardValues(DEFAULT_SETTINGS) })}>
          Standardwerte
        </button>
      </div>
      {feedback && (
        <div class={`feedback ${feedback.tone}`} role="status">
          {feedback.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
    </form>
  );
}
