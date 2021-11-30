const path = require("path");
const webpack = require("webpack");

const config = {
  mode: "production",
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts"],
    fallback: {
      buffer: require.resolve("buffer/"),
    },
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  plugins: [new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] })],
};

module.exports = config;
