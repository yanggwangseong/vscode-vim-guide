import * as assert from "assert";
import * as vscode from "vscode";
import { GuideItem, guideItemStageOverrides, guideItemStages, guideItems } from "../../data/guideData";
import {
  ALLOWED_VSCODE_COMMANDS,
  ALL_CATEGORY,
  ALL_STAGE,
  ConfigurationReader,
  FAVORITES_KEY,
  GuideViewModel,
  GuideService,
  StateStore,
  parseVscodeVimConfig
} from "../../services/guideService";
import { GuideViewProvider } from "../../webview/GuideViewProvider";

class MemoryState implements StateStore {
  private readonly values = new Map<string, unknown>();
  public readonly updates: Array<{ readonly key: string; readonly value: unknown }> = [];

  public get<T>(key: string, defaultValue: T): T {
    return this.values.has(key) ? (this.values.get(key) as T) : defaultValue;
  }

  public update(key: string, value: unknown): Thenable<void> {
    this.updates.push({ key, value });
    this.values.set(key, value);
    return Promise.resolve();
  }

  public set(key: string, value: unknown): void {
    this.values.set(key, value);
  }
}

class FakeWebview {
  public html = "";
  public options: vscode.WebviewOptions = {};
  public readonly postedMessages: unknown[] = [];
  public postMessageResult = true;
  private listener?: (message: unknown) => unknown;

  public readonly onDidReceiveMessage = (listener: (message: unknown) => unknown): vscode.Disposable => {
    this.listener = listener;
    return new vscode.Disposable(() => {
      this.listener = undefined;
    });
  };

  public postMessage(message: unknown): Thenable<boolean> {
    this.postedMessages.push(message);
    return Promise.resolve(this.postMessageResult);
  }

  public receive(message: unknown): void {
    this.listener?.(message);
  }
}

function createFakeWebviewView(): {
  readonly view: vscode.WebviewView;
  readonly webview: FakeWebview;
  readonly dispose: () => void;
} {
  const webview = new FakeWebview();
  let disposeListener: (() => unknown) | undefined;
  const view = {
    webview: webview as unknown as vscode.Webview,
    onDidDispose: (listener: () => unknown) => {
      disposeListener = listener;
      return new vscode.Disposable(() => {
        disposeListener = undefined;
      });
    }
  } as unknown as vscode.WebviewView;

  return {
    view,
    webview,
    dispose: () => disposeListener?.()
  };
}

function emptyConfig(): ConfigurationReader {
  return {
    get: () => undefined
  };
}

function mapConfig(values: Record<string, unknown>): ConfigurationReader {
  return {
    get: <T>(section: string) => values[section] as T | undefined
  };
}

