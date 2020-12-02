import * as vscode from 'vscode';
import { YuqueDataProxy } from './models/proxy';
import { YuqueOutlineProvider } from './models/outline';
import { Yuque } from './models/yuque';
import { SourceControl } from './models/sourceControl';


export class YuqueController {
    private _yuqueOutlineProvider: YuqueOutlineProvider;
    private _yuqueModel: Yuque;
    private _yuqueProxy: YuqueDataProxy;
    private _sourceControl: SourceControl;

    private static _instance: YuqueController | undefined;

    public static getInstanceSync(context: vscode.ExtensionContext) {
        if (YuqueController._instance === undefined) {
            YuqueController._instance = new YuqueController(context);
        }
        return YuqueController._instance;
    }

    private constructor(context: vscode.ExtensionContext) {
        this._sourceControl = new SourceControl(context);
        this._yuqueProxy = new YuqueDataProxy();
        this._yuqueOutlineProvider = new YuqueOutlineProvider(context);
        this._yuqueModel = new Yuque(this._yuqueProxy);

        this._yuqueProxy.getTOC().then(
            items => this._yuqueOutlineProvider.loadTOC(items)
        );

        vscode.window.registerTreeDataProvider('yuqueOutline', this._yuqueOutlineProvider);

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.reloadTOC',
                () => this.refreshTOC()
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.cloneTOC', 
                async () => {
                    this._yuqueModel.clone().then(
                        () => this.refreshTOC()
                    );
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateTOC',
                async () => {
                    this.updateTOC().then(
                        () => this.refreshTOC()
                    ).then(
                        () => this._sourceControl.tryUpdateChangedGroup()
                    );
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.fetchDocument',
                () => this.fetchDocument()
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.openDocument',
                () => this.openDocument())
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateDocument',
                () => {
                    this.updateDocument().then(() => this._sourceControl.tryUpdateChangedGroup());
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.createDocument',
                () => this._yuqueModel.createDocument(this._yuqueOutlineProvider.namespace()))
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.deleteDocument',
                async () => {
                    await this.deleteDocument();
                    await this.updateTOC();
                    this.refreshTOC();
                }
            )
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.openInWebsite',
                async () => {
                    try {
                        let node = this._yuqueOutlineProvider.getLastClickedNode();
                        let namespace = this._yuqueOutlineProvider.namespace();
                        await this._yuqueModel.openDocumentInWebsite(namespace, node.slug);
                    } catch (e) {
                        vscode.window.showErrorMessage(e.toString());
                    }
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.openTOCArrange',
                async () => this._yuqueModel.openTOCArrange(this._yuqueOutlineProvider.namespace())
            )
        );
    }

    async refreshTOC() {
        await this._yuqueProxy.getTOC().then(
            items => this._yuqueOutlineProvider.loadTOC(items)
        );
    }

    async fetchDocument() {
        try {
            let node = this._yuqueOutlineProvider.getLastClickedNode();
            let namespace = this._yuqueOutlineProvider.namespace();
            await this._yuqueModel.fetchDocument(namespace, node.id);
            vscode.window.showInformationMessage(`Fetch ${node.label} successfully`);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateDocument() {
        try {
            let node = this._yuqueOutlineProvider.getLastClickedNode();
            let namespace = this._yuqueOutlineProvider.namespace();
            await this._yuqueModel.updateDocument(namespace, node.id);
            vscode.window.showInformationMessage(`Update ${node.label} successfully`);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async openDocument() {
        try {
            let node = this._yuqueOutlineProvider.getLastClickedNode();
            await this._yuqueModel.openDocument(node.id);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async deleteDocument() {
        try {
            let node = this._yuqueOutlineProvider.getLastClickedNode();
            await this._yuqueModel.deleteDocument(this._yuqueOutlineProvider.namespace(), node.id).then(
                () => vscode.window.showInformationMessage(`Delete ${node.label} successfully`)
            );
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateTOC() {
        await this._yuqueModel.updateOrCreateTOC(this._yuqueOutlineProvider.namespace());
    }
}