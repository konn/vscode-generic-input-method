"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  CancellationToken,
  commands,
  CompletionContext,
  CompletionTriggerKind,
  ExtensionContext,
  languages,
  Position,
  Range,
  TextDocument,
  TextEdit,
  window,
  workspace,
  WorkspaceConfiguration
} from "vscode";
import InputMethod, { InputMethodConf } from "./input_method";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
  let conf: WorkspaceConfiguration = workspace.getConfiguration();

  let inputMethods: InputMethodConf[] = conf.get("input-methods", []);
  inputMethods.forEach(imConf => {
    const im = new InputMethod(context, imConf);
    const dict = im.completionItems();
    im.languages.forEach(lang => {
      let compProvider = languages.registerCompletionItemProvider(
        lang,
        {
          provideCompletionItems(
            document: TextDocument,
            position: Position,
            token: CancellationToken,
            context: CompletionContext
          ) {
            if (
              context.triggerKind === CompletionTriggerKind.TriggerCharacter &&
              im.triggers.some(c => c === context.triggerCharacter)
            ) {
              return dict.map(item => {
                let start = position;
                if (position.character > 0) {
                  start = new Position(position.line, position.character - 1);
                }
                let range = new Range(start, position);
                if (document.getText(range) === context.triggerCharacter) {
                  item.additionalTextEdits = [TextEdit.delete(range)];
                }
                return item;
              });
            } else {
              return [];
            }
          }
        },
        ...im.triggers
      );
      context.subscriptions.push(compProvider);
    });
    let cmd_name = im.commandName;
    if (cmd_name) {
      const picks = im.quickPickItems();
      let pickCommand = commands.registerTextEditorCommand(
        `extension.complete.${cmd_name}`,
        (editor, _edit) => {
          if (im.languages.some(i => i === editor.document.languageId)) {
            let selection: string | undefined;
            if (!editor.selection.isEmpty) {
              selection = editor.document.getText(editor.selection);
            }
            window.showQuickPick(picks).then(item => {
              if (!item) {
                return;
              }
              editor.insertSnippet(item.toSnippet(selection));
            });
          }
        }
      );
      context.subscriptions.push(pickCommand);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {}