function createService(
  state = new MemoryState(),
  executed: string[] = [],
  items: readonly GuideItem[] = guideItems,
  config: ConfigurationReader = emptyConfig(),
  installed = false
): GuideService {
  return new GuideService(state, items, {
    configurationReader: () => config,
    extensionInstalled: () => installed,
    executeCommand: (command) => {
      executed.push(command);
      return Promise.resolve();
    }
  });
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function latestViewModel(webview: FakeWebview): GuideViewModel {
  const message = webview.postedMessages.at(-1) as { readonly type?: unknown; readonly model?: GuideViewModel } | undefined;
  assert.strictEqual(message?.type, "viewModel");
  assert.ok(message.model, "expected latest webview message to include a model");
  return message.model;
}

suite("guide data", () => {
  test("contains expected item counts", () => {
    const vimLikeCount = guideItems.filter((item) => item.source !== "vscode").length;
    const vscodeCommandCount = guideItems.filter((item) => item.type === "vscode-command").length;

    assert.strictEqual(vimLikeCount, 48);
    assert.strictEqual(vscodeCommandCount, 12);
    assert.strictEqual(guideItems.length, 60);
  });

  test("has stable ids and required fields", () => {
    const ids = new Set<string>();
    const validStages = new Set<string>(guideItemStages);

    for (const item of guideItems) {
      assert.ok(item.id.length > 0, "id is required");
      assert.ok(!ids.has(item.id), `duplicate id: ${item.id}`);
      assert.ok(item.title.length > 0, `title is required for ${item.id}`);
      assert.ok(item.keys.length > 0, `keys are required for ${item.id}`);
      assert.ok(item.category.length > 0, `category is required for ${item.id}`);
      assert.ok(item.description.length > 0, `description is required for ${item.id}`);
      assert.ok(item.source.length > 0, `source is required for ${item.id}`);
      assert.ok(item.type.length > 0, `type is required for ${item.id}`);
      assert.ok(validStages.has(item.stage), `stage is invalid for ${item.id}`);
      ids.add(item.id);
    }

    for (const id of Object.keys(guideItemStageOverrides)) {
      assert.ok(ids.has(id), `stage override references an unknown item: ${id}`);
    }
    for (const stage of guideItemStages) {
      assert.ok(guideItems.some((item) => item.stage === stage), `stage has no items: ${stage}`);
    }
  });

  test("keeps executable command entries inside allowlist", () => {
    for (const item of guideItems) {
      if (item.type === "vscode-command") {
        assert.ok(item.command !== undefined, `${item.id} must declare a command`);
        assert.ok(ALLOWED_VSCODE_COMMANDS.has(item.command), `${item.command} is not allowlisted`);
      } else {
        assert.strictEqual(item.command, undefined, `${item.id} should not declare a command`);
      }
    }
  });
});

suite("GuideService", () => {
  test("searches title, keys, description, category, and tags", () => {
    const service = createService();

    assert.ok(service.searchItems("Delete current line", ALL_CATEGORY).some((item) => item.id === "vim-edit-delete-line"));
    assert.ok(service.searchItems("Ctrl+d", ALL_CATEGORY).some((item) => item.id === "vim-motion-page-down"));
    assert.ok(service.searchItems("workspace-wide", ALL_CATEGORY).some((item) => item.id === "vscode-command-find-files"));
    assert.ok(service.searchItems("Text Objects", ALL_CATEGORY).some((item) => item.id === "vim-text-object-inner-word"));
    assert.ok(service.searchItems("quick-open", ALL_CATEGORY).some((item) => item.id === "vscode-command-quick-open"));
  });

  test("searches each field with isolated fixture tokens", () => {
    const items: readonly GuideItem[] = [
      {
        id: "title-token",
        title: "AlphaTitleOnly",
        keys: "k1",
        category: "Fixture",
        description: "plain description",
        source: "vim",
        type: "tip",
        stage: "beginner",
        tags: ["plain"]
      },
      {
        id: "keys-token",
        title: "Keys item",
        keys: "BetaKeysOnly",
        category: "Fixture",
        description: "plain description",
        source: "vim",
        type: "tip",
        stage: "productive",
        tags: ["plain"]
      },
      {
        id: "description-token",
        title: "Description item",
        keys: "k3",
        category: "Fixture",
        description: "GammaDescriptionOnly",
        source: "vim",
        type: "tip",
        stage: "advanced",
        tags: ["plain"]
      },
      {
        id: "tag-token",
        title: "Tag item",
        keys: "k4",
        category: "Other",
        description: "plain description",
        source: "vim",
        type: "tip",
        stage: "productive",
        tags: ["DeltaTagOnly"]
      }
    ];
    const service = createService(new MemoryState(), [], items);

    assert.deepStrictEqual(service.searchItems("alphatitleonly", ALL_CATEGORY).map((item) => item.id), ["title-token"]);
    assert.deepStrictEqual(service.searchItems("betakeysonly", ALL_CATEGORY).map((item) => item.id), ["keys-token"]);
    assert.deepStrictEqual(service.searchItems("gammadescriptiononly", ALL_CATEGORY).map((item) => item.id), ["description-token"]);
    assert.deepStrictEqual(service.searchItems("deltatagonly", ALL_CATEGORY).map((item) => item.id), ["tag-token"]);
    assert.deepStrictEqual(service.searchItems("plain", "Other").map((item) => item.id), ["tag-token"]);
  });

  test("filters by category and handles empty and no-result states", () => {
    const service = createService();
    const searchModel = service.createViewModel("", "Search");
    const noResultsModel = service.createViewModel("definitely-no-match", "Search");

    assert.ok(searchModel.emptyQuery);
    assert.ok(searchModel.items.length > 0);
    assert.ok(searchModel.items.every((item) => item.category === "Search"));
    assert.ok(noResultsModel.noResults);
    assert.strictEqual(noResultsModel.resultCount, 0);
  });

  test("orders learning stages and filters by stage", () => {
    const service = createService();
    const stages = service.getStages();
    const beginnerModel = service.createViewModel({ stage: "beginner" });
    const productiveSearch = service.createViewModel({ query: "quick open", stage: "productive" });

    assert.deepStrictEqual(
      stages.map((stage) => stage.id),
      [ALL_STAGE, "beginner", "productive", "advanced"]
    );
    assert.ok(beginnerModel.items.length > 0);
    assert.ok(beginnerModel.items.every((item) => item.stage === "beginner"));
    assert.ok(productiveSearch.noResults, "Quick open is a beginner VS Code command and should not appear in productive-only results");
  });

  test("combines query, category, stage, and favorites-only filters", async () => {
    const state = new MemoryState();
    const service = createService(state);

    await service.toggleFavorite("vim-edit-delete-line");
    await service.toggleFavorite("vim-search-forward");

    const favoriteBeginnerEdit = service.createViewModel({
      query: "delete",
      category: "Editing",
      stage: "beginner",
      favoritesOnly: true
    });
    const favoriteProductiveEdit = service.createViewModel({
      category: "Editing",
      stage: "productive",
      favoritesOnly: true
    });
    const emptyFavorites = createService().createViewModel({ favoritesOnly: true });

    assert.deepStrictEqual(favoriteBeginnerEdit.items.map((item) => item.id), ["vim-edit-delete-line"]);
    assert.ok(favoriteProductiveEdit.noResults);
    assert.strictEqual(emptyFavorites.noResults, true);
    assert.strictEqual(emptyFavorites.guidanceText, "Favorite commands to build a personal practice queue.");
  });

  test("normalizes malformed filter payloads", () => {
    const service = createService();
    const model = service.createViewModel({
      query: 42,
      category: 42,
      stage: "unknown-stage",
      favoritesOnly: "yes"
    });

    assert.strictEqual(model.query, "");
    assert.strictEqual(model.category, ALL_CATEGORY);
    assert.strictEqual(model.stage, ALL_STAGE);
    assert.strictEqual(model.favoritesOnly, false);
    assert.strictEqual(model.resultCount, 60);
  });

  test("persists favorites through state", async () => {
    const state = new MemoryState();
    const service = createService(state);

    assert.strictEqual(await service.toggleFavorite("vim-edit-delete-line"), true);
    assert.deepStrictEqual(state.get(FAVORITES_KEY, []), ["vim-edit-delete-line"]);

    const reloaded = createService(state);
    const model = reloaded.createViewModel("delete line", ALL_CATEGORY);
    assert.strictEqual(model.favoriteCount, 1);
    assert.strictEqual(model.items.find((item) => item.id === "vim-edit-delete-line")?.favorite, true);

    assert.strictEqual(await reloaded.toggleFavorite("vim-edit-delete-line"), false);
    assert.deepStrictEqual(state.get(FAVORITES_KEY, []), []);
  });

  test("ignores malformed favorites, prunes stale ids, and does not update unknown ids", async () => {
    const state = new MemoryState();
    state.set(FAVORITES_KEY, "bad");
    const service = createService(state);

    assert.deepStrictEqual(service.getFavoriteIds(), []);
    await flushPromises();
    assert.deepStrictEqual(state.get(FAVORITES_KEY, []), []);
    assert.strictEqual(service.createViewModel("", ALL_CATEGORY).favoriteCount, 0);

    state.set(FAVORITES_KEY, ["vim-edit-delete-line", "missing-id", 1, "vim-edit-delete-line"]);
    assert.deepStrictEqual(service.getFavoriteIds(), ["vim-edit-delete-line"]);
    await flushPromises();
    assert.deepStrictEqual(state.get(FAVORITES_KEY, []), ["vim-edit-delete-line"]);
    assert.strictEqual(service.createViewModel("delete line", ALL_CATEGORY).items[0]?.favorite, true);

    const updateCount = state.updates.length;
    assert.strictEqual(await service.toggleFavorite("missing-id"), false);
    assert.strictEqual(state.updates.length, updateCount);
  });

  test("executes only allowlisted VS Code command items", async () => {
    const executed: string[] = [];
    const service = createService(new MemoryState(), executed);

    await service.executeGuideCommand("vscode-command-quick-open");
    assert.deepStrictEqual(executed, ["workbench.action.quickOpen"]);

    await assert.rejects(
      () => service.executeGuideCommand("vim-edit-delete-line"),
      /does not expose an allowlisted VS Code command/
    );
  });

  test("rejects vscode-command items outside the allowlist without calling executor", async () => {
    const executed: string[] = [];
    const items: readonly GuideItem[] = [
      {
        id: "evil-command",
        title: "Evil command",
        keys: "none",
        category: "VS Code Commands",
        description: "Fixture command that must not execute.",
        source: "vscode",
        type: "vscode-command",
        stage: "productive",
        tags: ["fixture"],
        command: "evil.command"
      }
    ];
    const service = createService(new MemoryState(), executed, items);

    await assert.rejects(
      () => service.executeGuideCommand("evil-command"),
      /does not expose an allowlisted VS Code command/
    );
    await assert.rejects(
      () => service.executeGuideCommand("missing-id"),
      /does not expose an allowlisted VS Code command/
    );
    assert.deepStrictEqual(executed, []);
  });
});

suite("VSCodeVim config parsing", () => {
  test("summarizes configured values", () => {
    const snapshot = parseVscodeVimConfig(
      mapConfig({
        leader: ",",
        normalModeKeyBindings: [{ before: ["<leader>", "f"], commands: ["workbench.action.quickOpen"] }],
        visualModeKeyBindings: [],
        insertModeKeyBindings: [{ before: ["j", "k"], after: ["<Esc>"] }],
        useSystemClipboard: true
      }),
      true
    );

    assert.strictEqual(snapshot.installed, true);
    assert.strictEqual(snapshot.configured, true);
    assert.strictEqual(snapshot.settings.find((setting) => setting.key === "vim.leader")?.value, ",");
    assert.strictEqual(snapshot.settings.find((setting) => setting.key === "vim.useSystemClipboard")?.value, "enabled");
  });

  test("handles missing and malformed values with stable statuses", () => {
    const snapshot = parseVscodeVimConfig(
      mapConfig({
        leader: 42,
        normalModeKeyBindings: "bad",
        visualModeKeyBindings: [false],
        useSystemClipboard: "yes"
      }),
      false
    );

    assert.strictEqual(snapshot.installed, false);
    assert.strictEqual(snapshot.configured, false);
    assert.deepStrictEqual(
      snapshot.settings.map((setting) => [setting.key, setting.status, setting.value, setting.detail ?? ""]),
      [
        ["vim.leader", "invalid", "invalid", "Expected a string value."],
        ["vim.normalModeKeyBindings", "invalid", "invalid", "Expected an array of keybinding objects."],
        ["vim.visualModeKeyBindings", "invalid", "1 binding", "invalid binding"],
        ["vim.insertModeKeyBindings", "empty", "0 bindings", ""],
        ["vim.useSystemClipboard", "invalid", "invalid", "Expected a boolean value."]
      ]
    );
  });

  test("limits large VSCodeVim binding summaries", () => {
    const largeBindings = Array.from({ length: 150 }, (_, index) => ({
      before: [`leader-${index}-${"x".repeat(120)}`],
      commands: [`fixture.command.${index}.${"y".repeat(120)}`]
    }));
    const snapshot = parseVscodeVimConfig(
      mapConfig({
        normalModeKeyBindings: largeBindings
      }),
      true
    );
    const setting = snapshot.settings.find((candidate) => candidate.key === "vim.normalModeKeyBindings");

    assert.strictEqual(setting?.status, "ok");
    assert.strictEqual(setting?.value, "150 bindings");
    assert.ok(setting?.detail?.includes("Only first 100 bindings inspected; 50 more omitted."));
    assert.ok((setting?.detail?.length ?? 0) < 420);
  });

  test("limits nested VSCodeVim binding arrays and long string settings", () => {
    const commands = Array.from({ length: 30 }, (_, index) => `fixture.command.${index}`);
    const snapshot = parseVscodeVimConfig(
      mapConfig({
        leader: "x".repeat(500),
        normalModeKeyBindings: [{ before: ["<leader>"], commands }]
      }),
      true
    );
    const leader = snapshot.settings.find((setting) => setting.key === "vim.leader");
    const normalBindings = snapshot.settings.find((setting) => setting.key === "vim.normalModeKeyBindings");

    assert.strictEqual(leader?.status, "ok");
    assert.ok((leader?.value.length ?? 0) <= 80);
    assert.ok(leader?.value.endsWith("..."));
    assert.strictEqual(normalBindings?.status, "ok");
    assert.ok(normalBindings?.detail?.includes("(+18 more)"));
    assert.ok((normalBindings?.detail?.length ?? 0) < 180);
  });

  test("marks malformed VSCodeVim binding objects invalid", () => {
    const snapshot = parseVscodeVimConfig(
      mapConfig({
        normalModeKeyBindings: [{}],
        visualModeKeyBindings: [{ before: "bad" }],
        insertModeKeyBindings: [{ before: ["j", "k"], after: ["<Esc>"] }]
      }),
      true
    );

    assert.deepStrictEqual(
      snapshot.settings
        .filter((setting) => setting.key.endsWith("ModeKeyBindings"))
        .map((setting) => [setting.key, setting.status, setting.detail ?? ""]),
      [
        ["vim.normalModeKeyBindings", "invalid", "invalid binding"],
        ["vim.visualModeKeyBindings", "invalid", "invalid binding"],
        ["vim.insertModeKeyBindings", "ok", "j k -> <Esc>"]
      ]
    );
  });
});

suite("GuideViewProvider", () => {
  test("resolves webview with expected HTML, CSP, and initial state skeleton", () => {
    const service = createService();
    const provider = new GuideViewProvider(vscode.Uri.file(__dirname), service);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);

    assert.strictEqual(fake.webview.options.enableScripts, true);
    assert.ok(fake.webview.html.includes("Content-Security-Policy"));
    assert.ok(fake.webview.html.includes('id="search"'));
    assert.ok(fake.webview.html.includes('id="stage"'));
    assert.ok(fake.webview.html.includes('aria-label="Search guide items"'));
    assert.ok(fake.webview.html.includes('id="favorites-only"'));
    assert.ok(fake.webview.html.includes('id="starter"'));
    assert.ok(fake.webview.html.includes('id="vim-summary-status"'));
    assert.ok(fake.webview.html.includes('id="settings-list"'));
    assert.ok(fake.webview.html.includes('id="results"'));
    assert.ok(!fake.webview.html.includes('id="results" aria-live'));
    assert.ok(fake.webview.html.includes('id="count" role="status" aria-live="polite"'));
    assert.ok(fake.webview.html.includes(".empty-results"));
    assert.ok(!fake.webview.html.includes(".empty {"));
    assert.ok(fake.webview.html.includes('"setting-value status-"'));
    assert.ok(fake.webview.html.includes("describeNoResults"));
    assert.ok(fake.webview.html.includes("Toggle favorite for "));
    assert.ok(fake.webview.html.includes('"totalCount":60'));
    assert.ok(fake.webview.html.indexOf('id="results"') < fake.webview.html.indexOf('class="settings"'));
  });

  test("posts updated view models for ready, filter, and favorite messages", async () => {
    const state = new MemoryState();
    const service = createService(state);
    const provider = new GuideViewProvider(vscode.Uri.file(__dirname), service);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    fake.webview.receive({ type: "ready" });
    await flushPromises();

    let model = latestViewModel(fake.webview);
    assert.strictEqual(model.totalCount, 60);
    assert.strictEqual(model.resultCount, 60);
    assert.strictEqual(model.starterItems.length, 5);
    assert.ok(model.guidanceText.includes("Start with the basics"));

    fake.webview.receive({ type: "filter", query: "delete line", category: ALL_CATEGORY, stage: "beginner", favoritesOnly: false });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.query, "delete line");
    assert.strictEqual(model.stage, "beginner");
    assert.strictEqual(model.favoritesOnly, false);
    assert.ok(model.items.some((item) => item.id === "vim-edit-delete-line"));

    fake.webview.receive({ type: "toggleFavorite", id: "vim-edit-delete-line" });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.favoriteCount, 1);
    assert.strictEqual(model.items.find((item) => item.id === "vim-edit-delete-line")?.favorite, true);
    assert.deepStrictEqual(state.get(FAVORITES_KEY, []), ["vim-edit-delete-line"]);

    fake.webview.receive({ type: "filter", query: "delete line", category: ALL_CATEGORY, stage: "beginner", favoritesOnly: true });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.favoritesOnly, true);
    assert.deepStrictEqual(model.items.map((item) => item.id), ["vim-edit-delete-line"]);
  });

  test("copy messages write item keys and ignore invalid ids", async () => {
    const previousClipboardText = await vscode.env.clipboard.readText();
    const service = createService();
    const provider = new GuideViewProvider(vscode.Uri.file(__dirname), service);
    const fake = createFakeWebviewView();

    try {
      provider.resolveWebviewView(fake.view);
      fake.webview.receive({ type: "copy", id: "vim-edit-delete-line" });
      await flushPromises();
      assert.strictEqual(await vscode.env.clipboard.readText(), "dd");

      await vscode.env.clipboard.writeText("unchanged-copy-sentinel");
      fake.webview.receive({ type: "copy", id: "missing-item" });
      fake.webview.receive({ type: "copy", id: 42 });
      await flushPromises();
      assert.strictEqual(await vscode.env.clipboard.readText(), "unchanged-copy-sentinel");
    } finally {
      await vscode.env.clipboard.writeText(previousClipboardText);
    }
  });

  test("run messages use item ids and ignore arbitrary command payloads", async () => {
    const executed: string[] = [];
    const service = createService(new MemoryState(), executed);
    const provider = new GuideViewProvider(vscode.Uri.file(__dirname), service);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    fake.webview.receive({ type: "run", id: "vscode-command-quick-open", command: "evil.command" });
    await flushPromises();
    assert.deepStrictEqual(executed, ["workbench.action.quickOpen"]);

    fake.webview.receive({ type: "run", id: "vim-edit-delete-line", command: "workbench.action.quickOpen" });
    fake.webview.receive({ type: "run", id: 42, command: "workbench.action.showCommands" });
    await flushPromises();
    assert.deepStrictEqual(executed, ["workbench.action.quickOpen"]);
  });

  test("clears disposed webview and tolerates undelivered postMessage", async () => {
    const service = createService();
    const provider = new GuideViewProvider(vscode.Uri.file(__dirname), service);
    const fake = createFakeWebviewView();

    provider.resolveWebviewView(fake.view);
    fake.webview.postMessageResult = false;
    assert.strictEqual(provider.refresh(), true);
    await flushPromises();
    assert.strictEqual(fake.webview.postedMessages.length, 1);

    fake.dispose();
    assert.strictEqual(provider.refresh(), false);
    await flushPromises();
    assert.strictEqual(fake.webview.postedMessages.length, 1);
  });
});

suite("extension activation", () => {
  test("contributes Activity Bar view and activates commands", async () => {
    const extension = vscode.extensions.getExtension("localdev.vscode-vim-guide");
    assert.ok(extension, "extension should be discoverable in Extension Development Host");

    await extension.activate();

    const packageJson = extension.packageJSON as {
      contributes?: {
        viewsContainers?: { activitybar?: Array<{ id?: string; title?: string }> };
        views?: Record<string, Array<{ id?: string; name?: string; type?: string }>>;
      };
    };
    const activityBar = packageJson.contributes?.viewsContainers?.activitybar ?? [];
    const vimGuideContainer = activityBar.find((container) => container.id === "vimGuide");
    const vimGuideViews = packageJson.contributes?.views?.vimGuide ?? [];

    assert.strictEqual(vimGuideContainer?.title, "Vim Guide");
    assert.ok(vimGuideViews.some((view) => view.id === "vimGuide.sidebar" && view.type === "webview"));

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("vimGuide.open"));
    assert.ok(commands.includes("vimGuide.refresh"));

    await vscode.commands.executeCommand("vimGuide.refresh");
  });
});
