export type GuideItemSource = "vim" | "vscode" | "vscodevim";

export type GuideItemType = "command" | "tip" | "vscode-command";

export const guideItemStages = ["beginner", "productive", "advanced"] as const;

export type GuideItemStage = (typeof guideItemStages)[number];

export interface GuideItem {
  readonly id: string;
  readonly title: string;
  readonly keys: string;
  readonly category: string;
  readonly description: string;
  readonly source: GuideItemSource;
  readonly type: GuideItemType;
  readonly stage: GuideItemStage;
  readonly tags: readonly string[];
  readonly command?: string;
}

type GuideItemSeed = Omit<GuideItem, "stage">;

export const guideItemStageOverrides: Readonly<Record<string, GuideItemStage>> = {
  "vim-motion-page-down": "productive",
  "vim-motion-page-up": "productive",
  "vim-motion-match-pair": "productive",
  "vim-edit-replace-char": "productive",
  "vim-edit-join-lines": "productive",
  "vim-edit-repeat-change": "productive",
  "vim-mode-visual-block": "advanced",
  "vim-search-forward": "productive",
  "vim-search-backward": "productive",
  "vim-search-next": "productive",
  "vim-search-previous": "productive",
  "vim-search-word-forward": "productive",
  "vim-register-system": "productive",
  "vim-register-named": "productive",
  "vim-register-black-hole": "advanced",
  "vim-macro-record": "advanced",
  "vim-macro-play": "advanced",
  "vim-text-object-inner-word": "productive",
  "vim-text-object-around-word": "productive",
  "vim-text-object-inner-parens": "advanced",
  "vim-text-object-around-quotes": "advanced",
  "vim-window-split-horizontal": "advanced",
  "vim-window-split-vertical": "advanced",
  "vim-window-move-left": "advanced",
  "vim-window-move-right": "advanced",
  "vscodevim-leader-tip": "advanced",
  "vscodevim-clipboard-tip": "productive",
  "vscodevim-keybindings-tip": "advanced",
  "vscode-command-recent-editor": "productive",
  "vscode-command-toggle-sidebar": "productive",
  "vscode-command-find-files": "productive",
  "vscode-command-replace": "productive",
  "vscode-command-toggle-terminal": "productive",
  "vscode-command-toggle-panel": "productive",
  "vscode-command-navigate-back": "productive",
  "vscode-command-next-editor": "productive"
};

