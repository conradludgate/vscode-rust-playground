import { execFile, spawn } from 'child_process';
import { mkdir, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	// context.subscriptions.push(PlaygroundEditorProvider.register(context));

	let panel: vscode.WebviewPanel | undefined;
	let tmp: string;
	context.subscriptions.push(vscode.commands.registerCommand('rust-playground.newPlayground', async () => {
		tmp = join(tmpdir(), "rust-playground", await mkdtemp("playground-"));
		await mkdir(tmp, { recursive: true });
		console.log({tmp});

		execFile("cargo", ["init", "--bin", "--quiet", "--offline", "--vcs", "none"], {
			cwd: tmp,
		}, async (error, stdout, stderr) => {
			if (!error) {
				const uri = vscode.Uri.file(join(tmp, "src", "main.rs"));
				const doc = await vscode.workspace.openTextDocument(uri);
				await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
				panel = vscode.window.createWebviewPanel("rustPlayground", "Playground", {
					viewColumn: vscode.ViewColumn.Two,
					preserveFocus: true
				});
			} else {
				vscode.window.showErrorMessage("Could not create playground", stderr);
			}
		});
	}));

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (event) => {
		if (event.uri.fsPath.startsWith(tmp) && panel) {
			panel.webview.html = "running...";
			const output = execFile("cargo", ["run"], {
				cwd: tmp,
			}, (error, stdout, stderr) => {
				if (panel) {
					if (error) {
						panel.webview.html = `<h1>error</h1><p>${stderr}</p>`;
					} else {
						panel.webview.html = `<h1>success</h1><p>${stdout}</p>`;
					}
				}
			});
		}
	}));

	// const myProvider = new (class implements vscode.TextDocumentContentProvider {
	// 	// emitter and its event
	// 	onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
	// 	onDidChange = this.onDidChangeEmitter.event;

	// 	//...
	// })();
}

export function deactivate() { }
