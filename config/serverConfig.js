import express from "express";
import webpack from "webpack";
import path from "path";
import webpackDevMiddleware from "webpack-dev-middleware";
import webpackDevServer from "webpack-dev-server";
import React from "react";
import { renderToString } from "react-dom/server";
import { ChunkExtractor } from "@loadable/server";
import clientConfig from "./webpack-dev.client";
import serverConfig from "./webpack-dev.server";
import { getHTML } from "./serverHTML.js";
const port = 4000;

export function initServerSetup() {
  const app = express();

  const serverCompiler = webpack([clientConfig, serverConfig]);

  const instance = webpackDevMiddleware(serverCompiler, {
    logLevel: "silent",
    writeToDisk: (filePath) => {
      return true;
    },
  });

  instance.waitUntilValid(() => {
    // This is the stats file generated by webpack loadable plugin
    const nodeOutputPath = path.resolve(process.cwd(), "./dist/node/");
    const statsFile = path.resolve(
      process.cwd(),
      "./dist/node/loadable-stats.json"
    );
    // We create an extractor from the statsFile
    const nodeExtractor = new ChunkExtractor({
      statsFile: statsFile,
      outputPath: nodeOutputPath,
    });

    // This is the stats file generated by webpack loadable plugin
    const webstatsFile = path.resolve(
      process.cwd(),
      "./dist/client/loadable-stats.json"
    );

    // This is needed in later time
    // Refer: https://www.smooth-code.com/open-source/loadable-components/docs/api-loadable-server/
    const webOutputPath = path.resolve(process.cwd(), "./dist/client/");
    // We create an extractor from the statsFile
    const webextractor = new ChunkExtractor({
      statsFile: webstatsFile,
    });

    const { default: App } = nodeExtractor.requireEntrypoint();

    // Wrap your application using "collectChunks"
    const jsx = webextractor.collectChunks(<App />);

    // console.log('----> jsx', jsx)

    // Render your application
    const html = renderToString(jsx);

    console.log("html", html);

    // const linkTags = extractor.getLinkTags()

    // You can now collect your script tags
    const scriptTags = webextractor.getScriptTags(); // or extractor.getScriptElements();

    app
      .use(
        "/dist/client/",
        express.static(path.join(process.cwd(), "./dist/client"))
      )
      .use("/", function routeHandler(req, res) {
        res.send(
          getHTML({
            html,
            scriptTags,
          })
        );
      });

    app.listen(port, function listenHandler() {
      console.info(`Running on ${port}...`);
    });
    console.log("Package is in a valid state");
  });
}

export function initClientSetup() {
  const compiler = webpack([clientConfig]);

  var server = new webpackDevServer(compiler, {
    hot: true,
  });
  server.listen(8080);
}

export function initCompileSetup() {
  const enableSSR = process.env.Enable_SSR || false;
  if (enableSSR) {
    initServerSetup();
  } else {
    initClientSetup();
  }
}
