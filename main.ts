import { groupCollapsed } from 'console';
import { generateKeySync } from 'crypto';
import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
const Papa = require('papaparse');

let handlebars = require('handlebars');
let hb_helpers = require('@budibase/handlebars-helpers')({handlebars: handlebars});
let hb_utils   = require('handlebars-utils');

// Remember to rename these classes and interfaces!

const SET_JSON_FILE     = "jsonFile";
const SET_TEMPLATE_FILE = "templateFile";
const SET_TOP_FIELD     = "topField";
const SET_JSON_NAME     = "jsonName";
const SET_JSON_NAMEPATH = "jsonNamePath";
const SET_FOLDER_NAME   = "folderName";
const SET_NOTE_PREFIX   = "notePrefix";
const SET_NOTE_SUFFIX   = "noteSuffix";
const SET_OVERWRITE     = "overwrite";
const SET_HELPER_FILE   = "helperFile";
const SET_FORCE_ARRAY   = "forceArray";

interface JsonImportSettings {
	[SET_JSON_FILE]: string;
	[SET_TEMPLATE_FILE]: string;
	[SET_JSON_NAME]: string;
	[SET_JSON_NAMEPATH]: boolean;
	[SET_FOLDER_NAME]: string;
	[SET_TOP_FIELD]: string;
	[SET_NOTE_PREFIX]: string;
	[SET_NOTE_SUFFIX]: string;
	[SET_OVERWRITE]: boolean;
	[SET_HELPER_FILE]: string;
	[SET_FORCE_ARRAY]: boolean;
}

const DEFAULT_SETTINGS: JsonImportSettings = {
	[SET_JSON_FILE]: "rewards.json",
	[SET_TEMPLATE_FILE]: "rewards.md",
	[SET_JSON_NAME]: "name",
	[SET_JSON_NAMEPATH]: false,
	[SET_FOLDER_NAME]: "Rewards",
	[SET_TOP_FIELD]: "",
	[SET_NOTE_PREFIX]: "",
	[SET_NOTE_SUFFIX]: "",
	[SET_OVERWRITE]: true,
	[SET_HELPER_FILE]: "",
	[SET_FORCE_ARRAY]: true
}


function convertCsv(source: string)
{
	// header: true - the first row is headers, and each header defines the name of the field in the returned object array
	let csv = Papa.parse(source, {header: true, skipEmptyLines: true});
	if (csv.errors?.length) {
		console.warn( JSON.stringify(csv.errors, null, 2));
	}
	console.log(JSON.stringify(csv.meta, null, 2));
	return csv.data;
}


function objfield(srcobj:any, field:string)
{
	if (!field) return srcobj;
	for (let part of field.split('.'))
	{
		srcobj = srcobj[part];
		if (srcobj === undefined) break;
	}
	return srcobj;
}


export default class JsonImport extends Plugin {
	settings: JsonImportSettings;
	knownpaths: Set<string>;   // The paths which we know exist
	namepath: boolean;   // if true, the name field can contain a path, otherwise / will be replaced by _

