# Change Log

## [0.0.11] - 2018-12-05

- Revives `defaults/greeks.json` dictionary from [CaTeX] extension.
  There is no default input-method using `defaults/greeks.json`, but you can use it to implement custom input methods for other extensions.

## [0.0.10] - 2018-11-28

- Automatic settings update

## [0.0.9] - 2018-11-27

- Workaround for `event-stream` vulnerability

## [0.0.8]

- Moves LaTeX-related functionalities to [CaTeX] extension.
- Custom QuickPick invoker
- Fixes Expander registration logic
- Path reference now respects absolute paths

[CaTeX]: https://marketplace.visualstudio.com/items?itemName=mr-konn.catex

## [0.0.7]

- Uses `body` field if the `description` misses.
- Introduces generic snippet expander mechanism.
- Exposes expander registration API: `registerExpander`.
- Renames `SnippetString` renderer to `Snippet`.
- Custom Exception for InputMethods.

## [0.0.6]

### Added

- Implements `extension.input-methods.invoke` command.
- Adds `invokeInputMethod` function to the API.

### Changed

- README enhancement
- Started to keep a Changelog.
