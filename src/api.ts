import { InputMethodConf, Expander } from "./input_method";
import { TextEditor } from "vscode";

export default interface GenericInputMethodAPI {
  registerInputMethod: (imConf: InputMethodConf) => void;
  registerExpander: (name: string, expander: Expander) => boolean;
  unregisterInputMethodByName: (name: string) => Thenable<boolean>;
  invokeInputMethod: (
    editor: TextEditor,
    name?: string | InputMethodConf
  ) => void;
}
