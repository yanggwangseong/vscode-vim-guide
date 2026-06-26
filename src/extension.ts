import * as vscode from "vscode";
import { GuideService } from "./services/guideService";
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
      await executeAllowlistedInternalCommand("workbench.view.extension.vimGuide");
      try {
        await executeAllowlistedInternalCommand(`${GuideViewProvider.viewType}.focus`);
      } catch {
        // Older VS Code builds may not expose a focus command for contributed webview views.
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("vimGuide.refresh", () => {
      guideViewProvider.refresh();
    })
  );
}

export function deactivate(): void {
  // VS Code disposes registered subscriptions from the extension context.
}

async function executeAllowlistedInternalCommand(command: string): Promise<void> {
  if (!ALLOWED_INTERNAL_COMMANDS.has(command)) {
    throw new Error(`Internal command is not allowlisted: ${command}`);
  }

  await vscode.commands.executeCommand(command);
}
