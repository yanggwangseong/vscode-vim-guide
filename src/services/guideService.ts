import * as vscode from "vscode";
import { DEFAULT_GUIDE_LESSON_ID, GuideLesson, guideLessons } from "../data/guideCurriculum";
import { GuideItem, GuideItemStage, guideItemStages, guideItems } from "../data/guideData";
import {
  GuideLanguage,
  GuideLanguageOption,
  getActionLabel,
  getCategoryLabel,
  getGuideLessonText,
  getGuideItemText,
  getStageLabel,
  guideLanguageOptions,
  isGuideLanguage
} from "../data/localization";

export const ALL_CATEGORY = "All";
export const ALL_STAGE = "All";
export const FAVORITES_KEY = "vimGuide.favoriteIds.v1";
export const LANGUAGE_KEY = "vimGuide.language.v1";
export const LEARNING_STATE_KEY = "vimGuide.learningState.v1";
const MAX_BINDING_ENTRIES_TO_INSPECT = 100;
const MAX_BINDING_SAMPLES = 3;
const MAX_SUMMARY_TEXT_LENGTH = 80;
const MAX_BINDING_ENTRY_TEXT_LENGTH = 120;
const MAX_NESTED_SETTING_ITEMS = 12;
const CATEGORY_ORDER = [
  "Modes",
  "Motions",
  "Editing",
  "Selection",
  "Search",
  "Text Objects",
  "Registers",
  "Windows",
  "Macros",
  "VSCodeVim",
  "VS Code Commands"
] as const;

export const ALLOWED_VSCODE_COMMANDS = new Set<string>([
  "workbench.action.files.save",
  "workbench.action.quickOpen",
  "workbench.action.showCommands",
  "workbench.action.gotoLine",
  "workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup",
  "workbench.action.toggleSidebarVisibility",
  "workbench.action.findInFiles",
  "editor.action.startFindReplaceAction",
  "workbench.action.terminal.toggleTerminal",
  "workbench.action.togglePanel",
  "workbench.action.navigateBack",
  "workbench.action.closeActiveEditor",
  "workbench.action.nextEditor"
]);

export interface StateStore {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Thenable<void>;
}

export interface ConfigurationReader {
  get<T>(section: string): T | undefined;
}

export interface GuideItemViewModel extends GuideItem {
  readonly favorite: boolean;
  readonly executable: boolean;
  readonly displayTitle: string;
  readonly displayDescription: string;
  readonly categoryLabel: string;
  readonly stageLabel: string;
  readonly actionLabel: string;
}

export interface GuideQuickPickItem {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly detail: string;
  readonly executable: boolean;
  readonly copyText: string;
}

export interface GuideLessonViewModel {
  readonly id: string;
  readonly stage: GuideItemStage;
  readonly stageLabel: string;
  readonly title: string;
  readonly description: string;
  readonly practicePrompt: string;
  readonly readinessHint: string;
  readonly checklist: readonly string[];
  readonly nextLessonId?: string;
  readonly nextLessonTitle?: string;
  readonly itemCount: number;
  readonly active: boolean;
  readonly initiallyOpen: boolean;
  readonly completed: boolean;
  readonly practiceCount: number;
  readonly lastPracticedAt?: string;
  readonly progressLabel: string;
  readonly items: readonly GuideItemViewModel[];
}

export type GuideStageFilter = typeof ALL_STAGE | GuideItemStage;
export type GuideViewMode = "practice" | "all";

export interface GuideLearningState {
  readonly currentLessonId: string;
  readonly viewMode: GuideViewMode;
  readonly completedLessonIds: readonly string[];
  readonly practiceCounts: Readonly<Record<string, number>>;
  readonly lastPracticedAt: Readonly<Record<string, string>>;
}

export interface GuideStageOption {
  readonly id: GuideStageFilter;
  readonly label: string;
}

export interface GuideFilterInput {
  readonly query?: unknown;
  readonly category?: unknown;
  readonly stage?: unknown;
  readonly favoritesOnly?: unknown;
  readonly language?: unknown;
  readonly viewMode?: unknown;
  readonly lesson?: unknown;
}

export interface GuideFilters {
  readonly query: string;
  readonly category: string;
  readonly stage: GuideStageFilter;
  readonly favoritesOnly: boolean;
  readonly language: GuideLanguage;
  readonly viewMode: GuideViewMode;
  readonly lesson: string;
}

export interface GuideCategoryOption {
  readonly id: string;
  readonly label: string;
}

