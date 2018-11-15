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
  Disposable,
  TextEditor
} from "vscode";
import InputMethod, {
  InputMethodConf,
  Expander,
  Expanders
} from "./input_method";
import GenericInputMethodAPI from "./api";

const registered: Map<string, [InputMethod, Disposable[]]> = new Map();

function isInputMethodConf(
  im: InputMethodConf | InputMethod
): im is InputMethodConf {
  const casted = <InputMethod>im;
  return (
    casted.provideCompletionItems === undefined ||
    casted.invokeQuickPick === undefined
  );
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext): GenericInputMethodAPI {
  let conf: WorkspaceConfiguration = workspace.getConfiguration();

  let inputMethods: InputMethodConf[] = conf.get(
    "generic-input-methods.input-methods",
    []
  );

  const registerInputMethod = (imConf: InputMethodConf) => {
    const im: InputMethod = isInputMethodConf(imConf)
      ? new InputMethod(context, imConf)
      : imConf;

    registered.set(im.name, [im, []]);
    const desps: Disposable[] = (registered.get(im.name) || [undefined, []])[1];
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
      let pickCommand = commands.registerTextEditorCommand(
        `extension.complete.${cmd_name}`,
        editor => im.invokeQuickPick(editor)
      );
      desps.push(pickCommand);
      context.subscriptions.push(pickCommand);
    }
  };

  inputMethods.forEach(registerInputMethod);

  const registerExpander = (name: string, expand: Expander): boolean => {
    if (Expanders.has(name)) {
      return false;
    } else {
      Expanders.set(name, expand);
      return true;
    }
  };

  const invokeInputMethod = async (
    editor: TextEditor,
    name?: string | InputMethodConf
  ) => {
    let im: InputMethod | undefined;
    if (!name) {
      const items: { label: string; im: InputMethod }[] = [];
      registered.forEach(([i, _], label) => {
        items.push({ label, im: i });
      });
      let item = await window.showQuickPick(items);
      if (item && item.im) {
        im = item.im;
      }
    } else if (typeof name === "string") {
      const targ = registered.get(name);
      if (targ) {
        im = targ[0];
      }
    } else if (name) {
      im = new InputMethod(context, name);
    }

    if (im) {
      im.invokeQuickPick(editor, true);
    }
  };

  let invoker = commands.registerTextEditorCommand(
    "extension.input-methods.invoke",
    (editor, _edit, ...args) => invokeInputMethod(editor, ...args)
  );
  context.subscriptions.push(invoker);

  const api: GenericInputMethodAPI = {
    unregisterInputMethodByName: (name: string): Thenable<boolean> =>
      new Promise((resolve, _) => {
        const targ = registered.get(name);
        if (targ) {
          registered.delete(name);
          targ[1].forEach(d => d.dispose());
          resolve(true);
        } else {
          resolve(false);
        }
      }),
    registerInputMethod,
    invokeInputMethod,
    registerExpander
  };

  return api;
}

// this method is called when your extension is deactivated
export function deactivate() {}
