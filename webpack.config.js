const path = require("path");

module.exports = {
  entry: "./test-e2e/test.js",
  output: {
    filename: "bundle.js"
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: "babel-loader"
      }
    ]
  },

  devServer: {
    contentBase: path.join(__dirname, "/test-e2e/web"),
    host: "localhost",
    port: 8080,
    proxy: {
      "/node": {
        target: "http://localhost:8545",
        pathRewrite: { "^/node": "" }
      }
    },
    staticOptions: {
      extensions: ["html"]
    }
  }
};
