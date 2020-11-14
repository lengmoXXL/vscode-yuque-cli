import * as vscode from 'vscode';

export class DocumentNode {

    public id: number;
    public label: string;
    public children: DocumentNode[];

    constructor(id: number, label: string) {
        this.id = id;
        this.label = label;
        this.children = [];
    }
}