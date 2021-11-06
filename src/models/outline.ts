import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from 'console';
import { TOCItem, DocumentId } from './define';


export class YuqueOutlineProvider implements vscode.TreeDataProvider<Number> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private _repoNamespace: string;
    private _childrenOfId: Map<Number, Number[]>;
    private _rootNode: Number[];
    private _idOfNode: Map<Number, DocumentId>;

    constructor(private context: vscode.ExtensionContext, items?: TOCItem[]) {
        if (items !== undefined) {
            this.loadTOC(items);
        }
    }

    getNodeById(id: Number): DocumentId | undefined {
        return this._idOfNode.get(id);
    }

    getTreeItem(did: Number): vscode.TreeItem {
        let document = this._idOfNode.get(did);
        let children = this._childrenOfId.get(did) || [];
        return {
            label: document.title,
            collapsibleState: children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            contextValue: 'yuqueDocument',
        };
    }

    getChildren(did?: Number): Thenable<Number[]> {
        let children = this._childrenOfId.get(did) || [];
        if (did) {
            return Promise.resolve(children);
        }
        return Promise.resolve(this._rootNode);
    }

    async loadTOC(items: TOCItem[]) {
        this._childrenOfId = new Map<Number, Number[]>();
        this._rootNode = [];
        this._idOfNode = new Map<Number, DocumentId>();

        let idOfUuid = new Map<String, Number>();

        assert(items !== null);
        // console.log(items);

        for (let i = 0; i < items.length; ++ i) {
            let item = items[i];
            if (item.type === 'META') {
                this._repoNamespace = item.namespace;
                continue;
            }

            if (!('uuid' in item) || !('id' in item) || !('title' in item) || (!('url' in item))) {
                continue;
            }

            let documentId = new DocumentId(item.id, item.slug, item.title);
            this._idOfNode.set(item.id, documentId);
            idOfUuid.set(item.uuid, item.id);

            if (!('parent_uuid' in item)) {
                this._rootNode.push(item.id);
                continue;
            }

            if (item.parent_uuid.length === 0) {
                this._rootNode.push(item.id);
            } else {
                let parentId = idOfUuid.get(item.parent_uuid);
                if (!this._childrenOfId.has(parentId)) {
                    this._childrenOfId.set(parentId, [item.id]);
                } else {
                    this._childrenOfId.get(parentId).push(item.id);
                }
            }
        }
        this._onDidChangeTreeData.fire(undefined);
    }

    namespace(): string {
        return this._repoNamespace;
    }

    private icon(): any {
        return {
            light: this.context.asAbsolutePath(path.join('resources', 'light', 'string.svg')),
            dark: this.context.asAbsolutePath(path.join('resources', 'dark', 'string.svg')) 
        };
    }
}