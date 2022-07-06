# ChangeLog

## 0.19.0

Fix version numbering between issues!

## 0.18.0

Add the 'strsplit' function so that a single string can be split into an array based on a single string or a regular expression.

## 0.17.0

Add a new field "Field containing the data" which can be used to specify the specific part of the JSON file from which to read the data (normally an array). If left blank, then the top of
the JSON file will be used if it is an array, otherwise the first array child of the top record in the JSON file will be used.

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

Add new handlers helper function:  strarray string       (converts a string into an array, e.g. for use with #each)

## 0.9.0

Add new Handlebars helper function:   substring string start length   (returns the part of 'string' starting at 'start' (first character = 0) with a length of 'length')

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
