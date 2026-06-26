# Vim Guide

Vim Guide is a VS Code extension MVP for VSCodeVim users. It adds a `Vim Guide` Activity Bar view with a Sidebar webview for searching Vim commands, productivity tips, VS Code integration commands, and selected VSCodeVim settings.

This extension does not emulate Vim and does not replace VSCodeVim.

## Features

- Activity Bar container and Sidebar view named `Vim Guide`.
- 48 Vim command and productivity tip entries.
- 12 VS Code integration command entries.
- Search across title, keys, description, category, learning stage, and tags.
- Category and learning-stage filtering.
- Compact `Start here` shortcuts for first-run practice.
- Empty search and no-results states.
- Favorites stored with VS Code global extension state.
- Favorites-only practice queue.
- Copy action for every guide item.
- Run action only for explicitly allowlisted VS Code commands.
- Readable item badges for learning stage, category, and action type.
- Read-only optional VSCodeVim settings summary:
  - `vim.leader`
  - `vim.normalModeKeyBindings`
  - `vim.visualModeKeyBindings`
  - `vim.insertModeKeyBindings`
  - `vim.useSystemClipboard`

## Non-Goals

- Vim emulator implementation.
- VSCodeVim replacement.
- Marketplace publish.
- Telemetry.
- Account or cloud sync.
- AI recommendations.
- Full Vim reference corpus.
- Complex onboarding or walkthrough contribution.

## Development

```sh
npm install
npm run compile
npm run lint
npm test
npm run verify
```

Package smoke uses the local `@vscode/vsce` dev dependency:

```sh
npm run package
```

Install or update the generated VSIX in your local VS Code profile:

```sh
npm run package
npm run install:local
```

## Extension Development Host

Open this repository in VS Code, then press `F5` if using a launch configuration, or run:

```sh
code --extensionDevelopmentPath=/Users/hongseok/project/vscode-vim-guide
```

In the Extension Development Host, verify:

- Activity Bar includes `Vim Guide`.
- Sidebar renders guide items.
- Search, learning-stage, category, and favorites-only filters update results.
- `Start here` shortcuts narrow the list to beginner-friendly commands.
- A no-results state appears for unmatched searches.
- Favorite toggles persist after reload.
- Copy writes the visible guide item keys to the clipboard.
- Item badges distinguish typed Vim actions, tips, and runnable VS Code actions.
- VSCodeVim settings panel handles installed, missing, empty, and malformed settings without failing.
- Run buttons appear only for VS Code command entries.

## VSCodeVim Integration

VSCodeVim is optional. Vim Guide checks whether `vscodevim.vim` is installed through the public VS Code extension API and reads selected settings through `workspace.getConfiguration("vim")`.

The extension never writes VSCodeVim settings and never uses VSCodeVim private APIs.

## Command Safety

The webview sends guide item ids to the extension host. It never sends arbitrary command ids for execution. The extension host looks up the item, verifies that it is a VS Code command item, checks the command against an explicit allowlist, then calls `vscode.commands.executeCommand`.

## Acceptance Mapping

| Criterion | Evidence |
| --- | --- |
| Git repository initialized | `git status --short --branch` |
| Baseline commit and feature diff exist | `git log --oneline`, `git diff --stat HEAD~1..HEAD` |
| Activity Bar shows `Vim Guide` | `package.json` contributions, Extension Development Host smoke |
| Sidebar renders initial list | `GuideViewProvider` fake webview HTML/model test; actual DOM render is covered by the Extension Development Host checklist |
| Search fields covered | `GuideService` seed and fixture tests |
| Category and learning-stage filters | `GuideService` filter tests |
| Empty query and no-results states | `GuideService` view model tests, `GuideViewProvider` HTML/message tests, Extension Development Host checklist |
| Favorites add/remove, persist, and favorites-only queue | `GuideService` state/filter tests, `GuideViewProvider` message tests |
| Start here shortcuts and readable item badges | `GuideViewProvider` HTML/model tests, Extension Development Host checklist |
| Copy action for guide items | `GuideViewProvider` copy message clipboard test, Extension Development Host checklist |
| 40 to 60 Vim command/tip seed items | data count test |
| 10 to 15 VS Code command seed items | data count test |
| Required item fields | data schema test |
| VSCodeVim settings displayed | parser tests, `GuideViewProvider` settings container/status tests; actual rendered settings rows are covered by the Extension Development Host checklist |
| Missing or malformed VSCodeVim config is safe | parser exact-status tests |
| Only allowlisted commands execute | allowlist positive/negative tests, webview run message test |
| Non-executable Vim actions avoid Run buttons | data/service executable model tests |
| Compile, lint, test pass | `npm run compile`, `npm run lint`, `npm test`, `npm run verify` |
| Package smoke | `npm run package`, `npm run verify` |
| Local VSIX install/update | `npm run install:local`, or `code --install-extension dist/vscode-vim-guide-0.0.1.vsix --force` |
| README coverage | this file |
| deep-code-review and pr-review clean | home harness workspace review reports |
