import * as vscode from "vscode";
import { GuideItem, guideItems } from "../data/guideData";

export const ALL_CATEGORY = "All";
export const FAVORITES_KEY = "vimGuide.favoriteIds.v1";
const MAX_BINDING_ENTRIES_TO_INSPECT = 100;
const MAX_BINDING_SAMPLES = 3;
const MAX_SUMMARY_TEXT_LENGTH = 80;
const MAX_BINDING_ENTRY_TEXT_LENGTH = 120;
const MAX_NESTED_SETTING_ITEMS = 12;

export const ALLOWED_VSCODE_COMMANDS = new Set<string>([
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
}

export interface GuideViewModel {
  readonly query: string;
  readonly category: string;
  readonly categories: readonly string[];
  readonly totalCount: number;
  readonly resultCount: number;
  readonly favoriteCount: number;
  readonly emptyQuery: boolean;
  readonly noResults: boolean;
  readonly items: readonly GuideItemViewModel[];
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
  private readonly configurationReader: () => ConfigurationReader;
  private readonly extensionInstalled: () => boolean;
  private readonly executeCommandImpl: (command: string) => Thenable<unknown>;

  public constructor(
    private readonly state: StateStore,
    private readonly items: readonly GuideItem[] = guideItems,
    options: GuideServiceOptions = {}
  ) {
    this.itemMap = new Map(items.map((item) => [item.id, item]));
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
    return [ALL_CATEGORY, ...Array.from(categories).sort((a, b) => a.localeCompare(b))];
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

  public searchItems(query = "", category = ALL_CATEGORY): readonly GuideItem[] {
    const normalizedQuery = normalize(query);
    const selectedCategory = category.trim() || ALL_CATEGORY;

    return this.items.filter((item) => {
      const categoryMatches = selectedCategory === ALL_CATEGORY || item.category === selectedCategory;
      if (!categoryMatches) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      return searchableText(item).includes(normalizedQuery);
    });
  }

  public createViewModel(query = "", category = ALL_CATEGORY): GuideViewModel {
    const favoriteIds = new Set(this.getFavoriteIds());
    const results = this.searchItems(query, category).map((item) => ({
      ...item,
      favorite: favoriteIds.has(item.id),
      executable: this.isExecutable(item)
    }));

    return {
      query,
      category: category.trim() || ALL_CATEGORY,
      categories: this.getCategories(),
      totalCount: this.items.length,
      resultCount: results.length,
      favoriteCount: favoriteIds.size,
      emptyQuery: query.trim().length === 0,
      noResults: results.length === 0,
      items: results,
      vscodeVim: this.getVscodeVimSnapshot()
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

  public async executeGuideCommand(id: string): Promise<string> {
    const item = this.getItem(id);
    if (item === undefined || !this.isExecutable(item) || item.command === undefined) {
      throw new Error("This guide item does not expose an allowlisted VS Code command.");
    }

    await this.executeCommandImpl(item.command);
    return item.command;
  }

  public getVscodeVimSnapshot(): VscodeVimSnapshot {
    return parseVscodeVimConfig(this.configurationReader(), this.extensionInstalled());
  }
}

export function parseVscodeVimConfig(config: ConfigurationReader, installed: boolean): VscodeVimSnapshot {
  const settings: readonly SettingSummary[] = [
    summarizeStringSetting("vim.leader", "Leader", config.get<unknown>("leader")),
    summarizeBindingSetting("vim.normalModeKeyBindings", "Normal mode bindings", config.get<unknown>("normalModeKeyBindings")),
    summarizeBindingSetting("vim.visualModeKeyBindings", "Visual mode bindings", config.get<unknown>("visualModeKeyBindings")),
    summarizeBindingSetting("vim.insertModeKeyBindings", "Insert mode bindings", config.get<unknown>("insertModeKeyBindings")),
    summarizeBooleanSetting("vim.useSystemClipboard", "System clipboard", config.get<unknown>("useSystemClipboard"))
  ];

  return {
    installed,
    configured: settings.some((setting) => setting.status === "ok"),
    settings
  };
}

function summarizeStringSetting(key: string, label: string, value: unknown): SettingSummary {
  if (value === undefined || value === null || value === "") {
    return { key, label, status: "empty", value: "not configured" };
  }

  if (typeof value !== "string") {
    return { key, label, status: "invalid", value: "invalid", detail: "Expected a string value." };
  }

  return { key, label, status: "ok", value: truncateSummary(value) };
}

function summarizeBooleanSetting(key: string, label: string, value: unknown): SettingSummary {
  if (value === undefined || value === null) {
    return { key, label, status: "empty", value: "not configured" };
  }

  if (typeof value !== "boolean") {
    return { key, label, status: "invalid", value: "invalid", detail: "Expected a boolean value." };
  }

  return { key, label, status: "ok", value: value ? "enabled" : "disabled" };
}

function summarizeBindingSetting(key: string, label: string, value: unknown): SettingSummary {
  if (value === undefined || value === null) {
    return { key, label, status: "empty", value: "0 bindings" };
  }

  if (!Array.isArray(value)) {
    return { key, label, status: "invalid", value: "invalid", detail: "Expected an array of keybinding objects." };
  }

  if (value.length === 0) {
    return { key, label, status: "empty", value: "0 bindings" };
  }

  const inspected = value.slice(0, MAX_BINDING_ENTRIES_TO_INSPECT);
  const summaries = inspected.map(summarizeBindingEntry);
  const samples = summaries.slice(0, MAX_BINDING_SAMPLES).map((summary) => summary.text);
  const invalidCount = summaries.filter((summary) => !summary.valid).length;
  const remainingCount = value.length - inspected.length;
  const detailParts = [...samples];

  if (remainingCount > 0) {
    detailParts.push(`Only first ${MAX_BINDING_ENTRIES_TO_INSPECT} bindings inspected; ${remainingCount} more omitted.`);
  }

  return {
    key,
    label,
    status: invalidCount > 0 ? "invalid" : "ok",
    value: `${value.length} binding${value.length === 1 ? "" : "s"}`,
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

function searchableText(item: GuideItem): string {
  return normalize([item.title, item.keys, item.description, item.category, ...item.tags].join(" "));
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
