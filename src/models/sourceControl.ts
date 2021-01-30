import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { YuqueDataProxy } from './proxy';

function originResource(uri: vscode.Uri): vscode.Uri {
    let filename = path.basename(uri.fsPath);
    let originFsPath = path.join(
        path.dirname(uri.fsPath), '.yuque', filename
    );
    return vscode.Uri.file(originFsPath); 
}

class QuickDiffer {
    provideOriginalResource(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Uri> {
        return originResource(uri);
    }
}

export class SourceControl {
    private fileSystemWatcher: vscode.FileSystemWatcher;
    private sourceControl: vscode.SourceControl;
    private sourceGroup: vscode.SourceControlResourceGroup;
    private timeout: NodeJS.Timer;

    constructor(private context: vscode.ExtensionContext, private proxy: YuqueDataProxy) {
        this.activate();
    }

    activate() {
        if (this.sourceControl) {
            this.sourceControl.dispose();
        }
        if (this.sourceGroup) {
            this.sourceGroup.dispose();
        }
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }

        let workspaceFolder = this.proxy.getWorkspaceFolder();
        this.fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(workspaceFolder, "*.md"));
		this.fileSystemWatcher.onDidChange(uri => this.onResourceChange(uri), this.context.subscriptions);
		this.fileSystemWatcher.onDidCreate(uri => this.onResourceChange(uri), this.context.subscriptions);
        this.fileSystemWatcher.onDidDelete(uri => this.onResourceChange(uri), this.context.subscriptions);
        
        this.sourceControl = vscode.scm.createSourceControl('yuque', 'Yuque Modification', workspaceFolder.uri);
        this.sourceGroup = this.sourceControl.createResourceGroup('modification', 'Changes');
        this.sourceControl.quickDiffProvider = new QuickDiffer();

        this.tryUpdateChangedGroup();
    }

    onResourceChange(uri: vscode.Uri) {
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
        vscode.workspace.findFiles('*.md').then(async uris => {
            // for simplicity we ignore which document was changed in this event and scan all of them
            const changedResources: vscode.SourceControlResourceState[] = [];

            for (let uri of uris) {
                let isDirty: boolean;
                let wasDeleted: boolean;

                const pathExists = fs.existsSync(uri.fsPath);
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

            this.sourceGroup.resourceStates = changedResources;

            // the number of modified resources needs to be assigned to the SourceControl.count filed to let VS Code show the number.
            this.sourceControl.count = this.sourceGroup.resourceStates.length;
        });
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