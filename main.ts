import { App, Modal, Notice, Plugin, Setting, TFile } from 'obsidian';
const Papa = require('papaparse');

let handlebars = require('handlebars');
let hb_helpers = require('@budibase/handlebars-helpers')({ handlebars: handlebars });
let hb_utils = require('handlebars-utils');
//let path       = require('path');

// Remember to rename these classes and interfaces!

// NOTE: test data in D:\Documents\RPG\D_and_D\5th Edition\5eTools\data

enum ExistingNotes {
  KEEP_EXISTING,
  REPLACE_EXISTING,
  APPEND_TO_EXISTING
}

interface JsonImportSettings {
  jsonName: string;
  jsonNamePath: boolean;
  jsonUrl: string;
  folderName: string;
  topField: string;
  notePrefix: string;
  noteSuffix: string;
  handleExistingNote: ExistingNotes;
  forceArray: boolean;
  multipleJSON: boolean;
  uniqueNames: boolean;
  batchFile: File | null;
  batchStep: string | null;
}

const DEFAULT_SETTINGS: JsonImportSettings = {
  jsonName: "name",
  jsonNamePath: false,
  jsonUrl: "",
  folderName: "Rewards",
  topField: "",
  notePrefix: "",
  noteSuffix: "",
  handleExistingNote: ExistingNotes.KEEP_EXISTING,
  forceArray: true,
  multipleJSON: false,
  uniqueNames: false,
  batchFile: null,
  batchStep: null
}

// Obsidian.md always uses forward slash as separator in vault paths.
const DIR_SEP = "/"; //path.sep;

function convertCsv(source: string) {
  // header: true - the first row is headers, and each header defines the name of the field in the returned object array
  let csv = Papa.parse(source, { header: true, skipEmptyLines: true });
  if (csv.errors?.length) {
    console.warn(JSON.stringify(csv.errors, null, 2));
  }
  console.log(JSON.stringify(csv.meta, null, 2));
  return csv.data;
}


function objfield(srcobj: any, field: string) {
  if (!field) return srcobj;
  for (const part of field.split('.')) {
    let array = part.match(/(\w+)(?:\[(\w+)\])?/);
    if (array[2]) {

    }
    srcobj = srcobj[part];
    if (srcobj === undefined) break;
  }
  return srcobj;
}


function copyObject(obj: any) {
  return JSON.parse(JSON.stringify(obj))
}

function fileFromUrl(url: string) {
  return new Promise((resolve, reject) => {
    let request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        var type = request.getResponseHeader('Content-Type');
        if (type.indexOf("text") !== 1) {
          resolve(request.responseText);
        }
        else
          reject(request.statusText)
      }
    }
    request.onerror = () => reject(request.statusText);
    request.send(null);
  });
};

export default class JsonImport extends Plugin {
  settings: JsonImportSettings;
  knownpaths: Set<string>;   // The paths which we know exist
  namepath: boolean;   // if true, the name field can contain a path, otherwise / will be replaced by _
  nameMap: Set<String>;

  startApp() {
    const modal = new FileSelectionModal(this.app);
    modal.setHandler(this, this.generateNotes);
    modal.setDefaults(this.settings);
    modal.open();
  }

  async onload() {
    await this.loadSettings();

    // This creates an icon in the left ribbon.
    const ribbonIconEl = this.addRibbonIcon('magnifying-glass', 'JSON/CSV Importer', (evt: MouseEvent) => this.startApp());
    // Perform additional things with the ribbon
    ribbonIconEl.addClass('json-import-ribbon-class');

    // Allow a keyboard shortcut to be specified.
    this.addCommand({
      id: 'import-json',
      name: 'Import JSON/CSV file',
      callback: () => this.startApp()
    });
  }

