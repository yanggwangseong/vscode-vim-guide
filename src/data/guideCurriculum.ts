import { GuideItemStage } from "./guideData";

export const DEFAULT_GUIDE_LESSON_ID = "lesson-survival-loop";

export interface GuideLesson {
  readonly id: string;
  readonly stage: GuideItemStage;
  readonly title: string;
  readonly description: string;
  readonly practicePrompt: string;
  readonly readinessHint: string;
  readonly checklist: readonly string[];
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
    checklist: [
      "Return to Normal mode without thinking.",
      "Move at least five lines and five characters without the mouse.",
      "Add text at the cursor and at the end of a line.",
      "Save and close the editor from the keyboard."
    ],
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
    practicePrompt: "Move through a real source file with w/b/e, jump to 0/^/$, use gg/G, then jump to a line number and quick-open a file.",
    readinessHint: "Move on when you can reach a line edge or a known line number without reaching for the mouse.",
    checklist: [
      "Move by word instead of holding arrow keys.",
      "Reach both ends of a line with 0, ^, and $.",
      "Jump to the top, bottom, and a known line number.",
      "Open a file by name without touching the file explorer."
    ],
    itemIds: [
      "vim-motion-word-forward",
      "vim-motion-word-back",
      "vim-motion-word-end",
      "vim-motion-line-column-start",
      "vim-motion-line-start",
      "vim-motion-line-end",
      "vim-motion-file-start",
      "vim-motion-file-end",
      "vscode-command-goto-line",
      "vscode-command-quick-open"
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
    checklist: [
      "Open a new line above and below the current line.",
      "Duplicate a line without selecting it.",
      "Delete and rewrite a line safely.",
      "Undo and redo until the edit feels reversible."
    ],
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
    checklist: [
      "Search within the file without scrolling.",
      "Move forward and backward through matches.",
      "Search the word under the cursor.",
      "Open workspace search for a symbol or text snippet."
    ],
    itemIds: [
      "vim-search-forward",
      "vim-search-backward",
      "vim-search-next",
      "vim-search-previous",
      "vim-search-word-forward",
      "vscode-command-find-files",
      "vscode-command-replace"
    ],
    nextLessonId: "lesson-operator-grammar"
  },
  {
    id: "lesson-operator-grammar",
    stage: "productive",
    title: "Operator grammar: edit by shape",
    description: "Learn the Vim pattern that unlocks speed: operator plus motion or text object.",
    practicePrompt: "Practice dw, d$, ciw, and yiw in a real line of code, then repeat one edit with .",
    readinessHint: "Move on when d/c/y plus a movement or text object feels like one combined action.",
    checklist: [
      "Delete a word with one command.",
      "Delete from the cursor to the end of the line.",
      "Change a whole word without selecting it.",
      "Repeat one successful edit with the dot command."
    ],
    itemIds: [
      "vim-edit-delete-word",
      "vim-edit-delete-to-line-end",
      "vim-edit-change-inner-word",
      "vim-edit-yank-inner-word",
      "vim-text-object-inner-word",
      "vim-text-object-around-word",
      "vim-edit-repeat-change"
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
    checklist: [
      "Use a register without overwriting the text you still need.",
      "Replace one character without entering Insert mode.",
      "Join two lines without manually deleting whitespace.",
      "Navigate back to the previous edit location."
    ],
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
    checklist: [
      "Record and replay a small repeated edit.",
      "Move between editor splits from the keyboard.",
      "Identify one command worth putting behind leader.",
      "Review a VSCodeVim remap without changing settings automatically."
    ],
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
