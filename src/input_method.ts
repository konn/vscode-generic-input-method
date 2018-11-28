import {
  CompletionItem,
  ExtensionContext,
  SnippetString,
  CompletionItemProvider,
  TextDocument,
  Position,
  CancellationToken,
  CompletionContext,
  CompletionTriggerKind,
  Range,
  TextEdit,
  QuickPickItem,
  TextEditor,
  window,
  workspace,
  ConfigurationChangeEvent
} from "vscode";
import { readFileSync } from "fs";
import { InputMethodException } from "./exception";
import * as path from "path";

const CHAR_SPACE: number = 32;
const CHAR_TILDE: number = 126;
const ASCII_CHARS: string[] = Array(CHAR_TILDE - CHAR_SPACE + 1)
  .fill(0)
  .map((_, offset) => String.fromCharCode(offset + CHAR_SPACE));
export const Expanders: Map<string, Expander> = new Map();

export default class InputMethod implements CompletionItemProvider {
  public name: string = "Dummy";
  public languages: string[] = [];
  public triggers: string[] = [];
  public renderMode: Expander = SimpleExpander;
  public commandName?: string;

  private oldConf: InputMethodConf = {
    name: "",
    languages: [],
    triggers: [],
    dictionary: []
  };
  private completionItems: CompletionItem[] = [];
  public dictionary: InputMethodItem[] = [];
  private showQuickPick?: (
    im: InputMethod,
    editor: TextEditor,
    forced?: boolean
  ) => any;

  constructor(context: ExtensionContext, confSeed: InputMethodConf) {
    let conf: InputMethodConf;

    if (confSeed.configurationName) {
      const confKey = confSeed.configurationName;
      const confer:
        | InputMethodConf
        | undefined = workspace.getConfiguration().get(confKey);
      if (!confer) {
        throw new InputMethodException(
          "Configuration scope error",
          `Configuration scope "${confSeed}" not found`
        );
      } else {
        const fallback = confSeed.onDidChangeConfiguration;
        let updateIt = (v: any) => {
          this.updateConf(context, v);
        };
        if (fallback) {
          updateIt = v => {
            const newConf = Object.assign({}, this.oldConf);
            newConf.dictionary = v;
            this.updateConf(context, newConf);
          };
        }

        const onChange = (evt: ConfigurationChangeEvent) => {
          if (evt.affectsConfiguration(confKey)) {
            const val = workspace.getConfiguration().get(confKey);
            if (val) {
              updateIt(val);
            } else {
              window
                .showErrorMessage(
                  `Configuration ${confSeed} updated, but ill-formed`,
                  "Revert"
                )
                .then(msg => {
                  if (msg) {
                    switch (msg) {
                      case "Revert":
                        workspace
                          .getConfiguration()
                          .update(confKey, this.oldConf);
                    }
                  }
                });
            }
          }
        };

        const updater = workspace.onDidChangeConfiguration(
          onChange,
          this,
          context.subscriptions
        );

        context.subscriptions.push(updater);
      }
    }
    conf = confSeed;

    this.updateConf(context, conf);
  }

