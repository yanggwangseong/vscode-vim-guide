import * as vscode from "vscode";
import { GuideQuickPickItem, GuideService } from "./services/guideService";
import { GuideViewProvider } from "./webview/GuideViewProvider";

const ALLOWED_INTERNAL_COMMANDS = new Set<string>([
  "workbench.view.extension.vimGuide",
  `${GuideViewProvider.viewType}.focus`
]);

export function activate(context: vscode.ExtensionContext): void {
  const guideService = new GuideService(context.globalState);
  const guideViewProvider = new GuideViewProvider(context.extensionUri, guideService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(GuideViewProvider.viewType, guideViewProvider, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vimGuide.open", async () => {
      await openGuideView();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vimGuide.openPanel", () => {
      guideViewProvider.openPanel();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vimGuide.search", async () => {
      await openGuideSearch(guideService);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vimGuide.refresh", async () => {
      if (guideViewProvider.refresh()) {
        return;
      }

      await openGuideView();
      if (!guideViewProvider.refresh()) {
        void vscode.window.showWarningMessage("Open the Vim Guide sidebar before refreshing it.");
      }
    })
  );
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}

async function openGuideView(): Promise<void> {
  await executeAllowlistedInternalCommand("workbench.view.extension.vimGuide");
  try {
    await executeAllowlistedInternalCommand(`${GuideViewProvider.viewType}.focus`);
  } catch {
    // Older VS Code builds may not expose a focus command for contributed webview views.
  }
}

async function executeAllowlistedInternalCommand(command: string): Promise<void> {
  if (!ALLOWED_INTERNAL_COMMANDS.has(command)) {
    throw new Error(`Internal command is not allowlisted: ${command}`);
  }

  await vscode.commands.executeCommand(command);
}

interface GuideSearchPick extends vscode.QuickPickItem {
  readonly guideItem: GuideQuickPickItem;
}

async function openGuideSearch(guideService: GuideService): Promise<void> {
  const language = guideService.getLanguage();
  const picks = guideService.getQuickPickItems(language).map((item): GuideSearchPick => {
    const action = getQuickPickActionText(item.executable, language);
    return {
      label: item.label,
      description: `${action} · ${item.description}`,
      detail: item.detail,
      guideItem: item
    };
  });
  const selected = await vscode.window.showQuickPick(picks, {
    matchOnDescription: true,
    matchOnDetail: true,
    placeHolder: language === "ko" ? "Vim 키, 명령, 설명 검색" : "Search Vim keys, commands, and tips"
  });

  if (selected === undefined) {
    return;
  }

  if (selected.guideItem.executable) {
    try {
      const command = await guideService.executeGuideCommand(selected.guideItem.id);
      void vscode.window.showInformationMessage(language === "ko" ? `실행: ${command}` : `Ran: ${command}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to run this guide item.";
      void vscode.window.showWarningMessage(`Vim Guide: ${message}`);
    }
    return;
  }

  await vscode.env.clipboard.writeText(selected.guideItem.copyText);
  void vscode.window.showInformationMessage(language === "ko" ? `복사: ${selected.guideItem.copyText}` : `Copied: ${selected.guideItem.copyText}`);
}

function getQuickPickActionText(executable: boolean, language: "en" | "ko"): string {
  if (language === "ko") {
    return executable ? "Enter로 VS Code 명령 실행" : "Enter로 키 복사";
  }

  return executable ? "Enter to run VS Code command" : "Enter to copy keys";
}
