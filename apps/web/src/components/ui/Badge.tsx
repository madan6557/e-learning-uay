import labels from "../../../../../packages/shared/src/id.json";

const t = labels;

export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase()}`}>
      {(t.statuses as Record<string, string>)[value] ?? value}
    </span>
  );
}

export const Status = Badge;
