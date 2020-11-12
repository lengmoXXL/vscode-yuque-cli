// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {yuqueClone} from './yuque';
import { YuqueOutlineProvider } from './yuqueOutline';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const yuqueOutlineProvider = new YuqueOutlineProvider(context);
	vscode.window.registerTreeDataProvider('yuqueOutline', yuqueOutlineProvider);
	vscode.commands.registerCommand('yuqueCli.reload', () => yuqueOutlineProvider.load());
	vscode.commands.registerCommand('yuqueCli.clone', () => yuqueClone());
}

// this method is called when your extension is deactivated
export function deactivate() {}