export interface GuideUiText {
  readonly searchPlaceholder: string;
  readonly searchAriaLabel: string;
  readonly filtersAriaLabel: string;
  readonly languageAriaLabel: string;
  readonly stageAriaLabel: string;
  readonly categoryAriaLabel: string;
  readonly favorites: string;
  readonly startHere: string;
  readonly curriculumTitle: string;
  readonly curriculumIntro: string;
  readonly currentLesson: string;
  readonly practicePrompt: string;
  readonly readiness: string;
  readonly lessonItemsLabel: string;
  readonly practiceThisLesson: string;
  readonly practicingNow: string;
  readonly todayPracticeTitle: string;
  readonly checklistLabel: string;
  readonly completeAndNext: string;
  readonly markLessonDone: string;
  readonly lessonMapTitle: string;
  readonly lessonDetailsLabel: string;
  readonly completedBadge: string;
  readonly showAllCommands: string;
  readonly practiceModeLabel: string;
  readonly referenceModeLabel: string;
  readonly resultsTitle: string;
  readonly copyTitle: string;
  readonly runTitle: string;
  readonly addFavoriteTitle: string;
  readonly removeFavoriteTitle: string;
  readonly focusItemsLabel: string;
  readonly currentLevel: string;
  readonly refresh: string;
  readonly copy: string;
  readonly run: string;
  readonly addFavorite: string;
  readonly removeFavorite: string;
  readonly vscodeVimNotDetected: string;
  readonly vscodeVimConfigured: string;
  readonly vscodeVimNoTrackedSettings: string;
  readonly noMatchesFor: string;
  readonly noGuideItems: string;
  readonly searchFilterLabel: string;
  readonly categoryFilterLabel: string;
  readonly stageFilterLabel: string;
  readonly favoritesFilterLabel: string;
  readonly filterJoin: string;
  readonly countAriaPrefix: string;
  readonly countAriaMiddle: string;
  readonly countAriaSuffix: string;
  readonly searchStarterPrefix: string;
}

export interface GuideViewModel {
  readonly query: string;
  readonly category: string;
  readonly categoryLabel: string;
  readonly language: GuideLanguage;
  readonly languages: readonly GuideLanguageOption[];
  readonly stage: GuideStageFilter;
  readonly stages: readonly GuideStageOption[];
  readonly favoritesOnly: boolean;
  readonly viewMode: GuideViewMode;
  readonly lesson: string;
  readonly categories: readonly string[];
  readonly categoryOptions: readonly GuideCategoryOption[];
  readonly totalCount: number;
  readonly resultCount: number;
  readonly favoriteCount: number;
  readonly emptyQuery: boolean;
  readonly noResults: boolean;
  readonly items: readonly GuideItemViewModel[];
  readonly lessons: readonly GuideLessonViewModel[];
  readonly currentLesson?: GuideLessonViewModel;
  readonly completedLessonCount: number;
  readonly lessonCount: number;
  readonly guidanceText: string;
  readonly ui: GuideUiText;
  readonly vscodeVim: VscodeVimSnapshot;
}

export type SettingStatus = "ok" | "empty" | "invalid";

export interface SettingSummary {
  readonly key: string;
  readonly label: string;
  readonly status: SettingStatus;
  readonly value: string;
  readonly detail?: string;
}

export interface VscodeVimSnapshot {
  readonly installed: boolean;
  readonly configured: boolean;
  readonly settings: readonly SettingSummary[];
}

interface GuideServiceOptions {
  readonly configurationReader?: () => ConfigurationReader;
  readonly extensionInstalled?: () => boolean;
  readonly executeCommand?: (command: string) => Thenable<unknown>;
}

interface BindingEntrySummary {
  readonly text: string;
  readonly valid: boolean;
}

interface ArraySummary {
  readonly text?: string;
  readonly invalid: boolean;
}

export class GuideService {
  private readonly itemMap: Map<string, GuideItem>;
  private readonly lessonMap: Map<string, GuideLesson>;
  private readonly configurationReader: () => ConfigurationReader;
  private readonly extensionInstalled: () => boolean;
  private readonly executeCommandImpl: (command: string) => Thenable<unknown>;

  public constructor(
    private readonly state: StateStore,
    private readonly items: readonly GuideItem[] = guideItems,
    options: GuideServiceOptions = {}
  ) {
    this.itemMap = new Map(items.map((item) => [item.id, item]));
    this.lessonMap = new Map(guideLessons.map((lesson) => [lesson.id, lesson]));
    this.configurationReader = options.configurationReader ?? (() => vscode.workspace.getConfiguration("vim"));
    this.extensionInstalled = options.extensionInstalled ?? (() => vscode.extensions.getExtension("vscodevim.vim") !== undefined);
    this.executeCommandImpl = options.executeCommand ?? ((command) => vscode.commands.executeCommand(command));
  }

  public getItems(): readonly GuideItem[] {
    return this.items;
  }

  public getItem(id: string): GuideItem | undefined {
    return this.itemMap.get(id);
  }

  public getCategories(): readonly string[] {
    const categories = new Set(this.items.map((item) => item.category));
    const ordered = CATEGORY_ORDER.filter((category) => categories.delete(category));
    const remaining = Array.from(categories).sort((a, b) => a.localeCompare(b));
    return [ALL_CATEGORY, ...ordered, ...remaining];
  }

  public getCategoryOptions(language: GuideLanguage = this.getLanguage()): readonly GuideCategoryOption[] {
    return this.getCategories().map((category) => ({
      id: category,
      label: getCategoryLabel(category, language)
    }));
  }

  public getLanguages(): readonly GuideLanguageOption[] {
    return guideLanguageOptions;
  }

  public getStages(language: GuideLanguage = this.getLanguage()): readonly GuideStageOption[] {
    return [
      { id: ALL_STAGE, label: language === "ko" ? "전체 단계" : "All stages" },
      ...guideItemStages.map((stage) => ({ id: stage, label: getStageLabel(stage, language) }))
    ];
  }