  onunload() {

  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  validFilename(name: string) {
    const regexp = this.namepath ? /[<>:"\\|?\*]/g : /[<>:"/\\|?\*]/g;
    return name.replace(regexp, '_');
  }

  hb_table() {
    // HB:  {{ table string val1 result1 val2 result2 val3 result3 ... }}
    if (arguments.length < 4) return "";  // string val1 result1 options
    if (arguments[0] == undefined || arguments[0] == null) return arguments[0];
    let len = arguments.length - 1;
    let options = arguments[len];
    let value = arguments[0].toString();
    for (let i = 1; i < len; i += 2) {
      let result = value.match(RegExp(`^${arguments[i]}$`, 'u'));
      if (result) {
        value = arguments[i + 1];
        // Replace all occurrences of $n with the corresponding match
        if (result.length > 1) {
          console.info(JSON.stringify(result.groups, null, 2));
          value = value.replaceAll(/\$(\d+)/g, (match: string, p1: string) => {
            let param = +p1;  // first parameter = 1
            if (param < result.length)
              return result[param];
            else
              return match;	// number is too high!
          })
        }
      }
    }
    return hb_utils.value(value, this, options);
  }

  hb_substring() {
    let len = arguments.length - 1;
    let options = arguments[len];
    let value = arguments[0];
    if (len === 3) {
      // fourth parameter = options
      let beginPos = arguments[1];
      let length = arguments[2];
      if (typeof value === "string" && typeof beginPos === "number" && typeof length === "number")
        value = value.slice(beginPos, beginPos + length);
    }
    return hb_utils.value(value, this, options);
  }

  hb_strarray() {
    let len = arguments.length - 1;
    let options = arguments[len];
    let orig = arguments[0];
    if (arguments.length != 2 || typeof orig !== "string") return hb_utils.value(orig, this, options);
    return hb_utils.value([...orig], this, options);
  }

  // {{replacereg orig "regular expression" "replacement"}}
  hb_replacereg() {
    if (arguments.length != 4) return arguments[0];
    let orig: string = arguments[0];
    let pattern: RegExp = RegExp(arguments[1], 'g');
    let replacement: string = arguments[2];
    let options: any = arguments[3];
    let result: string = pattern[Symbol.replace](orig, replacement);
    return hb_utils.value(result, this, options);
  }

  // {{strsplit string match}}
  // match can be a string or a RegEx
  hb_strsplit() {
    if (arguments.length != 3) return arguments[0];
    let orig: string = arguments[0];
    let pattern: RegExp = arguments[1];  // string or RegExp
    let options: any = arguments[2];
    let result: any = orig.split(pattern);
    return hb_utils.value(result, this, options);
  }

  // {{setVar varname varvalue}}
  // Sets a local variable for user later in the handlebars template by using @root.varname
  // The {{setVar ...}} expression does not put any string into the output.
  hb_setvar() {
    if (arguments.length != 3) return arguments[0];
    let varName: string = arguments[0];
    let varValue: string = arguments[1];
    let options: any = arguments[2];
    options.data.root[varName] = varValue;
    return hb_utils.value("");
  }

  /**
   * Check if the path for filename exists, if it doesn't then create it
   * @param filename 
   */
  async checkPath(filename: string) {
    let pos = filename.lastIndexOf(DIR_SEP);
    if (pos < 0) return true;
    let filepath = filename.slice(0, pos);
    if (this.knownpaths.has(filepath)) return true;
    let exists = this.app.vault.getAbstractFileByPath(filepath);
    // createFolder will create intervening paths too
    if (!exists) {
      console.log(`Creating folder for ${filepath}`);
      await this.app.vault.createFolder(filepath).catch(err => console.log(`app.vault.checkPath: ${err}`));
    }
    this.knownpaths.add(filepath);
  }

  async generateNotes(objdata: any, sourcefile: File, templatefile: File, helperfile: File, settings: JsonImportSettings) {
    console.log(`generateNotes`, { templatefile, helperfile, settings });

    this.knownpaths = new Set();
    this.namepath = settings.jsonNamePath;
    if (settings.uniqueNames) this.nameMap = new Set();

    const compileoptions = {
      noEscape: true,		// Don't put HTML escape sequences into the generated string
    };
    let templatetext = await templatefile.text();
    //console.log(`templatetext=\n${templatetext}\n`);
    let template = handlebars.compile(templatetext, compileoptions);
    handlebars.registerHelper('table', this.hb_table);
    handlebars.registerHelper('substring', this.hb_substring);
    handlebars.registerHelper('strarray', this.hb_strarray);
    handlebars.registerHelper('replacereg', this.hb_replacereg);
    handlebars.registerHelper('strsplit', this.hb_strsplit);
    handlebars.registerHelper('setvar', this.hb_setvar);
    if (helperfile) {
      let initJsonHelpers = new Function('handlebars', await helperfile.text());
      if (initJsonHelpers) initJsonHelpers(handlebars);
    }

    let notefunc: Function;
    let notefunc2: Function;
    if (settings.jsonName.startsWith("@{") && settings.jsonName.endsWith('}'))
      notefunc2 = new Function('dataRoot', settings.jsonName.slice(2, -1))
    else if (settings.jsonName.contains("${"))
      notefunc = new Function('row', `return \`${settings.jsonName.replaceAll("${", "${row.")}\``)

    // Save current settings
    this.settings = settings;
    this.saveSettings();

    // Ensure that the destination folder exists
    // Vault::exists() does exist, it just isn't defined in obsidian.d.ts
    //if (topfolder.length>0 && !(await this.app.vault.exists(topfolder))) {
    //	await this.app.vault.createFolder(topfolder).catch(err => console.log(`app.vault.createFolder: ${err}`));
    //}

    // Firstly, convert JSON to an object

    if (!settings.topField.match(/\w\[\w+]\./)) {
      if (!settings.topField)
        await notesFromArray.call(this, objdata);
      else {
        const topobj: any = objfield(objdata, settings.topField);
        if (topobj)
          await notesFromArray.call(this, topobj);
        else {
          new Notice(`Key '${settings.topField}' does not exist in the source file`)
          return;
        }
      }
    } else {
      // There are some array references in the key.
      const pattern: RegExp = /(\w+)\[(\w+)\]/;
      const start = settings.topField;
      let srcobj = objdata;
      const parts = settings.topField.split('.');

      async function recurseObj(objdata: any, keys: string[], arraynames: any) {
        if (!objdata) {
          // We ran out of data during recursion!
          new Notice(`Key '${settings.topField}' - failed to find field : '${arraynames}'`)
          return;
        }
        if (keys.length === 0) {
          // We've reached the bottom of the recursion
          await notesFromArray.call(this, objdata, arraynames);
          return;
        }
        const match = keys[0].match(pattern);   // fieldname[arrayname]
        if (match) {
          const field = objdata[match[1]];
          if (!Array.isArray(field)) {
            new Notice(`Key '${settings.topField}' - Field '${match[1]}' is not an array: ${arraynames}`)
            return;
          }
          // is an array in the fieldName
          for (const entry of field) {
            await recurseObj.call(this, entry, keys.slice(1), { ...arraynames, [match[2]]: entry });
          }
        }
        else {
          await recurseObj.call(this, objdata[keys[0]], keys.slice(1), arraynames);
        }
      }
      // Base recursion starts with the top object and an array of the individual key parts
      await recurseObj.call(this, objdata, settings.topField.split('.'), {});
    }

    async function notesFromArray(topobj: any, extradata: any = {}) {

      let entries: ArrayIterator<[number, any]> | any[] =
        Array.isArray(topobj) ? topobj.entries() :
          settings.forceArray ? [topobj].entries() :
            Object.entries(topobj);

      let hboptions: any = {
        allowProtoPropertiesByDefault: true, // Allow access to the methods inside @importSourceFile
      };
      hboptions.data = {
        importSourceIndex: 0,
        importSourceFile: sourcefile,
        importDataRoot: objdata,
        importHelperFile: helperfile,
        importSettings: settings,
        importBatchStep: settings.batchStep ?? "",
        ...extradata
      }

      console.debug(`hboptions`, hboptions);

      for (const [index, row] of entries) {
        if (!(row instanceof Object)) {
          console.info(`Ignoring element ${index} which is not an object: ${JSON.stringify(row)}`)
          continue;
        }
        hboptions.data.importSourceIndex = index;
        // Add our own fields to the ROW
        row.SourceIndex = index;
        row.dataRoot = objdata;
        if (sourcefile) row.SourceFilename = sourcefile.name;   // provide access to the filename from which the data was taken.

        let notefile: any = notefunc ? notefunc(row) : notefunc2 ? notefunc2.call(row, objdata) : objfield(row, settings.jsonName);
        // Ignore lines with an empty name field
        if (typeof notefile === "number") notefile = notefile.toString();
        if (!notefile || notefile.length == 0) continue;
        // Add prefix and suffix to filename
        notefile = settings.notePrefix + notefile + settings.noteSuffix;

        let body: any;
        try {
          body = template(row, hboptions);   // convert HTML to markdown
        } catch (err) {
          console.error(`${err.message}\nFOR ROW:\n`, row)
          continue;
        }
        if (body.contains("[object Object]")) {
          console.log(`[object Object] appears in '${notefile}'`);
          new Notice(`Incomplete conversion for '${notefile}'. Look for '[object Object]' (also reported in console)`);
        }

        let filename: string = settings.folderName + DIR_SEP + this.validFilename(notefile);
        // Check for filename uniqueness ONLY during this import (not with other existing Notes in the vault)
        if (settings.uniqueNames) {
          let basename = filename;
          let counter: number = 0;
          while (this.nameMap.has(filename)) {
            filename = basename + (++counter);
          }
          this.nameMap.add(filename);
        }
        filename += ".md";
        filename = filename.replaceAll(/(\/|\\)+/g, DIR_SEP);

        await this.checkPath(filename);
        // Delete the old version, if it exists
        let file = this.app.vault.getAbstractFileByPath(filename);
        if (file === null)
          await this.app.vault.create(filename, body).catch(err => console.log(`app.vault.create("${filename}"): ${err}`));
        else
          switch (settings.handleExistingNote) {
            case ExistingNotes.REPLACE_EXISTING:
              await this.app.vault.modify(file as TFile, body).catch(err => console.log(`app.vault.modify("${file.path}"): ${err}`));
              break;
            case ExistingNotes.APPEND_TO_EXISTING:
              await this.app.vault.append(file as TFile, body).catch(err => console.log(`app.vault.append("${file.path}"): ${err}`));
              break;
            default:
              new Notice(`Note already exists for '${filename}' - ignoring entry in data file`);
              break;
          }
      }
    } // function notesFromArray
  }
}

class FileSelectionModal extends Modal {
  caller: Object;
  handler: Function;
  default_settings: JsonImportSettings;