	startApp() {
		const modal = new FileSelectionModal(this.app);
		modal.setHandler(this, this.generateNotes);
		modal.setDefaults(this.settings[SET_JSON_FILE], this.settings[SET_TEMPLATE_FILE], this.settings[SET_TOP_FIELD], this.settings[SET_JSON_NAME], 
			this.settings[SET_NOTE_PREFIX],  this.settings[SET_NOTE_SUFFIX], this.settings[SET_JSON_NAMEPATH],  
			this.settings[SET_OVERWRITE], this.settings[SET_FOLDER_NAME], this.settings[SET_HELPER_FILE],
			this.settings[SET_FORCE_ARRAY] );
		modal.open();
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('magnifying-glass', 'JSON/CSV Importer', (evt: MouseEvent) => this.startApp() );
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

	validFilename(name:string) {
		const regexp = this.namepath ? /[<>:"\\|?\*]/g : /[<>:"/\\|?\*]/g;
		return name.replace(regexp,'_');
	}
	
	hb_table() {
		// HB:  {{ table string val1 result1 val2 result2 val3 result3 ... }}
		if (arguments.length < 4) return "";  // string val1 result1 options
		if (arguments[0] == undefined || arguments[0] == null) return arguments[0];
		let len     = arguments.length-1;
		let options = arguments[len];
		let value   = arguments[0].toString();
		for (let i=1; i<len; i+=2)
		{
			let result = value.match(RegExp(`^${arguments[i]}$`, 'u'));
			if (result)
			{
				value = arguments[i+1];
				// Replace all occurrences of $n with the corresponding match
				if (result.length>1) {
					console.info(JSON.stringify(result.groups, null, 2));
					value = value.replaceAll(/\$(\d+)/g, (match:string, p1:string) => {
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
		let len     = arguments.length-1;
		let options = arguments[len];
		let value = arguments[0];
		if (len === 3) {
			// fourth parameter = options
			let beginPos = arguments[1];
			let length   = arguments[2];
			if (typeof value === "string" && typeof beginPos === "number" && typeof length === "number")
				value = value.slice(beginPos, beginPos+length);
		}
		return hb_utils.value(value, this, options);
	}

	hb_strarray() {
		let len     = arguments.length-1;
		let options = arguments[len];
		let orig = arguments[0];
		if (arguments.length != 2 || typeof orig !== "string") return hb_utils.value(orig, this, options);
		return hb_utils.value([...orig], this, options);
	}

	// {{replacereg orig "regular expression" "replacement"}}
	hb_replacereg() {
		if (arguments.length != 4) return arguments[0];
		let orig:string        = arguments[0];
		let pattern:RegExp     = RegExp(arguments[1], 'g');
		let replacement:string = arguments[2];
		let options:any        = arguments[3];
		let result:string      = pattern[Symbol.replace](orig, replacement);
		return hb_utils.value(result, this, options);
	}

	// {{strsplit string match}}
	// match can be a string or a RegEx
	hb_strsplit() {
		if (arguments.length != 3) return arguments[0];
		let orig:string        = arguments[0];
		let pattern:RegExp     = arguments[1];  // string or RegExp
		let options:any        = arguments[2];
		let result:any         = orig.split(pattern);
		return hb_utils.value(result, this, options);
	}

	// {{setVar varname varvalue}}
	// Sets a local variable for user later in the handlebars template by using @root.varname
	// The {{setVar ...}} expression does not put any string into the output.
	hb_setvar() {
		if (arguments.length != 3) return arguments[0];
		let varName:string  = arguments[0];
		let varValue:string = arguments[1];
		let options:any     = arguments[2];
		options.data.root[varName] = varValue;
		return hb_utils.value("");
	}

	/**
	 * Check if the path for filename exists, if it doesn't then create it
	 * @param filename 
	 */
	async checkPath(filename: string) {
		let pos = filename.lastIndexOf('/');
		if (pos < 0) return true;
		let path = filename.slice(0,pos);
		if (this.knownpaths.has(path)) return true;
		let exists = await this.app.vault.exists(path);
		// createFolder will create intervening paths too
		if (!exists) {
			console.log(`Creating folder for ${path}`);
			await this.app.vault.createFolder(path).catch(err => console.log(`app.vault.checkPath: ${err}`));
		}
		this.knownpaths.add(path);
	}

	async generateNotes(objdata:any, templatefile:File, keyfield:string, jsonnamefield:string, noteprefix:string, notesuffix:string, 
		jsonnamepathfield:boolean, overwrite:boolean, topfolder:string, sourcefile:string, helperfile:File, forcearray:boolean) {
		console.log(`generateNotes('${templatefile}', '${keyfield}', '${jsonnamefield}', '${noteprefix}', '${notesuffix}', path='${jsonnamepathfield}', ovewrite='${overwrite}', '${topfolder}', '${sourcefile}', '${helperfile}', ${forcearray} )`);

		//console.log(`json file = ${jsonfile.path}`);
		//console.log(`json text = '${objdata}'`);
		this.knownpaths = new Set();
		this.namepath = jsonnamepathfield;

		const compileoptions = { noEscape: true };
		let templatetext = await templatefile.text();
		//console.log(`templatetext=\n${templatetext}\n`);
		let template = handlebars.compile(templatetext);
		handlebars.registerHelper('table',     this.hb_table);
		handlebars.registerHelper('substring', this.hb_substring);
		handlebars.registerHelper('strarray',  this.hb_strarray);
		handlebars.registerHelper('replacereg', this.hb_replacereg);
		handlebars.registerHelper('strsplit',   this.hb_strsplit);
		handlebars.registerHelper('setvar',     this.hb_setvar);
		if (helperfile) {
			let initJsonHelpers = new Function('handlebars', await helperfile.text());
			if (initJsonHelpers) initJsonHelpers(handlebars);
		}

		//console.log(`template = '${template}'`);

		// Firstly, convert JSON to an object
		let topobj:any=undefined;
		if (keyfield)
		{
			topobj = objfield(objdata, keyfield);
			if (!topobj) 
			{
				new Notice(`Key '${keyfield}' does not exist in the source file`)
				return;
			}
		}
		else
			topobj = objdata;

		if (!Array.isArray(topobj) && forcearray)
			topobj = [ topobj ];

		// Save current settings
		this.settings[SET_TOP_FIELD]  = keyfield;
		this.settings[SET_JSON_NAME]   = jsonnamefield;
		this.settings[SET_FOLDER_NAME] = topfolder;
		this.settings[SET_NOTE_PREFIX] = noteprefix;
		this.settings[SET_NOTE_SUFFIX] = notesuffix;
		this.settings[SET_JSON_NAMEPATH] = jsonnamepathfield;
		this.settings[SET_OVERWRITE]     = overwrite;
		this.settings[SET_FORCE_ARRAY]   = forcearray;
		this.saveSettings();

		// Ensure that the destination folder exists
		// Vault::exists() does exist, it just isn't defined in obsidian.d.ts
		//if (topfolder.length>0 && !(await this.app.vault.exists(topfolder))) {
		//	await this.app.vault.createFolder(topfolder).catch(err => console.log(`app.vault.createFolder: ${err}`));
		//}
		let entries:any = Array.isArray(topobj) ? topobj.entries() : Object.entries(topobj);

		for (const [index, row] of entries) {
			row.SourceIndex = index;
			
			let notefile = objfield(row, jsonnamefield);
			// Ignore lines with an empty name field
			if (typeof notefile === "number") notefile = notefile.toString();
			if (!notefile || notefile.length == 0) continue;
			// Add prefix and suffix to filename
			notefile = noteprefix + notefile + notesuffix;

			if (sourcefile) row.SourceFilename = sourcefile;   // provide access to the filename from which the data was taken.

			let body:any;
			try {
				body = template(row);   // convert HTML to markdown
			} catch (err) {
				console.error(`${err.message}\nFOR ROW:\n${row}`)
				continue;
			}
			if (body.contains("[object Object]")) {
				console.log(`[object Object] appears in '${notefile}'`);
				new Notice(`Incomplete conversion for '${notefile}'. Look for '[object Object]' (also reported in console)`);
			}

			let filename = topfolder + "/" + this.validFilename(notefile) + ".md";
			await this.checkPath(filename);
			// Delete the old version, if it exists
			let exist = this.app.vault.getAbstractFileByPath(filename);
			if (exist) {
				if (!overwrite) {
					new Notice(`Note already exists for '${filename}' - ignoring entry in data file`);
					continue;
				}
				await this.app.vault.delete(exist).catch(err => console.log(`app.vault.delete: ${err}`));
			}

			await this.app.vault.create(filename, body).catch(err => console.log(`app.vault.create: ${err}`));
		}
	}
}

class FileSelectionModal extends Modal {
	caller: Object;
	handler: Function;
	default_jsonfile: string;
	default_templfile: string;
	default_topfield: string;
	default_jsonname:  string;
	default_note_prefix: string;
	default_note_suffix: string;
	default_jsonnamepath:  boolean;
	default_overwrite: boolean;
	default_foldername: string;
	default_helperfile: string;
	default_forcearray: boolean;

	constructor(app: App) {
		super(app);
	}

	setHandler(caller:Object, handler:Function): void {
		this.caller  = caller;
		this.handler = handler;
	}
	setDefaults(jsonfile:string, templatefile:string, topfield:string, jsonname:string, noteprefix:string, notesuffix:string, 
		jsonnamepath:boolean, overwrite:boolean, foldername:string, helperfile:string, forcearray:boolean) {
		this.default_jsonfile = jsonfile;
		this.default_templfile = templatefile;
		this.default_topfield = topfield;
		this.default_jsonname  = jsonname;
		this.default_note_prefix = noteprefix;
		this.default_note_suffix = notesuffix;
		this.default_jsonnamepath  = jsonnamepath;
		this.default_foldername = foldername;
		this.default_overwrite = overwrite;
		this.default_helperfile = helperfile;
		this.default_forcearray = forcearray;
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
    	const inputJsonText = setting1.controlEl.createEl("textarea", {
			attr: {
			  rows: "5",
			  columns: "20"
			}
	 	});
	  	//input1.value = this.default_jsonfile;
	
	    const setting2 = new Setting(this.contentEl).setName("Choose TEMPLATE File").setDesc("Choose the Template (Handlebars) file");
    	const inputTemplateFile = setting2.controlEl.createEl("input", {
      		attr: {
        		type: "file",
        		accept: ".md",
				required: true
      		}
    	});
		//input2.value = this.default_templfile;

	    const setting2a = new Setting(this.contentEl).setName("Choose HELPERS File").setDesc("Optionally select a file containing some Handlebars Helpers functions");
    	const inputHelperFile = setting2a.controlEl.createEl("input", {
      		attr: {
        		type: "file",
        		accept: ".js"
      		}
    	});
		//input2a.value = this.default_helperfile;
		
	    const setting3b = new Setting(this.contentEl).setName("Field containing the data").setDesc("The field containing the array of data (leave blank to use entire file)");
    	const keyField = setting3b.controlEl.createEl("input", {
      		attr: {
        		type: "string"
      		}
    	});
		keyField.value = this.default_topfield;

	    const setting3c = new Setting(this.contentEl).setName("Each subfield is a separate note").setDesc("Select this option if 'Field containing the data' is a single object and a separate note should be created for each field of that object.");
    	const forceArrayField = setting3c.controlEl.createEl("input", {
      		attr: {
        		type: "checkbox"
      		}
    	});
		forceArrayField.checked = !this.default_forcearray;
	
	    const setting3 = new Setting(this.contentEl).setName("Field to use as Note name").setDesc("Field in each row of the JSON/CSV data to be used for the note name");
    	const inputNameField = setting3.controlEl.createEl("input", {
      		attr: {
        		type: "string",
				required: true
      		}
    	});
		inputNameField.value = this.default_jsonname;
	
	    const settingPrefix = new Setting(this.contentEl).setName("Note name prefix/suffix").setDesc("Optional prefix/suffix to be added either side of the value from the above Note name field");
    	const notePrefixField = settingPrefix.controlEl.createEl("input", {
      		attr: {
        		type: "string",
				placeholder: "prefix",
				size: 10
      		}
    	});
		notePrefixField.value = this.default_note_prefix;

    	const noteSuffixField = settingPrefix.controlEl.createEl("input", {
      		attr: {
        		type: "string",
				placeholder: "suffix",
				size: 10
      		}
    	});
		noteSuffixField.value = this.default_note_suffix;
	
	    const setting3a = new Setting(this.contentEl).setName("Allow paths in Note name").setDesc("Allow / in the Note name field to be used to create folders (when not selected / will be replaced by _ as part of note name)");
    	const inputNamePathField = setting3a.controlEl.createEl("input", {
      		attr: {
        		type: "checkbox"
      		}
    	});
		inputNamePathField.checked = this.default_jsonnamepath;
	
	    const settingOverwrite = new Setting(this.contentEl).setName("Overwrite existing Notes").setDesc("When ticked, existing Notes with a matching name will be overwritten by entries in the supplied JSON/CSV file. (If not ticked, then existing Notes will remain unchanged and entries in the JSON/CSV file with a matching name will be ignored)");
    	const inputOverwriteField = settingOverwrite.controlEl.createEl("input", {
      		attr: {
        		type: "checkbox"
      		}
    	});
		inputOverwriteField.checked = this.default_overwrite;
	
	    const setting4 = new Setting(this.contentEl).setName("Name of Destination Folder in Vault").setDesc("The name of the folder in your Obsidian Vault, which will be created if required");
    	const inputFolderName = setting4.controlEl.createEl("input", {
      		attr: {
        		type: "string"
      		}
    	});
		inputFolderName.value = this.default_foldername;
	
	    const setting5 = new Setting(this.contentEl).setName("Import").setDesc("Press to start the Import Process");
    	const input5 = setting5.controlEl.createEl("button");
		input5.textContent = "IMPORT";

    	input5.onclick = async () => {
			// Check for a valid template file
			const { files:templatefiles } = inputTemplateFile;
			if (!templatefiles.length) {
				new Notice("No Template file selected");
				return;
			}
			const { files:helperfile } = inputHelperFile;

			// See if explicit data or files are being used
			let srctext = inputJsonText.value;
			if (srctext.length == 0) {
				const { files:datafiles } = inputDataFile;
				if (!datafiles.length) {
				  	new Notice("No JSON file selected");
				  	return;
			  	}
				for (let i=0; i<datafiles.length; i++)
				{
					console.log(`Processing input file ${datafiles[i].name}`);
			  		srctext = await datafiles[i].text();
					let is_json:boolean = datafiles[i].name.endsWith(".json");
					let objdata:any = is_json ? JSON.parse(srctext) : convertCsv(srctext);
			  		await this.handler.call(this.caller, objdata, templatefiles[0], keyField.value, inputNameField.value, notePrefixField.value, 
						noteSuffixField.value, inputNamePathField.checked, inputOverwriteField.checked, inputFolderName.value, datafiles[i].name,
						helperfile?.[0], !forceArrayField.checked);
				}
			} else {
				let is_json:boolean = (srctext.startsWith('{') && srctext.endsWith('}'));
				let objdata:any = is_json ? JSON.parse(srctext) : convertCsv(srctext);
			  	await this.handler.call(this.caller, objdata, templatefiles[0], keyField.value, inputNameField.value, notePrefixField.value, 
					noteSuffixField.value, inputNamePathField.checked, inputOverwriteField.checked, inputFolderName.value, null,
					helperfile?.[0]);
			}
			new Notice("Import Finished");
	  		//this.close();
    	}
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}