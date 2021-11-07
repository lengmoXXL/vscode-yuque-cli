import * as vscode from 'vscode';
import { DocumentId, TOCItem } from './define';

export class YuqueInboxProvider implements vscode.TreeDataProvider<Number> {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    private _idOfDocumentsInTOC: Set<Number>;
    private _idOfDocuments: Map<Number, any>;
    private _idOfDocumentsInBox: Map<Number, any>;

	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    constructor() {
        this._idOfDocumentsInTOC = new Set<Number>();
        this._idOfDocumentsInBox = new Map<Number, any>();
        this._idOfDocuments = new Map<Number, any>();
    }

    loadTOC(items: TOCItem[]) {
        this._idOfDocumentsInTOC.clear();
        for (let item of items) {
            if ('id' in item) {
                this._idOfDocumentsInTOC.add(item.id);
            }
        }
        this._diff();
    }

    loadDocuments(items: any) {
        this._idOfDocuments.clear();
        for (let item of items) {
            this._idOfDocuments.set(item.id, item);
        }

        this._diff();
    }

    getInboxDocuments(): Map<Number, any> {
        return this._idOfDocumentsInBox;
    }

    getNodeById(did: Number): DocumentId {
        let document = this._idOfDocumentsInBox.get(did);
        if (document) {
            return {
                title: document.title,
                id: document.id,
                uuid: document.uuid,
                slug: document.slug
            };
        }
        return null;
    }

    _diff() {
        this._idOfDocumentsInBox.clear();
        for (let [did, document] of this._idOfDocuments) {
            if (!this._idOfDocumentsInTOC.has(did)) {
                this._idOfDocumentsInBox.set(did, document);
            }
        }

        this._onDidChangeTreeData.fire(undefined);
    }

    // TreeDataProvider
    getTreeItem(id: Number): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const document = this._idOfDocumentsInBox.get(id);
        return {
            label: document.title,
            contextValue: "yuqueDocument",
        };
    }

    getChildren(id?: Number): vscode.ProviderResult<Number[]> {
        if (!id) {
            let ret = [];
            for (let [id, document] of this._idOfDocumentsInBox) {
                ret.push(id);
            }
            return ret;
        }
        return [];
    }
}