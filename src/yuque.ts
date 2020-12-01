import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as open from 'open';
import * as open_darwin from 'mac-open';
import * as YuqueSDK from '@yuque/sdk';
import { YuqueDataProxy } from "./proxy";
import { assert } from 'console';


// decide what os should be used
// possible node values 'darwin', 'freebsd', 'linux', 'sunos' or 'win32'
const platform = process.platform;

export class Yuque {
    private SDKClient: any;

    constructor(private proxy: YuqueDataProxy) {
        let token = vscode.workspace.getConfiguration('yuqueCli').get('APIToken');
        this.SDKClient = new YuqueSDK({token: token});
    }

    async clone() {
        let user = await this.SDKClient.users.get();
        let groups = await this.SDKClient.groups.list({login: user.login});
        let nameOfGroups: {label: string, login: string, group: boolean} [] = groups.map(group => {return {label: group.name, login: group.login, group: true}});
        nameOfGroups.push({label: 'self', login: user.login, group: false});
        // console.log(groups);

        const groupChoice = await vscode.window.showQuickPick(nameOfGroups);
        // console.log(groupChoice);
        let repos: {name: string, namespace: string}[];
        if (groupChoice.group) {
            repos = await this.SDKClient.repos.list({group: groupChoice.login, data: {}});
        } else {
            repos = await this.SDKClient.repos.list({user: user.login, data: {}});
        }
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
        let document: any = await this.SDKClient.docs.get(
            {namespace: namespace, slug: id, data: {raw: 1}});
        let documentBody = document.body;
        this.proxy.saveDocument(id, documentBody);
        this.proxy.saveVersionDocument(id, documentBody);
    }

    async createDocument(namespace: string) {
        let title = await vscode.window.showInputBox({prompt: "Put Your Title Here"});
        if (title) {
            let res = await this.SDKClient.docs.create({
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
        let ret = await this.SDKClient.docs.update({
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

    async openDocumentInWebsite(namespace: string, slug: string) {
        let url = `https://www.yuque.com/${namespace}/${slug}`;
        if (platform === 'darwin') {
            open_darwin(url);
        } else {
            open(url);
        }
    }

    async openTOCArrange(namespace: string) {
        let url = `https://www.yuque.com/${namespace}/toc`;
        if (platform === 'darwin') {
            open_darwin(url);
        } else {
            open(url);
        }
    }

    async deleteDocument(namespace: string, id: number) {
        await this.SDKClient.docs.delete({
            namespace: namespace,
            id: id
        });
    }

    async updateOrCreateTOC(namespace: string) {
        const repoInfo = await this.SDKClient.repos.get({namespace: namespace, data: {}});
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