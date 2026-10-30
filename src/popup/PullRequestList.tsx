import { groupStacks, singlesBeforeStacks } from "../domain/stacks";
import type { LinkedPullRequest, PullRequestState, ReviewState, WorkItem } from "../domain/work-item";
import { Icon } from "../ui/Icon";
import { StackHeader } from "./StackHeader";

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

const REVIEW_LABELS: Record<ReviewState, string> = {
  approved: "Freigegeben",
  "changes-requested": "Änderungen angefragt",
  required: "Review offen",
};

function ReviewLabel({ pullRequest }: { pullRequest: LinkedPullRequest }) {
  const stillOpen = pullRequest.state === "open" || pullRequest.state === "draft";
  if (!stillOpen || !pullRequest.review) return null;
  return <span class={`badge review-state ${pullRequest.review}`}>{REVIEW_LABELS[pullRequest.review]}</span>;
}

interface PullRequestRowProps {
  pullRequest: LinkedPullRequest;
  item: WorkItem;
  step: number | null;
  onOpen: (url: string) => void;
}

function PullRequestRow({ pullRequest, item, step, onOpen }: PullRequestRowProps) {
  return (
    <a
      class="pull-request"
      href={pullRequest.url}
      title={pullRequest.title}
      onClick={(event) => {
        event.preventDefault();
        onOpen(pullRequest.url);
      }}
    >
      {step !== null && <span class="step-number">{step}</span>}
      <span class="pull-request-body">
        <span class="pull-request-title">
          <span class="pull-request-number">{reference(pullRequest, item)}</span> {pullRequest.title}
        </span>
        <span class="pull-request-meta">
          <span class={`badge pr-state ${pullRequest.state}`}>{STATE_LABELS[pullRequest.state]}</span>
          <ReviewLabel pullRequest={pullRequest} />
          {pullRequest.closesIssue && <span class="badge">schließt</span>}
        </span>
      </span>
    </a>
  );
}

export function PullRequestList({ item, onOpen }: { item: WorkItem; onOpen: (url: string) => void }) {
  return (
    <section class="detail-section">
      <h3 class="section-title">
        <Icon name="review" />
        Pull Requests
      </h3>
      {item.pullRequests.length ? (
        <ul class="pull-request-list">
          {singlesBeforeStacks(groupStacks(item.pullRequests)).map((group) =>
            group.isStack ? (
              <li key={group.items[0].url} class="stack pull-request-stack">
                <StackHeader size={group.items.length} base={group.base} />
                <ol class="stack-list">
                  {group.items.map((pullRequest, index) => (
                    <li key={pullRequest.url}>
                      <PullRequestRow pullRequest={pullRequest} item={item} step={index + 1} onOpen={onOpen} />
                    </li>
                  ))}
                </ol>
              </li>
            ) : (
              <li key={group.items[0].url}>
                <PullRequestRow pullRequest={group.items[0]} item={item} step={null} onOpen={onOpen} />
              </li>
            ),
          )}
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
