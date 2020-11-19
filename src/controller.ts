import * as vscode from 'vscode';
import {YuqueDataProxy} from './proxy';
import { YuqueOutlineProvider } from './outline';
import { DocumentNode } from './documentNode';
import { Yuque } from './yuque';
import { SourceControl } from './sourceControl';


export class YuqueController {
    private _lastIDClicked: DocumentNode | undefined;
    private _yuqueOutlineProvider: YuqueOutlineProvider;
    private _yuqueModel: Yuque;
    private _yuqueProxy: YuqueDataProxy;
    private _sourceControl: SourceControl;

    constructor(context: vscode.ExtensionContext) {
        this._yuqueOutlineProvider = new YuqueOutlineProvider(context);
        this._sourceControl = new SourceControl(context);
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
            () => this._yuqueModel.createDocument(this._yuqueOutlineProvider.namespace()));
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
            await this._yuqueModel.fetchDocument(namespace, this._lastIDClicked.id);
            vscode.window.showInformationMessage(`Fetch ${this._lastIDClicked.label} successfully`);
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async updateDocument() {
        if (this._lastIDClicked) {
            await this._yuqueModel.updateDocument(
                this._yuqueOutlineProvider.namespace(), this._lastIDClicked.id);
            vscode.window.showInformationMessage(`Update ${this._lastIDClicked.label} successfully`);
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async openDocument() {
        if (this._lastIDClicked) {
            this._yuqueModel.openDocument(this._lastIDClicked.id);
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async deleteDocument() {
        if (this._lastIDClicked) {
            await this._yuqueModel.deleteDocument(
                this._yuqueOutlineProvider.namespace(), this._lastIDClicked.id);
            vscode.window.showInformationMessage(`Delete ${this._lastIDClicked.label} successfully`);
        } else {
            vscode.window.showWarningMessage('Please left click TreeItem first');
        }
    }

    async updateTOC() {
        await this._yuqueModel.updateOrCreateTOC(this._yuqueOutlineProvider.namespace());
    }
}