import { randomBytes } from "crypto";
import * as vscode from "vscode";
import { ALL_CATEGORY, GuideService } from "../services/guideService";

type WebviewMessage =
  | { readonly type: "ready" }
  | { readonly type: "filter"; readonly query?: unknown; readonly category?: unknown }
  | { readonly type: "toggleFavorite"; readonly id?: unknown }
  | { readonly type: "copy"; readonly id?: unknown }
  | { readonly type: "run"; readonly id?: unknown }
  | { readonly type: "refreshConfig" };

export class GuideViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "vimGuide.sidebar";

  private view?: vscode.WebviewView;
  private query = "";
  private category = ALL_CATEGORY;

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly guideService: GuideService
  ) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.onDidDispose(() => {
      if (this.view === webviewView) {
        this.view = undefined;
      }
    });

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage((message: unknown) => {
      if (isWebviewMessage(message)) {
        void this.handleMessage(message).catch((error: unknown) => this.handleMessageError(error));
      }
    });
  }

  public refresh(): void {
    void this.postViewModel().catch((error: unknown) => this.handleMessageError(error));
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "ready":
      case "refreshConfig":
        await this.postViewModel();
        return;
      case "filter":
        this.query = typeof message.query === "string" ? message.query : "";
        this.category = typeof message.category === "string" ? message.category : ALL_CATEGORY;
        await this.postViewModel();
        return;
      case "toggleFavorite":
        if (typeof message.id === "string") {
          await this.guideService.toggleFavorite(message.id);
          await this.postViewModel();
        }
        return;
      case "copy":
        if (typeof message.id === "string") {
          const text = this.guideService.getCopyText(message.id);
          if (text !== undefined) {
            await vscode.env.clipboard.writeText(text);
            void vscode.window.showInformationMessage(`Copied: ${text}`);
          }
        }
        return;
      case "run":
        if (typeof message.id === "string") {
          await this.runCommand(message.id);
        }
        return;
    }
  }

  private async runCommand(id: string): Promise<void> {
    try {
      const command = await this.guideService.executeGuideCommand(id);
      void vscode.window.showInformationMessage(`Ran: ${command}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run this guide item.";
      void vscode.window.showWarningMessage(message);
    }
  }

  private async postViewModel(): Promise<void> {
    if (this.view === undefined) {
      return;
    }

    const model = this.guideService.createViewModel(this.query, this.category);
    const delivered = await this.view.webview.postMessage({ type: "viewModel", model });
    if (!delivered) {
      void vscode.window.showWarningMessage("Vim Guide could not update the sidebar view. Reopen the view if it appears stale.");
    }
  }

  private handleMessageError(error: unknown): void {
    const message = error instanceof Error ? error.message : "Unexpected Vim Guide sidebar error.";
    void vscode.window.showWarningMessage(`Vim Guide: ${message}`);
    void this.postViewModel().catch(() => {
      // If recovery sync also fails, VS Code will retry on the next webview ready/refresh message.
    });
  }

  private getHtml(): string {
    const nonce = getNonce();
    const model = this.guideService.createViewModel(this.query, this.category);
    const initialModel = JSON.stringify(model).replace(/</g, "\\u003c");

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vim Guide</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light dark;
      --gap: 10px;
      --radius: 6px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 12px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.45;
    }

    button,
    input,
    select {
      font: inherit;
    }

    button {
      min-height: 28px;
      border: 1px solid var(--vscode-button-border, transparent);
      border-radius: var(--radius);
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
      padding: 4px 9px;
      white-space: nowrap;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    button.secondary {
      color: var(--vscode-foreground);
      background: var(--vscode-button-secondaryBackground);
    }

    button.secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    button.link {
      padding: 0;
      border: 0;
      color: var(--vscode-textLink-foreground);
      background: transparent;
    }

    .shell {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }

    .title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--gap);
    }

    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 650;
      letter-spacing: 0;
    }

    .count {
      color: var(--vscode-descriptionForeground);
      white-space: nowrap;
    }

    .controls {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    input,
    select {
      width: 100%;
      min-height: 30px;
      border: 1px solid var(--vscode-input-border, transparent);
      border-radius: var(--radius);
      color: var(--vscode-input-foreground);
      background: var(--vscode-input-background);
      padding: 5px 8px;
    }

    input:focus,
    select:focus,
    button:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }

    .notice,
    .settings {
      border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
      border-radius: var(--radius);
      padding: 10px;
      background: var(--vscode-editorWidget-background);
    }

    .notice {
      color: var(--vscode-descriptionForeground);
    }

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--gap);
      margin-bottom: 8px;
    }

    .settings-title {
      font-weight: 650;
    }

    .settings-status {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      text-align: right;
    }

    .settings-list {
      display: grid;
      gap: 7px;
    }

    .setting {
      display: grid;
      grid-template-columns: minmax(96px, 38%) minmax(0, 1fr);
      gap: 8px;
      align-items: start;
    }

    .setting-label {
      color: var(--vscode-foreground);
      overflow-wrap: anywhere;
    }

    .setting-key {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      overflow-wrap: anywhere;
    }

    .setting-value {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .setting-value.invalid {
      color: var(--vscode-errorForeground);
    }

    .results {
      display: grid;
      gap: 8px;
    }

    .card {
      border: 1px solid var(--vscode-panel-border);
      border-radius: var(--radius);
      padding: 10px;
      background: var(--vscode-sideBar-background);
    }

    .card-head {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 8px;
      align-items: start;
    }

    .item-title {
      margin: 0;
      font-size: 14px;
      font-weight: 650;
      overflow-wrap: anywhere;
    }

    .keys {
      display: inline-block;
      max-width: 100%;
      margin-top: 4px;
      border-radius: 4px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-textCodeBlock-background);
      padding: 2px 5px;
      font-family: var(--vscode-editor-font-family);
      overflow-wrap: anywhere;
    }

    .description {
      margin: 8px 0;
      color: var(--vscode-foreground);
      overflow-wrap: anywhere;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

    .empty {
      border: 1px dashed var(--vscode-panel-border);
      border-radius: var(--radius);
      padding: 16px 10px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }

    @media (max-width: 280px) {
      body {
        padding: 10px;
      }

      .setting {
        grid-template-columns: 1fr;
        gap: 2px;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="title-row">
      <h1>Vim Guide</h1>
      <span class="count" id="count" role="status" aria-live="polite"></span>
    </div>

    <section class="controls" aria-label="Filters">
      <input id="search" type="search" placeholder="Search title, keys, category, tags" autocomplete="off" aria-label="Search guide items">
      <select id="category" aria-label="Category"></select>
    </section>

    <div class="notice" id="notice" role="status" aria-live="polite" hidden></div>
    <section class="results" id="results"></section>

    <section class="settings" aria-label="VSCodeVim settings">
      <div class="settings-header">
        <div class="settings-title">VSCodeVim</div>
        <button class="link" id="refresh" type="button">Refresh</button>
      </div>
      <div class="settings-status" id="vim-status"></div>
      <div class="settings-list" id="settings-list"></div>
    </section>
  </main>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let currentModel = ${initialModel};
    let debounceHandle;

    const searchInput = document.getElementById("search");
    const categorySelect = document.getElementById("category");
    const count = document.getElementById("count");
    const notice = document.getElementById("notice");
    const results = document.getElementById("results");
    const settingsList = document.getElementById("settings-list");
    const vimStatus = document.getElementById("vim-status");
    const refresh = document.getElementById("refresh");

    window.addEventListener("message", (event) => {
      if (event.data?.type === "viewModel") {
        currentModel = event.data.model;
        render(currentModel);
      }
    });

    searchInput.addEventListener("input", () => {
      window.clearTimeout(debounceHandle);
      debounceHandle = window.setTimeout(postFilter, 120);
    });

    categorySelect.addEventListener("change", postFilter);
    refresh.addEventListener("click", () => vscode.postMessage({ type: "refreshConfig" }));

    function postFilter() {
      vscode.postMessage({
        type: "filter",
        query: searchInput.value,
        category: categorySelect.value
      });
    }

    function render(model) {
      searchInput.value = model.query;
      renderCategories(model);
      renderSettings(model.vscodeVim);
      renderNotice(model);
      renderItems(model);
      count.textContent = model.resultCount + "/" + model.totalCount;
      count.setAttribute("aria-label", "Showing " + model.resultCount + " of " + model.totalCount + " guide items");
    }

    function renderCategories(model) {
      categorySelect.replaceChildren();
      for (const category of model.categories) {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        option.selected = category === model.category;
        categorySelect.append(option);
      }
    }

    function renderSettings(snapshot) {
      if (!snapshot.installed) {
        vimStatus.textContent = "VSCodeVim extension not detected";
      } else if (snapshot.configured) {
        vimStatus.textContent = "extension detected, tracked settings found";
      } else {
        vimStatus.textContent = "extension detected, no tracked settings configured";
      }
      settingsList.replaceChildren();

      for (const setting of snapshot.settings) {
        const row = document.createElement("div");
        row.className = "setting";

        const labelWrap = document.createElement("div");
        const label = document.createElement("div");
        label.className = "setting-label";
        label.textContent = setting.label;
        const key = document.createElement("div");
        key.className = "setting-key";
        key.textContent = setting.key;
        labelWrap.append(label, key);

        const value = document.createElement("div");
        value.className = "setting-value " + setting.status;
        value.textContent = setting.detail ? setting.value + " | " + setting.detail : setting.value;

        row.append(labelWrap, value);
        settingsList.append(row);
      }
    }

    function renderNotice(model) {
      if (model.noResults) {
        notice.hidden = true;
        notice.textContent = "";
        return;
      }

      if (model.emptyQuery) {
        notice.hidden = false;
        notice.textContent = "Showing all guide items.";
        return;
      }

      notice.hidden = true;
      notice.textContent = "";
    }

    function renderItems(model) {
      results.replaceChildren();

      if (model.items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = describeNoResults(model);
        results.append(empty);
        return;
      }

      for (const item of model.items) {
        results.append(renderItem(item));
      }
    }

    function describeNoResults(model) {
      const filters = [];
      const query = model.query.trim();
      if (query.length > 0) {
        filters.push('search "' + query + '"');
      }
      if (model.category !== "All") {
        filters.push('category "' + model.category + '"');
      }

      return filters.length > 0 ? "No matches for " + filters.join(" and ") + "." : "No guide items available.";
    }

    function renderItem(item) {
      const card = document.createElement("article");
      card.className = "card";

      const head = document.createElement("div");
      head.className = "card-head";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h2");
      title.className = "item-title";
      title.textContent = item.title;
      const keys = document.createElement("code");
      keys.className = "keys";
      keys.textContent = item.keys;
      titleWrap.append(title, keys);

      const favorite = document.createElement("button");
      favorite.className = "secondary";
      favorite.type = "button";
      favorite.textContent = item.favorite ? "Unfavorite" : "Favorite";
      favorite.title = item.favorite ? "Remove from favorites" : "Add to favorites";
      favorite.setAttribute("aria-pressed", item.favorite ? "true" : "false");
      favorite.setAttribute("aria-label", "Toggle favorite for " + item.title);
      favorite.addEventListener("click", () => vscode.postMessage({ type: "toggleFavorite", id: item.id }));

      head.append(titleWrap, favorite);

      const description = document.createElement("p");
      description.className = "description";
      description.textContent = item.description;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = item.category + " / " + item.type + " / " + item.source;

      const actions = document.createElement("div");
      actions.className = "actions";

      const copy = document.createElement("button");
      copy.className = "secondary";
      copy.type = "button";
      copy.textContent = "Copy";
      copy.title = "Copy keys";
      copy.setAttribute("aria-label", "Copy keys for " + item.title);
      copy.addEventListener("click", () => vscode.postMessage({ type: "copy", id: item.id }));
      actions.append(copy);

      if (item.executable) {
        const run = document.createElement("button");
        run.type = "button";
        run.textContent = "Run";
        run.title = "Run VS Code command";
        run.setAttribute("aria-label", "Run " + item.title);
        run.addEventListener("click", () => vscode.postMessage({ type: "run", id: item.id }));
        actions.append(run);
      }

      card.append(head, description, meta, actions);
      return card;
    }

    render(currentModel);
    vscode.postMessage({ type: "ready" });
  </script>
</body>
</html>`;
  }
}

function getNonce(): string {
  return randomBytes(16).toString("hex");
}

function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }

  const type = (value as { readonly type?: unknown }).type;
  return (
    type === "ready" ||
    type === "filter" ||
    type === "toggleFavorite" ||
    type === "copy" ||
    type === "run" ||
    type === "refreshConfig"
  );
}
