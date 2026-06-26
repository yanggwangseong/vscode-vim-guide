import { randomBytes } from "crypto";
import * as vscode from "vscode";
import { GuideFilters, GuideService, normalizeGuideFilters } from "../services/guideService";

type WebviewMessage =
  | { readonly type: "ready" }
  | {
      readonly type: "filter";
      readonly query?: unknown;
      readonly category?: unknown;
      readonly stage?: unknown;
      readonly favoritesOnly?: unknown;
      readonly language?: unknown;
      readonly viewMode?: unknown;
      readonly lesson?: unknown;
    }
  | { readonly type: "toggleFavorite"; readonly id?: unknown }
  | { readonly type: "copy"; readonly id?: unknown }
  | { readonly type: "run"; readonly id?: unknown }
  | { readonly type: "refreshConfig" };

export class GuideViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "vimGuide.sidebar";

  private view?: vscode.WebviewView;
  private filters: GuideFilters = normalizeGuideFilters();

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly guideService: GuideService
  ) {
    this.filters = normalizeGuideFilters({ language: guideService.getLanguage() });
  }

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

  public refresh(): boolean {
    if (this.view === undefined) {
      return false;
    }

    void this.postViewModel().catch((error: unknown) => this.handleMessageError(error));
    return true;
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case "ready":
      case "refreshConfig":
        await this.postViewModel();
        return;
      case "filter":
        this.filters = normalizeGuideFilters(message, this.filters.language);
        await this.guideService.setLanguage(this.filters.language);
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

    const model = this.guideService.createViewModel(this.filters);
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
    const model = this.guideService.createViewModel(this.filters);
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

        .filter-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        input:not([type="checkbox"]),
        select {
          width: 100%;
          min-height: 30px;
          border: 1px solid var(--vscode-input-border, transparent);
      border-radius: var(--radius);
      color: var(--vscode-input-foreground);
          background: var(--vscode-input-background);
          padding: 5px 8px;
        }

        input[type="checkbox"] {
          width: auto;
          min-height: 0;
          margin: 0;
        }

        .toggle {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 30px;
          color: var(--vscode-foreground);
        }

        input:focus,
        select:focus,
        button:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }

        .notice,
        .guidance,
        .curriculum,
        .vim-summary,
        .settings {
          border: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border));
          border-radius: var(--radius);
          padding: 10px;
          background: var(--vscode-editorWidget-background);
    }

        .notice {
          color: var(--vscode-descriptionForeground);
        }

        .guidance {
          color: var(--vscode-descriptionForeground);
        }

        .curriculum {
          display: grid;
          gap: 9px;
        }

        .curriculum-head {
          display: grid;
          gap: 4px;
        }

        .curriculum-title,
        .results-title {
          font-weight: 650;
        }

        .curriculum-intro,
        .lesson-meta,
        .lesson-note,
        .lesson-label,
        .path-count {
          color: var(--vscode-descriptionForeground);
          font-size: 12px;
        }

        .mode-toggle {
          display: flex;
          align-items: center;
          gap: 7px;
          min-height: 28px;
        }

        .lesson-list {
          display: grid;
          gap: 8px;
        }

        .lesson-card {
          display: grid;
          border: 1px solid var(--vscode-panel-border);
          border-radius: var(--radius);
          background: var(--vscode-sideBar-background);
        }

        .lesson-card.active {
          border-color: var(--vscode-focusBorder);
        }

        .lesson-card summary {
          display: grid;
          gap: 8px;
          padding: 9px;
          cursor: pointer;
          list-style: none;
        }

        .lesson-card summary::-webkit-details-marker {
          display: none;
        }

        .lesson-summary-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .lesson-title {
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .lesson-description,
        .lesson-practice,
        .lesson-readiness {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .lesson-body {
          display: grid;
          gap: 8px;
          padding: 0 9px 9px;
        }

        .lesson-items {
          display: grid;
          gap: 5px;
        }

        .lesson-item {
          display: grid;
          grid-template-columns: minmax(44px, auto) minmax(0, 1fr);
          gap: 6px;
          align-items: baseline;
        }

        .lesson-item code {
          color: var(--vscode-editor-foreground);
          font-family: var(--vscode-editor-font-family);
          overflow-wrap: anywhere;
        }

        .lesson-item-title {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        .lesson-action {
          justify-self: start;
        }

        .vim-summary {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--gap);
        }

        .vim-summary-text {
          min-width: 0;
        }

        .vim-summary-title {
          font-weight: 650;
        }

        .vim-summary-status {
          color: var(--vscode-descriptionForeground);
          font-size: 12px;
          overflow-wrap: anywhere;
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

        .setting-value.status-invalid {
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
          font-size: 12px;
        }

        .badge {
          border: 1px solid var(--vscode-badge-background, var(--vscode-panel-border));
          border-radius: 999px;
          color: var(--vscode-badge-foreground, var(--vscode-descriptionForeground));
          background: var(--vscode-badge-background, transparent);
          padding: 1px 6px;
          overflow-wrap: anywhere;
        }

        .badge.secondary-badge {
          color: var(--vscode-descriptionForeground);
          background: transparent;
        }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }

        .empty-results {
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

          .filter-row {
            grid-template-columns: 1fr;
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

        <section class="curriculum" id="curriculum" aria-label="Today's Vim practice"></section>
        <div class="guidance" id="guidance" role="status" aria-live="polite" hidden></div>

        <section class="controls" id="controls" aria-label="Filters">
          <input id="search" type="search" placeholder="Search title, keys, category, tags" autocomplete="off" aria-label="Search guide items">
          <div class="filter-row">
            <select id="language" aria-label="Display language"></select>
            <select id="stage" aria-label="Learning stage"></select>
          </div>
          <select id="category" aria-label="Category"></select>
          <label class="toggle">
            <input id="favorites-only" type="checkbox">
            <span id="favorite-label">Favorites</span>
          </label>
        </section>

        <section class="vim-summary" aria-label="VSCodeVim status">
          <div class="vim-summary-text">
            <div class="vim-summary-title">VSCodeVim</div>
            <div class="vim-summary-status" id="vim-summary-status"></div>
          </div>
          <button class="link" id="refresh-summary" type="button">Refresh</button>
        </section>

        <div class="notice" id="notice" role="status" aria-live="polite" hidden></div>
        <section class="results" id="results"></section>

    <section class="settings" aria-label="VSCodeVim settings">
      <div class="settings-header">
        <div class="settings-title" id="settings-title">VSCodeVim</div>
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
        const controls = document.getElementById("controls");
        const languageSelect = document.getElementById("language");
        const stageSelect = document.getElementById("stage");
        const categorySelect = document.getElementById("category");
        const favoritesOnly = document.getElementById("favorites-only");
        const favoriteLabel = document.getElementById("favorite-label");
        const count = document.getElementById("count");
        const curriculum = document.getElementById("curriculum");
        const guidance = document.getElementById("guidance");
        const notice = document.getElementById("notice");
        const results = document.getElementById("results");
        const settingsList = document.getElementById("settings-list");
        const settingsTitle = document.getElementById("settings-title");
        const vimStatus = document.getElementById("vim-status");
        const vimSummaryStatus = document.getElementById("vim-summary-status");
        const refresh = document.getElementById("refresh");
        const refreshSummary = document.getElementById("refresh-summary");

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
        languageSelect.addEventListener("change", postFilter);
        stageSelect.addEventListener("change", postFilter);
        favoritesOnly.addEventListener("change", postFilter);
        refresh.addEventListener("click", () => vscode.postMessage({ type: "refreshConfig" }));
        refreshSummary.addEventListener("click", () => vscode.postMessage({ type: "refreshConfig" }));

        function postFilter(overrides = {}) {
          vscode.postMessage({
            type: "filter",
            query: Object.prototype.hasOwnProperty.call(overrides, "query") ? overrides.query : searchInput.value,
            category: Object.prototype.hasOwnProperty.call(overrides, "category") ? overrides.category : categorySelect.value,
            stage: Object.prototype.hasOwnProperty.call(overrides, "stage") ? overrides.stage : stageSelect.value,
            favoritesOnly: Object.prototype.hasOwnProperty.call(overrides, "favoritesOnly") ? overrides.favoritesOnly : favoritesOnly.checked,
            language: Object.prototype.hasOwnProperty.call(overrides, "language") ? overrides.language : languageSelect.value,
            viewMode: Object.prototype.hasOwnProperty.call(overrides, "viewMode") ? overrides.viewMode : currentModel.viewMode,
            lesson: Object.prototype.hasOwnProperty.call(overrides, "lesson") ? overrides.lesson : currentModel.lesson
          });
        }

        function render(model) {
          document.documentElement.lang = model.language === "ko" ? "ko" : "en";
          searchInput.placeholder = model.ui.searchPlaceholder;
          searchInput.setAttribute("aria-label", model.ui.searchAriaLabel);
          controls.setAttribute("aria-label", model.ui.filtersAriaLabel);
          languageSelect.setAttribute("aria-label", model.ui.languageAriaLabel);
          stageSelect.setAttribute("aria-label", model.ui.stageAriaLabel);
          categorySelect.setAttribute("aria-label", model.ui.categoryAriaLabel);
          searchInput.value = model.query;
          favoritesOnly.checked = model.favoritesOnly;
          favoriteLabel.textContent = model.ui.favorites + " (" + model.favoriteCount + ")";
          refresh.textContent = model.ui.refresh;
          refreshSummary.textContent = model.ui.refresh;
          settingsTitle.textContent = "VSCodeVim";
          renderLanguages(model);
          renderStages(model);
          renderCategories(model);
          renderSettings(model.vscodeVim);
          renderCurriculum(model);
          renderGuidance(model);
          renderNotice();
          renderItems(model);
          count.textContent = model.resultCount + "/" + model.totalCount;
          count.setAttribute(
            "aria-label",
            model.ui.countAriaPrefix + model.resultCount + model.ui.countAriaMiddle + model.totalCount + model.ui.countAriaSuffix
          );
        }

        function renderLanguages(model) {
          languageSelect.replaceChildren();
          for (const language of model.languages) {
            const option = document.createElement("option");
            option.value = language.id;
            option.textContent = language.label;
            option.selected = language.id === model.language;
            languageSelect.append(option);
          }
        }

        function renderStages(model) {
          stageSelect.replaceChildren();
          for (const stage of model.stages) {
            const option = document.createElement("option");
            option.value = stage.id;
            option.textContent = stage.label;
            option.selected = stage.id === model.stage;
            stageSelect.append(option);
          }
        }

    function renderCategories(model) {
      categorySelect.replaceChildren();
      const categories = model.categoryOptions ?? model.categories.map((category) => ({ id: category, label: category }));
      for (const category of categories) {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.label;
        option.selected = category.id === model.category;
        categorySelect.append(option);
      }
    }

        function renderSettings(snapshot) {
          let statusText;
          if (!snapshot.installed) {
            statusText = currentModel.ui.vscodeVimNotDetected;
          } else if (snapshot.configured) {
            statusText = currentModel.ui.vscodeVimConfigured;
          } else {
            statusText = currentModel.ui.vscodeVimNoTrackedSettings;
          }
          vimSummaryStatus.textContent = statusText;
          vimStatus.textContent = statusText;
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
            value.className = "setting-value status-" + setting.status;
            value.textContent = setting.detail ? setting.value + " | " + setting.detail : setting.value;

        row.append(labelWrap, value);
        settingsList.append(row);
          }
        }

        function renderCurriculum(model) {
          curriculum.replaceChildren();
          curriculum.setAttribute("aria-label", model.ui.curriculumTitle);

          const head = document.createElement("div");
          head.className = "curriculum-head";
          const title = document.createElement("div");
          title.className = "curriculum-title";
          title.textContent = model.ui.curriculumTitle;
          const intro = document.createElement("div");
          intro.className = "curriculum-intro";
          intro.textContent = model.ui.curriculumIntro;
          head.append(title, intro);

          const modeToggle = document.createElement("label");
          modeToggle.className = "mode-toggle";
          const showAll = document.createElement("input");
          showAll.type = "checkbox";
          showAll.id = "show-all";
          showAll.checked = model.viewMode === "all";
          const modeLabel = document.createElement("span");
          modeLabel.textContent =
            model.ui.showAllCommands + " · " + (model.viewMode === "all" ? model.ui.referenceModeLabel : model.ui.practiceModeLabel);
          showAll.addEventListener("change", () => {
            searchInput.value = "";
            categorySelect.value = "All";
            stageSelect.value = "All";
            favoritesOnly.checked = false;
            postFilter({
              query: "",
              category: "All",
              stage: "All",
              favoritesOnly: false,
              viewMode: showAll.checked ? "all" : "practice"
            });
          });
          modeToggle.append(showAll, modeLabel);

          const list = document.createElement("div");
          list.className = "lesson-list";

          for (const lesson of model.lessons) {
            list.append(renderLesson(lesson, model));
          }

          curriculum.append(head, modeToggle, list);
        }

        function renderLesson(lesson, model) {
          const card = document.createElement("details");
          card.className = lesson.active ? "lesson-card active" : "lesson-card";
          card.open = lesson.initiallyOpen;

          const summary = document.createElement("summary");
          const topLine = document.createElement("div");
          topLine.className = "lesson-summary-top";
          const title = document.createElement("div");
          title.className = "lesson-title";
          title.textContent = lesson.active ? model.ui.currentLesson + ": " + lesson.title : lesson.title;
          const meta = document.createElement("div");
          meta.className = "lesson-meta";
          meta.textContent = lesson.stageLabel + " · " + lesson.itemCount;
          topLine.append(title, meta);

          const description = document.createElement("p");
          description.className = "lesson-description";
          description.textContent = lesson.description;
          summary.append(topLine, description);

          const body = document.createElement("div");
          body.className = "lesson-body";

          const practiceLabel = document.createElement("div");
          practiceLabel.className = "lesson-label";
          practiceLabel.textContent = model.ui.practicePrompt;
          const practice = document.createElement("p");
          practice.className = "lesson-practice";
          practice.textContent = lesson.practicePrompt;

          const itemLabel = document.createElement("div");
          itemLabel.className = "lesson-label";
          itemLabel.textContent = model.ui.lessonItemsLabel;
          const itemList = document.createElement("div");
          itemList.className = "lesson-items";
          for (const item of lesson.items) {
            const row = document.createElement("div");
            row.className = "lesson-item";
            const keys = document.createElement("code");
            keys.textContent = item.keys;
            const itemTitle = document.createElement("div");
            itemTitle.className = "lesson-item-title";
            itemTitle.textContent = item.displayTitle;
            row.append(keys, itemTitle);
            itemList.append(row);
          }

          const readinessLabel = document.createElement("div");
          readinessLabel.className = "lesson-label";
          readinessLabel.textContent = model.ui.readiness;
          const readiness = document.createElement("p");
          readiness.className = "lesson-readiness";
          readiness.textContent = lesson.readinessHint;

          const action = document.createElement("button");
          action.className = "secondary lesson-action";
          action.type = "button";
          action.textContent = lesson.active ? model.ui.practicingNow : model.ui.practiceThisLesson;
          action.disabled = lesson.active && model.viewMode === "practice";
          action.addEventListener("click", () => {
            searchInput.value = "";
            categorySelect.value = "All";
            stageSelect.value = lesson.stage;
            favoritesOnly.checked = false;
            postFilter({
              query: "",
              category: "All",
              stage: lesson.stage,
              favoritesOnly: false,
              viewMode: "practice",
              lesson: lesson.id
            });
          });

          body.append(practiceLabel, practice, itemLabel, itemList, readinessLabel, readiness, action);
          card.append(summary, body);
          return card;
        }

        function renderGuidance(model) {
          if (model.guidanceText.length === 0) {
            guidance.hidden = true;
            guidance.textContent = "";
            return;
          }

          guidance.hidden = false;
          guidance.textContent = model.guidanceText;
        }

        function renderNotice() {
          notice.hidden = true;
          notice.textContent = "";
        }

    function renderItems(model) {
      results.replaceChildren();

          const title = document.createElement("div");
          title.className = "results-title";
          title.textContent =
            model.viewMode === "practice" && model.query.trim().length === 0 && model.category === "All" && !model.favoritesOnly && model.currentLesson
              ? model.ui.currentLesson + ": " + model.currentLesson.title
              : model.ui.resultsTitle;
          results.append(title);

          if (model.items.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-results";
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
        filters.push(model.ui.searchFilterLabel + ' "' + query + '"');
      }
          if (model.category !== "All") {
            const selectedCategory = model.categoryOptions.find((category) => category.id === model.category);
            filters.push(model.ui.categoryFilterLabel + ' "' + (selectedCategory?.label ?? model.category) + '"');
          }
          if (model.stage !== "All") {
            const selectedStage = model.stages.find((stage) => stage.id === model.stage);
            filters.push(model.ui.stageFilterLabel + ' "' + (selectedStage?.label ?? model.stage) + '"');
          }
          if (model.favoritesOnly) {
            filters.push(model.ui.favoritesFilterLabel);
          }

          return filters.length > 0 ? model.ui.noMatchesFor + filters.join(model.ui.filterJoin) + "." : model.ui.noGuideItems;
        }

    function renderItem(item) {
      const card = document.createElement("article");
      card.className = "card";

      const head = document.createElement("div");
      head.className = "card-head";

      const titleWrap = document.createElement("div");
      const title = document.createElement("h2");
      title.className = "item-title";
      title.textContent = item.displayTitle;
      const keys = document.createElement("code");
      keys.className = "keys";
      keys.textContent = item.keys;
      titleWrap.append(title, keys);

      const favorite = document.createElement("button");
      favorite.className = "secondary";
      favorite.type = "button";
      favorite.textContent = item.favorite ? currentModel.ui.removeFavorite : currentModel.ui.addFavorite;
      favorite.title = item.favorite ? "Remove from favorites" : "Add to favorites";
      favorite.setAttribute("aria-pressed", item.favorite ? "true" : "false");
      favorite.setAttribute("aria-label", currentModel.ui.favorites + ": " + item.displayTitle);
      favorite.addEventListener("click", () => vscode.postMessage({ type: "toggleFavorite", id: item.id }));

      head.append(titleWrap, favorite);

      const description = document.createElement("p");
      description.className = "description";
      description.textContent = item.displayDescription;

          const meta = document.createElement("div");
          meta.className = "meta";
          meta.append(
            renderBadge(item.stageLabel, "secondary-badge"),
            renderBadge(item.categoryLabel, "secondary-badge"),
            renderBadge(item.actionLabel, item.executable ? "" : "secondary-badge")
          );

      const actions = document.createElement("div");
      actions.className = "actions";

      const copy = document.createElement("button");
      copy.className = "secondary";
      copy.type = "button";
      copy.textContent = currentModel.ui.copy;
      copy.title = "Copy keys";
      copy.setAttribute("aria-label", currentModel.ui.copy + ": " + item.displayTitle);
      copy.addEventListener("click", () => vscode.postMessage({ type: "copy", id: item.id }));
      actions.append(copy);

      if (item.executable) {
        const run = document.createElement("button");
        run.type = "button";
        run.textContent = currentModel.ui.run;
        run.title = "Run VS Code command";
        run.setAttribute("aria-label", currentModel.ui.run + ": " + item.displayTitle);
        run.addEventListener("click", () => vscode.postMessage({ type: "run", id: item.id }));
        actions.append(run);
      }

          card.append(head, description, meta, actions);
          return card;
        }

        function renderBadge(text, className) {
          const badge = document.createElement("span");
          badge.className = className ? "badge " + className : "badge";
          badge.textContent = text;
          return badge;
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
