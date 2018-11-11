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
  TextEdit
} from "vscode";
import { readFileSync } from "fs";
import {
  RenderMode,
  InputMethodConf,
  InputMethodItemConfig,
  RenderableQuickPickItem,
  ToSnippet
} from "./generic-input-method";

const CHAR_SPACE: number = 32;
const CHAR_TILDE: number = 126;
const ASCII_CHARS: string[] = Array(CHAR_TILDE - CHAR_SPACE + 1)
  .fill(0)
  .map((_, offset) => String.fromCharCode(offset + CHAR_SPACE));

export default class InputMethod implements CompletionItemProvider {
  public name: string;
  public languages: string[];
  public triggers: string[];
  public renderMode: RenderMode;
  public commandName?: string;

  private completionItems: CompletionItem[];
  private dictionary: InputMethodItem[];

  constructor(context: ExtensionContext, conf: InputMethodConf) {
    this.name = conf.name;
    this.languages = conf.languages;
    this.triggers = conf.triggers;
    this.dictionary = [];
    this.renderMode = conf.renderMode ? conf.renderMode : RenderMode.String;
    this.commandName = conf.commandName;

    function parseFile(path: string) {
      return JSON.parse(readFileSync(context.asAbsolutePath(path)).toString());
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

    switch (this.renderMode) {
      case RenderMode.LaTeXCommand:
        dict.forEach(i => {
          this.dictionary.push(
            new LaTeXInputMethodItem(i as LaTeXInputMethodItemConfig)
          );
        });
        break;

      default:
        dict.forEach(i => {
          this.dictionary.push(new SimpleInputMethodItem(i));
        });
    }

    const commiters = ASCII_CHARS.filter(
      c => !this.dictionary.some(i => i.label.indexOf(c) !== -1)
    );
    this.completionItems = this.dictionary.map(i => ({
      label: i.label,
      insertText: i.toSnippet(),
      filterText: i.label,
      documentation: i.description,
      commitCharacters: commiters
    }));
  }

  public provideCompletionItems(
    document: TextDocument,
    position: Position,
    token: CancellationToken,
    context: CompletionContext
  ): CompletionItem[] {
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
      return [];
    }
  }

  /**
   * quickPickItems
   */
  public quickPickItems(): RenderableQuickPickItem[] {
    return this.dictionary.map(i => {
      return {
        description: i.description,
        label: i.label,
        toSnippet: (e?: string) => i.toSnippet(e)
      };
    });
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

enum CommandType {
  Maketitle = "maketitle",
  Environment = "environment",
  Section = "section",
  Text = "text",
  Large = "large"
}

interface ArgSpec {
  kind: ArgKind;
  candidates?: string[];
}

/**
 * render_argspec
 */
function render_argspec(
  selection: string
): (spec: ArgSpec, i: number) => string {
  return function(value: ArgSpec, index: number): string {
    let rendered = "";
    let cands = value.candidates;
    if (cands) {
      rendered = `\${${index}|${cands.join(",")}|}`;
    } else if (selection.length > 0 && index === 0) {
      rendered = selection;
    } else {
      rendered = `\${${index}}`;
    }
    switch (value.kind) {
      case ArgKind.Fixed:
        rendered = `{${rendered}}`;
      case ArgKind.Optional:
        rendered = `[${rendered}]`;
    }
    return rendered;
  };
}

export enum ArgKind {
  Fixed = "fixed",
  Optional = "optional"
}

export interface LaTeXInputMethodItemConfig {
  label: string;
  body: string;
  filterText: string;
  description: string;
  type?: CommandType;
  args?: ArgSpec[];
}

export class LaTeXInputMethodItem implements InputMethodItem {
  public label: string;
  public body: string;
  public description: string;
  public type?: CommandType;
  public args?: ArgSpec[];
  constructor(item: LaTeXInputMethodItemConfig) {
    this.label = item.label;
    this.body = item.body;
    this.description = item.description;
    this.type = item.type;
    this.args = item.args;
  }

  /**
   * render
   */
  public toSnippet(selection: string = ""): SnippetString {
    let rendered = "";

    let args = (this.args || []).map(render_argspec(selection)).join("");

    switch (this.type) {
      case CommandType.Environment:
        rendered = `\\begin{${this.body}}${args}
  $1
\\end{${this.body}}`;
        break;
      case CommandType.Large:
        rendered = `{\\${this.body} $1}`;
        break;
      case CommandType.Section:
        if (!this.args || this.args.length === 0) {
          if (selection.length === 0) {
            rendered = `\\${this.body}{$1}`;
          } else {
            rendered = `\\${this.body}{${selection}}`;
          }
        } else {
          rendered = `\\${this.body}${args}`;
        }
        break;
      case CommandType.Text:
        rendered = this.body;
        break;

      default:
        rendered = `\\${this.body}`;
    }
    return new SnippetString(rendered);
  }
}
