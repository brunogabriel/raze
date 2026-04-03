# raze
Raze Automates Zero-Config Environment

How to run, test and build

Run the CLI in development (using Bun):

```
bun run src/cli/index.ts
```

Run unit tests:

```
bun test
```

Build the standalone binary (vbuild):

```
bun build ./src/cli/index.ts --compile --outfile dist/raze
```

After building, make the binary executable and move it to a directory on your PATH, for example:

```
chmod +x dist/raze
sudo mv dist/raze /usr/local/bin/raze
```

That's it — the binary is now available as `raze` on your PATH.
