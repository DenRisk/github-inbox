import type { QuickLinks as Links } from "../settings/settings";
import { Icon, type IconName } from "../ui/Icon";

const BUTTONS: { key: keyof Links; label: string; icon: IconName }[] = [
  { key: "reviewsBoard", label: "Review-Board", icon: "board" },
  { key: "tasksBoard", label: "Aufgaben-Board", icon: "board" },
  { key: "repository", label: "Haupt-Repo", icon: "repository" },
];

export function QuickLinks({ links, onOpen }: { links: Links; onOpen: (url: string) => void }) {
  const available = BUTTONS.filter((button) => links[button.key]);
  if (!available.length) return null;
  return (
    <nav class="quick-links" aria-label="Schnellzugriff">
      {available.map((button) => (
        <a
          key={button.key}
          class="secondary-button quick-link"
          href={links[button.key]}
          onClick={(event) => {
            event.preventDefault();
            onOpen(links[button.key]);
          }}
        >
          <Icon name={button.icon} small />
          {button.label}
        </a>
      ))}
    </nav>
  );
}
