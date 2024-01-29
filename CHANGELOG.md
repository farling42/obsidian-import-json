# ChangeLog

## 0.35.0

- Allow the notename to be constructed from more than one field. The "Field Name" can contain either a single field name, or a more complex format with field names surrounded by "${...}", for example "${country}-${name}" (without the double-quotes).

## 0.34.0

- Change target JS version to 2021 (instead of ES6).
- Handle multiple slashes properly in the file's path.
- Include vault path+filename when note creation fails.

## 0.33.0

- Ignore any elements of the selected object/array which are not valid JS objects (an INFO line is added to Obsidian's log to report the ignore.)
- Provide new variables for handlebars templates:
-- @importSourceIndex (index/fieldname of the current row/field)
-- @importSourceFile (File: the source file containing the CSV/JSON data [.name and .path are available])
-- @importDataRoot (the root of the data from the source file)
-- @importHelperFile (File: the file containing the JS handlebars helpers [.name and .path are available])
-- @importSettings (Values from the Dialog window)
--- @importSettings.jsonName: (string) "Field to use as Note name"
---	@importSettings.jsonNamePath: (boolean) "Allow paths in Note name"
---	@importSettings.jsonUrl: (string) "Specify URL to JSON data"
---	@importSettings.folderName: (string) "Name of Destination Folder in Vault"
---	@importSettings.topField: (string) "Field containing the data"
---	@importSettings.notePrefix: (string) "Note name prefix"
---	@importSettings.noteSuffix: (string) "Note name suffix"
---	@importSettings.handleExistingNote: (integer) "How to handle existing Notes"
---	@importSettings.forceArray: (boolean) "Each subfield is a separate note"
---	@importSettings.multipleJSON: (boolean) "Data contains multiple JSON objects"

BREAKING CHANGE: `@dataRoot` has been replaced by `@importDataRoot`

FUTURE BREAKING CHANGE: `SourceIndex` will be removed, since it can be accessed via `@importSourceIndex`

## 0.32.0

- Provide a new field in the object passed to the handlebars helper called `dataRoot`. This will allow you to access the root of the JSON file which was imported (whereas normally you can only access the fields of the element currently being converted into a Note).

## 0.31.2

- Ensure that the handlebars processing is done with `{noEscape: true}` so that no characters are substituted by a HTML entity `&#number;`.

## 0.31.1

- When processing JSON, only look for multiple JSON records if the "Multiple JSON" checkbox is selected.

## 0.31.0

- Add support for JSON files which contain more than one json object. Each object will be handled separately against the configured import parameters.

## 0.30.0

- Add the ability to specify a URL from which to read JSON data. A GET operation to the URL must return the actual JSON data.

## 0.29.2

- When handling of existing notes is set to REPLACE, then simply use vault.modify rather than deleting the old note and creating a new note.

## 0.29.1

- Use the correct option names in the hint information about the new 'How to handle existing Notes' option.

## 0.29.0

- Improve the handling of existing notes so that you can APPEND to an existing note instead of only REPLACE it.
- This version also includes a rework of how settings are managed.

## 0.28.0

Let the user specify a hotkey to open the import dialog.

## 0.27.0

Provide an additional setting 'Each subfield is a separate note' which can be selected for JSON data files. When used with a JSON file where the 'Field containing the data' is an Object rather than an Array, then selecting this new option will create a separate note for each field of that object. (If not selected, then the object will be parsed once to create a single note.)

If required, the name of the field can be referenced using the handlebars name of 'SourceField'.

This will help users who have JSON files which contain objects for what should probably be simple arrays.

## 0.26.1

Fix an issue where only the first '/' was replaced when 'Allow paths in Note name' was not selected. This fix also means that all invalid characters in the generated file name will be correctly replaced by '_' (rather than only the first occurrence).

## 0.26.0

Allow users to specify a specific note which will contain some additional handlebars helpers. See additional section in the README file.

## 0.25.0

When processing a JSON file, if "Field containing the data" is left blank, then it will only check the very top of the JSON object tree to see if it is an array or not. (It will no longer search for the first child field which is an array.)

## 0.24.0

The {{table ...}} helper function now explicitly checks for the first parameter being undefined or null in order to determine if the table search should be attempted (this will allow boolean false or numberic 0 to be valid strings for table lookups).

## 0.22.0

The handlebars helper function `{{ setVar *varName* *varValue* }}` has been added to allow creation of local variables. Note that usually varName is a string, so the variable name will need to be wrapped in double-quote marks. The created variable can be later referenced using `{{varName}}` or `{{@root.varName}}`

## 0.21.0

Add an option to NOT overwrite existing Notes (the entries in the JSON/CSV file for those notes will be ignored).

## 0.20.0

Provide additional configuration which allows a prefix and/or suffix to be used in the filename either side of value read from the Note name field.

## 0.19.0

Fix version numbering between issues!

## 0.18.0

Add the 'strsplit' function so that a single string can be split into an array based on a single string or a regular expression.

## 0.17.0

Add a new field "Field containing the data" which can be used to specify the specific part of the JSON file from which to read the data (normally an array). If left blank, then the top of the JSON file will be used if it is an array, otherwise the first array child of the top record in the JSON file will be used.

If the field is not an array then the entire JSON data object tree (below "Field containing the data") will be passed for processing, so a single JSON record can be read without needing to modify the JSON file to contain an array.

Both the "Field containing the data" and the "Field to use as Note name" can now contain a path to a field (field names separated by '.') instead of only allowing a direct field to be used.

## 0.16.0

Add a new variable which is automatically added to the field names available for your handlebars template file:

- "SourceFilename" contains the name of the data file from which the data is being read.

Ensure that the state of the "Allow paths in Note name" tick box is saved, so that it retains the same state when the window is reopened.

## 0.15.0

Add an additional flag 'Allow paths in Note name'. When ticked, this option will allow "/" within the name field to be used as part of the file path, allowing for a hierarchy of folders to be created from a single json file.

If not ticked, then the existing behaviour will be used where all "/" within the name field will be replaced as "_".

## 0.14.0

Add 'replacereg' helper routine to support replacing regular expressions in strings.

## 0.13.0

Support use of numbers as the name of each note (previously only strings were allowed).

Allow multiple source files to be selected for conversion.

## 0.12.0

Switch to Budibase's fork of handlebars-helpers, since that builds properly.

## 0.11.0

Add .tsv as an additional file type for matching (tab separated value files).

Clarify some field names in the launch dialogue.

## 0.10.0

The "table" function now supports pattern matching as per the Javascript [Regular Expression syntax](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions).

For example, the following contains two tables, first looking at the first part of the string to determine Lawful/Neutral/Chaotic, and a second table to look at the second half of the string for Good/Neutral/Evil.

```hb
{{table alignment "U" "Unaligned" "A" "Any" "N" "True Neutral" "L,." "Lawful" "N,." "Neutral" "C,." "Chaotic"}}{{table alignment "[A|N|U]" "" ".,G" " Good" ".,N" " Neutral" ".,E" " Evil"}}
```

It also supports numbered groups, so a search pattern of "M(\d+)" will allow you to specify "Medium $1" as the replacement string - where $1 will be replaced by the "\d+" part of the search pattern. (The parenthese identify the pattern that will be usable as $1, the second pair of parentheses will be usable as $2, etc.)

## 0.9.1

Add new handlers helper function:  `{{ strarray string }}`       (converts a string into an array, e.g. for use with #each)

## 0.9.0

Add new Handlebars helper function:   `{{ substring string start length }}`   (returns the part of 'string' starting at 'start' (first character = 0) with a length of 'length')

## 0.8.0

Improve CSV conversion to use more capabilities of the PapaParse library.

The library tries to auto-detect the separator; any of comma, tab, pipe, semicolon, ASCII record separator (30), ASCII unit separator(31).

## 0.7.2

Fix version information in various configuration files.

## 0.7.1

Ignore any entry in the source data which does not have a value present for the note filename.

## 0.7.0

Add initial support for CSV files, which REQUIRE that the first line of the file is a HEADER line.

## 0.6.0

Add a text box into which the JSON text can be pasted, as an alternative to reading in a file.

## 0.5.1

Remove use of forEach()

## 0.5.0

Add [handlebars-helpers](https://github.com/helpers/handlebars-helpers) as an additional library of options available.

Add our own "{{table ...}}" helper to perform string look-up mapping tables efficiently.

## 0.4.1

Get build working automatically on github.

## 0.3.0

Put "IMPORT" label onto the GO button.

Allow top-level of JSON to be an array, or a single variable which is an array.

Ensure 'JSON Name field' and 'Set Folder' are saved/restored within the dialog window.

Add Notice when a generated Note contains "[object Object]"

## 0.2.0

Initial Beta version
