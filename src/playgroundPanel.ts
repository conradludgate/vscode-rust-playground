import * as child from 'child_process';
import { SIGINT } from 'constants';
import * as vscode from 'vscode';

export class PlaygroundOutputProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'rust-playground.playgroundView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

    public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
	}

    // public static open(playground: string) {
    //     if (PlaygroundPanel.openPanels[playground]) {
    //         PlaygroundPanel.openPanels[playground].reveal();
    //     } else {
    //         new PlaygroundPanel(playground);
    //     }
    // }

    // public static close(playground: string) {
    //     if (PlaygroundPanel.openPanels[playground]) {
    //         PlaygroundPanel.openPanels[playground].dispose();
    //     }
    // }

    // private constructor(playground: string) {
    //     this._playground = playground;

    //     this._panel = vscode.window.createWebviewPanel(PlaygroundPanel.viewType, "Playground Output", {
    //         viewColumn: vscode.ViewColumn.Two,
    //         preserveFocus: true,
    //     });

    //     PlaygroundPanel.openPanels[playground] = this;
    // }

    // private reveal() {
    //     this._panel.reveal(vscode.ViewColumn.Two, true);
    // }

    // public dispose() {
    //     delete PlaygroundPanel.openPanels[this._playground];

    //     // Clean up our resources
    //     this._panel.dispose();

    //     while (this._disposables.length) {
    //         const x = this._disposables.pop();
    //         if (x) {
    //             x.dispose();
    //         }
    //     }
    // }



    // public static async shouldUpdate(playground: string) {
    //     return await this.openPanels[playground]?.shouldUpdate();
    // }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // let html = "";
        // if (this._stderr.length > 0) {
        //     html += `<h1>Standard Error</h1><pre><code><span>${this._stderr.join("\n")}</span></code></pre>`;
        // }
        // if (this._stdout.length > 0) {
        //     html += `<h1>Standard Output</h1><pre><code><span>${this._stdout.join("\n")}</span></code></pre>`;
        // }
        // this._panel.webview.html = html;
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">

				<title>Cat Colors</title>
			</head>
			<body>
				<ul class="color-list">
				</ul>

				<button class="add-color-button">Add Color</button>

				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}

class Playground {
    static playgrounds: Record<string, Playground> = {};
    static playground?: string;

    private _playground: string;
    private _view: vscode.WebviewView;

    private constructor(playground: string, view: vscode.WebviewView) {
        this._playground = playground;
        this._view = view;
    }

    private _stdout: string[] = [];
    private _stderr: string[] = [];
    private _stream: child.ChildProcess | undefined;
    async shouldUpdate() {
        this._stream?.kill(SIGINT);

        this._stderr = [];
        this._stdout = [];

        this._stream = child.spawn("cargo", ["run"], { cwd: this._playground });
        this._stream.stdout!.on("data", data => {
            this._stdout.push(data);
            // this.update();
        });
        this._stream.stderr!.on("data", data => {
            this._stderr.push(data);
            // this.update();
        });
    }
}


function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
