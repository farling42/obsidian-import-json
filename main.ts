import { generateKeySync } from 'crypto';
import { App, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
const Papa = require('papaparse');

let handlebars = require('handlebars');
let hb_helpers = require('handlebars-helpers')({handlebars: handlebars});
let hb_utils   = require('handlebars-utils');

// Remember to rename these classes and interfaces!

const SET_JSON_FILE     = "jsonFile";
const SET_TEMPLATE_FILE = "templateFile";
const SET_JSON_NAME     = "jsonName";
const SET_FOLDER_NAME   = "folderName";

interface JsonImportSettings {
	[SET_JSON_FILE]: string;
	[SET_TEMPLATE_FILE]: string;
	[SET_JSON_NAME]: string;
	[SET_FOLDER_NAME]: string;
}

const DEFAULT_SETTINGS: JsonImportSettings = {
	[SET_JSON_FILE]: "rewards.json",
	[SET_TEMPLATE_FILE]: "rewards.md",
	[SET_JSON_NAME]: "name",
	[SET_FOLDER_NAME]: "Rewards"
}


function convertCsv(source: string)
{
	let from = Papa.parse(source);
	// first row = column titles
	let titles = from.data[0];
	let csv = [];
	// Convert simple 2-D array into an array of objects with column title as field name;
	for (let i=1;i<from.data.length;i++) {
		let line = from.data[i];
		let obj:any = {};
		for (let c=0; c<line.length; c++) {
			if (line[c].length > 0) obj[titles[c]] = line[c];
		}
		csv.push(obj);
	}
	return csv;
}

export default class JsonImport extends Plugin {
	settings: JsonImportSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('magnifying-glass', 'JSON/CSV Importer', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const modal = new FileSelectionModal(this.app);
			modal.setHandler(this, this.generateNotes);
			modal.setDefaults(this.settings[SET_JSON_FILE], this.settings[SET_TEMPLATE_FILE], this.settings[SET_JSON_NAME], this.settings[SET_FOLDER_NAME]);
			modal.open();
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('json-import-ribbon-class');
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
		const regexp = /[<>:"/\\|?\*]/;
		return name.replace(regexp,'_');
	}
	
	hb_table() {
		// HB:  {{ table string val1 result1 val2 result2 val3 result3 ... }}
		if (!arguments[0]) return arguments[0];
		if (arguments.length < 4) return "";  // string val1 result1 options
		let len     = arguments.length-1;
		let options = arguments[len];
		let value   = arguments[0].toString();
		for (let i=1; i<len; i+=2)
		{
			if (value == arguments[i])
			{
				value = arguments[i+1];
				break;
			}
		}
		return hb_utils.value(value, this, options);
	}

	async generateNotes(objdata:any, templatefile:File, jsonnamefield:string, topfolder:string) {
		//console.log(`generateNotes(${jsonfile.path}, ${templatefile.path}, '${jsonnamefield}' , '${topfolder}' )`);

		//console.log(`json file = ${jsonfile.path}`);
		//console.log(`json text = '${objdata}'`);

		const compileoptions = { noEscape: true };
		let templatetext = await templatefile.text();
		//console.log(`templatetext=\n${templatetext}\n`);
		let template = handlebars.compile(templatetext);
		handlebars.registerHelper('table', this.hb_table);
		//console.log(`template = '${template}'`);

		// Firstly, convert JSON to an object
		let topobj:any;
		if (Array.isArray(objdata))
			topobj = objdata;
		else {
			let keys = Object.keys(objdata);
			if (keys.length!=1) {
				new Notice("JSON doesn't have a top-level array");
				return;
			}
			topobj = objdata[keys[0]];
		}

		if (!Array.isArray(topobj)) {
			new Notice("JSON file does not contain an array!");
			return;
		}

		// Save current settings
		this.settings[SET_JSON_NAME]   = jsonnamefield;
		this.settings[SET_FOLDER_NAME] = topfolder;
		this.saveSettings();

		// Ensure that the destination folder exists
		if (topfolder.length>0) {
			await this.app.vault.createFolder(topfolder).catch(err => console.log(`app.vault.createFolder: ${err}`));
		}

		for (let row of topobj.values()) {
			let notefile = row[jsonnamefield];
			// Ignore lines with an empty name field
			if (!notefile || notefile.length == 0) continue;

			let body = template(row);   // convert HTML to markdown
			if (body.contains("[object Object]")) {
				console.log(`[object Object] appears in '${notefile}'`);
				new Notice(`Incomplete conversion for '${notefile}'. Look for '[object Object]' (also reported in console)`);
			}

			let filename = topfolder + "/" + this.validFilename(notefile) + ".md";
			// Delete the old version, if it exists
			let exist = this.app.vault.getAbstractFileByPath(filename);
			if (exist) await this.app.vault.delete(exist).catch(err => console.log(`app.vault.delete: ${err}`));

			await this.app.vault.create(filename, body).catch(err => console.log(`app.vault.create: ${app}`));
		}
	}
}

class FileSelectionModal extends Modal {
	caller: Object;
	handler: Function;
	default_jsonfile: string;
	default_templfile: string;
	default_jsonname:  string;
	default_foldername: string;

	constructor(app: App) {
		super(app);
	}

	setHandler(caller:Object, handler:Function): void {
		this.caller  = caller;
		this.handler = handler;
	}
	setDefaults(jsonfile:string, templatefile:string, jsonname:string, foldername:string) {
		this.default_jsonfile = jsonfile;
		this.default_templfile = templatefile;
		this.default_jsonname  = jsonname;
		this.default_foldername = foldername;
	}

	onOpen() {
		let mode:string;
	    const setting1 = new Setting(this.contentEl).setName("Choose JSON/CSV File").setDesc("Choose JSON/CSV data file to import, or paste text into the text box");
    	const inputJsonFile = setting1.controlEl.createEl("input", {
      		attr: {
        		type: "file",
        		accept: ".json,.csv"
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
        		accept: ".md"
      		}
    	});
		//input2.value = this.default_templfile;
	
	    const setting3 = new Setting(this.contentEl).setName("JSON name field").setDesc("Field in each row of the JSON data to be used for the note name");
    	const inputNameField = setting3.controlEl.createEl("input", {
      		attr: {
        		type: "string"
      		}
    	});
		inputNameField.value = this.default_jsonname;
	
	    const setting4 = new Setting(this.contentEl).setName("Set Folder").setDesc("Name of Obsidian Folder");
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
			let srctext = inputJsonText.value;
			if (srctext.length == 0) {
				const { files:jsonfiles } = inputJsonFile;
				if (!jsonfiles.length) {
				  	new Notice("No JSON file selected");
				  	return;
			  	}
			  	srctext = await jsonfiles[0].text();
				mode = jsonfiles[0].name.endsWith(".csv") ? "CSV" : "JSON";
			} else {
				mode = (srctext.startsWith('{') && srctext.endsWith('}')) ? "JSON" : "CSV";
			}
			let objdata:any = (mode === 'CSV') ? convertCsv(srctext) : JSON.parse(srctext);
			const { files:templatefiles } = inputTemplateFile;
			if (!templatefiles.length) {
				new Notice("No Template file selected");
				return;
			}
		  	await this.handler.call(this.caller, objdata, templatefiles[0], inputNameField.value, inputFolderName.value);
			new Notice("Import Finished");
	  		//this.close();
    	}
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}