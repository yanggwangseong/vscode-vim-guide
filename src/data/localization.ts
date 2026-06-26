import { GuideItem, GuideItemStage, GuideItemType } from "./guideData";

export const guideLanguages = ["en", "ko"] as const;

export type GuideLanguage = (typeof guideLanguages)[number];

export interface GuideLanguageOption {
  readonly id: GuideLanguage;
  readonly label: string;
}

export interface GuideItemLocalizedText {
  readonly title: string;
  readonly description: string;
  readonly tags?: readonly string[];
}

export const guideLanguageOptions: readonly GuideLanguageOption[] = [
  { id: "en", label: "English" },
  { id: "ko", label: "한국어" }
];

export const koreanGuideItemText: Readonly<Record<string, GuideItemLocalizedText>> = {
  "vim-motion-word-forward": {
    title: "다음 단어로 이동",
    description: "커서를 다음 단어의 시작 위치로 옮깁니다. d나 c 같은 operator와 조합하면 단어 단위 편집이 빨라집니다."
  },
  "vim-motion-word-back": {
    title: "이전 단어로 이동",
    description: "커서를 이전 단어의 시작 위치로 뒤로 옮깁니다."
  },
  "vim-motion-word-end": {
    title: "단어 끝으로 이동",
    description: "현재 단어 또는 다음 단어의 끝 위치로 이동합니다."
  },
  "vim-motion-line-start": {
    title: "줄의 첫 글자로 이동",
    description: "현재 줄에서 공백을 제외한 첫 문자 위치로 점프합니다."
  },
  "vim-motion-line-end": {
    title: "줄 끝으로 이동",
    description: "현재 줄의 마지막 위치로 이동합니다."
  },
  "vim-motion-file-start": {
    title: "파일 처음으로 이동",
    description: "현재 파일의 첫 번째 줄로 점프합니다."
  },
  "vim-motion-file-end": {
    title: "파일 끝으로 이동",
    description: "현재 파일의 마지막 줄로 점프합니다."
  },
  "vim-motion-page-down": {
    title: "반 페이지 아래로 스크롤",
    description: "문맥을 유지하면서 화면을 대략 반 페이지 아래로 이동합니다."
  },
  "vim-motion-page-up": {
    title: "반 페이지 위로 스크롤",
    description: "문맥을 유지하면서 화면을 대략 반 페이지 위로 이동합니다."
  },
  "vim-motion-match-pair": {
    title: "짝이 맞는 괄호로 이동",
    description: "괄호, 중괄호, 대괄호처럼 서로 짝이 있는 문자 사이를 오갑니다."
  },
  "vim-edit-delete-line": {
    title: "현재 줄 삭제",
    description: "현재 줄을 삭제하고 unnamed register에 저장합니다. 바로 붙여넣거나 다른 줄 편집에 이어 쓸 수 있습니다."
  },
  "vim-edit-change-line": {
    title: "현재 줄 바꾸기",
    description: "현재 줄을 삭제한 뒤 Insert mode로 들어갑니다. 줄 전체를 다시 작성할 때 씁니다."
  },
  "vim-edit-yank-line": {
    title: "현재 줄 복사",
    description: "현재 줄을 unnamed register에 복사합니다. Vim에서는 복사를 yank라고 부릅니다."
  },
  "vim-edit-paste-after": {
    title: "커서 뒤에 붙여넣기",
    description: "활성 register의 내용을 커서 뒤 또는 현재 줄 아래에 붙여넣습니다."
  },
  "vim-edit-paste-before": {
    title: "커서 앞에 붙여넣기",
    description: "활성 register의 내용을 커서 앞 또는 현재 줄 위에 붙여넣습니다."
  },
  "vim-edit-replace-char": {
    title: "문자 하나 교체",
    description: "커서 아래 문자 하나를 입력한 문자로 바로 바꿉니다."
  },
  "vim-edit-undo": {
    title: "되돌리기",
    description: "현재 버퍼에서 마지막 변경을 되돌립니다."
  },
  "vim-edit-redo": {
    title: "다시 실행",
    description: "되돌렸던 변경을 다시 적용합니다."
  },
  "vim-edit-join-lines": {
    title: "줄 합치기",
    description: "현재 줄과 아래 줄을 한 줄로 합칩니다."
  },
  "vim-edit-repeat-change": {
    title: "마지막 변경 반복",
    description: "방금 수행한 변경을 현재 위치에도 반복합니다. 같은 편집을 여러 곳에 적용할 때 유용합니다."
  },
  "vim-mode-insert-before": {
    title: "커서 앞에서 입력 시작",
    description: "커서 앞 위치에서 Insert mode로 들어갑니다."
  },
  "vim-mode-insert-after": {
    title: "커서 뒤에서 입력 시작",
    description: "커서 뒤 위치에서 Insert mode로 들어갑니다."
  },
  "vim-mode-open-below": {
    title: "아래 줄 열고 입력",
    description: "현재 줄 아래에 새 줄을 만들고 바로 Insert mode로 들어갑니다."
  },
  "vim-mode-open-above": {
    title: "위 줄 열고 입력",
    description: "현재 줄 위에 새 줄을 만들고 바로 Insert mode로 들어갑니다."
  },
  "vim-mode-visual-char": {
    title: "문자 단위 선택 모드",
    description: "문자 단위로 범위를 선택하는 Visual mode를 시작합니다."
  },
  "vim-mode-visual-line": {
    title: "줄 단위 선택 모드",
    description: "줄 전체를 단위로 선택하는 Visual mode를 시작합니다."
  },
  "vim-mode-visual-block": {
    title: "블록 선택 모드",
    description: "VSCodeVim이 지원하는 경우 사각형 블록 단위 선택을 시작합니다."
  },
  "vim-search-forward": {
    title: "앞으로 검색",
    description: "현재 파일에서 패턴을 아래 방향으로 검색합니다."
  },
  "vim-search-backward": {
    title: "뒤로 검색",
    description: "현재 파일에서 패턴을 위 방향으로 검색합니다."
  },
  "vim-search-next": {
    title: "다음 검색 결과",
    description: "현재 검색 방향에서 다음 검색 결과로 이동합니다."
  },
  "vim-search-previous": {
    title: "이전 검색 결과",
    description: "현재 검색 방향에서 이전 검색 결과로 이동합니다."
  },
  "vim-search-word-forward": {
    title: "커서 아래 단어 검색",
    description: "커서가 놓인 단어를 아래 방향으로 검색합니다."
  },
  "vim-register-system": {
    title: "시스템 클립보드 register 사용",
    description: "설정되어 있다면 plus register를 사용해 시스템 클립보드로 복사하거나 붙여넣습니다."
  },
  "vim-register-named": {
    title: "이름 있는 register 사용",
    description: "텍스트를 특정 register에 저장해 두었다가 나중에 다시 붙여넣습니다."
  },
  "vim-register-black-hole": {
    title: "복사 내용 덮어쓰지 않고 삭제",
    description: "black-hole register를 사용하면 최근 yank 내용을 보존한 채 삭제할 수 있습니다."
  },
  "vim-macro-record": {
    title: "매크로 기록",
    description: "입력한 명령들을 register에 기록합니다. 다시 q를 누르면 기록을 멈춥니다."
  },
  "vim-macro-play": {
    title: "매크로 실행",
    description: "register에 기록해 둔 명령들을 다시 실행합니다."
  },
  "vim-text-object-inner-word": {
    title: "단어 내부 text object",
    description: "공백은 제외하고 현재 단어 자체에만 선택이나 operator를 적용합니다."
  },
  "vim-text-object-around-word": {
    title: "단어 주변 text object",
    description: "현재 단어와 주변 공백까지 포함해서 선택하거나 operator를 적용합니다."
  },
  "vim-text-object-inner-parens": {
    title: "괄호 내부",
    description: "괄호 기호는 제외하고 괄호 안쪽 내용에만 operator를 적용합니다."
  },
  "vim-text-object-around-quotes": {
    title: "따옴표 포함 범위",
    description: "따옴표 문자까지 포함해 quoted text 전체에 operator를 적용합니다."
  },
  "vim-window-split-horizontal": {
    title: "가로 분할",
    description: "Vim 스타일 워크플로에서 가로 split을 엽니다. VS Code에서는 editor group 명령을 매핑해 쓰는 편이 자연스럽습니다."
  },
  "vim-window-split-vertical": {
    title: "세로 분할",
    description: "Vim 스타일 워크플로에서 세로 split을 엽니다. VS Code에서는 editor group이 비슷한 역할을 합니다."
  },
  "vim-window-move-left": {
    title: "왼쪽 분할로 이동",
    description: "Vim 스타일 창 이동에서 왼쪽 split으로 포커스를 옮깁니다."
  },
  "vim-window-move-right": {
    title: "오른쪽 분할로 이동",
    description: "Vim 스타일 창 이동에서 오른쪽 split으로 포커스를 옮깁니다."
  },
  "vscodevim-leader-tip": {
    title: "Leader 키로 자주 쓰는 습관 만들기",
    description: "`vim.leader`와 사용자 keybinding을 사용해 자주 쓰는 VS Code 동작을 Vim 스타일 prefix 뒤에 배치합니다."
  },
  "vscodevim-clipboard-tip": {
    title: "시스템 클립보드 설정",
    description: "켜져 있으면 yank와 put이 기본적으로 시스템 클립보드를 사용합니다."
  },
  "vscodevim-keybindings-tip": {
    title: "모드별 remap",
    description: "VSCodeVim은 normal, visual, insert 모드별로 다른 키 매핑을 지원합니다."
  },
  "vscode-command-quick-open": {
    title: "파일 빠르게 열기",
    description: "VS Code Quick Open을 열어 파일 이름으로 빠르게 이동합니다."
  },
  "vscode-command-command-palette": {
    title: "명령 팔레트",
    description: "VS Code에서 사용 가능한 명령을 검색하고 실행하는 Command Palette를 엽니다."
  },
  "vscode-command-goto-line": {
    title: "줄 번호로 이동",
    description: "현재 에디터에서 원하는 줄 번호로 바로 이동합니다."
  },
  "vscode-command-recent-editor": {
    title: "최근 에디터로 전환",
    description: "현재 그룹에서 직전에 사용한 에디터로 전환합니다."
  },
  "vscode-command-toggle-sidebar": {
    title: "사이드바 표시 전환",
    description: "VS Code 기본 사이드바를 보이거나 숨깁니다."
  },
  "vscode-command-find-files": {
    title: "전체 파일에서 검색",
    description: "워크스페이스 전체 검색을 엽니다."
  },
  "vscode-command-replace": {
    title: "에디터에서 찾기/바꾸기",
    description: "현재 에디터의 찾기 및 바꾸기 컨트롤을 엽니다."
  },
  "vscode-command-toggle-terminal": {
    title: "터미널 표시 전환",
    description: "통합 터미널을 보이거나 숨깁니다."
  },
  "vscode-command-toggle-panel": {
    title: "패널 표시 전환",
    description: "하단 패널을 보이거나 숨깁니다."
  },
  "vscode-command-navigate-back": {
    title: "이전 위치로 돌아가기",
    description: "이전에 보던 에디터 위치로 포커스를 되돌립니다."
  },
  "vscode-command-close-editor": {
    title: "현재 에디터 닫기",
    description: "현재 활성 에디터 탭을 닫습니다."
  },
  "vscode-command-next-editor": {
    title: "다음 에디터",
    description: "다음 에디터 탭으로 포커스를 옮깁니다."
  }
};

