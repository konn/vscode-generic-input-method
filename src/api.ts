import { InputMethodConf } from "./input_method";

export default interface GenericInputMethodAPI {
  registerInputMethod: (imConf: InputMethodConf) => void;
  unregisterInputMethodByName: (name: string) => Thenable<boolean>;
}
