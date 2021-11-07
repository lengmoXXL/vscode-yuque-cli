import * as vscode from 'vscode';
import { YuqueDataProxy } from './models/proxy';
import { YuqueOutlineProvider } from './models/outline';
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
            vscode.commands.registerCommand( 'yuqueCli.reloadTOC', () => this.refreshTOC())
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
                (did: Number) => this.fetchDocument(did)
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.openDocument',
                (did: Number) => this.openDocument(did)
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.updateDocument',
                (did: Number) => this.updateDocument(did).then(
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
                async (did: Number) => {
                    this.deleteDocument(did).then(
                        () => this.updateTOC()
                    ).then(
                        () => this.refreshTOC()
                    );
                }
            )
        );
        
        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.openInWebsite',
                async (did: Number) => {
                    try {
                        let namespace = this._yuqueOutlineProvider.namespace();
                        await this._yuqueModel.openDocumentInWebsite(namespace, did);
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

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.insertTOC',
                async (targetDid?: Number) => {
                    let group = [];
                    for (let [did, document] of this._yuqueInboxProvider.getInboxDocuments()) {
                        group.push({
                            label: document.title,
                            document: document,
                        });
                    }
                    let choice = await vscode.window.showQuickPick(group);
                    if (choice) {
                        let toc;
                        if (targetDid) {
                            let target = this._yuqueOutlineProvider.getNodeById(targetDid);
                            toc = await this._yuqueModel.insertTOCAsChildOfTarget(
                                this._yuqueOutlineProvider.namespace(), target, choice.document);
                        } else {
                            toc = await this._yuqueModel.insertTOC(
                                this._yuqueOutlineProvider.namespace(), choice.document);
                        }
                        this._yuqueProxy.saveTOC(toc);
                        this.refreshTOC();
                    }
                }
            )
        );

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'yuqueCli.removeTOC',
                async (did: Number) => {
                    let document = this._yuqueOutlineProvider.getNodeById(did);
                    let toc = await this._yuqueModel.removeTOC(
                        this._yuqueOutlineProvider.namespace(), document);
                    this._yuqueProxy.saveTOC(toc);
                    this.refreshTOC();
                }
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

    async fetchDocument(did: Number) {
        try {
            let document = this._yuqueOutlineProvider.getNodeById(did);
            if (!document) {
                document = this._yuqueInboxProvider.getNodeById(did);
            }
            let namespace = this._yuqueOutlineProvider.namespace();
            let documentBody = await this._yuqueModel.fetchDocument(namespace, did);
            this._yuqueProxy.saveDocument(document, documentBody);
            this._yuqueProxy.saveVersionDocument(document, documentBody);
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateDocument(did: Number) {
        try {
            let document = this._yuqueOutlineProvider.getNodeById(did);
            if (!document) {
                document = this._yuqueInboxProvider.getNodeById(did);
            }
            let namespace = this._yuqueOutlineProvider.namespace();
            let documentBody = this._yuqueProxy.getDocument(document);
            let ret = await this._yuqueModel.updateDocument(namespace, did, documentBody);
            if ('body' in ret) {
                this._yuqueProxy.saveVersionDocument(document, ret.body);
            }
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async updateDocumentByUri(resourceStates: vscode.SourceControlResourceState[]) {
        try {
            for (let state of resourceStates) {
                let uri = state.resourceUri;
                let did = this._yuqueProxy.getDocumentIdByUri(uri);
                let document = this._yuqueOutlineProvider.getNodeById(did);
                if (!document) {
                    document = this._yuqueInboxProvider.getNodeById(did);
                }
                if (!document) {
                    vscode.window.showErrorMessage(`${uri.fsPath} is not found`);
                    return;
                }

                let namespace = this._yuqueOutlineProvider.namespace();
                let documentBody = this._yuqueProxy.getDocument(document);
                let ret = await this._yuqueModel.updateDocument(namespace, did, documentBody);
                if ('body' in ret) {
                    this._yuqueProxy.saveVersionDocument(document, ret.body);
                }
            }
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async openDocument(did: Number) {
        try {
            let document = this._yuqueOutlineProvider.getNodeById(did);
            if (!document) {
                document = this._yuqueInboxProvider.getNodeById(did);
            }
            let uri = null;
            try {
                uri = this._yuqueProxy.getUri(document);
            } catch (e) {
                await this.fetchDocument(did);
                uri = this._yuqueProxy.getUri(document);
            }
            await vscode.workspace.openTextDocument(uri).then(document => vscode.window.showTextDocument(document));
        } catch (e) {
            vscode.window.showErrorMessage(e.toString());
        }
    }

    async deleteDocument(did: Number) {
        try {
            let document = this._yuqueOutlineProvider.getNodeById(did);
            if (!document) {
                document = this._yuqueInboxProvider.getNodeById(did);
            }
            await this._yuqueModel.deleteDocument(this._yuqueOutlineProvider.namespace(), did);
            this._yuqueProxy.deleteDocument(document);
            this._yuqueProxy.deleteVersionDocument(document);
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