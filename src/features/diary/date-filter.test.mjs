import assert from "node:assert/strict";
import { diaryDateBounds } from "./date-filter.ts";

assert.deepEqual(diaryDateBounds({ from: "2026-10-17", to: "2026-10-17" }), {
  from: "2026-10-16T18:30:00.000Z",
  to: "2026-10-17T18:29:59.999Z",
});
