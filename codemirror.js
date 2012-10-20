/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true browser: true devel: true
         forin: true latedef: false globalstrict: true */

"use strict";

require("./resource/codemirror-compressed")

var CodeMirror = window.CodeMirror
var path = require("path")
var hub = require("plugin-hub/core"), meta = hub.meta, values = meta.values
var promises = require("micro-promise/core"),
    defer = promises.defer

var resources = path.join(path.dirname(module.filename), "resource")

exports.name = "codemirror-plug"
exports.version = "0.0.1"
exports.author = "Irakli Gozalishvili <rfobic@gmail.com>"
exports.description = "Codemirror plugin for Ambiance"
exports.stability = "unstable"

exports.types = {
  mode: meta({
    description: "Language modes"
  }, Object.keys(CodeMirror.modes)),
  keymap: meta({
    description: "Keymaps are ways to associate keys with functionality."
  }, Object.keys(CodeMirror.keyMap)),

  theme: meta({
    description: "Editor themes"
  }, [
    "default", "ambiance", "blackboard", "cobalt", "eclipse", "elegant",
    "erlang-dark", "lesser-dark", "monokai", "neat", "night", "rubyblue",
    "vibrant-ink", "xq-dark"
  ])
}

function makeSettingCommands(mapping) {
  return Object.keys(mapping).reduce(function(commands, name) {
    var descriptor = mapping[name]
    var option = descriptor[0]
    var takes = descriptor[1].concat("env")
    var description = descriptor[2] || ""
    commands[name] = meta({
      description: description,
      takes: takes
    }, function(value, env) {
      env.codemirror.setOption(option, value)
    })
    return commands
  }, {})
}

var commands = makeSettingCommands({
  "set-keymap": [
    "keyMap", ["keymap"],
    "Sets editor thekeymap to be used"
  ],
  "set-mode": [
    "mode", ["mode"],
    "Sets buffer mode"
  ],
  "set-theme": [
    "theme", ["theme"],
    "Set the theme to style the editor with."
  ],
  "set-indent-size": [
    "indentUnit", ["number"],
    "Set number of spaces blocks be used for indenteding"
  ],
  "enable-smart-indentatation": [
    "smartIndent", ["boolean"],
    "Whether to use the context-sensitive indentation that the mode provides"
  ],
  "set-tab-size": [
    "tabSize", ["number"],
    "Set the width of a tab character"
  ],
  "enable-tab-indent": [
    "indentWithTabs", ["boolean"],
    "If enabled indents with tabs"
  ],
  "enable-electric-chars": [
    "electricChars", ["boolean"],
    "If enabled editor will re-indent line when special character is entered"
  ],
  "enable-line-trim": [
    "autoClearEmptyLines", ["boolean"],
    "If enabled, editor will trim lines consisting only of whitespace"
  ],
  "enable-line-wrap": [
    "lineWrapping", ["boolean"],
    "If enabled, editor will wrap long lines"
  ],
  "enable-line-numbers": [
    "lineNumbers", ["boolean"],
    "If enabled, editor will display line numbers"
  ],
  "enabled-gutter": [
    "gutter", ["boolean"],
    "If enabled, editor will dispaly gutter even with no lines-number enabled."
  ],
  "set-read-only": [
    "readOnly", ["boolean"],
    "If enabled buffer will be in read-only mode"
  ],
  "set-undo-depth": [
    "undoDepth", ["boolean"],
    "Sets maximum number of undo levels that the editor stores."
  ]
})

exports.commands = commands

exports["onfs:open"] = function(env, path, buffer) {
  env.path = path
  env.codemirror.setValue(String(buffer))
}
exports["oneditor:focus"] = function(env, buffer) {
  env.codemirror.focus()
}

function importStylesheet(uri, document) {
  var style = document.createElement("link")
  style.setAttribute("rel", "stylesheet")
  style.setAttribute("type", "text/css")
  style.setAttribute("href", uri)
  document.head.appendChild(style)
}

function disposeStylesheet(uri, document) {
  var styles = document.querySelectorAll("link")
  var count = styles.length
  var index = 0
  while (index < count) {
    var style = styles[index]
    if (style.getAttribute("href") === uri) {
      style.parentNode.removeChild(style)
      return
    }
  }
}

exports.onstartup = meta({
  description: "Hook that registers all plugin commands & types"
}, function onstartup(env, plugins) {

  // Add additional command to CodeMirror that will broadcast
  // intent of saving a file.
  CodeMirror.commands.save = function() {
    env.broadcast("editor:save")
  }

  // We need to inject codemirror themes into document.
  importStylesheet(path.join(resources, "embed.css"), document)
  importStylesheet(path.join(resources, "codemirror.css"), document)
  importStylesheet(path.join(resources, "ambiance.css"), document)

  var inputView = document.createElement("textarea")
  inputView.setAttribute("id", "input")
  inputView.setAttribute("name", "input")
  document.body.appendChild(inputView)

  var codemirror = CodeMirror.fromTextArea(inputView, {
    lineNumbers: true,
    autoClearEmptyLines: true,
    tabSize: 2,
    indentWithTabs: false,
    electricChars: false,
    theme: "ambiance",
    autofocus: true,
    fixedGutter: true,
    matchBrackets: true,
    onChange: function(editor, delta) {
      env.broadcast("editor:changeed", editor, delta)
    },
    onFocus: function(editor) {
      env.broadcast("editor:focused", editor)
    },
    onBlur: function() {
      env.broadcast("editor:blur", codemirror)
    },
    onCursorActivity: function() {
      codemirror.setLineClass(hlLine, null, null)
      var line = codemirror.getCursor().line
      hlLine = codemirror.setLineClass(line, null, "activeline")
    }
  });
  var hlLine = codemirror.setLineClass(0, null, "activeline")

  env.CodeMirror = CodeMirror
  env.codemirror = codemirror
  env.codemirrorView = inputView
  env.getBufferValue = function getBufferValue() {
    return this.codemirror.getValue()
  }
})

exports.onshutdown = meta({
  description: "Hook that unregisters unplugged add-on commands & types"
}, function onshutdown(env) {
  disposeStylesheet(path.join(resources, "embed.css"), document)
  disposeStylesheet(path.join(resources, "codemirror.css"), document)
  disposeStylesheet(path.join(resources, "ambiance.css"), document)
  document.body.removeChild(env.codemirrorView)
  env.CodeMirror = null
  env.codemirrorView = null
  env.codemirror = null
})
