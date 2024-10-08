const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const CleanWebpackPlugin = require("clean-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
// const PurifyCSSPlugin = require("purifycss-webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
  entry: "./site.js",
  context: path.resolve(__dirname, "root/src"),
  output: {
    filename: "site.[contentHash].js",
    path: path.resolve(__dirname, "root/jekyll"),
  },
  mode: "production",
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
            plugins: [
              "@babel/plugin-proposal-class-properties",
              "@babel/plugin-syntax-dynamic-import",
            ],
          },
        },
      },
      {
        test: /\.scss$/,
        use: [
          "style-loader",
          MiniCssExtractPlugin.loader,
          "css-loader",
          "postcss-loader",
          "sass-loader",
        ],
      },
      // {
      //     test: /\.(jpe?g|png)$/i,
      //     loader: "file-loader"
      // }
      {
        test: /\.(jpe?g|png)$/i,
        loader: "responsive-loader",
        options: {
          sizes: [500, 750, 1000],
          adapter: require("responsive-loader/jimp"),
          name: "assets/images/[name]-[hash]-[width].[ext]",
          placeholder: true,
        },
      },
      // {
      //     test: /\.html$/,
      //     use: {
      //         loader: "html-loader",
      //         options: {
      //             interpolate: true
      //         }
      //     }
      // }
    ],
  },
  plugins: [
    new CleanWebpackPlugin(
      [
        "root/jekyll/*.js",
        "root/jekyll/*.css",
        "root/jekyll/*.map",
        "root/jekyll/assets/*",
        "root/jekyll/assets/images/*",
      ],
      {}
    ),
    new MiniCssExtractPlugin({
      filename: "site.[contentHash].min.css",
    }),
    // new PurifyCSSPlugin({
    //     paths: glob.sync(path.join(__dirname, "root/jekyll/**/*.html"))
    // }),
    new HtmlWebpackPlugin({
      inject: true,
      template: "./templates/home-layout.tmpl.html",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_layouts/home-layout.html"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: "./templates/site-layout.tmpl.html",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_layouts/site-layout.html"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: "./templates/clubs-layout.tmpl.html",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_layouts/clubs-layout.html"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: "./templates/programs-layout.tmpl.html",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_layouts/programs-layout.html"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: true,
      template: "./templates/events-layout.tmpl.html",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_layouts/events-layout.html"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: false,
      template: "./templates/images-metadata.tmpl.js",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_data/images-metadata.json"
      ),
    }),
    new HtmlWebpackPlugin({
      inject: false,
      //hash: true,
      template: "./templates/srcset.tmpl.js",
      filename: path.resolve(
        __dirname,
        "root/jekyll/_includes/img_srcset.html"
      ),
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "./assets/**/*", to: path.resolve(__dirname, "root/jekyll") },
      ],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new OptimizeCSSAssetsPlugin({}),
      new TerserPlugin({
        sourceMap: true,
        terserOptions: {
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
};
