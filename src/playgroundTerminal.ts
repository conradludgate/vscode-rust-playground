import * as vscode from 'vscode';import * as child from 'child_process';
import { SIGINT } from 'constants';

export class PlaygroundTerminal implements vscode.Pseudoterminal {
    private static terminals: Record<string, vscode.Terminal> = {};

    static show(cwd: string): vscode.Terminal {
        let terminal: vscode.Terminal;
        if (this.terminals[cwd]) {
            terminal = PlaygroundTerminal.terminals[cwd];
        } else {
            const split = cwd.split("/");
            const slug = split[split.length - 1];
            const name = `Rust Playground (${slug})`;

            terminal = vscode.window.createTerminal({ name, pty: new PlaygroundTerminal(cwd) });
            PlaygroundTerminal.terminals[cwd] = terminal;
        }
        terminal.show(true);
        return terminal;
    }

    private constructor(
		private readonly cwd: string,
	) {}

    private onDidWriteEmitter = new vscode.EventEmitter<string>();
    onDidWrite = this.onDidWriteEmitter.event;

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.onDidWriteEmitter.fire("Welcome to the Rust Playground. Try saving the open file");
    }
    close(): void {}

    static onSave(cwd: string) {
        const terminal = PlaygroundTerminal.show(cwd);
        const pty = (terminal.creationOptions as vscode.ExtensionTerminalOptions).pty as PlaygroundTerminal;
        pty.onSave();
    }

    private _stream: child.ChildProcessWithoutNullStreams | undefined = undefined;
    private onSave() {
        console.log("saved", this.cwd);
        this.onDidWriteEmitter.fire('\x1b[H\x1b[J');

        this._stream?.kill(SIGINT);
        this._stream = child.spawn("cargo", ["run"], { cwd: this.cwd });
        console.log(this._stream);
        this._stream.stdout.on("data", data => {
            const output = data.toString().replace("\n", "\n\r") + "\r";
            this.onDidWriteEmitter.fire(output);
        });
        this._stream.stderr.on("data", data => {
            const output = data.toString().replace("\n", "\n\r") + "\r";
            this.onDidWriteEmitter.fire(output);
        });
    }
}


// export class PlaygroundStdTerminal implements vscode.Pseudoterminal {
//     private onDidWriteEmitter = new vscode.EventEmitter<string>();
//     onDidWrite = this.onDidWriteEmitter.event;

//     open(initialDimensions: vscode.TerminalDimensions | undefined): void {}
//     close(): void {}

//     private clear() {
//         this.onDidWriteEmitter.fire('\x1b[H\x1b[J');
//     }

//     private write(data: Buffer) {
//         const output = data.toString().replace("\n", "\n\r") + "\r";
//         this.onDidWriteEmitter.fire(output);
//     }
// }

// export class PlaygroundErrTerminal implements vscode.Pseudoterminal {
//     private onDidWriteEmitter = new vscode.EventEmitter<string>();
//     onDidWrite = this.onDidWriteEmitter.event;

//     open(initialDimensions: vscode.TerminalDimensions | undefined): void {
//         this.onDidWriteEmitter.fire("Welcome to the Rust Playground. Try saving the open file");
//     }
//     close(): void {}

//     private clear() {
//         this.onDidWriteEmitter.fire('\x1b[H\x1b[J');
//     }

//     private write(data: Buffer) {
//         const output = data.toString().replace("\n", "\n\r") + "\r";
//         this.onDidWriteEmitter.fire(output);
//     }
// }
