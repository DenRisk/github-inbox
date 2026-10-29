import type { StatusColor } from "../domain/work-item";

export const STATUS_FIELD = `status: fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name color } }`;

export interface StatusValue {
  name?: string;
  color?: string;
}

const STATUS_COLORS: readonly string[] = ["GRAY", "BLUE", "GREEN", "YELLOW", "ORANGE", "RED", "PINK", "PURPLE"];

function isStatusColor(color: string | undefined): color is StatusColor {
  return color !== undefined && STATUS_COLORS.includes(color);
}

export function statusColorOf(value: StatusValue | null | undefined): StatusColor | null {
  return isStatusColor(value?.color) ? value.color : null;
}
