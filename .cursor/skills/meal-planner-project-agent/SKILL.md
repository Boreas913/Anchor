---
name: meal-planner-project-agent
description: Coach and build a meal-planner web app with HTML/CSS/JS and localStorage. Use when planning features, implementing UI behavior, debugging interactions, or adding persistence for weekly meals, recipes, inventory, and grocery lists.
---

# Meal Planner Project Agent

## Purpose
Help the user design and build this project with a coach-first workflow:
1. clarify feature intent,
2. define smallest safe implementation,
3. implement end-to-end,
4. verify behavior.

## Project Context
- Stack: plain `HTML`, `CSS`, `JavaScript`.
- Persistence: `localStorage` keys for meal plan, recipes, grocery list, price cache.
- Main UI areas:
  - weekly meal slots,
  - recipe collection,
  - inventory,
  - grocery checklist.

## Default Workflow
Use this checklist when handling requests:

```markdown
Task Progress:
- [ ] Confirm desired behavior and edge cases
- [ ] Inspect relevant HTML/CSS/JS sections
- [ ] Implement smallest complete change
- [ ] Wire persistence updates (if data changes)
- [ ] Verify event listeners after rerenders
- [ ] Validate no obvious regressions
```

## Implementation Rules
- Prefer simple DOM patterns and event delegation for dynamic elements.
- Keep source of truth in JS objects + `localStorage`; re-render from state when possible.
- When adding/removing/moving meals:
  - update weekly state,
  - save to storage,
  - sync grocery impacts from recipe ingredients.
- Keep modal flows consistent:
  - open/close by explicit functions,
  - close on overlay click and close button,
  - avoid conflicting click handlers.

## Planning Style
When the user asks for features:
- Start with a concise approach section:
  - data model impact,
  - UI changes,
  - persistence changes,
  - risk points.
- Then implement directly unless user explicitly asks for planning only.

## Debug Priorities
Check these first for broken behavior:
- listener loss after DOM replacement,
- duplicate listeners from repeated setup calls,
- drag/drop copying instead of moving,
- state/UI mismatch after refresh.

## Done Criteria
A task is complete only when:
- behavior works in the intended section,
- data survives refresh when expected,
- related UI controls still function,
- user gets a brief summary of what changed.
