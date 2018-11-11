"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
  commands,
  ExtensionContext,
  languages,
  window,
  workspace,
  WorkspaceConfiguration,
  Disposable
} from "vscode";
import InputMethod, {
  InputMethodConf,
  RenderableQuickPickItem
} from "./input_method";
import GenericInputMethodAPI from "./api";

const registered: Map<string, Disposable[]> = new Map();

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext): GenericInputMethodAPI {
  let conf: WorkspaceConfiguration = workspace.getConfiguration();

  let inputMethods: InputMethodConf[] = conf.get(
    "generic-input-methods.input-methods",
    []
  );

  const registerInputMethod = (imConf: InputMethodConf) => {
    const im = new InputMethod(context, imConf);
    registered.set(im.name, []);
    const desps: Disposable[] = registered.get(im.name) || [];
    im.languages.forEach(lang => {
      let compProvider = languages.registerCompletionItemProvider(
        lang,
        im,
        ...im.triggers
      );
      desps.push(compProvider);
      context.subscriptions.push(compProvider);
    });
    let cmd_name = im.commandName;
    if (cmd_name) {
      const picks: RenderableQuickPickItem[] = im.quickPickItems();
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
      desps.push(pickCommand);
      context.subscriptions.push(pickCommand);
    }
  };

  inputMethods.forEach(registerInputMethod);

  const api = {
    registerInputMethod: registerInputMethod,
    unregisterInputMethodByName: (name: string): Thenable<boolean> =>
      new Promise((resolve, _) => {
        const targ = registered.get(name);
        if (targ) {
          registered.delete(name);
          targ.forEach(d => d.dispose());
          resolve(true);
        } else {
          resolve(false);
        }
      })
  };

  return api;
}

// this method is called when your extension is deactivated
export function deactivate() {}
