import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as open from 'open';
import * as open_darwin from 'mac-open';
import { YuqueDataProxy } from "./proxy";
import { SDKClient } from "./util";
import { assert } from 'console';

// decide what os should be used
// possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
const platform = process.platform;

export class Yuque {
    constructor(private proxy: YuqueDataProxy) {}

    async clone() {
        let user = await SDKClient.users.get();
        let repos: {name: string, namespace: string} [] = await SDKClient.repos.list({user: user.login, data: {}});
        let nameOfRepos = [];
        for (let i = 0; i < repos.length; ++ i) {
            nameOfRepos.push(
                {
                    label: repos[i].name,
                    namespace: repos[i].namespace
                }
            );
        }
        
        const choice = await vscode.window.showQuickPick(nameOfRepos);
        await this.updateOrCreateTOC(choice.namespace);
        vscode.window.showInformationMessage(`${choice.label} is saved into TOC.yaml successfully`);
    }

    async fetchDocument(namespace: string, id: number) {
        let document: any = await SDKClient.docs.get(
            {namespace: namespace, slug: id, data: {raw: 1}});
        let documentBody = document.body;
        this.proxy.saveDocument(id, documentBody);
        this.proxy.saveVersionDocument(id, documentBody);
    }

    async createDocument(namespace: string) {
        let title = await vscode.window.showInputBox({prompt: "Put Your Title Here"});
        if (title) {
            let res = await SDKClient.docs.create({
                namespace: namespace,
                data: {
                    title: title,
                    public: 1,
                    format: "markdown",
                    body: "<Put Your Body Here>"
                }
            });
            if (res) {
                await vscode.window.showInformationMessage('Create Success, Please insert the document into the TOC');
                let url = `https://www.yuque.com/${namespace}/toc`;
                if (platform === 'darwin') {
                    open_darwin(url);
                }
                else {
                    open(url);
                }
            }
        } else {
            vscode.window.showErrorMessage('Title must not be null');
        }
    }

    async updateDocument(namespace: string, id: number) {
        let documentBody = this.proxy.getDocument(id);
        let ret = await SDKClient.docs.update({
            namespace: namespace,
            id: id,
            data: {
                body: documentBody
            }
        });
        if ('body' in ret) {
            this.proxy.saveVersionDocument(id, ret.body);
        }
    }

    async openDocument(id: number) {
        let uri = this.proxy.getUri(id);
        if (uri) {
            vscode.workspace.openTextDocument(uri).then(document => vscode.window.showTextDocument(document));
        } else {
            vscode.window.showErrorMessage('File not fetched');
        }
    }

    async deleteDocument(namespace: string, id: number) {
        await SDKClient.docs.delete({
            namespace: namespace,
            id: id
        });
    }

    async updateOrCreateTOC(namespace: string) {
        const repoInfo = await SDKClient.repos.get({namespace: namespace, data: {}});
        let tocVal = yaml.safeLoad(repoInfo.toc_yml, 'utf-8');
        if (tocVal === null) {
            tocVal = [{type: 'META', namespace: namespace}];
        } else {
            assert(tocVal[0].type === 'META');
            tocVal[0].namespace = namespace;
        }

        this.proxy.saveTOC(tocVal);
    }
}