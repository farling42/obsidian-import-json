# Import JSON/CSV

[![ko-fi](https://img.shields.io/badge/Ko--Fi-farling-success)](https://ko-fi.com/farling)
[![patreon](https://img.shields.io/badge/Patreon-amusingtime-success)](https://patreon.com/amusingtime)
[![paypal](https://img.shields.io/badge/Paypal-farling-success)](https://paypal.me/farling)
![Latest Release Download Count](https://img.shields.io/github/downloads/farling42/obsidian-import-json/latest/main.js)
![GitHub License](https://img.shields.io/github/license/farling42/obsidian-import-json)

## Instructions

This plug-in provides you with the tools to import your favourite JSON and CSV table and create a set of Obsidian notes from that table. One note will be created for each row in a CSV file, or each object in a named array within the JSON file.

A magnifying-glass icon will appear in the left margin when this plug-in is enabled.

Clicking the icon will open a dialog window with four fields:

- "Choose JSON/CSV File" will allow to you pick any .json or .csv file.

- "Choose TEMPLATE File" will allow you to choose any .md file, which should be a [Handlebars template file](https://handlebarsjs.com/guide/).

- "Choose HELPER File" will allow you to specify a separate .js file which contains additional handlebars helper functions (see below).

- "JSON name field" will allow you to specify the JSON field/CSV column within each row of the table which should be used as the name of the note.

- "Field containing the data" is used with a JSON file if a child of the top object should be used as the source of data instead of the very top of the JSON object.

- "Set Folder" allows you to set the top-level folder name within your Vault into which all the notes will be placed.

When the IMPORT button is pressed then the JSON/CSV file will be read and all the notes created.

### Notes

If your Handlebars template file tries to reference something in the JSON data which isn't a simple text field, then the generated note will contain the text \[object Object].

A notice will appear for each such note, but opening Obsidian's dev window (on MS Windows use Ctrl+Shift+i) will also show the list of affected notes.

The CSV decoder should auto-detect the actual separator from any of: comma, tab, pipe, semicolon, ASCII record separator (30), ASCII unit separator (31). (Blank lines in the CSV file will be ignored.)

Ensure that column names in CSV files contain only characters which make valid JSON variable/field names as required by Handlebars (e.g. no spaces or periods).

For CSV decoding, the list of detected delimiter, linebreak, and fields (column names) are displayed in the Obsidian Developer Console.

You can set up an Obsidian Hotkey to open the dialog, if you don't want to use the icon in the left bar.

### New Handlebars variables

- SourceFilename: The name of the file which is supplying the data.
- SourceIndex: If the source data is an array (which is always the case for CSV files) this will be the index into the array, otherwise it will be the name of the field within the 'Field containing the data' object which is being used to create the current note.

### Additional Handlebar Functions

When building handlebars template files, you will have access to all the [handlebars-helpers](https://github.com/Budibase/handlebars-helpers)

### New Handlebar Functions

#### Table Lookup

A new inline helper "{{table" is available. It is used to lookup a value in a static look-up table and replace it with another value.

- The first parameter is the value to be translated into another value.
- value1 is the value to be compared to the lookup value.
- result1 is the result of the {{table}} helper if the lookup value is equal to value1
- value2 result2 = second set of possible matches
- etc, as many pairs of value/result as you need.
(any/all of the lookup value and value/result values can be fields or fixed strings)
- value* can contain a [javascript regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions)
- result* can contain capturing groups (e.g. $1) to copy information from the matching string.

```hb
{{!-- {{table "blue" "red" "angry" "blue" "sad" "yellow" "envious" "green" "happy"}}   --}}
{{!-- will be converted into the string 'sad'  (taking "blue" and looking for the value/result pair that matches) --}}
{{table lookup value1 result1 value2 result2 value3 result3}}
```

#### substring

{{substring string start length}}

This will return a string containing the part of 'string' starting at offset start (0=first letter) and will return 'length' characters from that offset (if the string is shorter than start+length, then the remainder of the string will be returned).

```hb
{{substring "HAROLD" 3 2}}
{{!-- will return the string "OL", since 3 corresponds to the fourth letter in the string, and 2 refers to the number of characters to return starting at that position. --}}
```

#### strarray

{{strarray "HAROLD"}}

Converts the supplied string into an array of characters; primarily for use with #each to iterate over each letter in a string.

#### replacereg

{{replacereg string regexp replace}}

This searches 'string' for any matches with the regular expression 'regexp' string provided (do NOT use toRegExp, just provide the string), and replaces each occurrence with the 'replace' string (the 'replace' string can contain place markers from the regexp string).

#### strsplit

{{strsplit string separator}}

This splits 'string' at all occurrences of 'separator' (which may be a Regex) and returns an array containing all the parts of the string.

If the separator is a regex then you can include () around the regex to include the separator in the array of output strings (note that the separator is a separate element in the array).

#### setvar

{{setvar varName varValue}}

This assigns varValue to a local variable called varName (it will be created if it doesn't already exist). Usually varName will be a string, so it will need to be wrapped in double-quote marks.

The variable can be used later in the handlebars template using the expression {{varName}}

The {{setVar...}} function itself does not put any string into the generated output.

### Adding your own Handlebars Helpers

You can specify an optional "HELPER" file, which should contain some javascript containing your additional handlebars helpers. See <https://handlebarsjs.com/api-reference/helpers.html> for more information.

An example helpers.js is:

```js
function hb_farling() {
    let orig = arguments[0];
    orig += ' from Helper';
    return orig;
}

handlebars.registerHelper('farling', hb_farling);
```

The important component is to call `handlebars.registerHelper` with the name of the helper and the function that is implementing the helper. It is a good practise to prefix the name of the helper functions with `hb_` to ensure that they don't conflict with other function names in the module. (Note that it is YOUR responsibility to ensure that the javascript in the helper functions don't break your Obsidian vault.)

which would allow the following to be specified in your template MD file:

```md
{{farling 'Some Text'}}
```
