/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const slsw = require("serverless-webpack");
const nodeExternals = require("webpack-node-externals");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

const isLocal = slsw.lib.webpack.isLocal;

module.exports = {
  context: __dirname,
  mode: isLocal ? "development" : "production",
  entry: slsw.lib.entries,
  devtool: isLocal ? "eval-cheap-source-map" : "eval-source-map",
  resolve: {
    extensions: [".mjs", ".json", ".ts"],
    symlinks: false,
    cacheWithContext: false,
    alias: {
      src: path.resolve(__dirname, "src"),
    },
  },
  output: {
    libraryTarget: "commonjs",
    path: path.join(__dirname, ".webpack"),
    filename: "[name].js",
  },
  target: "node",
  externals: [nodeExternals(), /aws-sdk/, /sharp/],
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      {
        test: /\.(tsx?)$/,
        loader: "ts-loader",
        exclude: [
          [
            path.resolve(__dirname, "node_modules"),
            path.resolve(__dirname, ".serverless"),
            path.resolve(__dirname, ".webpack"),
          ],
        ],
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
    ],
  },
  plugins: [new ForkTsCheckerWebpackPlugin({})],
};