  public getLanguage(): GuideLanguage {
    const stored = this.state.get<unknown>(LANGUAGE_KEY, "en");
    return isGuideLanguage(stored) ? stored : "en";
  }

  public async setLanguage(language: GuideLanguage): Promise<void> {
    await this.state.update(LANGUAGE_KEY, language);
  }

  public getLearningState(): GuideLearningState {
    const stored = this.state.get<unknown>(LEARNING_STATE_KEY, {});
    const learningState = normalizeLearningState(stored);

    if (!learningStateStorageMatches(stored, learningState)) {
      void this.state.update(LEARNING_STATE_KEY, learningState).then(undefined, () => {
        // Keep rendering resilient even if storage cleanup fails.
      });
    }

    return learningState;
  }

  public async setLearningFocus(lessonId: string, viewMode: GuideViewMode): Promise<void> {
    const state = this.getLearningState();
    const lesson = this.lessonMap.get(lessonId) ?? this.lessonMap.get(DEFAULT_GUIDE_LESSON_ID);
    if (lesson === undefined) {
      return;
    }

    await this.state.update(LEARNING_STATE_KEY, {
      ...state,
      currentLessonId: lesson.id,
      viewMode
    });
  }

  public async completeLesson(lessonId: string): Promise<string | undefined> {
    const lesson = this.lessonMap.get(lessonId);
    if (lesson === undefined) {
      return undefined;
    }

    const state = this.getLearningState();
    const nextLessonId = lesson.nextLessonId !== undefined && this.lessonMap.has(lesson.nextLessonId) ? lesson.nextLessonId : lesson.id;
    const completedLessonIds = orderedLessonIds(new Set([...state.completedLessonIds, lesson.id]));
    const practiceCounts = {
      ...state.practiceCounts,
      [lesson.id]: (state.practiceCounts[lesson.id] ?? 0) + 1
    };
    const lastPracticedAt = {
      ...state.lastPracticedAt,
      [lesson.id]: new Date().toISOString()
    };

    await this.state.update(LEARNING_STATE_KEY, {
      currentLessonId: nextLessonId,
      viewMode: "practice",
      completedLessonIds,
      practiceCounts,
      lastPracticedAt
    });

    return nextLessonId;
  }

  public getFavoriteIds(): readonly string[] {
    const stored = this.state.get<unknown>(FAVORITES_KEY, []);
    const favorites = Array.isArray(stored)
      ? Array.from(new Set(stored.filter((id): id is string => typeof id === "string" && this.itemMap.has(id)))).sort()
      : [];

    if (!favoriteStorageMatches(stored, favorites)) {
      void this.state.update(FAVORITES_KEY, favorites).then(undefined, () => {
        // Favor rendering a clean model over surfacing storage cleanup failures.
      });
    }

    return favorites;
  }

  public async toggleFavorite(id: string): Promise<boolean> {
    if (!this.itemMap.has(id)) {
      return false;
    }

    const favorites = new Set(this.getFavoriteIds());
    const nextFavorite = !favorites.has(id);

    if (nextFavorite) {
      favorites.add(id);
    } else {
      favorites.delete(id);
    }

    await this.state.update(FAVORITES_KEY, Array.from(favorites).sort());
    return nextFavorite;
  }

  public searchItems(queryOrFilters: string | GuideFilterInput = "", category = ALL_CATEGORY): readonly GuideItem[] {
    const filters = normalizeGuideFilters(
      typeof queryOrFilters === "string" ? { query: queryOrFilters, category } : queryOrFilters,
      this.getLanguage()
    );
    const normalizedQuery = normalize(filters.query);

    return this.items.filter((item) => {
      const categoryMatches = filters.category === ALL_CATEGORY || item.category === filters.category;
      if (!categoryMatches) {
        return false;
      }

      if (filters.stage !== ALL_STAGE && item.stage !== filters.stage) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      return searchableText(item, filters.language).includes(normalizedQuery);
    });
  }

  public createViewModel(queryOrFilters: string | GuideFilterInput = "", category = ALL_CATEGORY): GuideViewModel {
    const learningState = this.getLearningState();
    const normalizedFilters = normalizeGuideFilters(
      typeof queryOrFilters === "string" ? { query: queryOrFilters, category } : queryOrFilters,
      this.getLanguage(),
      learningState
    );
    const currentLesson = this.resolveCurrentLesson(normalizedFilters.lesson, normalizedFilters.stage);
    const filters: GuideFilters = { ...normalizedFilters, lesson: currentLesson.id };
    const favoriteIds = new Set(this.getFavoriteIds());
    const referenceResults = this.searchItems(filters)
      .filter((item) => !filters.favoritesOnly || favoriteIds.has(item.id))
      .map((item) => this.toViewModel(item, favoriteIds, filters.language));
    const lessons = this.getLessons(filters, favoriteIds, learningState);
    const currentLessonModel = lessons.find((lesson) => lesson.id === currentLesson.id);
    const results = shouldUsePracticeResults(filters) ? currentLessonModel?.items ?? [] : referenceResults;

    return {
      query: filters.query,
      category: filters.category,
      categoryLabel: getCategoryLabel(filters.category, filters.language),
      language: filters.language,
      languages: this.getLanguages(),
      stage: filters.stage,
      stages: this.getStages(filters.language),
      favoritesOnly: filters.favoritesOnly,
      viewMode: filters.viewMode,
      lesson: filters.lesson,
      categories: this.getCategories(),
      categoryOptions: this.getCategoryOptions(filters.language),
      totalCount: this.items.length,
      resultCount: results.length,
      favoriteCount: favoriteIds.size,
      emptyQuery: filters.query.trim().length === 0,
      noResults: results.length === 0,
      items: results,
      lessons,
      currentLesson: currentLessonModel,
      completedLessonCount: learningState.completedLessonIds.length,
      lessonCount: guideLessons.length,
      guidanceText: getGuidanceText(filters, favoriteIds.size),
      ui: getUiText(filters.language),
      vscodeVim: this.getVscodeVimSnapshot(filters.language)
    };
  }

