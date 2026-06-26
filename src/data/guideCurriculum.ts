import { GuideItemStage } from "./guideData";

export const DEFAULT_GUIDE_LESSON_ID = "lesson-survival-loop";

export interface GuideLesson {
  readonly id: string;
  readonly stage: GuideItemStage;
  readonly title: string;
  readonly description: string;
  readonly practicePrompt: string;
  readonly readinessHint: string;
  readonly itemIds: readonly string[];
  readonly nextLessonId?: string;
}

export const guideLessons: readonly GuideLesson[] = [
  {
    id: DEFAULT_GUIDE_LESSON_ID,
    stage: "beginner",
    title: "Survival loop: move, type, save",
    description: "Start here when Vim still feels risky. Learn the few keys needed to move, enter text, save, and close.",
    practicePrompt: "Open any file, press Esc, move with h/j/k/l, enter text with i or A, then save with Cmd+S.",
    readinessHint: "Move on when Esc, h/j/k/l, i, A, Cmd+S, and Cmd+W no longer require searching.",
    itemIds: [
      "vim-mode-normal",
      "vim-motion-left-right",
      "vim-motion-up-down",
      "vim-mode-insert-before",
      "vim-mode-append-line-end",
      "vscode-command-save-file",
      "vscode-command-close-editor"
    ],
    nextLessonId: "lesson-line-navigation"
  },
  {
    id: "lesson-line-navigation",
    stage: "beginner",
    title: "Line and file movement",
    description: "Add the movements you use constantly while reading code: words, line edges, file start/end, and line numbers.",
    practicePrompt: "Move through a real source file with w/b/e, jump to 0/^/$, use gg/G, then jump to a line number.",
    readinessHint: "Move on when you can reach a line edge or a known line number without reaching for the mouse.",
    itemIds: [
      "vim-motion-word-forward",
      "vim-motion-word-back",
      "vim-motion-word-end",
      "vim-motion-line-column-start",
      "vim-motion-line-start",
      "vim-motion-line-end",
      "vim-motion-file-start",
      "vim-motion-file-end",
      "vscode-command-goto-line"
    ],
    nextLessonId: "lesson-basic-edits"
  },
  {
    id: "lesson-basic-edits",
    stage: "beginner",
    title: "Everyday edit loop",
    description: "Practice the edits that replace most mouse selections: open a line, delete, change, yank, paste, undo, and redo.",
    practicePrompt: "Duplicate a line with yy then p, delete a line with dd, rewrite one with cc, and undo/redo the result.",
    readinessHint: "Move on when line copy/delete/paste and undo feel safe enough for normal work.",
    itemIds: [
      "vim-mode-open-below",
      "vim-mode-open-above",
      "vim-edit-delete-line",
      "vim-edit-change-line",
      "vim-edit-yank-line",
      "vim-edit-paste-after",
      "vim-edit-paste-before",
      "vim-edit-undo",
      "vim-edit-redo"
    ],
    nextLessonId: "lesson-search-workflow"
  },
  {
    id: "lesson-search-workflow",
    stage: "productive",
    title: "Find code fast",
    description: "Use Vim search for the current file and VS Code search for project-wide navigation.",
    practicePrompt: "Search in the file with /, move with n/N, search the word under the cursor with *, then open project search.",
    readinessHint: "Move on when search becomes faster than scanning with the mouse or scrollbar.",
    itemIds: [
      "vim-search-forward",
      "vim-search-backward",
      "vim-search-next",
      "vim-search-previous",
      "vim-search-word-forward",
      "vscode-command-find-files",
      "vscode-command-replace"
    ],
    nextLessonId: "lesson-structured-edits"
  },
  {
    id: "lesson-structured-edits",
    stage: "productive",
    title: "Structured edits",
    description: "Add text objects, registers, repeat, and small replace/join edits for real code changes.",
    practicePrompt: "Change a word with an operator plus iw/aw, repeat a change with ., and use the clipboard register only when needed.",
    readinessHint: "Move on when text objects feel like selecting code without manually dragging.",
    itemIds: [
      "vim-text-object-inner-word",
      "vim-text-object-around-word",
      "vim-register-system",
      "vim-register-named",
      "vim-edit-replace-char",
      "vim-edit-join-lines",
      "vim-edit-repeat-change",
      "vscode-command-navigate-back"
    ],
    nextLessonId: "lesson-automation-workspace"
  },
  {
    id: "lesson-automation-workspace",
    stage: "advanced",
    title: "Automation and workspace flow",
    description: "Use macros, windows, leader habits, and remaps only after the daily edit loop is comfortable.",
    practicePrompt: "Record one repeatable edit, replay it, move between splits, and review which VSCodeVim mappings would save work.",
    readinessHint: "You are ready here when repeated edits or project commands are the bottleneck, not basic movement.",
    itemIds: [
      "vim-macro-record",
      "vim-macro-play",
      "vim-window-split-horizontal",
      "vim-window-split-vertical",
      "vim-window-move-left",
      "vim-window-move-right",
      "vscodevim-leader-tip",
      "vscodevim-keybindings-tip",
      "vim-mode-visual-block"
    ]
  }
];
