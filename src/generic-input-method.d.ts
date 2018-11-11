import { extensions, SnippetString, QuickPickItem } from "vscode";

export default interface GenericInputMethodAPI {
  registerInputMethod(inputMethod: InputMethodConf): void;
  unregisterInputMethodByName(inputMethod: string): Thenable<boolean>;
}

export function activate(): Thenable<GenericInputMethodAPI>;

export interface ToSnippet {
  toSnippet(selection?: string): SnippetString;
}

export enum RenderMode {
  String = "string",
  SnippetString = "snippet",
  LaTeXCommand = "latex"
}

export interface RenderableQuickPickItem extends QuickPickItem, ToSnippet {}

export interface InputMethodConf {
  name: string;
  languages: string[];
  triggers: string[];
  dictionary: (InputMethodItemConfig | string)[] | string;
  renderMode?: RenderMode;
  commandName?: string;
}

export interface InputMethodItemConfig {
  label: string;
  body: string;
  description?: string;
  [index: string]: any;
}
