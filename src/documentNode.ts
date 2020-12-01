import * as vscode from 'vscode';

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