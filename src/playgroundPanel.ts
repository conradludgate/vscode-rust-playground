import * as child from 'child_process';
import { SIGINT } from 'constants';
import * as vscode from 'vscode';

export class PlaygroundPanel {
    public static readonly viewType = 'rustPlayground';
    static openPanels: Record<string, PlaygroundPanel> = {};

    private _playground: string;
    private _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private _stdout: string[] = [];
    private _stderr: string[] = [];

    public static open(playground: string) {
        if (PlaygroundPanel.openPanels[playground]) {
            PlaygroundPanel.openPanels[playground].reveal();
        } else {
            new PlaygroundPanel(playground);
        }
    }

    public static close(playground: string) {
        if (PlaygroundPanel.openPanels[playground]) {
            PlaygroundPanel.openPanels[playground].dispose();
        }
    }

    private constructor(playground: string) {
        this._playground = playground;

        this._panel = vscode.window.createWebviewPanel(PlaygroundPanel.viewType, "Playground Output", {
            viewColumn: vscode.ViewColumn.Two,
            preserveFocus: true
        });

        PlaygroundPanel.openPanels[playground] = this;
    }

    private reveal() {
        this._panel.reveal(vscode.ViewColumn.Two, true);
    }

    public dispose() {
        delete PlaygroundPanel.openPanels[this._playground];

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _stream: child.ChildProcess | undefined;

    public static async shouldUpdate(playground: string) {
        return await this.openPanels[playground]?.shouldUpdate();
    }

    async shouldUpdate() {
        this._stream?.kill(SIGINT);

        this._stderr = [];
        this._stdout = [];

        this._stream = child.spawn("cargo", ["run"], { cwd: this._playground });
        this._stream.stdout!.on("data", data => {
            this._stdout.push(data);
            this.update();
        });
        this._stream.stderr!.on("data", data => {
            this._stderr.push(data);
            this.update();
        });
    }

    private update() {
        let html = "";
        if (this._stderr.length > 0) {
            html += `<h1>Standard Error</h1><pre><code><span>${this._stderr.join("\n")}</span></code></pre>`;
        }
        if (this._stdout.length > 0) {
            html += `<h1>Standard Output</h1><pre><code><span>${this._stdout.join("\n")}</span></code></pre>`;
        }
        this._panel.webview.html = html;
    }
}
