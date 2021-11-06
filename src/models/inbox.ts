import * as vscode from 'vscode';
import { TOCItem } from './define';

export class YuqueInboxProvider implements vscode.TreeDataProvider<Number> {
    private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    private _idOfDocumentsInTOC: Set<Number>;
    private _idOfDocumentsNotInTOC: Map<Number, any>;

	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    constructor() {
        this._idOfDocumentsInTOC = new Set<Number>();
        this._idOfDocumentsNotInTOC = new Map<Number, any>();
    }

    loadTOC(items: TOCItem[]) {
        for (let item of items) {
            if ('id' in item) {
                this._idOfDocumentsInTOC.add(item.id);
            }
        }
    }

    loadDocuments(items: any) {
        this._idOfDocumentsNotInTOC.clear();
        for (let item of items) {
            if (!this._idOfDocumentsInTOC.has(item.id)) {
                this._idOfDocumentsNotInTOC.set(item.id, item);
            }
        }

        this._onDidChangeTreeData.fire(undefined);
    }

    // TreeDataProvider
    getTreeItem(id: Number): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const document = this._idOfDocumentsNotInTOC.get(id);
        return {
            label: document.title,
            contextValue: "yuqueDocument",
        };
    }

    getChildren(id?: Number): vscode.ProviderResult<Number[]> {
        if (!id) {
            let ret = [];
            for (let [id, document] of this._idOfDocumentsNotInTOC) {
                ret.push(id);
            }
            return ret;
        }
        return [];
    }
}