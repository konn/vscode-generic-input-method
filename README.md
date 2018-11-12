# Generic Input Method for VSCode

This extension provides a generic input method within VSCode.
It can be used as a [YaTeX][yatex]-like image completion for LaTeX or Unicode Math input for theorem provers such as Agda or Lean.

[yatex]: http://yatex.org

## Features

- [YaTeX][yatex]-like image-completion for LaTeX
- Unicode Math input for Markdown
- Ability to configure your own custom input methods!

## Configuration

You can define and/or modify input methods in `generic-input-method.input-methods`.
This must be an array of input method.
Each input method is defined as follows:

```javascript
{
  // Unique name for the input method
  "name": "Example Math Input",

  // Languages where the IM is activated.
  "languages": ["markdown", "latex"],

  // Characters to trigger conversion
  "triggers": ["\\"],

  // How to render each items?
  // Available: "string" or "latex".
  // `string` just prints the content of "body" property.
  // `latex` provides more sophisticated completion for LaTeX commands.
  // See `defaults/images.json` for examples.
  "renderMode": "string",

  // Suffix for a text-editor command;
  // you can invoke it as `extension.complete.custom.example-math`.
  "commandName": "custom.example-math",

  // An array of items or a reference to the default dictionary.
  "dictionary": [
    // Default Math dictionary shipped with this extension
    "defaults/math.json",

    // Push `\||-` to input `\Vvdash`.
    // Shows `⊪` as a preview.
    { "label": "|||-", "body": "\\Vvdash", "description": "⊪" }
  ]
}
```

Currently, you can only refer to the default dictionaries shipped with the `generic-input-method` extension.

## External API

This extension provides an API to un/register custom input methods.

### Registering a new Input Method dynamically

```typescript
import { extensions, ExtensionContext } from "vscode";

function async activate(context: ExtensionContext) {
  let ims = extensions.getExtension("mr-konn.generic-input-method");
  if (gim) {
    const api: any = await gim.activate();
    const im: any = {
      name: "My Great IM Dynamically Registered",
      languages: ["redtt"],
      triggers: ["\\"],
      dictionary: ["defaults/math.json", { label: "to", body: "→" }]
    };
    api.registerInputMethod(im);
  }
}
```

See [`redtt-diagnostics`][redtt-diag] for an example usage.

[redtt-diag]: https://github.com/konn/vscode-redtt-diagnostics

### Invoking Input Method Forcedly

You can use `api.invokeInputMethod(editor?, nameOrIM?)` to invoke an input method, regardless of the language of editor.

## TODOs

- Cool screenshot GIFs
- Underlining converted input
- Contextual completion based on scopes
- Split LaTeX-related input methods as an external extension?