const koreanCategoryLabels: Readonly<Record<string, string>> = {
  All: "전체",
  Modes: "모드 전환",
  Motions: "이동",
  Editing: "편집",
  Selection: "선택",
  Search: "검색",
  "Text Objects": "텍스트 객체",
  Registers: "레지스터",
  Windows: "창/분할",
  Macros: "매크로",
  VSCodeVim: "VSCodeVim",
  "VS Code Commands": "VS Code 명령"
};

export function isGuideLanguage(value: unknown): value is GuideLanguage {
  return guideLanguages.some((language) => language === value);
}

export function getGuideItemText(item: GuideItem, language: GuideLanguage): GuideItemLocalizedText {
  if (language === "ko") {
    return koreanGuideItemText[item.id] ?? { title: item.title, description: item.description };
  }

  return {
    title: item.title,
    description: item.description,
    tags: item.tags
  };
}

export function getCategoryLabel(category: string, language: GuideLanguage): string {
  if (language === "ko") {
    return koreanCategoryLabels[category] ?? category;
  }

  return category;
}

export function getStageLabel(stage: GuideItemStage, language: GuideLanguage): string {
  if (language === "ko") {
    switch (stage) {
      case "beginner":
        return "입문";
      case "productive":
        return "실무 생산성";
      case "advanced":
        return "고급";
    }
  }

  switch (stage) {
    case "beginner":
      return "Beginner";
    case "productive":
      return "Productive";
    case "advanced":
      return "Advanced";
  }
}

export function getActionLabel(type: GuideItemType, executable: boolean, language: GuideLanguage): string {
  if (language === "ko") {
    if (executable) {
      return "실행 가능한 VS Code 명령";
    }

    if (type === "tip") {
      return "팁";
    }

    return "에디터에서 직접 입력";
  }

  if (executable) {
    return "Runnable VS Code action";
  }

  if (type === "tip") {
    return "Tip";
  }

  return "Type in editor";
}
