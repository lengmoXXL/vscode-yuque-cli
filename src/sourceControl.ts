import { assert } from 'console';
import * as vscode from 'vscode';

class QuickDiffer {
    provideOriginalResource(uri: vscode.Uri, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Uri> {
        let splices = uri.fsPath.split('/');
        let filename = splices.pop();
        splices.push('.yuque');
        splices.push(filename);
        return vscode.Uri.file(splices.join('/'));
    }
}

export class SourceControl {
    private workspaceFolder: vscode.WorkspaceFolder;
    private sourceControl: vscode.SourceControl;
    private sourceGroup: vscode.SourceControlResourceGroup;

    constructor(context: vscode.ExtensionContext) {
        let folders = vscode.workspace.workspaceFolders;
        assert(folders.length === 1);
        this.workspaceFolder = folders[0];
        
        // TODO
        // const fileSystemWatcher = vscode.workspace.createFileSystemWatcher(
        //     new vscode.RelativePattern(this.workspaceFolder, "*.md"));
		// fileSystemWatcher.onDidChange(uri => this.onResourceChange(uri), context.subscriptions);
		// fileSystemWatcher.onDidCreate(uri => this.onResourceChange(uri), context.subscriptions);
        // fileSystemWatcher.onDidDelete(uri => this.onResourceChange(uri), context.subscriptions);
        
        this.sourceControl = vscode.scm.createSourceControl('yuque', 'Yuque Modification', this.workspaceFolder.uri);
        this.sourceGroup = this.sourceControl.createResourceGroup('modification', 'Changes');
        this.sourceControl.quickDiffProvider = new QuickDiffer();
    }

    // onResourceChange(uri: vscode.Uri) {
    //     console.log(uri);
    // }
}