  public isExecutable(item: GuideItem): boolean {
    return item.type === "vscode-command" && item.command !== undefined && ALLOWED_VSCODE_COMMANDS.has(item.command);
  }

  public getCopyText(id: string): string | undefined {
    const item = this.getItem(id);
    if (item === undefined) {
      return undefined;
    }

    return item.keys.length > 0 ? item.keys : item.title;
  }

  public getQuickPickItems(language: GuideLanguage = this.getLanguage()): readonly GuideQuickPickItem[] {
    const favoriteIds = new Set(this.getFavoriteIds());
    return this.items.map((item) => {
      const viewItem = this.toViewModel(item, favoriteIds, language);
      return {
        id: viewItem.id,
        label: `${viewItem.keys}  ${viewItem.displayTitle}`,
        description: `${viewItem.categoryLabel} · ${viewItem.stageLabel} · ${viewItem.actionLabel}`,
        detail: viewItem.displayDescription,
        executable: viewItem.executable,
        copyText: this.getCopyText(viewItem.id) ?? viewItem.keys
      };
    });
  }

  public async executeGuideCommand(id: string): Promise<string> {
    const item = this.getItem(id);
    if (item === undefined || !this.isExecutable(item) || item.command === undefined) {
      throw new Error("This guide item does not expose an allowlisted VS Code command.");
    }

    await this.executeCommandImpl(item.command);
    return item.command;
  }

  public getVscodeVimSnapshot(language: GuideLanguage = this.getLanguage()): VscodeVimSnapshot {
    return parseVscodeVimConfig(this.configurationReader(), this.extensionInstalled(), language);
  }

  private toViewModel(item: GuideItem, favoriteIds: ReadonlySet<string>, language: GuideLanguage): GuideItemViewModel {
    const executable = this.isExecutable(item);
    const text = getGuideItemText(item, language);
    return {
      ...item,
      favorite: favoriteIds.has(item.id),
      executable,
      displayTitle: text.title,
      displayDescription: text.description,
      categoryLabel: getCategoryLabel(item.category, language),
      stageLabel: getStageLabel(item.stage, language),
      actionLabel: getActionLabel(item.type, executable, language)
    };
  }

  private getLessons(
    filters: GuideFilters,
    favoriteIds: ReadonlySet<string>,
    learningState: GuideLearningState
  ): readonly GuideLessonViewModel[] {
    const completedIds = new Set(learningState.completedLessonIds);
    return guideLessons.map((lesson) => {
      const text = getGuideLessonText(lesson, filters.language);
      const active = lesson.id === filters.lesson;
      const nextLesson = lesson.nextLessonId !== undefined ? this.lessonMap.get(lesson.nextLessonId) : undefined;
      const nextLessonText = nextLesson !== undefined ? getGuideLessonText(nextLesson, filters.language) : undefined;
      const practiceCount = learningState.practiceCounts[lesson.id] ?? 0;
      const completed = completedIds.has(lesson.id);
      return {
        id: lesson.id,
        stage: lesson.stage,
        stageLabel: getStageLabel(lesson.stage, filters.language),
        title: text.title,
        description: text.description,
        practicePrompt: text.practicePrompt,
        readinessHint: text.readinessHint,
        checklist: text.checklist,
        nextLessonId: nextLesson?.id,
        nextLessonTitle: nextLessonText?.title,
        itemCount: lesson.itemIds.length,
        active,
        initiallyOpen: active,
        completed,
        practiceCount,
        lastPracticedAt: learningState.lastPracticedAt[lesson.id],
        progressLabel: getLessonProgressLabel(completed, practiceCount, filters.language),
        items: lesson.itemIds
          .map((id) => this.itemMap.get(id))
          .filter((item): item is GuideItem => item !== undefined)
          .map((item) => this.toViewModel(item, favoriteIds, filters.language))
      };
    });
  }

  private resolveCurrentLesson(lessonId: string, stage: GuideStageFilter): GuideLesson {
    const requestedLesson = this.lessonMap.get(lessonId);
    if (requestedLesson !== undefined && (stage === ALL_STAGE || requestedLesson.stage === stage)) {
      return requestedLesson;
    }

    if (stage !== ALL_STAGE) {
      const firstStageLesson = guideLessons.find((lesson) => lesson.stage === stage);
      if (firstStageLesson !== undefined) {
        return firstStageLesson;
      }
    }

    const defaultLesson = this.lessonMap.get(DEFAULT_GUIDE_LESSON_ID) ?? guideLessons[0];
    if (defaultLesson === undefined) {
      throw new Error("Vim Guide has no curriculum lessons configured.");
    }

    return defaultLesson;
  }
}

