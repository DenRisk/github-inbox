# GitHub Inbox

Chrome-Erweiterung, die mit einem Klick zeigt, welche PRs ein Review von dir anfordern (Status und Deadline aus sw-code Projekt 25) und welche Aufgaben dir zugewiesen sind (Projekt 13). Ein dritter Reiter listet deine in den letzten 30 Tagen geschlossenen Issues. Zu jedem Eintrag lassen sich private Todos anlegen; sie bleiben nur in deinem Chrome.

## Bauen

```bash
pnpm install
pnpm build
```

Das Ergebnis liegt in `dist/`.

## In Chrome laden

1. `chrome://extensions` öffnen.
2. Oben rechts „Entwicklermodus“ einschalten.
3. „Entpackte Erweiterung laden“ und den Ordner `dist` wählen.
4. Das Symbol über das Puzzle-Menü an die Leiste anheften.

Nach Code-Änderungen: `pnpm build`, dann in `chrome://extensions` bei „GitHub Inbox“ auf „Neu laden“.

## Token einrichten

1. Unter https://github.com/settings/tokens/new einen **Personal Access Token (classic)** mit den Scopes `repo`, `read:org` und `read:project` erstellen.
2. Falls sw-code SSO verlangt: in der Token-Liste bei diesem Token „Configure SSO“ → sw-code autorisieren.
3. Rechtsklick auf das Erweiterungssymbol → „Optionen“, Token eintragen, „Speichern und prüfen“.

Die Seite zeigt danach, als wer du angemeldet bist und ob Berechtigungen fehlen.

## Was angezeigt wird

| Reiter | Quelle | Filter (änderbar in den Optionen) |
|--------|--------|-----------------------------------|
| Reviews | GitHub-Suche, Status und Deadline aus Projekt 25 | `is:pr is:open review-requested:@me archived:false` |
| Aufgaben | Projekt 13 | `is:issue assignee:@me -status:Done is:open` |
| Geschlossen | GitHub-Suche | `is:issue is:closed assignee:@me`, in den letzten 30 Tagen geschlossen (fest) |

Die Erweiterung lädt beim Öffnen und alle 5 Minuten im Hintergrund neu. Die Zahl am Symbol ist die Anzahl wartender Reviews, „!“ bedeutet ein Problem mit dem Token.

## Als eigene App (PWA)

Dieselbe Oberfläche gibt es als installierbare Web-App mit eigenem Fenster und Zahl am Taskleisten-Symbol. Sie hat ihren eigenen Speicher, Token und Todos aus der Erweiterung kommen also nicht mit.

```bash
pnpm build:web
pnpm preview:web
```

Das Ergebnis liegt in `dist-web/`. Bei jedem Push auf `main` baut `.github/workflows/pages.yml` die App und veröffentlicht sie auf GitHub Pages. Im Repo muss dafür unter „Settings → Pages“ als Quelle „GitHub Actions“ eingestellt sein.

Installieren: Die Pages-Adresse in Chrome oder Edge öffnen, rechts in der Adressleiste auf „App installieren“ klicken. Danach über das Zahnrad den Token eintragen.

Die App lädt beim Öffnen und alle 5 Minuten neu, solange ihr Fenster offen ist (auch minimiert). Der Token liegt im `localStorage` der App-Adresse.

## Entwickeln

```bash
pnpm test
pnpm typecheck
```
