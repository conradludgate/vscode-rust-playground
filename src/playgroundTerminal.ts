import * as vscode from 'vscode';
import * as child from 'child_process';
import { SIGINT } from 'constants';

const TERMINAL_RESET = '\x1bc\x1b[0J\x1b[1J\x1b[2J\x1b[3J\x1b[0;0H';

export class PlaygroundTerminal {
    private static terminals: Record<string, PlaygroundTerminal> = {};

    static show(cwd: string): PlaygroundTerminal {
        const terminal = PlaygroundTerminal.terminals[cwd] || new PlaygroundTerminal(cwd);
        terminal.stdout.show(true);
        return terminal;
    }

    private readonly stdout: vscode.Terminal;
    private readonly stderr: vscode.Terminal;
    private constructor(
        private readonly cwd: string,
    ) {
        const split = cwd.split("/");
        const slug = split[split.length - 1];

        this.stdout = vscode.window.createTerminal({
            name: `Rust Playground (${slug}) - stdout`,
            pty: new PlaygroundPty('OUTPUT', 'Welcome to the Rust Playground. Try saving the open file'),
        });
        this.stderr = vscode.window.createTerminal({
            name: `Rust Playground (${slug}) - stderr`,
            pty: new PlaygroundPty('ERROR'),
        });

        PlaygroundTerminal.terminals[cwd] = this;
    }

    static onSave(cwd: string) {
        PlaygroundTerminal.show(cwd).onSave();
    }

    private _stream: child.ChildProcessWithoutNullStreams | undefined = undefined;
    private onSave() {
        const stderr = this.stderr;
        const stdout = this.stdout;
        const stderrpty = (stderr.creationOptions as vscode.ExtensionTerminalOptions).pty as PlaygroundPty;
        const stdoutpty = (stdout.creationOptions as vscode.ExtensionTerminalOptions).pty as PlaygroundPty;
        this._stream?.kill();

        stdoutpty.clear();
        stderrpty.clear();

        this._stream = child.spawn("cargo", ["run",
            "--color", "always",
        ], { cwd: this.cwd });

        this._stream.stdout.on("data", data => stdoutpty.write(data));
        this._stream.stderr.on("data", data => stderrpty.write(data));
        this._stream.on('error', err => {
            stderrpty.write(Buffer.from(`\n!!!!!!!!!!! Could not start compile: ${err}\n`));
            stderr.show(true);
        });
        this._stream.on('exit', exitCode => {
          if (exitCode !== 0) {
              stderrpty.write(Buffer.from(`\n!!!!!!!!!!! cargo run returned failure status: ${exitCode}\n`));
              stderr.show(true);
          } else {
              stdout.show(true);
          }
        });
    }
}

export class PlaygroundPty implements vscode.Pseudoterminal {
    private onDidWriteEmitter = new vscode.EventEmitter<string>();
    private name: string;
    private greeting?: string;
    onDidWrite = this.onDidWriteEmitter.event;

    constructor(name: string, greeting?: string) {
        this.name = name;
        this.greeting = greeting;
    }

    open(): void {
        if (!this.greeting) { return; }
        this.onDidWriteEmitter.fire(this.greeting);
    }

    close(): void { }

    clear() {
        this.onDidWriteEmitter.fire(`${TERMINAL_RESET}================ STANDARD ${this.name} ================\n\n\r`);
    }

    write(data: Buffer) {
        const output = data.toString().replace(/([^\r])\n/g, "$1\r\n");
        this.onDidWriteEmitter.fire(output);
    }
}
