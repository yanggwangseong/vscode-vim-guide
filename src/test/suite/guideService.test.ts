import * as assert from "assert";
import * as vscode from "vscode";
import { DEFAULT_GUIDE_LESSON_ID, guideLessons } from "../../data/guideCurriculum";
import { GuideItem, guideItemStageOverrides, guideItemStages, guideItems } from "../../data/guideData";
import { koreanGuideItemText, koreanGuideLessonText } from "../../data/localization";
import {
  ALLOWED_VSCODE_COMMANDS,
  ALL_CATEGORY,
  ALL_STAGE,
  ConfigurationReader,
  FAVORITES_KEY,
  GuideViewModel,
  GuideService,
  LANGUAGE_KEY,
  LEARNING_STATE_KEY,
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

    assert.strictEqual(vimLikeCount, 57);
    assert.strictEqual(vscodeCommandCount, 13);
    assert.strictEqual(guideItems.length, 70);
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

  test("has Korean localization coverage for every guide item", () => {
    const ids = new Set(guideItems.map((item) => item.id));

    for (const item of guideItems) {
      const localized = koreanGuideItemText[item.id];
      assert.ok(localized, `missing Korean localization for ${item.id}`);
      assert.ok(localized.title.length > 0, `Korean title is required for ${item.id}`);
      assert.ok(localized.description.length > 0, `Korean description is required for ${item.id}`);
    }

    for (const id of Object.keys(koreanGuideItemText)) {
      assert.ok(ids.has(id), `Korean localization references an unknown item: ${id}`);
    }
  });

  test("keeps curriculum lessons pointed at stable guide item ids", () => {
    const ids = new Set(guideItems.map((item) => item.id));
    const lessonIds = new Set<string>();

    assert.ok(guideLessons.some((lesson) => lesson.id === DEFAULT_GUIDE_LESSON_ID));
    for (const lesson of guideLessons) {
      assert.ok(!lessonIds.has(lesson.id), `duplicate lesson id: ${lesson.id}`);
      assert.ok(lesson.title.length > 0, `lesson title is required for ${lesson.id}`);
      assert.ok(lesson.description.length > 0, `lesson description is required for ${lesson.id}`);
      assert.ok(lesson.practicePrompt.length > 0, `lesson practice prompt is required for ${lesson.id}`);
      assert.ok(lesson.readinessHint.length > 0, `lesson readiness hint is required for ${lesson.id}`);
      assert.ok(lesson.checklist.length >= 4, `lesson self-checklist is required for ${lesson.id}`);
      assert.ok(lesson.itemIds.length >= 7, `lesson should include enough practice items: ${lesson.id}`);
      assert.ok(koreanGuideLessonText[lesson.id], `missing Korean lesson localization for ${lesson.id}`);
      assert.strictEqual(koreanGuideLessonText[lesson.id]?.checklist.length, lesson.checklist.length);
      for (const itemId of lesson.itemIds) {
        assert.ok(ids.has(itemId), `lesson ${lesson.id} references an unknown item: ${itemId}`);
      }
      if (lesson.nextLessonId !== undefined) {
        assert.ok(guideLessons.some((candidate) => candidate.id === lesson.nextLessonId), `unknown next lesson: ${lesson.nextLessonId}`);
      }
      lessonIds.add(lesson.id);
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
    assert.ok(service.searchItems("operator plus motion", ALL_CATEGORY).some((item) => item.id === "vim-edit-delete-word"));
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

  test("localizes guide text and searches Korean copy", () => {
    const service = createService();
    const defaultModel = service.createViewModel({ language: "ko" });
    const model = service.createViewModel({ query: "현재 줄 삭제", language: "ko" });

    assert.strictEqual(model.language, "ko");
    assert.strictEqual(model.languages.find((language) => language.id === "ko")?.label, "한국어");
    assert.ok(defaultModel.guidanceText.includes("연습 모드"));
    assert.strictEqual(defaultModel.currentLesson?.title, "생존 루프: 이동, 입력, 저장");
    assert.ok(model.items.some((item) => item.id === "vim-edit-delete-line"));
    const deleteLine = model.items.find((item) => item.id === "vim-edit-delete-line");
    assert.strictEqual(deleteLine?.displayTitle, "현재 줄 삭제");
    assert.strictEqual(deleteLine?.categoryLabel, "편집");
    assert.strictEqual(deleteLine?.stageLabel, "입문");
    assert.strictEqual(deleteLine?.actionLabel, "에디터에서 직접 입력");
  });

  test("builds a lesson-based curriculum and defaults to current lesson practice", () => {
    const service = createService();
    const defaultModel = service.createViewModel({ language: "ko" });
    const productiveModel = service.createViewModel({ stage: "productive", language: "ko" });
    const searchModel = service.createViewModel({ query: "삭제", language: "ko" });
    const allModel = service.createViewModel({ viewMode: "all", language: "ko" });

    assert.deepStrictEqual(
      defaultModel.lessons.map((lesson) => lesson.id),
      guideLessons.map((lesson) => lesson.id)
    );
    assert.strictEqual(defaultModel.viewMode, "practice");
    assert.strictEqual(defaultModel.lesson, DEFAULT_GUIDE_LESSON_ID);
    assert.strictEqual(defaultModel.currentLesson?.id, DEFAULT_GUIDE_LESSON_ID);
    assert.strictEqual(defaultModel.currentLesson?.active, true);
    assert.strictEqual(defaultModel.currentLesson?.initiallyOpen, true);
    assert.strictEqual(defaultModel.currentLesson?.completed, false);
    assert.strictEqual(defaultModel.currentLesson?.practiceCount, 0);
    assert.strictEqual(defaultModel.currentLesson?.progressLabel, "아직 연습 전");
    assert.ok(defaultModel.currentLesson?.checklist.some((item) => item.includes("Normal mode")));
    assert.deepStrictEqual(
      defaultModel.items.map((item) => item.id),
      defaultModel.currentLesson?.items.map((item) => item.id)
    );
    assert.ok(defaultModel.items.some((item) => item.id === "vim-mode-normal"));
    assert.ok(defaultModel.items.some((item) => item.id === "vim-motion-left-right"));
    assert.ok(defaultModel.items.some((item) => item.id === "vscode-command-save-file"));

    assert.strictEqual(productiveModel.currentLesson?.stage, "productive");
    assert.strictEqual(productiveModel.currentLesson?.id, "lesson-search-workflow");
    assert.ok(productiveModel.items.every((item) => productiveModel.currentLesson?.items.some((lessonItem) => lessonItem.id === item.id)));

    assert.ok(searchModel.lessons.length > 0);
    assert.ok(searchModel.items.some((item) => item.id === "vim-edit-delete-line"));
    assert.strictEqual(allModel.viewMode, "all");
    assert.strictEqual(allModel.resultCount, guideItems.length);
    assert.ok(defaultModel.lessons.some((lesson) => lesson.id === "lesson-operator-grammar"));
  });

  test("persists learning focus and advances completed lessons", async () => {
    const state = new MemoryState();
    const service = createService(state);

    await service.setLearningFocus("lesson-line-navigation", "all");
    let reloaded = createService(state);
    let model = reloaded.createViewModel();
    assert.strictEqual(model.lesson, "lesson-line-navigation");
    assert.strictEqual(model.viewMode, "all");

    const nextLessonId = await reloaded.completeLesson("lesson-line-navigation");
    assert.strictEqual(nextLessonId, "lesson-basic-edits");
    reloaded = createService(state);
    model = reloaded.createViewModel();
    const completedLesson = model.lessons.find((lesson) => lesson.id === "lesson-line-navigation");
    assert.strictEqual(model.lesson, "lesson-basic-edits");
    assert.strictEqual(model.viewMode, "practice");
    assert.strictEqual(model.completedLessonCount, 1);
    assert.strictEqual(completedLesson?.completed, true);
    assert.strictEqual(completedLesson?.practiceCount, 1);
    assert.ok(completedLesson?.lastPracticedAt);
  });

  test("normalizes malformed learning state", async () => {
    const state = new MemoryState();
    state.set(LEARNING_STATE_KEY, {
      currentLessonId: "missing-lesson",
      viewMode: "bad-mode",
      completedLessonIds: ["lesson-basic-edits", "missing-lesson", "lesson-basic-edits"],
      practiceCounts: { "lesson-basic-edits": 2, "missing-lesson": 5, "lesson-search-workflow": -1 },
      lastPracticedAt: { "lesson-basic-edits": "2026-06-26T00:00:00.000Z", "missing-lesson": "bad" }
    });
    const service = createService(state);
    const learningState = service.getLearningState();

    assert.deepStrictEqual(learningState, {
      currentLessonId: DEFAULT_GUIDE_LESSON_ID,
      viewMode: "practice",
      completedLessonIds: ["lesson-basic-edits"],
      practiceCounts: { "lesson-basic-edits": 2 },
      lastPracticedAt: { "lesson-basic-edits": "2026-06-26T00:00:00.000Z" }
    });
    await flushPromises();
    assert.deepStrictEqual(state.get(LEARNING_STATE_KEY, {}), learningState);
  });

  test("persists display language through state", async () => {
    const state = new MemoryState();
    const service = createService(state);

    assert.strictEqual(service.getLanguage(), "en");
    await service.setLanguage("ko");

    const reloaded = createService(state);
    assert.strictEqual(state.get(LANGUAGE_KEY, "en"), "ko");
    assert.strictEqual(reloaded.getLanguage(), "ko");
    assert.strictEqual(reloaded.createViewModel().language, "ko");
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
      favoritesOnly: "yes",
      language: "fr"
    });

    assert.strictEqual(model.query, "");
    assert.strictEqual(model.category, ALL_CATEGORY);
    assert.strictEqual(model.stage, ALL_STAGE);
    assert.strictEqual(model.favoritesOnly, false);
    assert.strictEqual(model.language, "en");
    assert.strictEqual(model.viewMode, "practice");
    assert.strictEqual(model.lesson, DEFAULT_GUIDE_LESSON_ID);
    assert.strictEqual(model.totalCount, 70);
    assert.strictEqual(model.resultCount, model.currentLesson?.items.length);
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

  test("builds localized quick pick items without exposing raw command payloads", () => {
    const service = createService();
    const picks = service.getQuickPickItems("ko");
    const deleteLine = picks.find((item) => item.id === "vim-edit-delete-line");
    const saveFile = picks.find((item) => item.id === "vscode-command-save-file");

    assert.strictEqual(picks.length, guideItems.length);
    assert.ok(deleteLine?.label.includes("dd"));
    assert.ok(deleteLine?.label.includes("현재 줄 삭제"));
    assert.strictEqual(deleteLine?.copyText, "dd");
    assert.strictEqual(deleteLine?.executable, false);
    assert.ok(deleteLine?.description.includes("편집"));
    assert.ok(deleteLine?.detail.includes("현재 줄"));

    assert.ok(saveFile?.label.includes("Cmd+S"));
    assert.strictEqual(saveFile?.executable, true);
    assert.strictEqual(saveFile?.copyText, "Cmd+S");
    assert.ok(!saveFile?.description.includes("workbench.action.files.save"));
    assert.ok(!saveFile?.detail.includes("workbench.action.files.save"));
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
    assert.ok(fake.webview.html.includes("base-uri 'none'"));
    assert.ok(fake.webview.html.includes("form-action 'none'"));
    assert.ok(fake.webview.html.includes('class="surface-sidebar"'));
    assert.ok(fake.webview.html.includes(".surface-panel .guide-layout"));
    assert.ok(fake.webview.html.includes('class="guide-layout"'));
    assert.ok(fake.webview.html.includes('class="guide-results-pane"'));
    assert.ok(fake.webview.html.includes('id="curriculum"'));
    assert.ok(fake.webview.html.includes('id="search"'));
    assert.ok(fake.webview.html.includes('id="language"'));
    assert.ok(fake.webview.html.includes('id="stage"'));
    assert.ok(fake.webview.html.includes('aria-label="Search guide items"'));
    assert.ok(fake.webview.html.includes('id="favorites-only"'));
    assert.ok(fake.webview.html.includes('showAll.id = "show-all"'));
    assert.ok(fake.webview.html.includes("renderCurriculum"));
    assert.ok(fake.webview.html.includes("renderTodayLesson"));
    assert.ok(fake.webview.html.includes("renderLessonMap"));
    assert.ok(fake.webview.html.includes("completeLesson"));
    assert.ok(fake.webview.html.includes(".today-card"));
    assert.ok(fake.webview.html.includes(".lesson-nav"));
    assert.ok(fake.webview.html.includes('id="vim-summary-status"'));
    assert.ok(fake.webview.html.includes('id="settings-list"'));
    assert.ok(fake.webview.html.includes('id="results"'));
    assert.ok(!fake.webview.html.includes('id="results" aria-live'));
    assert.ok(fake.webview.html.includes('id="count" role="status" aria-live="polite"'));
    assert.ok(fake.webview.html.includes(".empty-results"));
    assert.ok(!fake.webview.html.includes(".empty {"));
    assert.ok(fake.webview.html.includes('"setting-value status-"'));
    assert.ok(fake.webview.html.includes("describeNoResults"));
    assert.ok(fake.webview.html.includes("model.ui.favorites"));
    assert.ok(fake.webview.html.includes('"totalCount":70'));
    assert.ok(fake.webview.html.includes('"label":"한국어"'));
    assert.ok(fake.webview.html.indexOf('id="controls"') < fake.webview.html.indexOf('id="curriculum"'));
    assert.ok(fake.webview.html.indexOf('class="settings"') < fake.webview.html.indexOf('id="results"'));
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
    assert.strictEqual(model.totalCount, 70);
    assert.strictEqual(model.viewMode, "practice");
    assert.strictEqual(model.currentLesson?.id, DEFAULT_GUIDE_LESSON_ID);
    assert.strictEqual(model.resultCount, model.currentLesson?.items.length);
    assert.strictEqual(model.lessons.length, guideLessons.length);
    assert.ok(model.items.some((item) => item.id === "vim-mode-normal"));
    assert.ok(model.items.some((item) => item.id === "vscode-command-save-file"));
    assert.ok(model.guidanceText.includes("Practice mode"));

    fake.webview.receive({ type: "filter", query: "delete line", category: ALL_CATEGORY, stage: "beginner", favoritesOnly: false });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.query, "delete line");
    assert.strictEqual(model.stage, "beginner");
    assert.strictEqual(model.favoritesOnly, false);
    assert.strictEqual(model.lessons.length, guideLessons.length);
    assert.ok(model.items.some((item) => item.id === "vim-edit-delete-line"));

    fake.webview.receive({ type: "filter", query: "현재 줄 삭제", category: ALL_CATEGORY, stage: "beginner", favoritesOnly: false, language: "ko" });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.language, "ko");
    assert.strictEqual(state.get(LANGUAGE_KEY, "en"), "ko");
    assert.deepStrictEqual(model.items.map((item) => item.id), ["vim-edit-delete-line"]);
    assert.strictEqual(model.items[0]?.displayTitle, "현재 줄 삭제");

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

    fake.webview.receive({
      type: "filter",
      query: "",
      category: ALL_CATEGORY,
      stage: ALL_STAGE,
      favoritesOnly: false,
      language: "en",
      viewMode: "all",
      lesson: DEFAULT_GUIDE_LESSON_ID
    });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.viewMode, "all");
    assert.strictEqual(model.resultCount, guideItems.length);

    fake.webview.receive({
      type: "filter",
      query: "",
      category: ALL_CATEGORY,
      stage: "beginner",
      favoritesOnly: false,
      language: "en",
      viewMode: "practice",
      lesson: "lesson-line-navigation"
    });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.viewMode, "practice");
    assert.strictEqual(model.currentLesson?.id, "lesson-line-navigation");
    assert.ok(model.items.some((item) => item.id === "vim-motion-line-column-start"));

    fake.webview.receive({ type: "completeLesson", id: "lesson-line-navigation" });
    await flushPromises();
    model = latestViewModel(fake.webview);
    assert.strictEqual(model.currentLesson?.id, "lesson-basic-edits");
    assert.strictEqual(model.completedLessonCount, 1);
    assert.strictEqual(model.lessons.find((lesson) => lesson.id === "lesson-line-navigation")?.completed, true);
    assert.strictEqual(
      (state.get(LEARNING_STATE_KEY, {}) as { readonly currentLessonId?: unknown }).currentLessonId,
      "lesson-basic-edits"
    );
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
        commands?: Array<{ command?: string; title?: string }>;
        viewsContainers?: { activitybar?: Array<{ id?: string; title?: string }> };
        views?: Record<string, Array<{ id?: string; name?: string; type?: string }>>;
        walkthroughs?: Array<{
          id?: string;
          steps?: Array<{ id?: string; completionEvents?: readonly string[] }>;
        }>;
      };
    };
    const activityBar = packageJson.contributes?.viewsContainers?.activitybar ?? [];
    const vimGuideContainer = activityBar.find((container) => container.id === "vimGuide");
    const vimGuideViews = packageJson.contributes?.views?.vimGuide ?? [];
    const contributedCommands = packageJson.contributes?.commands ?? [];
    const walkthrough = packageJson.contributes?.walkthroughs?.find((candidate) => candidate.id === "vimGuide.gettingStarted");

    assert.strictEqual(vimGuideContainer?.title, "Vim Guide");
    assert.ok(vimGuideViews.some((view) => view.id === "vimGuide.sidebar" && view.type === "webview"));
    assert.ok(contributedCommands.some((command) => command.command === "vimGuide.openPanel"));
    assert.ok(contributedCommands.some((command) => command.command === "vimGuide.search"));
    assert.ok(walkthrough?.steps?.some((step) => step.completionEvents?.includes("onCommand:vimGuide.openPanel")));
    assert.ok(walkthrough?.steps?.some((step) => step.completionEvents?.includes("onCommand:vimGuide.search")));

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("vimGuide.open"));
    assert.ok(commands.includes("vimGuide.openPanel"));
    assert.ok(commands.includes("vimGuide.search"));
    assert.ok(commands.includes("vimGuide.refresh"));

    await vscode.commands.executeCommand("vimGuide.refresh");
  });
});
