const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  mode : 'development',
  entry: path.join(__dirname, "src", "scripts" , "./index.ts"),
  devtool: 'source-map',
  target: ['web', 'es5'],
  output: {
    filename: 'annotation.js',
    path:path.resolve(__dirname, "dist"),
    libraryTarget: 'umd',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|tsx|ts)$/,
        use: ['babel-loader','ts-loader']
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js', '.tsx', '.jsx'],
  },
  // optimization: {
  //   minimize: true,
  //   minimizer: [new TerserPlugin()],
  // }
}