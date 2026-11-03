import type { QuickLinks as Links } from "../settings/settings";
import { Icon, type IconName } from "../ui/Icon";
import { linkCaption } from "./link-caption";

const BUTTONS: { key: keyof Links; label: string; icon: IconName; tone: string }[] = [
  { key: "reviewsBoard", label: "Review-Board", icon: "review", tone: "review" },
  { key: "tasksBoard", label: "Aufgaben-Board", icon: "board", tone: "task" },
  { key: "repository", label: "Haupt-Repo", icon: "github", tone: "repository" },
];

export function QuickLinks({ links, onOpen }: { links: Links; onOpen: (url: string) => void }) {
  const available = BUTTONS.filter((button) => links[button.key]);
  if (!available.length) return null;
  return (
    <nav class="quick-links" aria-label="Schnellzugriff">
      {available.map((button) => (
        <a
          key={button.key}
          class="quick-link"
          href={links[button.key]}
          onClick={(event) => {
            event.preventDefault();
            onOpen(links[button.key]);
          }}
        >
          <span class={`tile ${button.tone}`}>
            <Icon name={button.icon} />
          </span>
          <span class="quick-link-text">
            <span class="quick-link-label">{button.label}</span>
            <span class="quick-link-caption">{linkCaption(links[button.key])}</span>
          </span>
          <span class="quick-link-opens">
            <Icon name="opens" small />
          </span>
        </a>
      ))}
    </nav>
  );
}
