import type { LinkedPullRequest, PullRequestState, WorkItem } from "../domain/work-item";
import { Icon } from "../ui/Icon";

const STATE_LABELS: Record<PullRequestState, string> = {
  open: "Offen",
  draft: "Entwurf",
  merged: "Gemergt",
  closed: "Geschlossen",
};

function reference(pullRequest: LinkedPullRequest, item: WorkItem): string {
  const repository = pullRequest.repository === item.repository ? "" : pullRequest.repository;
  return `${repository}#${pullRequest.number}`;
}

export function PullRequestList({ item, onOpen }: { item: WorkItem; onOpen: (url: string) => void }) {
  return (
    <section class="pull-requests">
      <h3 class="section-title">
        <Icon name="review" />
        Pull Requests
      </h3>
      {item.pullRequests.length ? (
        <ul class="pull-request-list">
          {item.pullRequests.map((pullRequest) => (
            <li key={pullRequest.url}>
              <a
                class="pull-request"
                href={pullRequest.url}
                title={pullRequest.title}
                onClick={(event) => {
                  event.preventDefault();
                  onOpen(pullRequest.url);
                }}
              >
                <span class={`badge pr-state ${pullRequest.state}`}>{STATE_LABELS[pullRequest.state]}</span>
                <span class="pull-request-title">
                  <span class="pull-request-number">{reference(pullRequest, item)}</span> {pullRequest.title}
                </span>
                {pullRequest.closesIssue && <span class="badge">schließt</span>}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p class="pull-requests-empty">Kein Pull Request verknüpft oder erwähnt.</p>
      )}
    </section>
  );
}

export function PullRequestCount({ item }: { item: WorkItem }) {
  const count = item.pullRequests.length;
  return count ? (
    <span class="badge pr-count">
      <Icon name="review" small />
      {count} {count === 1 ? "PR" : "PRs"}
    </span>
  ) : null;
}
