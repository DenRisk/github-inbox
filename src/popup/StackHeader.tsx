import { Icon } from "../ui/Icon";

export function StackHeader({ size, base }: { size: number; base: string | null }) {
  return (
    <div class="stack-header">
      <Icon name="stack" small />
      <span>Stack mit {size} PRs</span>
      {base && <span class="stack-base">auf {base}</span>}
    </div>
  );
}
