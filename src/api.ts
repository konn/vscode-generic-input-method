import { InputMethodConf } from "./input_method";
import { TextEditor } from "vscode";

export default interface GenericInputMethodAPI {
  registerInputMethod: (imConf: InputMethodConf) => void;
  unregisterInputMethodByName: (name: string) => Thenable<boolean>;
  invokeInputMethod: (
    editor: TextEditor,
    name?: string | InputMethodConf
  ) => void;
}
