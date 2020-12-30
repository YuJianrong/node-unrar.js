# Webpack Demo

This is the demo to show how to use `node-unrar-js` in Webpack on browser (yes, although the name is still `node-unrar-js` bu actually browser is supported).

Since `node-unrar-js` is powered by WebAssembly, to use this package in webpack, the WASM file `node_modules/node-unrar-js/esm/js/unrar.wasm` must be copied to the static files folder of the site, this is done by webpack plugin `copy-webpack-plugin` in this demo.

Please run `npm run build` to build or run `npm run start` to launch the dev-server of this demo.

## How to use `node-unrar-js` in webpack

- Copy the `unrar.wasm` by webpack plugin `copy-webpack-plugin`
  - run `npm i -D copy-webpack-plugin` to install the plugin
  - Add the following configurations in `webpack.config.js`:

```Javascript
const CopyPlugin = require('copy-webpack-plugin');
//...
  plugins: [
    // Copy `unrar.wasm` to `assets/` folder of the output dir.
    new CopyPlugin({
      patterns: [{ from: 'node_modules/node-unrar-js/esm/js/*.wasm', to: 'assets/[name].[ext]' }],
    }),
  ]
```

- Load the `unrar.wasm` in code and call the api `createExtractorFromData` with the loaded wasm

```Typescript
const wasmBinary = await (
  await fetch('./assets/unrar.wasm', { credentials: 'same-origin' })
).arrayBuffer();

const extractor = await createExtractorFromData({ wasmBinary, data });
```

Please read [index.ts](https://github.com/YuJianrong/node-unrar.js/blob/master/demo/web/src/index.ts) for the details of how to use the api.

---

_Note: the api `createExtractorFromFile` is not supported in EM2015 Module (used by webpack) since it depend on nodejs `fs` and `path` packages._
