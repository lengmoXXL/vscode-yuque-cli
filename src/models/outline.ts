import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { assert } from 'console';
import { TOCItem } from './proxy';

export class DocumentNode {

    public id: number;
    public slug: string;
    public label: string;
    public children: DocumentNode[];

    constructor(id: number, label: string, slug: string) {
        this.id = id;
        this.label = label;
        this.children = [];
        this.slug = slug;
    }
}

export class YuqueOutlineProvider implements vscode.TreeDataProvider<DocumentNode> {
	private _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
	readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private _repoNamespace: string;
    private _nodes: any;
    private _idOfNodes: any;
    private _rootNodes: DocumentNode[];
    private _lastClickedNode: DocumentNode;

    constructor(private context: vscode.ExtensionContext, items?: TOCItem[]) {
        context.subscriptions.push(
            vscode.commands.registerCommand('yuqueCli.onDocumentClicked',
                (node: DocumentNode) => this.onYuqueDocumentClicked(node))
        );

        if (items !== undefined) {
            this.loadTOC(items);
        }
    }

    onYuqueDocumentClicked(node: DocumentNode): void {
        this._lastClickedNode = node;
    }

    getLastClickedNode(): DocumentNode {
        if (this._lastClickedNode) {
            return this._lastClickedNode;
        }
        throw new Error("Please click Outline Node first");
    }

    getNodeById(id: number): DocumentNode | undefined {
        return this._idOfNodes[id];
    }

    getTreeItem(node: DocumentNode): vscode.TreeItem {
        return {
            label: node.label,
            collapsibleState: node.children.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            contextValue: 'document',
            command: {
                command: 'yuqueCli.onDocumentClicked',
                title: '',
                arguments: [node]
            }
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