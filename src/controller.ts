import * as vscode from 'vscode';
import { YuqueDataProxy } from './models/proxy';
import { YuqueOutlineProvider } from './models/outline';
import { Yuque } from './models/yuque';
import { SourceControl } from './models/sourceControl';
import { HeaderCodelens } from './models/codeLens';


export class YuqueController {
    private _yuqueOutlineProvider: YuqueOutlineProvider;
    private _yuqueModel: Yuque;
    private _yuqueProxy: YuqueDataProxy;
    private _sourceControl: SourceControl;
    private _codeLens: HeaderCodelens;

    private static _instance: YuqueController | undefined;

    public static getInstanceSync(context: vscode.ExtensionContext) {
        if (YuqueController._instance === undefined) {
            YuqueController._instance = new YuqueController(context);
        }
        return YuqueController._instance;
    }

    private constructor(context: vscode.ExtensionContext) {
        this._yuqueOutlineProvider = new YuqueOutlineProvider(context);
        this._yuqueProxy = new YuqueDataProxy();
        this._sourceControl = new SourceControl(context, this._yuqueProxy);
        this._yuqueModel = new Yuque(this._yuqueProxy);

        this._yuqueProxy.getTOC().then(
            items => this._yuqueOutlineProvider.loadTOC(items)
        );

        vscode.window.registerTreeDataProvider('yuqueOutline', this._yuqueOutlineProvider);

        this._codeLens = new HeaderCodelens(this._yuqueOutlineProvider);
        vscode.languages.registerCodeLensProvider("*", this._codeLens);

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
                    this._yuqueModel.clone().catch(e => {
                        vscode.window.showErrorMessage(e.toString());
                    }).then(
                        (tocVal) => {
                            this._yuqueProxy.saveTOC(tocVal);
                            return this.refreshTOC();
                        }
                    );
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateTOC',
                async () => {
                    this.updateTOC().catch(
                        e => vscode.window.showErrorMessage(e.toString())
                    ).then(
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
                () => this.openDocument()
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateDocument',
                () => this.updateDocument().then(
                    () => this._sourceControl.tryUpdateChangedGroup()
                )
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.createDocument',
                () => this._yuqueModel.createDocument(this._yuqueOutlineProvider.namespace())
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.deleteDocument',
                async () => {
                    this.deleteDocument().then(
                        () => this.updateTOC()
                    ).then(
                        () => this.refreshTOC()
                    );
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

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.switchActiveFolder',
                async() => this.switchActivateFolder()
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
            let documentBody = await this._yuqueModel.fetchDocument(namespace, node.id);
            this._yuqueProxy.saveDocument(node.id, documentBody);
            this._yuqueProxy.saveVersionDocument(node.id, documentBody);
            vscode.window.showInformationMessage(`Fetch ${node.label} successfully`);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateDocument() {
        try {
            let node = this._yuqueOutlineProvider.getLastClickedNode();
            let namespace = this._yuqueOutlineProvider.namespace();
            let documentBody = this._yuqueProxy.getDocument(node.id);
            let ret = await this._yuqueModel.updateDocument(namespace, node.id, documentBody);
            if ('body' in ret) {
                this._yuqueProxy.saveVersionDocument(node.id, ret.body);
            }
            vscode.window.showInformationMessage(`Update ${node.label} successfully`);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async openDocument() {
        try {
            let node = this._yuqueOutlineProvider.getLastClickedNode();
            let uri = null;
            try {
                uri = this._yuqueProxy.getUri(node.id);
            } catch (e) {
                await this.fetchDocument();
                uri = this._yuqueProxy.getUri(node.id);
            }
            await vscode.workspace.openTextDocument(uri).then(document => vscode.window.showTextDocument(document));
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
            this._yuqueProxy.deleteDocument(node.id);
            this._yuqueProxy.deleteVersionDocument(node.id);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateTOC() {
        let toc = await this._yuqueModel.updateOrCreateTOC(this._yuqueOutlineProvider.namespace());
        this._yuqueProxy.saveTOC(toc);
    }

    async switchActivateFolder() {
        let folder = await vscode.window.showQuickPick(
            vscode.workspace.workspaceFolders.map(folder => {return {label: folder.name, folder: folder};}));
        if (folder) {
            this._yuqueProxy.saveDeactiveForCurrentFolder();
            this._yuqueProxy.activate(folder.folder);
            this._yuqueProxy.saveActivateForCurrentFolder();
            this._sourceControl.activate();
            this._yuqueModel.activate();

            this._yuqueProxy.getTOC().then(
                items => this._yuqueOutlineProvider.loadTOC(items)
            );
        }
    }
}