export function normalizeGuideFilters(
  input: GuideFilterInput = {},
  fallbackLanguage: GuideLanguage = "en",
  fallbackLearningState: Pick<GuideLearningState, "currentLessonId" | "viewMode"> = defaultLearningState()
): GuideFilters {
  return {
    query: typeof input.query === "string" ? input.query : "",
    category: typeof input.category === "string" && input.category.trim().length > 0 ? input.category : ALL_CATEGORY,
    stage: isGuideStageFilter(input.stage) ? input.stage : ALL_STAGE,
    favoritesOnly: input.favoritesOnly === true,
    language: isGuideLanguage(input.language) ? input.language : fallbackLanguage,
    viewMode: isGuideViewMode(input.viewMode) ? input.viewMode : fallbackLearningState.viewMode,
    lesson: typeof input.lesson === "string" && input.lesson.trim().length > 0 ? input.lesson : fallbackLearningState.currentLessonId
  };
}

export function isGuideStageFilter(value: unknown): value is GuideStageFilter {
  return value === ALL_STAGE || guideItemStages.some((stage) => stage === value);
}

export function isGuideViewMode(value: unknown): value is GuideViewMode {
  return value === "practice" || value === "all";
}

function shouldUsePracticeResults(filters: GuideFilters): boolean {
  return (
    filters.viewMode === "practice" &&
    filters.query.trim().length === 0 &&
    filters.category === ALL_CATEGORY &&
    !filters.favoritesOnly
  );
}

function defaultLearningState(): GuideLearningState {
  return {
    currentLessonId: DEFAULT_GUIDE_LESSON_ID,
    viewMode: "practice",
    completedLessonIds: [],
    practiceCounts: {},
    lastPracticedAt: {}
  };
}

function normalizeLearningState(stored: unknown): GuideLearningState {
  const defaults = defaultLearningState();
  if (!isRecord(stored)) {
    return defaults;
  }

  const validLessonIds = new Set(guideLessons.map((lesson) => lesson.id));
  const currentLessonId = typeof stored.currentLessonId === "string" && validLessonIds.has(stored.currentLessonId) ? stored.currentLessonId : defaults.currentLessonId;
  const viewMode = isGuideViewMode(stored.viewMode) ? stored.viewMode : defaults.viewMode;
  const completedSet = new Set(
    Array.isArray(stored.completedLessonIds)
      ? stored.completedLessonIds.filter((id): id is string => typeof id === "string" && validLessonIds.has(id))
      : []
  );
  const practiceCounts = normalizeLessonNumberRecord(stored.practiceCounts, validLessonIds);
  const lastPracticedAt = normalizeLessonStringRecord(stored.lastPracticedAt, validLessonIds);

  return {
    currentLessonId,
    viewMode,
    completedLessonIds: orderedLessonIds(completedSet),
    practiceCounts,
    lastPracticedAt
  };
}

function normalizeLessonNumberRecord(value: unknown, validLessonIds: ReadonlySet<string>): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: Record<string, number> = {};
  for (const [id, count] of Object.entries(value)) {
    if (validLessonIds.has(id) && typeof count === "number" && Number.isInteger(count) && count > 0) {
      normalized[id] = count;
    }
  }

  return normalized;
}

function normalizeLessonStringRecord(value: unknown, validLessonIds: ReadonlySet<string>): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const normalized: Record<string, string> = {};
  for (const [id, text] of Object.entries(value)) {
    if (validLessonIds.has(id) && typeof text === "string" && text.trim().length > 0) {
      normalized[id] = text;
    }
  }

  return normalized;
}

function orderedLessonIds(ids: ReadonlySet<string>): readonly string[] {
  return guideLessons.map((lesson) => lesson.id).filter((id) => ids.has(id));
}

function learningStateStorageMatches(stored: unknown, learningState: GuideLearningState): boolean {
  return JSON.stringify(stored) === JSON.stringify(learningState);
}

function getLessonProgressLabel(completed: boolean, practiceCount: number, language: GuideLanguage): string {
  if (language === "ko") {
    if (completed) {
      return practiceCount > 1 ? `완료 · ${practiceCount}회 연습` : "완료";
    }

    return practiceCount > 0 ? `${practiceCount}회 연습` : "아직 연습 전";
  }

  if (completed) {
    return practiceCount > 1 ? `Done · practiced ${practiceCount} times` : "Done";
  }

  return practiceCount > 0 ? `Practiced ${practiceCount} time${practiceCount === 1 ? "" : "s"}` : "Not practiced yet";
}

export function parseVscodeVimConfig(
  config: ConfigurationReader,
  installed: boolean,
  language: GuideLanguage = "en"
): VscodeVimSnapshot {
  const settings: readonly SettingSummary[] = [
    summarizeStringSetting("vim.leader", settingLabel("leader", language), config.get<unknown>("leader"), language),
    summarizeBindingSetting(
      "vim.normalModeKeyBindings",
      settingLabel("normal", language),
      config.get<unknown>("normalModeKeyBindings"),
      language
    ),
    summarizeBindingSetting(
      "vim.visualModeKeyBindings",
      settingLabel("visual", language),
      config.get<unknown>("visualModeKeyBindings"),
      language
    ),
    summarizeBindingSetting(
      "vim.insertModeKeyBindings",
      settingLabel("insert", language),
      config.get<unknown>("insertModeKeyBindings"),
      language
    ),
    summarizeBooleanSetting("vim.useSystemClipboard", settingLabel("clipboard", language), config.get<unknown>("useSystemClipboard"), language)
  ];

  return {
    installed,
    configured: settings.some((setting) => setting.status === "ok"),
    settings
  };
}

