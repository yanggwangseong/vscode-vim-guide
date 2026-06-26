import * as assert from "assert";
import * as vscode from "vscode";
import { guideItems } from "../../data/guideData";
import {
  ALLOWED_VSCODE_COMMANDS,
  ALL_CATEGORY,
  ConfigurationReader,
  FAVORITES_KEY,
  GuideService,
  StateStore,
  parseVscodeVimConfig
} from "../../services/guideService";

class MemoryState implements StateStore {
  private readonly values = new Map<string, unknown>();

  public get<T>(key: string, defaultValue: T): T {
    return this.values.has(key) ? (this.values.get(key) as T) : defaultValue;
  }

  public update(key: string, value: unknown): Thenable<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
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

function createService(state = new MemoryState(), executed: string[] = []): GuideService {
  return new GuideService(state, guideItems, {
    configurationReader: emptyConfig,
    extensionInstalled: () => false,
    executeCommand: (command) => {
      executed.push(command);
      return Promise.resolve();
    }
  });
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

    for (const item of guideItems) {
      assert.ok(item.id.length > 0, "id is required");
      assert.ok(!ids.has(item.id), `duplicate id: ${item.id}`);
      assert.ok(item.title.length > 0, `title is required for ${item.id}`);
      assert.ok(item.keys.length > 0, `keys are required for ${item.id}`);
      assert.ok(item.category.length > 0, `category is required for ${item.id}`);
      assert.ok(item.description.length > 0, `description is required for ${item.id}`);
      assert.ok(item.source.length > 0, `source is required for ${item.id}`);
      assert.ok(item.type.length > 0, `type is required for ${item.id}`);
      ids.add(item.id);
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

  test("handles missing and malformed values without throwing", () => {
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
    assert.ok(snapshot.settings.some((setting) => setting.status === "invalid"));
    assert.strictEqual(snapshot.settings.find((setting) => setting.key === "vim.insertModeKeyBindings")?.status, "empty");
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
