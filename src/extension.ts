'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { workspace, commands, window, SnippetString, ExtensionContext, WorkspaceConfiguration, QuickPickItem } from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "latex-shape-completion" is now active!');
    let conf: WorkspaceConfiguration = workspace.getConfiguration();

    function register(cmd_name: string, dictionary: string) {
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
                    editor.insertSnippet(render(item));
                }
            });
        });
        context.subscriptions.push(disposable);
    }

    register("greek-complete", "greek-dictionary");
    register("image-complete", "image-dictionary");
    register("font-complete", "font-dictionary");
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

interface ShapeCompletionItem extends QuickPickItem {
    label: string;
    body: string;
    description: string;
    type?: CommandType;
    args?: ArgSpec[];
}


function render(value: ShapeCompletionItem): SnippetString {
    let rendered = "";
    let editor = window.activeTextEditor;
    if (!editor) {
        return new SnippetString("");
    }
    let selection = editor.document.getText(editor.selection);
    let args = (value.args || []).map(render_argspec(selection)).join("");

    switch (value.type) {
        case CommandType.Environment:
            rendered = `\\begin{${value.body}}${args}
  $1
\\end{${value.body}}`;
            break;
        case CommandType.Large:
            rendered = `{\\${value.body} $1}`;
            break;
        case CommandType.Section:
            if (!value.args || value.args.length === 0) {
                if (selection.length === 0) {
                    rendered = `\\${value.body}{$1}`;
                } else {
                    rendered = `\\${value.body}{${selection}}`;
                }
            } else {
                rendered = `\\${value.body}${args}`;
            }
            break;
        case CommandType.Text:
            rendered = value.body;
            break;

        default:
            rendered = `\\${value.body}`;
    }
    return new SnippetString(rendered);
}