  constructor(app: App) {
    super(app);
  }

  setHandler(caller: Object, handler: Function): void {
    this.caller = caller;
    this.handler = handler;
  }
  setDefaults(settings: JsonImportSettings) {
    this.default_settings = settings;
  }

  onOpen() {
    const setting1 = new Setting(this.contentEl).setName("Choose JSON/CSV File").setDesc("Choose JSON/CSV data file to import, or paste text into the text box");
    const inputDataFile = setting1.controlEl.createEl("input", {
      attr: {
        type: "file",
        multiple: true,
        accept: ".json,.csv,.tsv"
      }
    });
    const setting1a = new Setting(this.contentEl).setName("Specify URL to JSON data").setDesc("Specify the URL location of the JSON data");
    const inputJsonUrl = setting1a.controlEl.createEl("input", {
      attr: {
        type: "string"
      }
    });
    inputJsonUrl.value = this.default_settings.jsonUrl;
    const inputJsonText = setting1.controlEl.createEl("textarea", {
      attr: {
        rows: "5",
        columns: "20"
      }
    });
    const setting1d = new Setting(this.contentEl).setName("Data contains multiple JSON objects").setDesc("Select this option if the JSON data might contain more than one object (the selected data is split into separate objects by looking for '}\s+{' as the separator");
    const inputMultipleJSON = setting1d.controlEl.createEl("input", {
      attr: {
        type: "checkbox"
      }
    });
    inputMultipleJSON.checked = this.default_settings.multipleJSON;


    const setting2 = new Setting(this.contentEl).setName("Choose TEMPLATE File").setDesc("Choose the Template (Handlebars) file");
    const inputTemplateFile = setting2.controlEl.createEl("input", {
      attr: {
        type: "file",
        accept: ".md",
        required: true
      }
    });

    const setting2a = new Setting(this.contentEl).setName("Choose HELPERS File").setDesc("Optionally select a file containing some Handlebars Helpers functions");
    const inputHelperFile = setting2a.controlEl.createEl("input", {
      attr: {
        type: "file",
        accept: ".js"
      }
    });

    const setting2b = new Setting(this.contentEl).setName("Choose BATCH File").setDesc("Optionally select a file which controls multiple parses of the data");
    const inputBatchFile = setting2b.controlEl.createEl("input", {
      attr: {
        type: "file",
        accept: ".json"
      }
    });

    const setting3b = new Setting(this.contentEl).setName("Field containing the data").setDesc("The field containing the array of data (leave blank to use entire file) [in batch file 'fieldName']");
    const inputTopField = setting3b.controlEl.createEl("input", {
      attr: {
        type: "string"
      }
    });
    inputTopField.value = this.default_settings.topField;

    const setting3c = new Setting(this.contentEl).setName("Each subfield is a separate note").setDesc("Select this option if 'Field containing the data' is a single object and a separate note should be created for each field of that object.");
    const inputForceArray = setting3c.controlEl.createEl("input", {
      attr: {
        type: "checkbox"
      }
    });
    inputForceArray.checked = !this.default_settings.forceArray;

    const setting3 = new Setting(this.contentEl).setName("Field to use as Note name").setDesc("Field in each row of the JSON/CSV data to be used for the note name [in batch file 'noteName']");
    const inputJsonName = setting3.controlEl.createEl("input", {
      attr: {
        type: "string",
        required: true
      }
    });
    inputJsonName.value = this.default_settings.jsonName;
    const settingUniqueNames = new Setting(this.contentEl).setName("Add suffix on duplicate Note Names").setDesc("When checked, if a second or subsequent Note has the same name as a Note created during this import, then the second or subsequent note will have a numeric identifier added to the end of the Note Name to make it unique");
    const inputUniqueNames = settingUniqueNames.controlEl.createEl("input", {
      attr: {
        type: "checkbox"
      }
    });
    inputUniqueNames.checked = this.default_settings.uniqueNames;

    const settingPrefix = new Setting(this.contentEl).setName("Note name prefix/suffix").setDesc("Optional prefix/suffix to be added either side of the value from the above Note name field [in batch file 'namePrefix', 'nameSuffix']");
    const inputNotePrefix = settingPrefix.controlEl.createEl("input", {
      attr: {
        type: "string",
        placeholder: "prefix",
        size: 10
      }
    });
    inputNotePrefix.value = this.default_settings.notePrefix;

    const inputNoteSuffix = settingPrefix.controlEl.createEl("input", {
      attr: {
        type: "string",
        placeholder: "suffix",
        size: 10
      }
    });
    inputNoteSuffix.value = this.default_settings.noteSuffix;

    const setting3a = new Setting(this.contentEl).setName("Allow paths in Note name").setDesc("Allow / in the Note name field to be used to create folders (when not selected / will be replaced by _ as part of note name)");
    const inputJsonNamePath = setting3a.controlEl.createEl("input", {
      attr: {
        type: "checkbox"
      }
    });
    inputJsonNamePath.checked = this.default_settings.jsonNamePath;

    const settingOverwrite = new Setting(this.contentEl).setName("How to handle existing Notes").setDesc("REPLACE: Replace the existing note with the newly generated note; APPEND: Append the new note contents to the end of the existing note; KEEP: Leave the original note untouched and generate a warning");
    const inputHandleExisting = settingOverwrite.controlEl.createEl("select");
    inputHandleExisting.add(new Option('KEEP', ExistingNotes.KEEP_EXISTING.toString()));
    inputHandleExisting.add(new Option('REPLACE', ExistingNotes.REPLACE_EXISTING.toString()));
    inputHandleExisting.add(new Option('APPEND', ExistingNotes.APPEND_TO_EXISTING.toString()));
    inputHandleExisting.selectedIndex = this.default_settings.handleExistingNote;

    const setting4 = new Setting(this.contentEl).setName("Name of Destination Folder in Vault").setDesc("The name of the folder in your Obsidian Vault, which will be created if required [in batch file, 'folderName']");
    const inputFolderName = setting4.controlEl.createEl("input", {
      attr: {
        type: "string"
      }
    });
    inputFolderName.value = this.default_settings.folderName;

    const setting5 = new Setting(this.contentEl).setName("Import").setDesc("Press to start the Import Process");
    const input5 = setting5.controlEl.createEl("button");
    input5.textContent = "IMPORT";

    input5.onclick = async () => {
      // Check for a valid template file
      const { files: templatefiles } = inputTemplateFile;
      if (!templatefiles.length) {
        new Notice("No Template file selected");
        return;
      }
      const { files: helperfile } = inputHelperFile;

      // Get Settings from the dialog
      const settings: JsonImportSettings = {
        jsonName: inputJsonName.value,
        jsonNamePath: inputJsonNamePath.checked,
        jsonUrl: inputJsonUrl.value,
        folderName: inputFolderName.value,
        topField: inputTopField.value,
        notePrefix: inputNotePrefix.value,
        noteSuffix: inputNoteSuffix.value,
        handleExistingNote: parseInt(inputHandleExisting.value),
        forceArray: !inputForceArray.checked,
        multipleJSON: inputMultipleJSON.checked,
        uniqueNames: inputUniqueNames.checked,
        batchFile: inputBatchFile.files?.[0]
      }
      function parsejson(text: string): Array<object> {
        // convert a string to an array of one or more json objects
        return settings.multipleJSON ? text.split(/(?<=})\s*(?={)/).map(obj => JSON.parse(obj)) : [JSON.parse(text)];
      }
      // See if explicit data or files are being used
      // Manage JSON files by allowing more than one JSON object in a single file...
      // - convert the file's contents into an array
      // - process each element in that array as a completely separate object.

      async function callHandler(objdata: any, sourcefile: File | null) {
        if (!settings.batchFile) {
          await this.handler.call(this.caller, objdata, sourcefile, templatefiles[0], helperfile?.[0], settings);
        } else {
          let batch: Array<object> = JSON.parse(await settings.batchFile.text());
          console.log(batch);
          for (let iter of batch) {
            if (iter.fieldName) settings.topField = iter.fieldName;
            if (iter.noteName) settings.jsonName = iter.noteName;
            if (iter.folderName) settings.folderName = iter.folderName;
            if (iter.namePrefix) settings.notePrefix = iter.notePrefix;
            if (iter.nameSuffix) settings.noteSuffix = iter.noteSuffix;
            settings.batchStep = iter.batchStep ?? "";
            console.log(`BATCH processing '${settings.topField}', '${settings.jsonName}', '${settings.folderName}'`)
            await this.handler.call(this.caller, objdata, sourcefile, templatefiles[0], helperfile?.[0], settings);
          }
        }
      }
      let srctext = inputJsonText.value;
      if (srctext.length > 0) {
        const is_json: boolean = (srctext.startsWith('{') && srctext.endsWith('}'));
        const objdataarray: Array<any> = is_json ? parsejson(srctext) : [convertCsv(srctext)];
        for (const objdata of objdataarray)
          await callHandler.call(this, objdata, /*sourcefile*/null);
      } else if (inputJsonUrl.value?.length > 0) {
        const fromurl: any = await fileFromUrl(inputJsonUrl.value).catch(e => { new Notice('Failed to GET data from URL'); return null });
        if (fromurl) {
          const objdataarray: Array<any> = parsejson(fromurl);
          console.debug(`JSON data from '${inputJsonUrl.value}' =`, objdataarray)
          for (const objdata of objdataarray)
            await callHandler.call(this, objdata, /*sourcefile*/null);
        }
      } else {
        const { files: datafiles } = inputDataFile;
        if (!datafiles.length) {
          new Notice("No JSON file selected");
          return;
        }
        for (let i = 0; i < datafiles.length; i++) {
          console.log(`Processing input file ${datafiles[i].name}`);
          srctext = await datafiles[i].text();
          let is_json: boolean = datafiles[i].name.endsWith(".json");
          let objdataarray: Array<any> = is_json ? parsejson(srctext) : [convertCsv(srctext)];
          for (const objdata of objdataarray)
            await callHandler.call(this, objdata, /*sourcefile*/datafiles[i]);
        }
      }
      new Notice("Import Finished");
      //this.close();
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}