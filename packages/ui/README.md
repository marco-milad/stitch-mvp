# @stitch/ui

Shared mobile UI components for the Stitch app.

> **Status:** Empty in Week 1. Populated starting Week 3 once core screens stabilize and patterns emerge.

## Planned components

- `Avatar`, `Badge`, `Chip`, `Card`
- `EmptyState`, `LoadingState`, `ErrorState`
- `ScreenHeader`, `TopBar` (with bell + theme toggle)
- `FAB` (the center action button on the tab bar)
- `BottomSheet`, `Modal`
- `Form` primitives (`Input`, `Select`, `DatePicker`, `Toggle`)

## Conventions

- All components export from `src/index.ts` so consumers do `import { X } from '@stitch/ui'`
- Components must support both light and dark themes via NativeWind classes
- Components must support RTL (Arabic) without code changes — use `start`/`end` instead of `left`/`right`
