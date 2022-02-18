[![ko-fi](https://img.shields.io/badge/Ko--Fi-farling-success)](https://ko-fi.com/farling)
[![patreon](https://img.shields.io/badge/Patreon-amusingtime-success)](https://patreon.com/amusingtime)
[![paypal](https://img.shields.io/badge/Paypal-farling-success)](https://paypal.me/farling)
![Latest Release Download Count](https://img.shields.io/github/downloads/farling42/obsidian-import-json/latest/main.js)
![GitHub License](https://img.shields.io/github/license/farling42/obsidian-import-json)

## Import JSON

This plug-in provides you with the tools to import your favourite JSON tables.

A magnifying-glass icon will appear in the left margin when this plug-in is enabled.

Clicking the icon will open a dialog window with four fields:

- "Choose JSON/CSV File" will allow to you pick any .json or .csv file.

- "Choose TEMPLATE File" will allow you to choose any .md file, which should be a Handlebars template file (see https://handlebarsjs.com/guide/).

- "JSON name field" will allow you to specify the JSON field/CSV column within each row of the table which should be used as the name of the note.

- "Set Folder" allows you to set the top-level folder name within your Vault into which all the notes will be placed.

When the IMPORT button is pressed then the JSON/CSV file will be read and all the notes created.

### Note

If your Handlebars template file tries to reference something in the JSON data which isn't a simple text field, then the generated note will contain the text \[object Object].

A notice will appear for each such note, but opening Obsidian's dev window (on MS Windows use Ctrl+Shift+i) will also show the list of affected notes.

### Additional Handlebar Functions

When building handlebars template files, you will have access to all the handlebars-helpers provided at https://github.com/helpers/handlebars-helpers/

### New Handlebar Functions

#### Table Lookup

A new inline helper "{{table" is available. It is used to lookup a value in a static look-up table and replace it with another value.
- The first parameter is the value to be translated into another value.
- value1 is the value to be compared to the lookup value.
- result1 is the result of the {{table}} helper if the lookup value is equal to value1
- value2 result2 = second set of possible matches
- etc, as many pairs of value/result as you need.
(any/all of the lookup value and value/result values can be fields or fixed strings)

```
{{!-- {{table "blue" "red" "angry" "blue" "sad" "yellow" "envious" "green" "happy"}}   --}}
{{!-- will be converted into the string 'sad'  (taking "blue" and looking for the value/result pair that matches) }}
{{table lookup value1 result1 value2 result2 value3 result3}}
```