  public updateConf<T extends InputMethodConf>(
    context: ExtensionContext,
    conf: T
  ) {
    this.oldConf = conf;
    this.name = conf.name;
    this.languages = conf.languages;
    this.triggers = conf.triggers;
    this.dictionary = [];
    this.showQuickPick = conf.showQuickPick;
    const renderModeSeed = conf.renderMode
      ? conf.renderMode
      : RenderMode.Snippet;
    if (typeof renderModeSeed === "string") {
      if (renderModeSeed === RenderMode.Snippet) {
        this.renderMode = SimpleExpander;
      } else if (renderModeSeed === RenderMode.String) {
        this.renderMode = RawStringExpander;
      } else {
        let exp = Expanders.get(renderModeSeed);
        if (exp) {
          this.renderMode = exp;
        } else {
          throw new InputMethodException(
            "Initialisation Error",
            `No expander \`${renderModeSeed}' found`
          );
        }
      }
    } else {
      this.renderMode = renderModeSeed;
    }

    this.commandName = conf.commandName;

    function parseFile(fp: string) {
      if (!path.isAbsolute(fp)) {
        fp = context.asAbsolutePath(fp);
      }

      return JSON.parse(readFileSync(fp).toString());
    }

    const dictSeed = conf.dictionary;
    let dict: InputMethodItemConfig[] = [];
    if (typeof dictSeed === "string") {
      dict = parseFile(dictSeed);
    } else {
      dictSeed.forEach(i => {
        if (typeof i === "string") {
          dict = dict.concat(parseFile(i));
        } else {
          dict.push(i);
        }
      });
    }

    this.dictionary = dict.map(this.renderMode);

    const commiters = ASCII_CHARS.filter(
      c => !this.dictionary.some(i => i.label.indexOf(c) !== -1)
    );
    this.completionItems = this.dictionary.map(i => ({
      label: i.label,
      insertText: i.toSnippet(),
      filterText: i.label,
      documentation: i.description || i.toSnippet().value,
      commitCharacters: commiters
    }));
  }

  public async provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): Promise<CompletionItem[]> {
    if (
      context.triggerKind === CompletionTriggerKind.TriggerCharacter &&
      this.triggers.some(c => c === context.triggerCharacter)
    ) {
      return this.completionItems.map(item => {
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
      throw Promise.reject();
    }
  }

  /**
   * quickPickItems
   */
  public quickPickItems(): Thenable<RenderableQuickPickItem[]> {
    return new Promise(resolve =>
      resolve(
        this.dictionary.map(i => {
          return {
            description: i.description,
            label: i.label,
            toSnippet: (e?: string) => i.toSnippet(e)
          };
        })
      )
    );
  }

  public async invokeQuickPick(editor: TextEditor, forced: boolean = false) {
    if (this.showQuickPick) {
      this.showQuickPick(this, editor, forced);
    } else {
      if (
        forced ||
        this.languages.some(i => i === editor.document.languageId)
      ) {
        const picks: RenderableQuickPickItem[] = await this.quickPickItems();
        let selection: string | undefined;
        if (!editor.selection.isEmpty) {
          selection = editor.document.getText(editor.selection);
        }
        const item = await window.showQuickPick(picks);
        if (!item) {
          return Promise.reject();
        }
        editor.insertSnippet(item.toSnippet(selection));
      }
    }
  }
}
export class SimpleInputMethodItem implements ToSnippet {
  public label: string;
  public body: string;
  public description?: string;
  constructor(i: InputMethodItemConfig) {
    this.label = i.label;
    this.body = i.body;
    this.description = i.description;
  }

  /**
   * toSnippet
   */
  public toSnippet(_?: string): SnippetString {
    return new SnippetString(this.body);
  }
}

export interface InputMethodItem extends ToSnippet {
  label: string;
  body: string;
  description?: string;
}
export interface ToSnippet {
  toSnippet(selection?: string): SnippetString;
}

export enum RenderMode {
  Snippet = "snippet",
  String = "string"
}

export interface RenderableQuickPickItem extends QuickPickItem, ToSnippet {}

export interface InputMethodConf {
  name: string;
  languages: string[];
  triggers: string[];
  dictionary: (InputMethodItemConfig | string)[] | string;
  renderMode?: RenderMode | string | Expander;
  commandName?: string;
  showQuickPick?: (
    im: InputMethod,
    editor: TextEditor,
    forced?: boolean
  ) => any;

  configurationName?: string;
  onDidChangeConfiguration?: <T>(
    context: ExtensionContext,
    config: T
  ) => Thenable<InputMethodItemConfig[]>;
}

export interface InputMethodItemConfig {
  label: string;
  body: string;
  description?: string;
  [index: string]: any;
}

export type Expander = (conf: InputMethodItemConfig) => InputMethodItem;

export const SimpleExpander: Expander = i => new SimpleInputMethodItem(i);

export const RawStringExpander: Expander = i => {
  i.body = i.body.replace("$", "\\$").replace("}", "\\}");
  return new SimpleInputMethodItem(i);
};
