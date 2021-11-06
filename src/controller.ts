import * as vscode from 'vscode';
import { YuqueDataProxy } from './models/proxy';
import { DocumentNode, YuqueOutlineProvider } from './models/outline';
import { Yuque } from './models/yuque';
import { SourceControl } from './models/sourceControl';
import { YuqueInboxProvider } from './models/inbox';


export class YuqueController {
    private _yuqueOutlineProvider: YuqueOutlineProvider;
    private _yuqueModel: Yuque;
    private _yuqueProxy: YuqueDataProxy;
    private _sourceControl: SourceControl;
    private _yuqueInboxProvider: YuqueInboxProvider;

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

        this._yuqueInboxProvider = new YuqueInboxProvider();
        this._yuqueModel.subscribeDocumentsChanges(event => this._yuqueInboxProvider.loadDocuments(event));

        this._yuqueProxy.getTOC().then(
            items => {
                this._yuqueOutlineProvider.loadTOC(items);
                this._yuqueInboxProvider.loadTOC(items);
                this._yuqueModel.listAndFireDocuments(this._yuqueOutlineProvider.namespace());
            }
        );

        vscode.window.registerTreeDataProvider('yuqueOutline', this._yuqueOutlineProvider);
        vscode.window.createTreeView('yuqueInbox', {
            treeDataProvider: this._yuqueInboxProvider, 
        });

        context.subscriptions.push(
            vscode.commands.registerCommand( 'yuqueCli.reloadTOC', () => this.refreshTOC()
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
                (node: DocumentNode) => this.fetchDocument(node)
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.openDocument',
                (node: DocumentNode) => this.openDocument(node)
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateDocument',
                (node: DocumentNode) => this.updateDocument(node).then(
                    () => this._sourceControl.tryUpdateChangedGroup()
                )
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateDocumentByStates',
                async (...states: vscode.SourceControlResourceState[]) => this.updateDocumentByUri(states).then(
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
                async (node: DocumentNode) => {
                    this.deleteDocument(node).then(
                        () => this.updateTOC()
                    ).then(
                        () => this.refreshTOC()
                    );
                }
            )
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.openInWebsite',
                async (node: DocumentNode) => {
                    try {
                        let namespace = this._yuqueOutlineProvider.namespace();
                        await this._yuqueModel.openDocumentInWebsite(namespace, node.docid.slug);
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
            items => {
                this._yuqueOutlineProvider.loadTOC(items);
                this._yuqueInboxProvider.loadTOC(items);
            }
        );
    }

    async fetchDocument(node: DocumentNode) {
        try {
            let namespace = this._yuqueOutlineProvider.namespace();
            let documentBody = await this._yuqueModel.fetchDocument(namespace, node.docid);
            this._yuqueProxy.saveDocument(node.docid, documentBody);
            this._yuqueProxy.saveVersionDocument(node.docid, documentBody);
            vscode.window.showInformationMessage(`Fetch ${node.docid.title} successfully`);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateDocument(node: DocumentNode) {
        try {
            let namespace = this._yuqueOutlineProvider.namespace();
            let documentBody = this._yuqueProxy.getDocument(node.docid);
            let ret = await this._yuqueModel.updateDocument(namespace, node.docid, documentBody);
            if ('body' in ret) {
                this._yuqueProxy.saveVersionDocument(node.docid, ret.body);
            }
            vscode.window.showInformationMessage(`Update ${node.docid.title} successfully`);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateDocumentByUri(resourceStates: vscode.SourceControlResourceState[]) {
        try {
            for (let state of resourceStates) {
                let uri = state.resourceUri;
                let node = this._yuqueOutlineProvider.getNodeByUri(uri);
                if (!node) {
                    vscode.window.showErrorMessage(`${uri.fsPath} is not found`);
                    return;
                }

                let namespace = this._yuqueOutlineProvider.namespace();
                let documentBody = this._yuqueProxy.getDocument(node.docid);
                let ret = await this._yuqueModel.updateDocument(namespace, node.docid, documentBody);
                if ('body' in ret) {
                    this._yuqueProxy.saveVersionDocument(node.docid, ret.body);
                }
                vscode.window.showInformationMessage(`Update ${node.docid.title} successfully`);
            }
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async openDocument(node: DocumentNode) {
        try {
            let uri = null;
            try {
                uri = this._yuqueProxy.getUri(node.docid);
            } catch (e) {
                await this.fetchDocument(node);
                uri = this._yuqueProxy.getUri(node.docid);
            }
            await vscode.workspace.openTextDocument(uri).then(document => vscode.window.showTextDocument(document));
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async deleteDocument(node: DocumentNode) {
        try {
            await this._yuqueModel.deleteDocument(this._yuqueOutlineProvider.namespace(), node.docid).then(
                () => vscode.window.showInformationMessage(`Delete ${node.docid.title} successfully`)
            );
            this._yuqueProxy.deleteDocument(node.docid);
            this._yuqueProxy.deleteVersionDocument(node.docid);
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
                items => {
                    this._yuqueOutlineProvider.loadTOC(items);
                    this._yuqueInboxProvider.loadTOC(items);
                }
            );
        }
    }
}