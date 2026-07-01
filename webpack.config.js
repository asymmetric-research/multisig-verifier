const path = require('path');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

function loadEnv() {
  const envFile = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envFile)) return {};
  return Object.fromEntries(
    fs.readFileSync(envFile, 'utf-8')
      .split('\n')
      .filter(line => line && !line.startsWith('#') && line.includes('='))
      .map(line => { const i = line.indexOf('='); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; })
  );
}

module.exports = (env, argv) => {
  const isProd = argv.mode === 'production';
  const dotenv = loadEnv();

  return {
    devtool: isProd ? false : 'source-map',
    entry: './src/main.js',
    output: {
      filename: isProd ? 'app.[contenthash].js' : 'app.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
      hashFunction: 'xxhash64',
      pathinfo: false,
    },
    optimization: {
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
      minimize: isProd,
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
          ],
        },
        {
          test: /\.woff2$/,
          type: 'asset/resource',
          generator: { filename: '[name][ext]' },
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        __RPC_URL__: JSON.stringify(dotenv.RPC_URL || process.env.RPC_URL || ''),
      }),
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body',
        minify: isProd ? { collapseWhitespace: true, removeComments: true } : false,
      }),
      new CopyPlugin({
        patterns: [{ from: 'public', to: '.' }],
      }),
      new MiniCssExtractPlugin({
        filename: isProd ? 'style.[contenthash].css' : 'style.css',
      }),
    ],
    devServer: {
      static: { directory: path.join(__dirname, 'public') },
      port: 3000,
      hot: true,
      open: true,
    },
    resolve: {
      fallback: {
        crypto: false,
        stream: false,
        buffer: false,
      },
    },
  };
};