function summarizeStringSetting(key: string, label: string, value: unknown, language: GuideLanguage): SettingSummary {
  if (value === undefined || value === null || value === "") {
    return { key, label, status: "empty", value: settingText(language).notConfigured };
  }

  if (typeof value !== "string") {
    return { key, label, status: "invalid", value: settingText(language).invalid, detail: settingText(language).expectedString };
  }

  return { key, label, status: "ok", value: truncateSummary(value) };
}

function summarizeBooleanSetting(key: string, label: string, value: unknown, language: GuideLanguage): SettingSummary {
  if (value === undefined || value === null) {
    return { key, label, status: "empty", value: settingText(language).notConfigured };
  }

  if (typeof value !== "boolean") {
    return { key, label, status: "invalid", value: settingText(language).invalid, detail: settingText(language).expectedBoolean };
  }

  return { key, label, status: "ok", value: value ? settingText(language).enabled : settingText(language).disabled };
}

function summarizeBindingSetting(key: string, label: string, value: unknown, language: GuideLanguage): SettingSummary {
  if (value === undefined || value === null) {
    return { key, label, status: "empty", value: bindingCountText(0, language) };
  }

  if (!Array.isArray(value)) {
    return { key, label, status: "invalid", value: settingText(language).invalid, detail: settingText(language).expectedBindingArray };
  }

  if (value.length === 0) {
    return { key, label, status: "empty", value: bindingCountText(0, language) };
  }

  const inspected = value.slice(0, MAX_BINDING_ENTRIES_TO_INSPECT);
  const summaries = inspected.map(summarizeBindingEntry);
  const samples = summaries.slice(0, MAX_BINDING_SAMPLES).map((summary) => summary.text);
  const invalidCount = summaries.filter((summary) => !summary.valid).length;
  const remainingCount = value.length - inspected.length;
  const detailParts = [...samples];

  if (remainingCount > 0) {
    detailParts.push(omittedBindingText(remainingCount, language));
  }

  return {
    key,
    label,
    status: invalidCount > 0 ? "invalid" : "ok",
    value: bindingCountText(value.length, language),
    detail: detailParts.join("; ")
  };
}

function summarizeBindingEntry(entry: unknown): BindingEntrySummary {
  if (!isRecord(entry)) {
    return { text: "invalid binding", valid: false };
  }

  const before = summarizeKeySequence(entry.before);
  const after = summarizeKeySequence(entry.after);
  const commands = summarizeCommandList(entry.commands);
  const targetText = after.text ?? commands.text;
  const valid = before.text !== undefined && targetText !== undefined;

  if (before.invalid || after.invalid || commands.invalid || !valid) {
    return { text: "invalid binding", valid: false };
  }

  return { text: truncateBindingEntry(`${before.text} -> ${targetText}`), valid: true };
}

function summarizeKeySequence(value: unknown): ArraySummary {
  if (value === undefined) {
    return { invalid: false };
  }

  if (!Array.isArray(value)) {
    return { invalid: true };
  }

  const inspected = value.slice(0, MAX_NESTED_SETTING_ITEMS);
  const keys = inspected.filter((part): part is string => typeof part === "string").map(truncateSummary);
  const omittedCount = value.length - inspected.length;
  if (keys.length === 0 || keys.length !== inspected.length) {
    return { invalid: true };
  }

  return { text: appendOmittedCount(keys.join(" "), omittedCount), invalid: false };
}

function summarizeCommandList(value: unknown): ArraySummary {
  if (value === undefined) {
    return { invalid: false };
  }

  if (!Array.isArray(value)) {
    return { invalid: true };
  }

  const inspected = value.slice(0, MAX_NESTED_SETTING_ITEMS);
  const commands = inspected
    .map((entry): string | undefined => {
      if (typeof entry === "string") {
        return truncateSummary(entry);
      }

      if (isRecord(entry) && typeof entry.command === "string") {
        return truncateSummary(entry.command);
      }

      return undefined;
    })
    .filter((entry): entry is string => entry !== undefined);
  const omittedCount = value.length - inspected.length;
  if (commands.length === 0 || commands.length !== inspected.length) {
    return { invalid: true };
  }

  return { text: appendOmittedCount(commands.join(", "), omittedCount), invalid: false };
}

