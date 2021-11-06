import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from 'console';
import { TOCItem } from './proxy';

export class DocumentId {
    public id: number;
    public slug: string;
    public title: string;

    constructor(id?:number, slug?:string, title?:string) {
        this.id = id;
        this.slug = slug;
        this.title = title;
    }
}

export class DocumentNode {

    public docid: DocumentId;
    public children: DocumentNode[];

    constructor(id: number, label: string, slug: string) {
        this.docid = new DocumentId(id, slug, label);
        this.children = [];
    }
}

export class YuqueOutlineProvider implements vscode.TreeDataProvider<DocumentNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private _repoNamespace: string;
    private _nodes: any;
    private _idOfNodes: any;
    private _rootNodes: DocumentNode[];

    constructor(private context: vscode.ExtensionContext, items?: TOCItem[]) {
        if (items !== undefined) {
            this.loadTOC(items);
        }
    }

    getNodeById(id: number): DocumentNode | undefined {
        return this._idOfNodes[id];
    }

    getNodeByUri(uri: vscode.Uri): DocumentNode | undefined {
        let filename = path.basename(uri.fsPath);
        let results = /\[(\d+)\].*/.exec(filename);
        console.log(results);
        if (results.length <= 1) {
            return undefined;
        }

        let id = Number.parseInt(results[1]);
        return this.getNodeById(id);
    }

    getTreeItem(node: DocumentNode): vscode.TreeItem {
        return {
            label: node.docid.title,
            collapsibleState: node.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            contextValue: 'document',
        };
    }

    getChildren(node?: DocumentNode): Thenable<DocumentNode[]> {
        if (node) {
            return Promise.resolve(node.children);
        }
        return Promise.resolve(this._rootNodes);
    }

    async loadTOC(items: TOCItem[]) {
        this._nodes = {};
        this._idOfNodes = {};
        this._rootNodes = [];

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

            let node = new DocumentNode(item.id, item.title, item.url);
            this._nodes[item.uuid] = node;
            this._idOfNodes[item.id] = node;

            if (!('parent_uuid' in item)) {
                this._rootNodes.push(node);
                continue;
            }

            if (item.parent_uuid.length === 0) {
                this._rootNodes.push(node);
            } else {
                let parentNode: DocumentNode = this._nodes[item.parent_uuid];
                parentNode.children.push(node);
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