const guideItemSeeds: readonly GuideItemSeed[] = [
  {
    id: "vim-motion-left-right",
    title: "Move left or right",
    keys: "h / l",
    category: "Motions",
    description: "Move one character left or right in Normal mode.",
    source: "vim",
    type: "command",
    tags: ["motion", "character", "normal"]
  },
  {
    id: "vim-motion-up-down",
    title: "Move up or down",
    keys: "j / k",
    category: "Motions",
    description: "Move one line down or up in Normal mode.",
    source: "vim",
    type: "command",
    tags: ["motion", "line", "normal"]
  },
  {
    id: "vim-motion-word-forward",
    title: "Move to next word",
    keys: "w",
    category: "Motions",
    description: "Move to the start of the next word. Pair it with operators such as d or c in VSCodeVim.",
    source: "vim",
    type: "command",
    tags: ["motion", "word", "normal"]
  },
  {
    id: "vim-motion-word-back",
    title: "Move to previous word",
    keys: "b",
    category: "Motions",
    description: "Move backward to the start of the previous word.",
    source: "vim",
    type: "command",
    tags: ["motion", "word", "normal"]
  },
  {
    id: "vim-motion-word-end",
    title: "Move to word end",
    keys: "e",
    category: "Motions",
    description: "Move to the end of the current or next word.",
    source: "vim",
    type: "command",
    tags: ["motion", "word", "normal"]
  },
  {
    id: "vim-motion-line-start",
    title: "Move to first non-blank",
    keys: "^",
    category: "Motions",
    description: "Jump to the first non-blank character on the current line.",
    source: "vim",
    type: "command",
    tags: ["motion", "line", "normal"]
  },
  {
    id: "vim-motion-line-column-start",
    title: "Move to first column",
    keys: "0",
    category: "Motions",
    description: "Jump to column zero at the start of the current line, including indentation.",
    source: "vim",
    type: "command",
    tags: ["motion", "line", "normal"]
  },
  {
    id: "vim-motion-line-end",
    title: "Move to line end",
    keys: "$",
    category: "Motions",
    description: "Jump to the end of the current line.",
    source: "vim",
    type: "command",
    tags: ["motion", "line", "normal"]
  },
  {
    id: "vim-motion-file-start",
    title: "Move to file start",
    keys: "gg",
    category: "Motions",
    description: "Jump to the first line of the file.",
    source: "vim",
    type: "command",
    tags: ["motion", "file", "normal"]
  },
  {
    id: "vim-motion-file-end",
    title: "Move to file end",
    keys: "G",
    category: "Motions",
    description: "Jump to the last line of the file.",
    source: "vim",
    type: "command",
    tags: ["motion", "file", "normal"]
  },
  {
    id: "vim-motion-page-down",
    title: "Scroll half page down",
    keys: "Ctrl+d",
    category: "Motions",
    description: "Move down by roughly half a page while keeping context.",
    source: "vim",
    type: "command",
    tags: ["motion", "scroll", "normal"]
  },
  {
    id: "vim-motion-page-up",
    title: "Scroll half page up",
    keys: "Ctrl+u",
    category: "Motions",
    description: "Move up by roughly half a page while keeping context.",
    source: "vim",
    type: "command",
    tags: ["motion", "scroll", "normal"]
  },
  {
    id: "vim-motion-match-pair",
    title: "Jump to matching pair",
    keys: "%",
    category: "Motions",
    description: "Jump between matching brackets, braces, or parentheses.",
    source: "vim",
    type: "command",
    tags: ["motion", "pair", "bracket"]
  },
  {
    id: "vim-edit-delete-line",
    title: "Delete current line",
    keys: "dd",
    category: "Editing",
    description: "Delete the current line into the unnamed register.",
    source: "vim",
    type: "command",
    tags: ["delete", "line", "operator"]
  },
  {
    id: "vim-edit-change-line",
    title: "Change current line",
    keys: "cc",
    category: "Editing",
    description: "Delete the current line and enter Insert mode.",
    source: "vim",
    type: "command",
    tags: ["change", "line", "operator"]
  },
  {
    id: "vim-edit-yank-line",
    title: "Yank current line",
    keys: "yy",
    category: "Editing",
    description: "Copy the current line into the unnamed register.",
    source: "vim",
    type: "command",
    tags: ["yank", "copy", "line"]
  },
  {
    id: "vim-edit-paste-after",
    title: "Paste after cursor",
    keys: "p",
    category: "Editing",
    description: "Paste text from the active register after the cursor or below the current line.",
    source: "vim",
    type: "command",
    tags: ["paste", "register", "normal"]
  },
  {
    id: "vim-edit-paste-before",
    title: "Paste before cursor",
    keys: "P",
    category: "Editing",
    description: "Paste text from the active register before the cursor or above the current line.",
    source: "vim",
    type: "command",
    tags: ["paste", "register", "normal"]
  },
  {
    id: "vim-edit-replace-char",
    title: "Replace one character",
    keys: "r{char}",
    category: "Editing",
    description: "Replace the character under the cursor with a typed character.",
    source: "vim",
    type: "command",
    tags: ["replace", "character", "normal"]
  },
  {
    id: "vim-edit-undo",
    title: "Undo",
    keys: "u",
    category: "Editing",
    description: "Undo the last change in the current buffer.",
    source: "vim",
    type: "command",
    tags: ["undo", "history", "normal"]
  },
  {
    id: "vim-edit-redo",
    title: "Redo",
    keys: "Ctrl+r",
    category: "Editing",
    description: "Redo a previously undone change.",
    source: "vim",
    type: "command",
    tags: ["redo", "history", "normal"]
  },
  {
    id: "vim-edit-join-lines",
    title: "Join lines",
    keys: "J",
    category: "Editing",
    description: "Join the current line with the line below.",
    source: "vim",
    type: "command",
    tags: ["join", "line", "normal"]
  },
  {
    id: "vim-edit-repeat-change",
    title: "Repeat last change",
    keys: ".",
    category: "Editing",
    description: "Repeat the last change where it applies.",
    source: "vim",
    type: "command",
    tags: ["repeat", "productivity", "normal"]
  },
  {
    id: "vim-mode-normal",
    title: "Return to Normal mode",
    keys: "Esc",
    category: "Modes",
    description: "Leave Insert, Visual, or command-line mode and return to Normal mode.",
    source: "vim",
    type: "command",
    tags: ["normal", "mode", "escape"]
  },
  {
    id: "vim-mode-insert-before",
    title: "Insert before cursor",
    keys: "i",
    category: "Modes",
    description: "Enter Insert mode before the cursor.",
    source: "vim",
    type: "command",
    tags: ["insert", "mode", "normal"]
  },
  {
    id: "vim-mode-insert-after",
    title: "Insert after cursor",
    keys: "a",
    category: "Modes",
    description: "Enter Insert mode after the cursor.",
    source: "vim",
    type: "command",
    tags: ["insert", "mode", "normal"]
  },
  {
    id: "vim-mode-append-line-end",
    title: "Append at line end",
    keys: "A",
    category: "Modes",
    description: "Move to the end of the current line and enter Insert mode.",
    source: "vim",
    type: "command",
    tags: ["insert", "line", "normal"]
  },
  {
    id: "vim-mode-open-below",
    title: "Open line below",
    keys: "o",
    category: "Modes",
    description: "Open a new line below and enter Insert mode.",
    source: "vim",
    type: "command",
    tags: ["insert", "line", "normal"]
  },
  {
    id: "vim-mode-open-above",
    title: "Open line above",
    keys: "O",
    category: "Modes",
    description: "Open a new line above and enter Insert mode.",
    source: "vim",
    type: "command",
    tags: ["insert", "line", "normal"]
  },
  {
    id: "vim-mode-visual-char",
    title: "Visual character mode",
    keys: "v",
    category: "Selection",
    description: "Start character-wise Visual mode selection.",
    source: "vim",
    type: "command",
    tags: ["visual", "selection", "mode"]
  },
  {
    id: "vim-mode-visual-line",
    title: "Visual line mode",
    keys: "V",
    category: "Selection",
    description: "Start line-wise Visual mode selection.",
    source: "vim",
    type: "command",
    tags: ["visual", "selection", "line"]
  },
  {
    id: "vim-mode-visual-block",
    title: "Visual block mode",
    keys: "Ctrl+v",
    category: "Selection",
    description: "Start rectangular block selection when supported by VSCodeVim.",
    source: "vscodevim",
    type: "command",
    tags: ["visual", "selection", "block"]
  },
  {
    id: "vim-search-forward",
    title: "Search forward",
    keys: "/pattern",
    category: "Search",
    description: "Search forward in the current file for a pattern.",
    source: "vim",
    type: "command",
    tags: ["search", "find", "normal"]
  },
  {
    id: "vim-search-backward",
    title: "Search backward",
    keys: "?pattern",
    category: "Search",
    description: "Search backward in the current file for a pattern.",
    source: "vim",
    type: "command",
    tags: ["search", "find", "normal"]
  },
  {
    id: "vim-search-next",
    title: "Next search match",
    keys: "n",
    category: "Search",
    description: "Move to the next search result in the current search direction.",
    source: "vim",
    type: "command",
    tags: ["search", "next", "normal"]
  },
  {
    id: "vim-search-previous",
    title: "Previous search match",
    keys: "N",
    category: "Search",
    description: "Move to the previous search result in the current search direction.",
    source: "vim",
    type: "command",
    tags: ["search", "previous", "normal"]
  },
  {
    id: "vim-search-word-forward",
    title: "Search word under cursor",
    keys: "*",
    category: "Search",
    description: "Search forward for the word under the cursor.",
    source: "vim",
    type: "command",
    tags: ["search", "word", "cursor"]
  },
  {
    id: "vim-register-system",
    title: "Use system clipboard register",
    keys: "\"+y / \"+p",
    category: "Registers",
    description: "Use the plus register to yank from or paste to the system clipboard when configured.",
    source: "vim",
    type: "tip",
    tags: ["register", "clipboard", "yank", "paste"]
  },
  {
    id: "vim-register-named",
    title: "Use a named register",
    keys: "\"ay / \"ap",
    category: "Registers",
    description: "Store text in a named register and paste it later.",
    source: "vim",
    type: "tip",
    tags: ["register", "clipboard", "workflow"]
  },
  {
    id: "vim-register-black-hole",
    title: "Delete without replacing yank",
    keys: "\"_d",
    category: "Registers",
    description: "Use the black-hole register to delete without overwriting your latest yank.",
    source: "vim",
    type: "tip",
    tags: ["register", "delete", "yank"]
  },
  {
    id: "vim-macro-record",
    title: "Record a macro",
    keys: "q{register}",
    category: "Macros",
    description: "Start recording typed commands into a register, then press q to stop.",
    source: "vim",
    type: "tip",
    tags: ["macro", "automation", "normal"]
  },
  {
    id: "vim-macro-play",
    title: "Play a macro",
    keys: "@{register}",
    category: "Macros",
    description: "Replay commands recorded in a register.",
    source: "vim",
    type: "tip",
    tags: ["macro", "automation", "repeat"]
  },
  {
    id: "vim-text-object-inner-word",
    title: "Inner word text object",
    keys: "iw",
    category: "Text Objects",
    description: "Select or operate on the current word without surrounding whitespace.",
    source: "vim",
    type: "tip",
    tags: ["text-object", "word", "operator"]
  },
  {
    id: "vim-text-object-around-word",
    title: "Around word text object",
    keys: "aw",
    category: "Text Objects",
    description: "Select or operate on the current word including surrounding whitespace.",
    source: "vim",
    type: "tip",
    tags: ["text-object", "word", "operator"]
  },
  {
    id: "vim-text-object-inner-parens",
    title: "Inner parentheses",
    keys: "i)",
    category: "Text Objects",
    description: "Operate inside matching parentheses without including the delimiters.",
    source: "vim",
    type: "tip",
    tags: ["text-object", "parentheses", "operator"]
  },
  {
    id: "vim-text-object-around-quotes",
    title: "Around quotes",
    keys: "a\"",
    category: "Text Objects",
    description: "Operate on quoted text including the quote characters.",
    source: "vim",
    type: "tip",
    tags: ["text-object", "quotes", "operator"]
  },
  {
    id: "vim-window-split-horizontal",
    title: "Horizontal split",
    keys: ":split",
    category: "Windows",
    description: "Open a horizontal split in Vim-style workflows. In VS Code, prefer mapped workbench commands for editor groups.",
    source: "vim",
    type: "tip",
    tags: ["window", "split", "layout"]
  },
  {
    id: "vim-window-split-vertical",
    title: "Vertical split",
    keys: ":vsplit",
    category: "Windows",
    description: "Open a vertical split in Vim-style workflows. In VS Code, editor groups provide the native equivalent.",
    source: "vim",
    type: "tip",
    tags: ["window", "split", "layout"]
  },
  {
    id: "vim-window-move-left",
    title: "Move to left split",
    keys: "Ctrl+w h",
    category: "Windows",
    description: "Move focus to the split on the left in Vim-style window navigation.",
    source: "vim",
    type: "tip",
    tags: ["window", "focus", "layout"]
  },
  {
    id: "vim-window-move-right",
    title: "Move to right split",
    keys: "Ctrl+w l",
    category: "Windows",
    description: "Move focus to the split on the right in Vim-style window navigation.",
    source: "vim",
    type: "tip",
    tags: ["window", "focus", "layout"]
  },
  {
    id: "vscodevim-leader-tip",
    title: "Leader key maps project habits",
    keys: "<leader>",
    category: "VSCodeVim",
    description: "Use `vim.leader` and custom keybindings to put frequent VS Code actions behind a Vim-style prefix.",
    source: "vscodevim",
    type: "tip",
    tags: ["leader", "settings", "keybindings"]
  },
  {
    id: "vscodevim-clipboard-tip",
    title: "System clipboard setting",
    keys: "vim.useSystemClipboard",
    category: "VSCodeVim",
    description: "When enabled, yanks and puts use the system clipboard by default.",
    source: "vscodevim",
    type: "tip",
    tags: ["clipboard", "settings", "integration"]
  },
  {
    id: "vscodevim-keybindings-tip",
    title: "Mode-specific remaps",
    keys: "vim.normalModeKeyBindings",
    category: "VSCodeVim",
    description: "VSCodeVim supports mode-specific remaps for normal, visual, and insert modes.",
    source: "vscodevim",
    type: "tip",
    tags: ["settings", "remap", "keybindings"]
  },
  {
    id: "vscode-command-save-file",
    title: "Save current file",
    keys: "Cmd+S",
    category: "VS Code Commands",
    description: "Save the active editor using the standard VS Code save command.",
    source: "vscode",
    type: "vscode-command",
    tags: ["save", "file", "editor"],
    command: "workbench.action.files.save"
  },
  {
    id: "vscode-command-quick-open",
    title: "Quick open file",
    keys: "Cmd+P",
    category: "VS Code Commands",
    description: "Open VS Code Quick Open for fast file navigation.",
    source: "vscode",
    type: "vscode-command",
    tags: ["file", "navigation", "quick-open"],
    command: "workbench.action.quickOpen"
  },
  {
    id: "vscode-command-command-palette",
    title: "Command Palette",
    keys: "Cmd+Shift+P",
    category: "VS Code Commands",
    description: "Open the Command Palette to run any available VS Code command.",
    source: "vscode",
    type: "vscode-command",
    tags: ["commands", "palette", "navigation"],
    command: "workbench.action.showCommands"
  },
  {
    id: "vscode-command-goto-line",
    title: "Go to line",
    keys: "Ctrl+G",
    category: "VS Code Commands",
    description: "Jump to a line number in the active editor.",
    source: "vscode",
    type: "vscode-command",
    tags: ["line", "navigation", "editor"],
    command: "workbench.action.gotoLine"
  },
  {
    id: "vscode-command-recent-editor",
    title: "Previous recent editor",
    keys: "Ctrl+Tab",
    category: "VS Code Commands",
    description: "Switch to the previous recently used editor in the current group.",
    source: "vscode",
    type: "vscode-command",
    tags: ["editor", "navigation", "recent"],
    command: "workbench.action.quickOpenPreviousRecentlyUsedEditorInGroup"
  },
  {
    id: "vscode-command-toggle-sidebar",
    title: "Toggle sidebar",
    keys: "Cmd+B",
    category: "VS Code Commands",
    description: "Show or hide the VS Code primary sidebar.",
    source: "vscode",
    type: "vscode-command",
    tags: ["sidebar", "layout", "focus"],
    command: "workbench.action.toggleSidebarVisibility"
  },
  {
    id: "vscode-command-find-files",
    title: "Find in files",
    keys: "Cmd+Shift+F",
    category: "VS Code Commands",
    description: "Open workspace-wide search.",
    source: "vscode",
    type: "vscode-command",
    tags: ["search", "workspace", "files"],
    command: "workbench.action.findInFiles"
  },
  {
    id: "vscode-command-replace",
    title: "Find and replace in editor",
    keys: "Cmd+Option+F",
    category: "VS Code Commands",
    description: "Open the editor find and replace control.",
    source: "vscode",
    type: "vscode-command",
    tags: ["search", "replace", "editor"],
    command: "editor.action.startFindReplaceAction"
  },
  {
    id: "vscode-command-toggle-terminal",
    title: "Toggle terminal",
    keys: "Ctrl+`",
    category: "VS Code Commands",
    description: "Show or hide the integrated terminal.",
    source: "vscode",
    type: "vscode-command",
    tags: ["terminal", "panel", "workflow"],
    command: "workbench.action.terminal.toggleTerminal"
  },
  {
    id: "vscode-command-toggle-panel",
    title: "Toggle panel",
    keys: "Cmd+J",
    category: "VS Code Commands",
    description: "Show or hide the bottom panel.",
    source: "vscode",
    type: "vscode-command",
    tags: ["panel", "layout", "workflow"],
    command: "workbench.action.togglePanel"
  },
  {
    id: "vscode-command-navigate-back",
    title: "Navigate back",
    keys: "Ctrl+-",
    category: "VS Code Commands",
    description: "Move focus back to the previous editor location.",
    source: "vscode",
    type: "vscode-command",
    tags: ["navigation", "history", "editor"],
    command: "workbench.action.navigateBack"
  },
  {
    id: "vscode-command-close-editor",
    title: "Close active editor",
    keys: "Cmd+W",
    category: "VS Code Commands",
    description: "Close the active editor tab.",
    source: "vscode",
    type: "vscode-command",
    tags: ["editor", "tab", "close"],
    command: "workbench.action.closeActiveEditor"
  },
  {
    id: "vscode-command-next-editor",
    title: "Next editor",
    keys: "Cmd+Option+Right",
    category: "VS Code Commands",
    description: "Move focus to the next editor tab.",
    source: "vscode",
    type: "vscode-command",
    tags: ["editor", "tab", "navigation"],
    command: "workbench.action.nextEditor"
  }
];

export const guideItems: readonly GuideItem[] = guideItemSeeds.map((item) => ({
  ...item,
  stage: getGuideItemStage(item.id)
}));

function getGuideItemStage(id: string): GuideItemStage {
  return guideItemStageOverrides[id] ?? "beginner";
}