function searchableText(item: GuideItem, language: GuideLanguage): string {
  const text = getGuideItemText(item, language);
  return normalize(
    [
      item.title,
      text.title,
      item.keys,
      item.description,
      text.description,
      item.category,
      getCategoryLabel(item.category, language),
      getStageLabel(item.stage, language),
      ...item.tags,
      ...(text.tags ?? [])
    ].join(" ")
  );
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function truncateSummary(value: string): string {
  return truncateText(value, MAX_SUMMARY_TEXT_LENGTH);
}

function truncateBindingEntry(value: string): string {
  return truncateText(value, MAX_BINDING_ENTRY_TEXT_LENGTH);
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function appendOmittedCount(value: string, omittedCount: number): string {
  const suffix = omittedCount > 0 ? ` (+${omittedCount} more)` : "";
  if (suffix.length === 0) {
    return truncateSummary(value);
  }

  const maxValueLength = Math.max(0, MAX_SUMMARY_TEXT_LENGTH - suffix.length);
  const visibleValue = value.length <= maxValueLength ? value : `${value.slice(0, Math.max(0, maxValueLength - 3))}...`;
  return `${visibleValue}${suffix}`;
}

function favoriteStorageMatches(stored: unknown, favorites: readonly string[]): boolean {
  return Array.isArray(stored) && stored.length === favorites.length && stored.every((id, index) => id === favorites[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getGuidanceText(filters: GuideFilters, favoriteCount: number): string {
  if (filters.language === "ko") {
    if (filters.favoritesOnly && favoriteCount === 0) {
      return "자주 연습할 명령을 즐겨찾기에 추가해 나만의 연습 큐를 만드세요.";
    }

    if (filters.favoritesOnly) {
      return "연습 큐: 저장해 둔 Vim 명령과 생산성 팁입니다.";
    }

    if (filters.viewMode === "all") {
      return "전체 보기: 모든 명령을 reference처럼 검색하고 필터링합니다. 다시 연습 모드로 돌아가면 현재 레슨만 봅니다.";
    }

    if (filters.query.trim().length === 0 && filters.category === ALL_CATEGORY) {
      return "연습 모드: 지금 선택한 레슨 항목만 반복합니다. 이미 익숙하면 전체 명령 보기를 켜세요.";
    }

    if (filters.stage === "beginner") {
      return "입문 경로: 모드, 이동, 기본 편집부터 익힙니다.";
    }

    if (filters.stage === "productive") {
      return "실무 생산성 경로: 검색, text object, register, VS Code 흐름을 익힙니다.";
    }

    if (filters.stage === "advanced") {
      return "고급 경로: 매크로, 창 이동, VSCodeVim remap을 익힙니다.";
    }

    return "";
  }

  if (filters.favoritesOnly && favoriteCount === 0) {
    return "Favorite commands to build a personal practice queue.";
  }

  if (filters.favoritesOnly) {
    return "Practice queue: your saved commands and tips.";
  }

  if (filters.viewMode === "all") {
    return "All commands: search and filter the full reference. Turn it off to return to the current lesson.";
  }

  if (filters.query.trim().length === 0 && filters.category === ALL_CATEGORY) {
    return "Practice mode: repeat only the current lesson items. Turn on all commands when you already know the basics.";
  }

  if (filters.stage === "beginner") {
    return "Beginner path: modes, movement, and basic edits.";
  }

  if (filters.stage === "productive") {
    return "Productive path: search, text objects, registers, and VS Code flow.";
  }

  if (filters.stage === "advanced") {
    return "Advanced path: macros, windows, and VSCodeVim remaps.";
  }

  return "";
}

function getUiText(language: GuideLanguage): GuideUiText {
  if (language === "ko") {
    return {
      searchPlaceholder: "제목, 키, 카테고리, 설명 검색",
      searchAriaLabel: "가이드 항목 검색",
      filtersAriaLabel: "필터",
      languageAriaLabel: "표시 언어",
      stageAriaLabel: "학습 단계",
      categoryAriaLabel: "카테고리",
      favorites: "즐겨찾기",
      startHere: "여기서 시작",
      curriculumTitle: "오늘의 Vim 연습",
      curriculumIntro: "전체 명령을 먼저 외우지 말고, 현재 레슨의 작은 묶음을 반복하세요.",
      currentLesson: "현재 레슨",
      practicePrompt: "연습 방법",
      readiness: "다음으로 넘어갈 기준",
      lessonItemsLabel: "이 레슨에서 볼 항목",
      practiceThisLesson: "이 레슨 연습",
      practicingNow: "연습 중",
      todayPracticeTitle: "오늘 10분 연습",
      checklistLabel: "자기점검",
      completeAndNext: "오늘 완료하고 다음 레슨",
      markLessonDone: "오늘 연습 완료",
      lessonMapTitle: "전체 학습 경로",
      lessonDetailsLabel: "명령 카드 자세히 보기",
      completedBadge: "완료",
      showAllCommands: "전체 명령 보기",
      practiceModeLabel: "연습 모드",
      referenceModeLabel: "전체 명령 참고",
      resultsTitle: "표시 중인 항목",
      copyTitle: "키 복사",
      runTitle: "VS Code 명령 실행",
      addFavoriteTitle: "즐겨찾기에 추가",
      removeFavoriteTitle: "즐겨찾기에서 제거",
      focusItemsLabel: "먼저 익힐 것",
      currentLevel: "현재 추천",
      refresh: "새로고침",
      copy: "복사",
      run: "실행",
      addFavorite: "즐겨찾기",
      removeFavorite: "해제",
      vscodeVimNotDetected: "VSCodeVim 확장이 감지되지 않았습니다",
      vscodeVimConfigured: "확장이 감지되었고 추적 설정이 있습니다",
      vscodeVimNoTrackedSettings: "확장은 감지되었지만 추적 설정은 없습니다",
      noMatchesFor: "일치하는 항목 없음: ",
      noGuideItems: "표시할 가이드 항목이 없습니다.",
      searchFilterLabel: "검색",
      categoryFilterLabel: "카테고리",
      stageFilterLabel: "단계",
      favoritesFilterLabel: "즐겨찾기",
      filterJoin: " 및 ",
      countAriaPrefix: "총 ",
      countAriaMiddle: "개 중 ",
      countAriaSuffix: "개 가이드 항목 표시",
      searchStarterPrefix: "검색: "
    };
  }

  return {
    searchPlaceholder: "Search title, keys, category, tags",
    searchAriaLabel: "Search guide items",
    filtersAriaLabel: "Filters",
    languageAriaLabel: "Display language",
    stageAriaLabel: "Learning stage",
    categoryAriaLabel: "Category",
    favorites: "Favorites",
    startHere: "Start here",
    curriculumTitle: "Today's Vim practice",
    curriculumIntro: "Do not memorize the full reference first. Repeat the small set in the current lesson.",
    currentLesson: "Current lesson",
    practicePrompt: "Practice",
    readiness: "Ready for next",
    lessonItemsLabel: "Lesson items",
    practiceThisLesson: "Practice this lesson",
    practicingNow: "Practicing",
    todayPracticeTitle: "Today's 10-minute practice",
    checklistLabel: "Self-check",
    completeAndNext: "Mark done and go next",
    markLessonDone: "Mark practice done",
    lessonMapTitle: "Full learning path",
    lessonDetailsLabel: "Show command cards",
    completedBadge: "Done",
    showAllCommands: "Show all commands",
    practiceModeLabel: "Practice mode",
    referenceModeLabel: "Full reference",
    resultsTitle: "Visible items",
    copyTitle: "Copy keys",
    runTitle: "Run VS Code command",
    addFavoriteTitle: "Add to favorites",
    removeFavoriteTitle: "Remove from favorites",
    focusItemsLabel: "Practice first",
    currentLevel: "Recommended now",
    refresh: "Refresh",
    copy: "Copy",
    run: "Run",
    addFavorite: "Favorite",
    removeFavorite: "Unfavorite",
    vscodeVimNotDetected: "VSCodeVim extension not detected",
    vscodeVimConfigured: "extension detected, tracked settings found",
    vscodeVimNoTrackedSettings: "extension detected, no tracked settings configured",
    noMatchesFor: "No matches for ",
    noGuideItems: "No guide items available.",
    searchFilterLabel: "search",
    categoryFilterLabel: "category",
    stageFilterLabel: "stage",
    favoritesFilterLabel: "favorites",
    filterJoin: " and ",
    countAriaPrefix: "Showing ",
    countAriaMiddle: " of ",
    countAriaSuffix: " guide items",
    searchStarterPrefix: "Search "
  };
}

function settingLabel(name: "leader" | "normal" | "visual" | "insert" | "clipboard", language: GuideLanguage): string {
  if (language === "ko") {
    switch (name) {
      case "leader":
        return "리더 키";
      case "normal":
        return "Normal 모드 매핑";
      case "visual":
        return "Visual 모드 매핑";
      case "insert":
        return "Insert 모드 매핑";
      case "clipboard":
        return "시스템 클립보드";
    }
  }

  switch (name) {
    case "leader":
      return "Leader";
    case "normal":
      return "Normal mode bindings";
    case "visual":
      return "Visual mode bindings";
    case "insert":
      return "Insert mode bindings";
    case "clipboard":
      return "System clipboard";
  }
}

function settingText(language: GuideLanguage): {
  readonly notConfigured: string;
  readonly invalid: string;
  readonly expectedString: string;
  readonly expectedBoolean: string;
  readonly expectedBindingArray: string;
  readonly enabled: string;
  readonly disabled: string;
} {
  if (language === "ko") {
    return {
      notConfigured: "설정 없음",
      invalid: "잘못된 값",
      expectedString: "문자열 값이어야 합니다.",
      expectedBoolean: "boolean 값이어야 합니다.",
      expectedBindingArray: "keybinding 객체 배열이어야 합니다.",
      enabled: "켜짐",
      disabled: "꺼짐"
    };
  }

  return {
    notConfigured: "not configured",
    invalid: "invalid",
    expectedString: "Expected a string value.",
    expectedBoolean: "Expected a boolean value.",
    expectedBindingArray: "Expected an array of keybinding objects.",
    enabled: "enabled",
    disabled: "disabled"
  };
}

function bindingCountText(count: number, language: GuideLanguage): string {
  if (language === "ko") {
    return `${count}개 매핑`;
  }

  return `${count} binding${count === 1 ? "" : "s"}`;
}

function omittedBindingText(remainingCount: number, language: GuideLanguage): string {
  if (language === "ko") {
    return `처음 ${MAX_BINDING_ENTRIES_TO_INSPECT}개 매핑만 확인함; ${remainingCount}개는 생략됨.`;
  }

  return `Only first ${MAX_BINDING_ENTRIES_TO_INSPECT} bindings inspected; ${remainingCount} more omitted.`;
}
