import { assert } from 'console';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

function originResource(uri: vscode.Uri): vscode.Uri {
    let filename = path.basename(uri.fsPath);
    let originFsPath = path.join(
        path.dirname(uri.fsPath), '.yuque', filename
    )
    return vscode.Uri.file(originFsPath); 
}

class QuickDiffer {
    provideOriginalResource(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Uri> {
        return originResource(uri);
    }
}

export class SourceControl {
    private workspaceFolder: vscode.WorkspaceFolder;
    private sourceControl: vscode.SourceControl;
    private sourceGroup: vscode.SourceControlResourceGroup;
    private timeout: NodeJS.Timer;
    private updatedUris: Map<string, vscode.Uri>;

    constructor(context: vscode.ExtensionContext) {
        let folders = vscode.workspace.workspaceFolders;
        assert(folders.length === 1);
        this.workspaceFolder = folders[0];
        
        const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceFolder, "*.md"));
		fileSystemWatcher.onDidChange(uri => this.onResourceChange(uri), context.subscriptions);
		fileSystemWatcher.onDidCreate(uri => this.onResourceChange(uri), context.subscriptions);
        fileSystemWatcher.onDidDelete(uri => this.onResourceChange(uri), context.subscriptions);
        
        this.sourceControl = vscode.scm.createSourceControl('yuque', 'Yuque Modification', this.workspaceFolder.uri);
        this.sourceGroup = this.sourceControl.createResourceGroup('modification', 'Changes');
        this.sourceControl.quickDiffProvider = new QuickDiffer();

        this.updatedUris = new Map();
    }

    onResourceChange(uri: vscode.Uri) {
        this.updatedUris.set(uri.fsPath, uri);
        if (this.timeout) { clearTimeout(this.timeout); }
		this.timeout = setTimeout(() => this.tryUpdateChangedGroup(), 500);
    }

    async tryUpdateChangedGroup(): Promise<void> {
		try {
			await this.updateChangedGroup();
		}
		catch (ex) {
			vscode.window.showErrorMessage(ex);
		}
    } 
    
    	/** This is where the source control determines, which documents were updated, removed, and theoretically added. */
	async updateChangedGroup(): Promise<void> {
		// for simplicity we ignore which document was changed in this event and scan all of them
		const changedResources: vscode.SourceControlResourceState[] = [];

        for (let e of this.updatedUris.entries()) {
			let isDirty: boolean;
            let wasDeleted: boolean;
            let uri = e[1];

            const pathExists = fs.existsSync(uri.fsPath)
			if (pathExists) {
				const document = await vscode.workspace.openTextDocument(uri);
				isDirty = this.isDirty(uri, document);
				wasDeleted = false;
			}
			else {
				isDirty = true;
				wasDeleted = true;
			}

			if (isDirty) {
				const resourceState = this.toSourceControlResourceState(uri, wasDeleted);
				changedResources.push(resourceState);
			}
        }

        this.updatedUris.clear();

		this.sourceGroup.resourceStates = changedResources;

		// the number of modified resources needs to be assigned to the SourceControl.count filed to let VS Code show the number.
		this.sourceControl.count = this.sourceGroup.resourceStates.length;
    }

	toSourceControlResourceState(docUri: vscode.Uri, deleted: boolean): vscode.SourceControlResourceState {

		const resourceState: vscode.SourceControlResourceState = {
			resourceUri: docUri,
			decorations: {
				strikeThrough: deleted,
				tooltip: 'File was locally deleted.'
			}
		};

		return resourceState;
    }

    isDirty(uri: vscode.Uri, doc: vscode.TextDocument): boolean {
        const originalText = fs.readFileSync(originResource(uri).fsPath).toString();
		return originalText.replace('\r', '') !== doc.getText().replace('\r', '');
    }
}