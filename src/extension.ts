'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {
    languages, workspace, window, SnippetString,
    CompletionItem, ExtensionContext,
    WorkspaceConfiguration, QuickPickItem,
    TextDocument, Position, Range, TextEdit,
    CancellationToken, CompletionContext, CompletionTriggerKind, commands
} from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "latex-shape-completion" is now active!');
    let conf: WorkspaceConfiguration = workspace.getConfiguration();

    function register_completer(cmd_name: string, dictionary: string, ...keys: string[]) {
        const dict: ShapeCompletionItemIF[] = conf.get(dictionary) || [];
        let disposable = languages.registerCompletionItemProvider("latex", {
            provideCompletionItems(
                document: TextDocument,
                position: Position,
                token: CancellationToken,
                context: CompletionContext
            ) {
                if (context.triggerKind === CompletionTriggerKind.TriggerCharacter &&
                    keys.some(c => c === context.triggerCharacter)) {
                    return dict.map(i => {
                        let item = new ShapeCompletionItem(i);
                        let start = position;
                        if (position.character > 0) {
                            start = new Position(position.line, position.character - 1);
                        }
                        let range = new Range(start, position);
                        item.additionalTextEdits = [TextEdit.delete(range)];
                        return item;
                    });
                } else {
                    return [];
                }
            }
        }, ...keys);
        context.subscriptions.push(disposable);
    }

    register_completer("greek-complete", "greek-dictionary", ":");
    register_completer("image-complete", "image-dictionary", ";");
    register_completer("font-complete", "font-dictionary", "@");

    function register_command(cmd_name: string, dictionary: string) {
        let dict: ShapeCompletionItem[] = conf.get(dictionary) || [];
        let disposable = commands.registerCommand(`extension.${cmd_name}`, () => {
            // The code you place here will be executed every time your command is executed
            let editor = window.activeTextEditor;

            // Display a message box to the user
            window.showQuickPick(dict).then(item => {
                if (!item) {
                    return;
                } else {
                    if (!editor) {
                        return;
                    }
                    console.log(`Selected: ${JSON.stringify(item)}`);
                    editor.insertSnippet((new ShapeCompletionItem(item).render()));
                }
            });
        });
        context.subscriptions.push(disposable);
    }

    register_command("greek-complete", "greek-dictionary");
    register_command("image-complete", "image-dictionary");
    register_command("font-complete", "font-dictionary");
}

// this method is called when your extension is deactivated
export function deactivate() {
}

enum CommandType {
    Maketitle = "maketitle",
    Environment = "environment",
    Section = "section",
    Text = "text",
    Large = "large"
}

interface ArgSpec {
    kind: ArgKind; candidates?: string[];
}

/**
 * render_argspec
 */
function render_argspec(selection: string): (spec: ArgSpec, i: number) => string {
    return function (value: ArgSpec, index: number): string {
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

enum ArgKind { Fixed = "fixed", Optional = "optional" }

interface ShapeCompletionItemIF {
    label: string;
    body: string;
    filterText: string;
    description: string;
    type?: CommandType;
    args?: ArgSpec[];
}

class ShapeCompletionItem implements QuickPickItem, CompletionItem {
    public insertText: SnippetString;
    public documentation: string;
    public label: string;
    public body: string;
    public filterText: string;
    public description: string;
    public type?: CommandType;
    public args?: ArgSpec[];
    public additionalTextEdits?: TextEdit[];
    public commitCharacters?: string[];
    constructor(
        item: ShapeCompletionItemIF
    ) {
        this.label = item.label;
        this.body = item.body;
        this.filterText = item.filterText;
        this.description = item.description;
        this.type = item.type;
        this.args = item.args;
        this.insertText = this.render();
        this.documentation = this.description;
        this.commitCharacters = [" "];
    }

    /**
     * render
     */
    public render() {
        let rendered = "";
        let editor = window.activeTextEditor;
        let selection = "";
        if (editor) {
            selection = editor.document.getText(editor.selection);
        }
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

