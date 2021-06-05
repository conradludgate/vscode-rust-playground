import * as vscode from 'vscode';

export class PlaygroundEditorProvider implements vscode.CustomTextEditorProvider {

	public static register(context: vscode.ExtensionContext): vscode.Disposable {
		const provider = new PlaygroundEditorProvider(context);
		const providerRegistration = vscode.window.registerCustomEditorProvider(PlaygroundEditorProvider.viewType, provider);
		return providerRegistration;
	}

	private static readonly viewType = 'rustPlayground.editor';

	constructor(
		private readonly context: vscode.ExtensionContext
	) { }

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		token: vscode.CancellationToken
	) {
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            vscode.window.showInformationMessage("change");
        });
        console.log({document, webviewPanel, token});
        vscode.window.showInformationMessage(JSON.stringify({document, webviewPanel, token}));
	}
}
