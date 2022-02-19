# 0.8.0
Improve CSV conversion to use more capabilities of the PapaParse library.
The library tries to auto-detect the separator; any of comma, tab, pipe, semicolon, ASCII record separator (30), ASCII unit separator(31).

# 0.7.2
Fix version information in various configuration files.

# 0.7.1
Ignore any entry in the source data which does not have a value present for the note filename.

# 0.7.0
Add initial support for CSV files, which REQUIRE that the first line of the file is a HEADER line.

# 0.6.0
Add a text box into which the JSON text can be pasted, as an alternative to reading in a file.

# 0.5.1
Remove use of forEach()

# 0.5.0
Add handlebars-helpers as an additional library of options available (see https://github.com/helpers/handlebars-helpers)

Add our own "{{table ...}}" helper to perform string look-up mapping tables efficiently.

# 0.4.1
Get build working automatically on github.

# 0.3.0

Put "IMPORT" label onto the GO button.

Allow top-level of JSON to be an array, or a single variable which is an array.

Ensure 'JSON Name field' and 'Set Folder' are saved/restored within the dialog window.

Add Notice when a generated Note contains "[object Object]"

# 0.2.0

Initial Beta version