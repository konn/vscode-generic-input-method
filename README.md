# Generic Input Method for VSCode

This extension provides a generic input method within VSCode.
It can be used as a [YaTeX][yatex]-like image completion for LaTeX or Unicode Math input for theorem provers such as Agda or Lean.

[yatex]: http://yatex.org

## Features

- [YaTeX][yatex]-like image-completion for LaTeX
- Unicode Math input for Markdown
- Ability to configure your own custom input methods!

## External API

This extension provides an API to un/register custom input methods.
See [`redtt-diagnostics`][redtt-diag] for an example usage;

[redtt-diag]: https://github.com/konn/vscode-redtt-diagnostics

## TODOs

- Cool screenshot GIFs
- Underlining converted input
- Contextual completion based on scopes
- Split LaTeX-related input methods as an external extension?
