import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as open from 'open';
import * as open_darwin from 'mac-open';
import { SDKClient } from './util';
import { updateOrCreateTOC, yuqueClone, YuqueDataProxy} from './proxy';
import { YuqueOutlineProvider } from './yuqueOutline';
import { DocumentNode } from './documentNode';
import { Yuque } from './yuque';

// decide what os should be used
// possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
const platform = process.platform;

export class YuqueController {
    private _lastIDClicked: DocumentNode | undefined;
    private _yuqueOutlineProvider: YuqueOutlineProvider;
    private _yuqueModel: Yuque;
    private _yuqueProxy: YuqueDataProxy;

    constructor(context: vscode.ExtensionContext) {
        this._yuqueOutlineProvider = new YuqueOutlineProvider(context);
        this._yuqueProxy = new YuqueDataProxy();
        this._yuqueModel = new Yuque(this._yuqueProxy);

        vscode.window.registerTreeDataProvider('yuqueOutline', this._yuqueOutlineProvider);
        vscode.commands.registerCommand('yuqueCli.reloadTOC', () => this._yuqueOutlineProvider.refresh());
        vscode.commands.registerCommand('yuqueCli.cloneTOC', 
            async () => {
                await this._yuqueModel.clone();
                this._yuqueOutlineProvider.refresh();
            }
        );
        vscode.commands.registerCommand('yuqueCli.updateTOC',
            async () => {
                await this.updateTOC();
                this._yuqueOutlineProvider.refresh();
            }
        );

        vscode.commands.registerCommand('yuqueCli.fetchDocument',
            () => this.fetchDocument());
        vscode.commands.registerCommand('yuqueCli.openDocument',
            () => this.openDocument());
        vscode.commands.registerCommand('yuqueCli.updateDocument',
            () => this.updateDocument());
        vscode.commands.registerCommand('yuqueCli.createDocument',
            () => this.createDocument());
        vscode.commands.registerCommand('yuqueCli.deleteDocument',
            async () => {
                await this.deleteDocument();
                await this.updateTOC();
                this._yuqueOutlineProvider.refresh();
            }
        );
        vscode.commands.registerCommand('yuqueCli.onDocumentClicked',
            (node: DocumentNode) => this.onYuqueDocumentClicked(node));
    }

    onYuqueDocumentClicked(node: DocumentNode): void {
        this._lastIDClicked = node;
    }

    async fetchDocument() {
        if (this._lastIDClicked) {
            let namespace = this._yuqueOutlineProvider.namespace();
            let document: any = await SDKClient.docs.get(
                {namespace: namespace, slug: this._lastIDClicked.id, data: {raw: 1}});
            let documentBody = document.body_draft || document.body;

            let workspacePath = this.getWorkspaceFolder();
            if (workspacePath) {
                let docPath = path.join(workspacePath, this._lastIDClicked.id.toString() + '.md');
                fs.writeFile(docPath, documentBody, {}, function(err) {
                    vscode.window.showErrorMessage(err.message);
                });
            }
            vscode.window.showInformationMessage(`Fetch ${this._lastIDClicked.label} successfully`);
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async createDocument() {
        let title = await vscode.window.showInputBox({prompt: "Put Your Title Here"});
        if (title) {
            let namespace = this._yuqueOutlineProvider.namespace();
            let res = await SDKClient.docs.create({
                namespace: namespace,
                data: {
                    title: title,
                    public: 1,
                    format: "markdown",
                    body: "<Put Your Body Here>"
                }
            });
            if (res) {
                await vscode.window.showInformationMessage('Create Success, Please insert the document into the TOC');
                let url = `https://www.yuque.com/${this._yuqueOutlineProvider.namespace()}/toc`;
                if (platform === 'darwin') {
                    open_darwin(url);
                }
                else {
                    open(url);
                }
            }
        } else {
            vscode.window.showErrorMessage('Title must not be null');
        }
    }

    async updateDocument() {
        if (this._lastIDClicked) {
            let workspacePath = this.getWorkspaceFolder();
            if (workspacePath) {
                let docPath = path.join(workspacePath, this._lastIDClicked.id.toString() + '.md');
                const documentBody = fs.readFileSync(docPath, 'utf-8');
                let ret = await SDKClient.docs.update({
                    namespace: this._yuqueOutlineProvider.namespace(),
                    id: this._lastIDClicked.id,
                    data: {
                        body: documentBody
                    }
                });
                vscode.window.showInformationMessage(`Update ${this._lastIDClicked.label} successfully`);
            } 
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async openDocument() {
        if (this._lastIDClicked) {
            let workspacePath = this.getWorkspaceFolder();
            if (workspacePath) {
                let docPath = path.join(workspacePath, this._lastIDClicked.id.toString() + '.md');
                if (fs.existsSync(docPath)) {
                    let uri = vscode.Uri.file(docPath);
                    vscode.workspace.openTextDocument(uri).then(document => vscode.window.showTextDocument(document));
                } else {
                    vscode.window.showErrorMessage('File not fetched');
                }
            }
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async deleteDocument() {
        if (this._lastIDClicked) {
            await SDKClient.docs.delete({
                namespace: this._yuqueOutlineProvider.namespace(),
                id: this._lastIDClicked.id
            });
            vscode.window.showInformationMessage(`Delete ${this._lastIDClicked.label} successfully`);
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async updateTOC() {
        await updateOrCreateTOC(this._yuqueOutlineProvider.namespace());
    }

    private getWorkspaceFolder(): string | undefined {
        let folders = vscode.workspace.workspaceFolders;
        if (folders.length === 1) {
            return folders[0].uri.fsPath;
        } else {
            vscode.window.showErrorMessage('YuqueCli is not supported for multiworkspaces');
        }

    }
}