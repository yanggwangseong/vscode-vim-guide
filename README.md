# Vim Guide

Vim Guide is a VS Code extension MVP for VSCodeVim users. It adds a `Vim Guide` Activity Bar view with a Sidebar webview for searching Vim commands, productivity tips, VS Code integration commands, and selected VSCodeVim settings.

This extension does not emulate Vim and does not replace VSCodeVim.

## Features

- Activity Bar container and Sidebar view named `Vim Guide`.
- 48 Vim command and productivity tip entries.
- 12 VS Code integration command entries.
- Search across title, keys, description, category, and tags.
- Category filtering.
- Empty search and no-results states.
- Favorites stored with VS Code global extension state.
- Copy action for every guide item.
- Run action only for explicitly allowlisted VS Code commands.
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
```

Package smoke uses the local `@vscode/vsce` dev dependency:

```sh
npm run package
```

## Extension Development Host

Open this repository in VS Code, then press `F5` if using a launch configuration, or run:

```sh
code --extensionDevelopmentPath=/Users/hongseok/project/vscode-vim-guide
```

In the Extension Development Host, verify:

- Activity Bar includes `Vim Guide`.
- Sidebar renders guide items.
- Search and category filter update results.
- A no-results state appears for unmatched searches.
- Favorite toggles persist after reload.
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
| Sidebar renders initial list | Extension activation test, Extension Development Host smoke |
| Search fields covered | `GuideService` tests |
| Category filter | `GuideService` tests, manual smoke |
| Empty query and no-results states | `GuideService` view model tests, manual smoke |
| Favorites add/remove and persist | `GuideService` state tests, manual smoke |
| 40 to 60 Vim command/tip seed items | data count test |
| 10 to 15 VS Code command seed items | data count test |
| Required item fields | data schema test |
| VSCodeVim settings displayed | parser tests, manual smoke |
| Missing or malformed VSCodeVim config is safe | parser tests |
| Only allowlisted commands execute | allowlist tests |
| Non-executable Vim actions avoid Run buttons | data/service tests, manual smoke |
| Compile, lint, test pass | `npm run compile`, `npm run lint`, `npm test` |
| Package smoke | `npm run package` |
| README coverage | this file |
| deep-code-review and pr-review clean | harness review reports |
