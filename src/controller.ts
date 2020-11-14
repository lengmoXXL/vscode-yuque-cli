import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SDKClient } from './util';
import {yuqueClone} from './yuque';
import { YuqueOutlineProvider } from './yuqueOutline';
import { DocumentNode } from './documentNode';
import * as open from 'open';
import * as open_darwin from 'mac-open';

// decide what os should be used
// possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
const platform = process.platform;

export class YuqueController {
    private _lastIDClicked: DocumentNode | undefined;
    private _yuqueOutlineProvider: YuqueOutlineProvider;

    constructor(context: vscode.ExtensionContext) {
        this._yuqueOutlineProvider = new YuqueOutlineProvider(context);
        vscode.window.registerTreeDataProvider('yuqueOutline', this._yuqueOutlineProvider);
        vscode.commands.registerCommand('yuqueCli.reload', () => this._yuqueOutlineProvider.refresh());
        vscode.commands.registerCommand('yuqueCli.clone', 
            async () => {
                await yuqueClone();
                this._yuqueOutlineProvider.refresh();
            }
        );
        vscode.commands.registerCommand('yuqueCli.fetchDocument',
            () => this.fetchDocument());
        vscode.commands.registerCommand('yuqueCli.updateDocument',
            () => this.updateDocument());
        vscode.commands.registerCommand('yuqueCli.createDocument',
            () => this.createDocument());
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
            let folders = vscode.workspace.workspaceFolders;
            if (folders.length === 1) {
                let docPath = path.join(folders[0].uri.fsPath, this._lastIDClicked.id.toString() + '.md');
                fs.writeFile(docPath, documentBody, {}, function(err) {
                    console.log(err);
                });
            }
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
        }
    }

    async updateDocument() {
        if (this._lastIDClicked) {
            let folders = vscode.workspace.workspaceFolders;
            if (folders.length === 1) {
                let docPath = path.join(folders[0].uri.fsPath, this._lastIDClicked.id.toString() + '.md');
                const documentBody = fs.readFileSync(docPath, 'utf-8');
                SDKClient.docs.update({
                    namespace: this._yuqueOutlineProvider.namespace(),
                    id: this._lastIDClicked.id,
                    data: {
                        body: documentBody
                    }
                });
            } 
        }
    }
}