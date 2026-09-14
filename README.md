# DSA Log

A minimal, single-file dark-themed tracker for daily DSA (Data Structures & Algorithms) practice. No backend, no login as everything runs in the browser and saves to `localStorage`.

## Features

- Notion-style table you can add rows to with one click. Columns: Date, Title, Topics, Platform, Link, Level, Type, Help required, Time Taken, Approach, Mistakes, Solution.
- **Streak tracker** — current streak and longest streak, based on days you logged at least one problem.
- **Activity heatmap** — GitHub-contributions-style grid of the last 18 weeks.
- **Revisit queue** — a simple spaced-repetition heuristic predicts when to revisit each problem, based on:
  - **Level** — harder problems get a shorter base gap (Hard: 2 days, Medium: 4, Easy: 6), since they're riskier to forget.
  - **Type** — if it's already a "Revised" entry, the next gap is stretched out further (you're reinforcing it).
  - **Help required** — needing help pulls the revisit date closer.
  - **Time taken** — much slower than expected pulls it closer; much faster pushes it out.
  - The queue panel shows what's overdue, due today, and coming up.
- **Export / Import JSON** — since data only lives in one browser's `localStorage`, use Export to back it up periodically or move it to another machine, and Import to bring it back in.

## A note on data persistence

The app saves to your browser's `localStorage`, so your log survives closing the tab, refreshing, and restarting your browser — it's tied to that specific browser on that specific device, though. It is **not** synced across devices or browsers automatically. Use the **Export JSON** button now and then (e.g. weekly) to keep a backup file, and **Import JSON** to restore it or carry it over to another browser/device.
