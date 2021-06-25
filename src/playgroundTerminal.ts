import * as vscode from 'vscode'; import * as child from 'child_process';
import { SIGINT } from 'constants';

export class PlaygroundTerminal {
    private static terminals: Record<string, PlaygroundTerminal> = {};

    static show(cwd: string): PlaygroundTerminal {
        let terminal: PlaygroundTerminal;
        if (this.terminals[cwd]) {
            terminal = PlaygroundTerminal.terminals[cwd];
        } else {
            const split = cwd.split("/");
            const slug = split[split.length - 1];

            const stdout = vscode.window.createTerminal({ name: `Rust Playground (${slug}) - stdout`, pty: new PlaygroundStdTerminal });
            const stderr = vscode.window.createTerminal({ name: `Rust Playground (${slug}) - stderr`, pty: new PlaygroundErrTerminal });
            terminal = new PlaygroundTerminal(cwd, stdout, stderr);
            PlaygroundTerminal.terminals[cwd] = terminal;
        }

        terminal.stdout.show(true);

        return terminal;
    }

    private constructor(
        private readonly cwd: string,
        private readonly stdout: vscode.Terminal,
        private readonly stderr: vscode.Terminal,
    ) { }

    static onSave(cwd: string) {
        PlaygroundTerminal.show(cwd).onSave();
    }

    private _stream: child.ChildProcessWithoutNullStreams | undefined = undefined;
    private onSave() {
        console.log("saved", this.cwd);
        const stdout = (this.stdout.creationOptions as vscode.ExtensionTerminalOptions).pty as PlaygroundStdTerminal;
        const stderr = (this.stderr.creationOptions as vscode.ExtensionTerminalOptions).pty as PlaygroundErrTerminal;

        this._stream?.kill(SIGINT);

        stdout.clear();
        stderr.clear();

        this._stream = child.spawn("cargo", ["run", "--color", "always"], { cwd: this.cwd });

        this._stream.stdout.on("data", data => stdout.write(data));
        this._stream.stderr.on("data", data => stderr.write(data));
    }
}


export class PlaygroundStdTerminal implements vscode.Pseudoterminal {
    private onDidWriteEmitter = new vscode.EventEmitter<string>();
    onDidWrite = this.onDidWriteEmitter.event;

    open(initialDimensions: vscode.TerminalDimensions | undefined): void { }
    close(): void { }

    clear() {
        this.onDidWriteEmitter.fire('\x1b[H\x1b[J================ STANDARD OUTPUT ================\n\n\r');
    }

    write(data: Buffer) {
        const output = data.toString().replace("\n", "\n\r") + "\r";
        this.onDidWriteEmitter.fire(output);
    }
}

export class PlaygroundErrTerminal implements vscode.Pseudoterminal {
    private onDidWriteEmitter = new vscode.EventEmitter<string>();
    onDidWrite = this.onDidWriteEmitter.event;

    open(initialDimensions: vscode.TerminalDimensions | undefined): void {
        this.onDidWriteEmitter.fire("Welcome to the Rust Playground. Try saving the open file");
    }
    close(): void { }

    clear() {
        this.onDidWriteEmitter.fire('\x1b[H\x1b[J================ STANDARD  ERROR ================\n\n\r');
    }

    write(data: Buffer) {
        const output = data.toString().replace("\n", "\n\r") + "\r";
        this.onDidWriteEmitter.fire(output);
    }
}
