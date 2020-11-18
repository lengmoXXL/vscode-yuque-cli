import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { YuqueDataProxy } from "./proxy";
import { SDKClient } from "./util";
import { assert } from 'console';

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