const CIRCLE = "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20";

const PATHS = {
  inbox: [
    "M22 12h-6l-2 3h-4l-2-3H2",
    "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
  ],
  refresh: [
    "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
    "M21 3v5h-5",
    "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
    "M8 16H3v5",
  ],
  settings: ["M20 7h-9", "M14 17H5", "M17 14a3 3 0 1 0 0 6a3 3 0 1 0 0-6", "M7 4a3 3 0 1 0 0 6a3 3 0 1 0 0-6"],
  review: ["M18 15a3 3 0 1 0 0 6a3 3 0 1 0 0-6", "M6 3a3 3 0 1 0 0 6a3 3 0 1 0 0-6", "M13 6h3a2 2 0 0 1 2 2v7", "M6 9v12"],
  task: [CIRCLE, "M12 11a1 1 0 1 0 0 2a1 1 0 1 0 0-2"],
  closed: [CIRCLE, "m9 12 2 2 4-4"],
  clock: [CIRCLE, "M12 6v6l4 2"],
  external: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  todos: ["m3 17 2 2 4-4", "m3 7 2 2 4-4", "M13 6h8", "M13 12h8", "M13 18h8"],
  check: ["M20 6 9 17l-5-5"],
  plus: ["M5 12h14", "M12 5v14"],
  remove: ["M18 6 6 18", "m6 6 12 12"],
  alert: [CIRCLE, "M12 8v4", "M12 16h.01"],
  back: ["m12 19-7-7 7-7", "M19 12H5"],
  description: ["M21 6H3", "M15 12H3", "M17 18H3"],
  stack: [
    "M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",
    "M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",
    "M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",
  ],
  sun: [
    "M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8",
    "M12 2v2",
    "M12 20v2",
    "m4.93 4.93 1.41 1.41",
    "m17.66 17.66 1.41 1.41",
    "M2 12h2",
    "M20 12h2",
    "m6.34 17.66-1.41 1.41",
    "m19.07 4.93-1.41 1.41",
  ],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"],
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, small }: { name: IconName; small?: boolean }) {
  return (
    <svg class={small ? "icon small" : "icon"} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
