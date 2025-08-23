#!/usr/bin/env bun
// @bun

// script/update.ts
import fs3 from "fs";
import path3 from "path";
import { execSync as execSync3 } from "child_process";
import { fileURLToPath } from "url";

// src/paths.ts
import fs from "fs";
import path from "path";
var __dirname2 = process.cwd();
var detectPaths = () => {
  const paths = {
    script: path.resolve(__dirname2, ".."),
    root: null,
    bash: null,
    config: null,
    isPackage: false,
    isDevelopment: false
  };
  const scriptPath = paths.script;
  if (scriptPath.includes("node_modules")) {
    paths.isPackage = true;
    const parts = scriptPath.split(path.sep);
    const nodeModulesIndex = parts.lastIndexOf("node_modules");
    paths.root = parts.slice(0, nodeModulesIndex).join(path.sep);
  } else {
    const cwdConfig = path.join(process.cwd(), "air.json");
    const scriptConfig = path.join(scriptPath, "air.json");
    if (fs.existsSync(cwdConfig)) {
      paths.root = process.cwd();
    } else if (fs.existsSync(scriptConfig)) {
      paths.root = scriptPath;
      paths.isDevelopment = true;
    } else {
      paths.root = process.cwd();
    }
  }
  paths.bash = path.join(paths.script, "script");
  paths.config = path.join(paths.root, "air.json");
  return paths;
};
var getRootPath = (cliArg = null) => {
  if (cliArg)
    return path.resolve(cliArg);
  if (process.env.AIR_ROOT)
    return path.resolve(process.env.AIR_ROOT);
  if (process.env.ROOT)
    return path.resolve(process.env.ROOT);
  const detected = detectPaths();
  return detected.root;
};
var getBashPath = (cliArg = null) => {
  if (cliArg)
    return path.resolve(cliArg);
  if (process.env.AIR_BASH)
    return path.resolve(process.env.AIR_BASH);
  if (process.env.BASH)
    return path.resolve(process.env.BASH);
  const detected = detectPaths();
  return detected.bash;
};
var getPaths = (rootArg = null, bashArg = null) => {
  const detected = detectPaths();
  return {
    root: getRootPath(rootArg),
    bash: getBashPath(bashArg),
    config: path.join(getRootPath(rootArg), "air.json"),
    logs: path.join(getRootPath(rootArg), "logs"),
    script: detected.script,
    isPackage: detected.isPackage,
    isDevelopment: detected.isDevelopment
  };
};

// node_modules/@akaoio/tui/dist/index.mjs
import readline from "readline";
import { EventEmitter } from "events";
import { EventEmitter as EventEmitter2 } from "events";
import os from "os";
import { execSync } from "child_process";
import os2 from "os";
import path2 from "path";
import fs2 from "fs";
import { execSync as execSync2 } from "child_process";
var Keyboard = class extends EventEmitter {
  constructor(stdin = process.stdin) {
    super();
    this.rl = null;
    this.rawMode = false;
    this.stdin = stdin;
  }
  start() {
    if (this.rl)
      return;
    if (this.stdin.isTTY) {
      this.stdin.setRawMode(true);
      this.rawMode = true;
    }
    readline.emitKeypressEvents(this.stdin);
    this.stdin.resume();
    this.stdin.on("keypress", this.handleKeypress.bind(this));
  }
  stop() {
    if (this.rawMode && this.stdin.isTTY) {
      this.stdin.setRawMode(false);
    }
    this.stdin.pause();
    this.stdin.removeAllListeners("keypress");
    this.rl = null;
  }
  handleKeypress(str, key) {
    if (!key)
      return;
    const keyEvent = {
      name: key.name || "",
      key: str || "",
      ctrl: key.ctrl || false,
      meta: key.meta || false,
      shift: key.shift || false,
      sequence: key.sequence || ""
    };
    if (key.ctrl && key.name === "c") {
      this.emit("key", "ctrl+c", keyEvent);
      this.stop();
      process.exit(0);
    }
    const keyMap = {
      up: "up",
      down: "down",
      left: "left",
      right: "right",
      return: "return",
      escape: "escape",
      space: "space",
      tab: "tab",
      backspace: "backspace",
      delete: "delete",
      home: "home",
      end: "end",
      pageup: "pageup",
      pagedown: "pagedown"
    };
    const mappedKey = keyMap[key.name || ""];
    if (mappedKey) {
      this.emit("key", mappedKey, keyEvent);
    } else if (str) {
      this.emit("char", str, keyEvent);
    }
    this.emit("keypress", keyEvent);
  }
  onKey(callback) {
    this.on("key", callback);
  }
  onChar(callback) {
    this.on("char", callback);
  }
  onKeypress(callback) {
    this.on("keypress", callback);
  }
};
var Screen = class {
  constructor(stdout = process.stdout) {
    this.buffer = [];
    this.width = 80;
    this.height = 24;
    this.stdout = stdout;
    this.updateDimensions();
    if (this.stdout.isTTY) {
      this.stdout.on("resize", () => this.updateDimensions());
    }
  }
  updateDimensions() {
    if (this.stdout.isTTY) {
      this.width = this.stdout.columns || 80;
      this.height = this.stdout.rows || 24;
    }
  }
  getWidth() {
    return this.width;
  }
  getHeight() {
    return this.height;
  }
  clear() {
    this.write("\x1B[2J");
    this.moveCursor(0, 0);
  }
  clearLine() {
    this.write("\x1B[2K");
  }
  moveCursor(x, y) {
    this.write(`\x1B[${y + 1};${x + 1}H`);
  }
  hideCursor() {
    this.write("\x1B[?25l");
  }
  showCursor() {
    this.write("\x1B[?25h");
  }
  saveCursor() {
    this.write("\x1B[s");
  }
  restoreCursor() {
    this.write("\x1B[u");
  }
  write(text) {
    this.stdout.write(text);
  }
  writeLine(text) {
    this.write(text + `
`);
  }
  writeAt(x, y, text) {
    this.saveCursor();
    this.moveCursor(x, y);
    this.write(text);
    this.restoreCursor();
  }
  startBuffer() {
    this.buffer = [];
  }
  addToBuffer(text) {
    this.buffer.push(text);
  }
  flushBuffer() {
    if (this.buffer.length > 0) {
      this.write(this.buffer.join(""));
      this.buffer = [];
    }
  }
  enableAlternateScreen() {
    this.write("\x1B[?1049h");
  }
  disableAlternateScreen() {
    this.write("\x1B[?1049l");
  }
  reset() {
    this.write("\x1B[0m");
  }
};
var Component = class extends EventEmitter2 {
  constructor(screen, keyboard, options = {}) {
    super();
    this.screen = screen;
    this.keyboard = keyboard;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 0;
    this.height = options.height || 1;
    this.focused = options.focused || false;
    this.visible = options.visible !== false;
  }
  focus() {
    this.focused = true;
    this.render();
    this.emit("focus");
  }
  blur() {
    this.focused = false;
    this.render();
    this.emit("blur");
  }
  show() {
    this.visible = true;
    this.render();
  }
  hide() {
    this.visible = false;
    this.clear();
  }
  clear() {
    if (!this.visible)
      return;
    for (let i = 0;i < this.height; i++) {
      this.screen.writeAt(this.x, this.y + i, " ".repeat(this.width));
    }
  }
  getValue() {
    return this.value;
  }
  setValue(value) {
    this.value = value;
    this.render();
    this.emit("change", value);
  }
  setPosition(x, y) {
    this.clear();
    this.x = x;
    this.y = y;
    this.render();
  }
  setSize(width, height) {
    this.clear();
    this.width = width;
    this.height = height;
    this.render();
  }
  isFocused() {
    return this.focused;
  }
  isVisible() {
    return this.visible;
  }
};
function rgb(r, g, b) {
  return `\x1B[38;2;${r};${g};${b}m`;
}
function bgRgb(r, g, b) {
  return `\x1B[48;2;${r};${g};${b}m`;
}
function hex(color2) {
  const hex2 = color2.replace("#", "");
  const r = parseInt(hex2.substr(0, 2), 16);
  const g = parseInt(hex2.substr(2, 2), 16);
  const b = parseInt(hex2.substr(4, 2), 16);
  return rgb(r, g, b);
}
function bgHex(color2) {
  const hexColor = color2.replace("#", "");
  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);
  return bgRgb(r, g, b);
}
function color(fg, bg) {
  let result = "";
  if (fg !== undefined) {
    if (typeof fg === "string") {
      result += fg.startsWith("#") ? hex(fg) : fg;
    } else {
      result += `\x1B[${fg}m`;
    }
  }
  if (bg !== undefined) {
    if (typeof bg === "string") {
      result += bg.startsWith("#") ? bgHex(bg) : bg;
    } else {
      result += `\x1B[${bg}m`;
    }
  }
  return result;
}
function reset() {
  return "\x1B[0m";
}
function bold(text) {
  return `\x1B[1m${text}\x1B[22m`;
}
function dim(text) {
  return `\x1B[2m${text}\x1B[22m`;
}
function underline(text) {
  return `\x1B[4m${text}\x1B[24m`;
}
var BoxStyles = {
  Single: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
    cross: "┼",
    horizontalDown: "┬",
    horizontalUp: "┴",
    verticalLeft: "┤",
    verticalRight: "├"
  },
  Double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
    cross: "╬",
    horizontalDown: "╦",
    horizontalUp: "╩",
    verticalLeft: "╣",
    verticalRight: "╠"
  },
  Rounded: {
    topLeft: "╭",
    topRight: "╮",
    bottomLeft: "╰",
    bottomRight: "╯",
    horizontal: "─",
    vertical: "│",
    cross: "┼",
    horizontalDown: "┬",
    horizontalUp: "┴",
    verticalLeft: "┤",
    verticalRight: "├"
  },
  Bold: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
    cross: "╋",
    horizontalDown: "┳",
    horizontalUp: "┻",
    verticalLeft: "┫",
    verticalRight: "┣"
  },
  ASCII: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
    cross: "+",
    horizontalDown: "+",
    horizontalUp: "+",
    verticalLeft: "+",
    verticalRight: "+"
  }
};
function drawBox(width, height, style2 = BoxStyles.Single) {
  const lines = [];
  const topLine = style2.topLeft + style2.horizontal.repeat(width - 2) + style2.topRight;
  lines.push(topLine);
  for (let i = 0;i < height - 2; i++) {
    const middleLine = style2.vertical + " ".repeat(width - 2) + style2.vertical;
    lines.push(middleLine);
  }
  const bottomLine = style2.bottomLeft + style2.horizontal.repeat(width - 2) + style2.bottomRight;
  lines.push(bottomLine);
  return lines;
}
var Input = class extends Component {
  constructor(screen, keyboard, options = {}) {
    super(screen, keyboard, options);
    this.error = null;
    this.placeholder = options.placeholder || "";
    this.value = options.value || "";
    this.cursorPosition = this.value.length;
    this.scrollOffset = 0;
    this.maxLength = options.maxLength || Infinity;
    this.password = options.password || false;
    this.multiline = options.multiline || false;
    this.validator = options.validator;
    if (this.multiline) {
      this.lines = this.value ? this.value.split(`
`) : [""];
      this.currentLine = this.lines.length - 1;
      this.height = Math.max(3, options.height || 5);
    } else {
      this.lines = [this.value];
      this.currentLine = 0;
      this.height = 1;
    }
  }
  render() {
    if (!this.visible)
      return;
    if (this.multiline) {
      this.renderMultiline();
    } else {
      this.renderSingleLine();
    }
  }
  renderSingleLine() {
    const displayValue = this.password ? "*".repeat(this.value.length) : this.value;
    const displayText = displayValue || this.placeholder;
    const isPlaceholder = !this.value && this.placeholder;
    let text = "";
    if (this.focused) {
      text += color(36);
    }
    if (isPlaceholder) {
      text += color(90);
    }
    const maxWidth = this.width || this.screen.getWidth() - this.x;
    let visibleText = displayText;
    if (displayText.length > maxWidth - 1) {
      if (this.cursorPosition - this.scrollOffset >= maxWidth - 1) {
        this.scrollOffset = this.cursorPosition - maxWidth + 2;
      } else if (this.cursorPosition < this.scrollOffset) {
        this.scrollOffset = this.cursorPosition;
      }
      visibleText = displayText.substring(this.scrollOffset, this.scrollOffset + maxWidth - 1);
    }
    if (this.focused && !isPlaceholder) {
      const cursorPos = this.cursorPosition - this.scrollOffset;
      if (cursorPos >= 0 && cursorPos <= visibleText.length) {
        const before = visibleText.substring(0, cursorPos);
        const at = visibleText[cursorPos] || " ";
        const after = visibleText.substring(cursorPos + 1);
        text += before + underline(at) + after;
      } else {
        text += visibleText;
      }
    } else {
      text += visibleText;
    }
    text += reset();
    if (text.length < maxWidth) {
      text += " ".repeat(maxWidth - visibleText.length);
    }
    this.screen.writeAt(this.x, this.y, text);
    if (this.error) {
      this.screen.writeAt(this.x, this.y + 1, color(31) + this.error + reset());
    }
  }
  renderMultiline() {
    const boxWidth = this.width || 40;
    const boxHeight = this.height;
    this.screen.writeAt(this.x, this.y, "┌" + "─".repeat(boxWidth - 2) + "┐");
    for (let i = 1;i < boxHeight - 1; i++) {
      this.screen.writeAt(this.x, this.y + i, "│" + " ".repeat(boxWidth - 2) + "│");
    }
    this.screen.writeAt(this.x, this.y + boxHeight - 1, "└" + "─".repeat(boxWidth - 2) + "┘");
    const visibleLines = boxHeight - 2;
    const startLine = Math.max(0, this.currentLine - visibleLines + 1);
    for (let i = 0;i < visibleLines && startLine + i < this.lines.length; i++) {
      const lineIndex = startLine + i;
      const line = this.lines[lineIndex] || "";
      const displayLine = this.password ? "*".repeat(line.length) : line;
      let text = "";
      if (this.focused && lineIndex === this.currentLine) {
        const cursorPos = this.cursorPosition;
        const before = displayLine.substring(0, cursorPos);
        const at = displayLine[cursorPos] || " ";
        const after = displayLine.substring(cursorPos + 1);
        text = before + underline(at) + after;
      } else {
        text = displayLine;
      }
      if (text.length > boxWidth - 2) {
        text = text.substring(0, boxWidth - 2);
      }
      this.screen.writeAt(this.x + 1, this.y + i + 1, text + " ".repeat(boxWidth - 2 - text.length));
    }
  }
  handleKey(key, event) {
    if (!this.focused)
      return;
    switch (key) {
      case "left":
        this.moveCursorLeft();
        break;
      case "right":
        this.moveCursorRight();
        break;
      case "home":
        this.cursorPosition = 0;
        break;
      case "end":
        if (this.multiline) {
          this.cursorPosition = this.lines[this.currentLine]?.length || 0;
        } else {
          this.cursorPosition = this.value.length;
        }
        break;
      case "backspace":
        this.handleBackspace();
        break;
      case "delete":
        this.handleDelete();
        break;
      case "return":
        if (this.multiline) {
          this.handleNewLine();
        } else {
          this.validate();
          this.emit("submit", this.value);
        }
        break;
      case "up":
        if (this.multiline) {
          this.moveCursorUp();
        }
        break;
      case "down":
        if (this.multiline) {
          this.moveCursorDown();
        }
        break;
      default:
        if (event.key && event.key.length === 1 && !event.ctrl && !event.meta) {
          this.insertChar(event.key);
        }
    }
    this.render();
  }
  moveCursorLeft() {
    if (this.cursorPosition > 0) {
      this.cursorPosition--;
    } else if (this.multiline && this.currentLine > 0) {
      this.currentLine--;
      this.cursorPosition = this.lines[this.currentLine]?.length || 0;
    }
  }
  moveCursorRight() {
    if (this.multiline) {
      const currentLineLength = this.lines[this.currentLine]?.length || 0;
      if (this.cursorPosition < currentLineLength) {
        this.cursorPosition++;
      } else if (this.currentLine < this.lines.length - 1) {
        this.currentLine++;
        this.cursorPosition = 0;
      }
    } else {
      if (this.cursorPosition < this.value.length) {
        this.cursorPosition++;
      }
    }
  }
  moveCursorUp() {
    if (this.currentLine > 0) {
      this.currentLine--;
      const lineLength = this.lines[this.currentLine]?.length || 0;
      this.cursorPosition = Math.min(this.cursorPosition, lineLength);
    }
  }
  moveCursorDown() {
    if (this.currentLine < this.lines.length - 1) {
      this.currentLine++;
      const lineLength = this.lines[this.currentLine]?.length || 0;
      this.cursorPosition = Math.min(this.cursorPosition, lineLength);
    }
  }
  handleBackspace() {
    if (this.multiline) {
      const line = this.lines[this.currentLine] || "";
      if (this.cursorPosition > 0) {
        this.lines[this.currentLine] = line.substring(0, this.cursorPosition - 1) + line.substring(this.cursorPosition);
        this.cursorPosition--;
      } else if (this.currentLine > 0) {
        const prevLine = this.lines[this.currentLine - 1] || "";
        this.cursorPosition = prevLine.length;
        this.lines[this.currentLine - 1] = prevLine + line;
        this.lines.splice(this.currentLine, 1);
        this.currentLine--;
      }
      this.value = this.lines.join(`
`);
    } else {
      if (this.cursorPosition > 0) {
        this.value = this.value.substring(0, this.cursorPosition - 1) + this.value.substring(this.cursorPosition);
        this.cursorPosition--;
      }
    }
    this.emit("change", this.value);
  }
  handleDelete() {
    if (this.multiline) {
      const line = this.lines[this.currentLine] || "";
      if (this.cursorPosition < line.length) {
        this.lines[this.currentLine] = line.substring(0, this.cursorPosition) + line.substring(this.cursorPosition + 1);
      } else if (this.currentLine < this.lines.length - 1) {
        this.lines[this.currentLine] = line + (this.lines[this.currentLine + 1] || "");
        this.lines.splice(this.currentLine + 1, 1);
      }
      this.value = this.lines.join(`
`);
    } else {
      if (this.cursorPosition < this.value.length) {
        this.value = this.value.substring(0, this.cursorPosition) + this.value.substring(this.cursorPosition + 1);
      }
    }
    this.emit("change", this.value);
  }
  handleNewLine() {
    const line = this.lines[this.currentLine] || "";
    const before = line.substring(0, this.cursorPosition);
    const after = line.substring(this.cursorPosition);
    this.lines[this.currentLine] = before;
    this.lines.splice(this.currentLine + 1, 0, after);
    this.currentLine++;
    this.cursorPosition = 0;
    this.value = this.lines.join(`
`);
    this.emit("change", this.value);
  }
  insertChar(char) {
    if (this.value.length >= this.maxLength)
      return;
    if (this.multiline) {
      const line = this.lines[this.currentLine] || "";
      this.lines[this.currentLine] = line.substring(0, this.cursorPosition) + char + line.substring(this.cursorPosition);
      this.cursorPosition++;
      this.value = this.lines.join(`
`);
    } else {
      this.value = this.value.substring(0, this.cursorPosition) + char + this.value.substring(this.cursorPosition);
      this.cursorPosition++;
    }
    this.emit("change", this.value);
  }
  validate() {
    if (this.validator) {
      this.error = this.validator(this.value);
      if (this.error) {
        this.emit("error", this.error);
      }
    }
  }
  setValidator(validator) {
    this.validator = validator;
  }
  getError() {
    return this.error;
  }
  clearError() {
    this.error = null;
    this.render();
  }
};
var Select = class extends Component {
  constructor(screen, keyboard, options) {
    super(screen, keyboard, options);
    this.options = options.options || [];
    this.selectedIndex = options.selected || 0;
    this.hoveredIndex = this.selectedIndex;
    this.scrollOffset = 0;
    this.multiple = options.multiple || false;
    this.selectedIndices = /* @__PURE__ */ new Set;
    this.maxDisplay = options.maxDisplay || 10;
    this.isOpen = false;
    this.height = 1;
    if (this.multiple && this.selectedIndex >= 0) {
      this.selectedIndices.add(this.selectedIndex);
    }
    this.updateValue();
  }
  render() {
    if (!this.visible)
      return;
    if (this.focused && this.isOpen) {
      this.renderOpen();
    } else {
      this.renderClosed();
    }
  }
  renderClosed() {
    const selectedOption = this.options[this.selectedIndex];
    const label = selectedOption ? selectedOption.label : "Select...";
    const width = this.width || 30;
    let text = "";
    if (this.focused) {
      text += color(36);
    }
    text += "▼ " + label;
    if (text.length < width) {
      text += " ".repeat(width - label.length - 2);
    }
    text += reset();
    this.screen.writeAt(this.x, this.y, text);
  }
  renderOpen() {
    const width = this.width || 30;
    const displayCount = Math.min(this.options.length, this.maxDisplay);
    this.screen.writeAt(this.x, this.y, "▲ Select option" + " ".repeat(width - 15));
    this.screen.writeAt(this.x, this.y + 1, "┌" + "─".repeat(width - 2) + "┐");
    const visibleOptions = this.options.slice(this.scrollOffset, this.scrollOffset + displayCount);
    visibleOptions.forEach((option, index) => {
      const actualIndex = this.scrollOffset + index;
      const isHovered = actualIndex === this.hoveredIndex;
      const isSelected = this.multiple ? this.selectedIndices.has(actualIndex) : actualIndex === this.selectedIndex;
      let line = "│ ";
      if (this.multiple) {
        line += isSelected ? "[✓] " : "[ ] ";
      } else {
        line += isSelected ? "● " : "○ ";
      }
      let optionText = option.label;
      if (option.disabled) {
        optionText = color(90) + optionText + reset();
      } else if (isHovered) {
        optionText = color(30, 46) + optionText + reset();
      } else if (isSelected && !this.multiple) {
        optionText = color(36) + optionText + reset();
      }
      line += optionText;
      const lineLength = this.stripAnsi(line).length;
      if (lineLength < width - 1) {
        line += " ".repeat(width - lineLength - 1);
      }
      line += "│";
      this.screen.writeAt(this.x, this.y + 2 + index, line);
    });
    this.screen.writeAt(this.x, this.y + 2 + displayCount, "└" + "─".repeat(width - 2) + "┘");
    if (this.options.length > this.maxDisplay) {
      const scrollbarHeight = Math.max(1, Math.floor(displayCount * displayCount / this.options.length));
      const scrollbarPosition = Math.floor(this.scrollOffset * displayCount / this.options.length);
      for (let i = 0;i < displayCount; i++) {
        const char = i >= scrollbarPosition && i < scrollbarPosition + scrollbarHeight ? "█" : "│";
        this.screen.writeAt(this.x + width - 1, this.y + 2 + i, char);
      }
    }
    this.height = displayCount + 3;
  }
  stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, "");
  }
  handleKey(key, _event) {
    if (!this.focused)
      return;
    switch (key) {
      case "return":
      case "space":
        if (this.isOpen) {
          this.selectCurrent();
        } else {
          this.open();
        }
        break;
      case "escape":
        if (this.isOpen) {
          this.close();
        }
        break;
      case "up":
        if (this.isOpen) {
          this.moveUp();
        }
        break;
      case "down":
        if (this.isOpen) {
          this.moveDown();
        } else {
          this.open();
        }
        break;
      case "home":
        if (this.isOpen) {
          this.hoveredIndex = 0;
          this.scrollOffset = 0;
        }
        break;
      case "end":
        if (this.isOpen) {
          this.hoveredIndex = this.options.length - 1;
          this.updateScroll();
        }
        break;
      case "pageup":
        if (this.isOpen) {
          this.hoveredIndex = Math.max(0, this.hoveredIndex - this.maxDisplay);
          this.updateScroll();
        }
        break;
      case "pagedown":
        if (this.isOpen) {
          this.hoveredIndex = Math.min(this.options.length - 1, this.hoveredIndex + this.maxDisplay);
          this.updateScroll();
        }
        break;
    }
    this.render();
  }
  open() {
    this.isOpen = true;
    this.hoveredIndex = this.selectedIndex;
    this.updateScroll();
    this.emit("open");
  }
  close() {
    this.isOpen = false;
    this.height = 1;
    this.clear();
    this.emit("close");
  }
  moveUp() {
    do {
      this.hoveredIndex = Math.max(0, this.hoveredIndex - 1);
    } while (this.hoveredIndex > 0 && this.options[this.hoveredIndex]?.disabled);
    this.updateScroll();
  }
  moveDown() {
    do {
      this.hoveredIndex = Math.min(this.options.length - 1, this.hoveredIndex + 1);
    } while (this.hoveredIndex < this.options.length - 1 && this.options[this.hoveredIndex]?.disabled);
    this.updateScroll();
  }
  updateScroll() {
    if (this.hoveredIndex < this.scrollOffset) {
      this.scrollOffset = this.hoveredIndex;
    } else if (this.hoveredIndex >= this.scrollOffset + this.maxDisplay) {
      this.scrollOffset = this.hoveredIndex - this.maxDisplay + 1;
    }
  }
  selectCurrent() {
    const option = this.options[this.hoveredIndex];
    if (!option || option.disabled)
      return;
    if (this.multiple) {
      if (this.selectedIndices.has(this.hoveredIndex)) {
        this.selectedIndices.delete(this.hoveredIndex);
      } else {
        this.selectedIndices.add(this.hoveredIndex);
      }
      this.updateValue();
    } else {
      this.selectedIndex = this.hoveredIndex;
      this.updateValue();
      this.close();
    }
    this.emit("select", this.value);
  }
  updateValue() {
    if (this.multiple) {
      this.value = Array.from(this.selectedIndices).map((i) => this.options[i]?.value);
    } else {
      this.value = this.options[this.selectedIndex]?.value;
    }
  }
  clear() {
    for (let i = 0;i < this.height; i++) {
      this.screen.writeAt(this.x, this.y + i, " ".repeat(this.width || 30));
    }
  }
  setOptions(options) {
    this.options = options;
    this.selectedIndex = 0;
    this.hoveredIndex = 0;
    this.scrollOffset = 0;
    this.selectedIndices.clear();
    this.updateValue();
    this.render();
  }
  getSelectedOption() {
    return this.options[this.selectedIndex] || null;
  }
  getSelectedOptions() {
    if (this.multiple) {
      return Array.from(this.selectedIndices).map((i) => this.options[i]).filter((option2) => option2 !== undefined);
    }
    const option = this.getSelectedOption();
    return option ? [option] : [];
  }
};
var Checkbox = class extends Component {
  constructor(screen, keyboard, options) {
    super(screen, keyboard, options);
    this.label = options.label;
    this.checked = options.checked || false;
    this.disabled = options.disabled || false;
    this.value = this.checked;
  }
  render() {
    if (!this.visible)
      return;
    let text = "";
    if (this.disabled) {
      text += color(90);
    } else if (this.focused) {
      text += color(36);
    }
    text += this.checked ? "[✓] " : "[ ] ";
    text += this.label;
    text += reset();
    this.screen.writeAt(this.x, this.y, text);
  }
  handleKey(key, _event) {
    if (!this.focused || this.disabled)
      return;
    if (key === "space" || key === "return") {
      this.toggle();
    }
  }
  toggle() {
    if (this.disabled)
      return;
    this.checked = !this.checked;
    this.value = this.checked;
    this.render();
    this.emit("change", this.checked);
  }
  check() {
    if (this.disabled)
      return;
    this.checked = true;
    this.value = true;
    this.render();
    this.emit("change", true);
  }
  uncheck() {
    if (this.disabled)
      return;
    this.checked = false;
    this.value = false;
    this.render();
    this.emit("change", false);
  }
  isChecked() {
    return this.checked;
  }
  setDisabled(disabled) {
    this.disabled = disabled;
    this.render();
  }
  isDisabled() {
    return this.disabled;
  }
};
var Spinner = class extends Component {
  constructor(screen, keyboard, options = {}) {
    super(screen, keyboard, options);
    this.text = options.text || "";
    this.style = options.style || "dots";
    this.spinnerColor = options.color || 36;
    this.currentFrame = 0;
    this.interval = null;
    this.isSpinning = false;
    this.frames = this.getFrames(this.style);
  }
  getFrames(style2) {
    const styles = {
      dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
      line: ["-", "\\", "|", "/"],
      circle: ["◜", "◠", "◝", "◞", "◡", "◟"],
      square: ["◰", "◳", "◲", "◱"],
      arrow: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
      pulse: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"]
    };
    return styles[style2] ?? styles.dots;
  }
  render() {
    if (!this.visible || !this.isSpinning)
      return;
    const frame = this.frames[this.currentFrame];
    let output = color(this.spinnerColor) + frame + reset();
    if (this.text) {
      output += " " + this.text;
    }
    this.screen.writeAt(this.x, this.y, output + "  ");
  }
  start() {
    if (this.isSpinning)
      return;
    this.isSpinning = true;
    this.currentFrame = 0;
    this.interval = setInterval(() => {
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      this.render();
    }, 80);
    this.render();
    this.emit("start");
  }
  stop() {
    if (!this.isSpinning)
      return;
    this.isSpinning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.clear();
    this.emit("stop");
  }
  succeed(text) {
    this.stop();
    const successText = color(32) + "✓" + reset() + " " + (text || this.text);
    this.screen.writeAt(this.x, this.y, successText);
    this.emit("succeed", text);
  }
  fail(text) {
    this.stop();
    const failText = color(31) + "✗" + reset() + " " + (text || this.text);
    this.screen.writeAt(this.x, this.y, failText);
    this.emit("fail", text);
  }
  warn(text) {
    this.stop();
    const warnText = color(33) + "⚠" + reset() + " " + (text || this.text);
    this.screen.writeAt(this.x, this.y, warnText);
    this.emit("warn", text);
  }
  info(text) {
    this.stop();
    const infoText = color(34) + "ℹ" + reset() + " " + (text || this.text);
    this.screen.writeAt(this.x, this.y, infoText);
    this.emit("info", text);
  }
  setText(text) {
    this.text = text;
    this.render();
  }
  setStyle(style2) {
    this.style = style2;
    this.frames = this.getFrames(style2);
    this.currentFrame = 0;
    this.render();
  }
  handleKey(_key, _event) {}
  clear() {
    if (!this.visible)
      return;
    const clearLength = (this.frames[0]?.length || 1) + (this.text ? this.text.length + 1 : 0) + 2;
    this.screen.writeAt(this.x, this.y, " ".repeat(clearLength));
  }
};
var ProgressBar = class extends Component {
  constructor(screen, keyboard, options) {
    super(screen, keyboard, options);
    this.total = options.total;
    this.current = options.current || 0;
    this.showPercentage = options.showPercentage !== false;
    this.showNumbers = options.showNumbers || false;
    this.barWidth = options.barWidth || 30;
    this.completeChar = options.completeChar || "█";
    this.incompleteChar = options.incompleteChar || "░";
    this.barColor = options.barColor || 32;
    this.value = this.getPercentage();
  }
  render() {
    if (!this.visible)
      return;
    const percentage = this.getPercentage();
    const filled = Math.floor(this.barWidth * percentage / 100);
    const empty = this.barWidth - filled;
    let output = "";
    output += "[";
    output += color(this.barColor) + this.completeChar.repeat(filled) + reset();
    output += this.incompleteChar.repeat(empty);
    output += "]";
    if (this.showPercentage) {
      output += ` ${percentage}%`;
    }
    if (this.showNumbers) {
      output += ` (${this.current}/${this.total})`;
    }
    this.screen.writeAt(this.x, this.y, output);
  }
  handleKey(_key, _event) {}
  getPercentage() {
    if (this.total === 0)
      return 0;
    return Math.min(100, Math.floor(this.current / this.total * 100));
  }
  setProgress(current) {
    this.current = Math.min(this.total, Math.max(0, current));
    this.value = this.getPercentage();
    this.render();
    this.emit("progress", this.current, this.total, this.value);
    if (this.current >= this.total) {
      this.emit("complete");
    }
  }
  increment(amount = 1) {
    this.setProgress(this.current + amount);
  }
  decrement(amount = 1) {
    this.setProgress(this.current - amount);
  }
  reset() {
    this.setProgress(0);
  }
  complete() {
    this.setProgress(this.total);
  }
  setTotal(total) {
    this.total = total;
    if (this.current > this.total) {
      this.current = this.total;
    }
    this.value = this.getPercentage();
    this.render();
  }
  getCurrent() {
    return this.current;
  }
  getTotal() {
    return this.total;
  }
};
var isTermux = () => {
  return process.env.TERMUX_VERSION !== undefined || process.env.PREFIX?.includes("com.termux") || false;
};
var isWindows = () => os.platform() === "win32";
var isMac = () => os.platform() === "darwin";
var isLinux = () => os.platform() === "linux";
var hasSudo = () => {
  if (isWindows())
    return false;
  if (isTermux())
    return false;
  try {
    execSync("which sudo", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
var hasSystemd = () => {
  if (!isLinux())
    return false;
  if (isTermux())
    return false;
  try {
    execSync("systemctl --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
var ServiceManager = class {
  constructor(serviceName) {
    this.platform = os2.platform();
    this.serviceName = serviceName;
  }
  createSystemdUserService(config) {
    const userServicePath = path2.join(os2.homedir(), ".config", "systemd", "user");
    if (!fs2.existsSync(userServicePath)) {
      fs2.mkdirSync(userServicePath, { recursive: true });
    }
    const serviceFile = path2.join(userServicePath, `${this.serviceName}.service`);
    const runtime = typeof global.Bun !== "undefined" ? "bun" : "node";
    const mainFile = runtime === "bun" ? "src/main.ts" : "dist/main.js";
    const serviceContent = `[Unit]
Description=${config.description || config.name}
After=network.target

[Service]
Type=simple
ExecStart=${process.execPath} ${path2.join(config.root, mainFile)}
WorkingDirectory=${config.root}
Restart=always
RestartSec=10
StandardOutput=append:${path2.join(os2.homedir(), ".local", "share", config.name, "logs", `${config.name}.log`)}
StandardError=append:${path2.join(os2.homedir(), ".local", "share", config.name, "logs", `${config.name}.error.log`)}

[Install]
WantedBy=default.target`;
    fs2.writeFileSync(serviceFile, serviceContent);
    execSync2("systemctl --user daemon-reload", { stdio: "ignore" });
    execSync2(`systemctl --user enable ${this.serviceName}`, { stdio: "ignore" });
    execSync2(`systemctl --user start ${this.serviceName}`, { stdio: "ignore" });
  }
  createLaunchdService(config) {
    const plistPath = path2.join(os2.homedir(), "Library", "LaunchAgents");
    if (!fs2.existsSync(plistPath)) {
      fs2.mkdirSync(plistPath, { recursive: true });
    }
    const plistFile = path2.join(plistPath, `com.${config.name}.plist`);
    const runtime = typeof global.Bun !== "undefined" ? "bun" : "node";
    const mainFile = runtime === "bun" ? "src/main.ts" : "dist/main.js";
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.${config.name}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${process.execPath}</string>
        <string>${path2.join(config.root, mainFile)}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${config.root}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path2.join(os2.homedir(), "Library", "Logs", config.name, `${config.name}.log`)}</string>
    <key>StandardErrorPath</key>
    <string>${path2.join(os2.homedir(), "Library", "Logs", config.name, `${config.name}.error.log`)}</string>
</dict>
</plist>`;
    fs2.writeFileSync(plistFile, plistContent);
    execSync2(`launchctl load "${plistFile}"`, { stdio: "ignore" });
  }
  createWindowsService(config) {
    const startupPath = path2.join(os2.homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
    const batchFile = path2.join(startupPath, `${config.name}.bat`);
    const runtime = typeof global.Bun !== "undefined" ? "bun" : "node";
    const mainFile = runtime === "bun" ? "src\\main.ts" : "dist\\main.js";
    const batchContent = `@echo off
cd /d "${config.root}"
start "" "${process.execPath}" "${path2.join(config.root, mainFile)}"
exit`;
    fs2.writeFileSync(batchFile, batchContent);
  }
  createTermuxService(config) {
    const servicePath = path2.join(process.env.PREFIX || "/data/data/com.termux/files/usr", "var", "service");
    if (!fs2.existsSync(servicePath)) {
      fs2.mkdirSync(servicePath, { recursive: true });
    }
    const serviceDir = path2.join(servicePath, config.name);
    const runFile = path2.join(serviceDir, "run");
    fs2.mkdirSync(serviceDir, { recursive: true });
    const runtime = typeof global.Bun !== "undefined" ? "bun" : "node";
    const mainFile = runtime === "bun" ? "src/main.ts" : "dist/main.js";
    const runContent = `#!/data/data/com.termux/files/usr/bin/sh
exec ${process.execPath} ${path2.join(config.root, mainFile)} 2>&1`;
    fs2.writeFileSync(runFile, runContent);
    fs2.chmodSync(runFile, 493);
    try {
      execSync2(`sv-enable ${config.name}`, { stdio: "ignore" });
    } catch {}
  }
  install(config) {
    if (isWindows()) {
      this.createWindowsService(config);
    } else if (isMac()) {
      this.createLaunchdService(config);
    } else if (isTermux()) {
      this.createTermuxService(config);
    } else if (hasSystemd()) {
      this.createSystemdUserService(config);
    } else {
      this.createCronJob(config);
    }
  }
  createCronJob(config) {
    const runtime = typeof global.Bun !== "undefined" ? "bun" : "node";
    const mainFile = runtime === "bun" ? "src/main.ts" : "dist/main.js";
    const cronCommand = `@reboot ${process.execPath} ${path2.join(config.root, mainFile)} >> ${path2.join(os2.homedir(), `.${config.name}`, "logs", `${config.name}.log`)} 2>&1`;
    try {
      let currentCron = "";
      try {
        currentCron = execSync2("crontab -l", { encoding: "utf8" });
      } catch {}
      if (!currentCron.includes(config.root)) {
        const newCron = currentCron + `
` + cronCommand + `
`;
        const tmpFile = path2.join(os2.tmpdir(), `cron-${Date.now()}`);
        fs2.writeFileSync(tmpFile, newCron);
        execSync2(`crontab "${tmpFile}"`, { stdio: "ignore" });
        fs2.unlinkSync(tmpFile);
      }
    } catch (error) {
      throw new Error(`Failed to install cron job: ${error.message}`);
    }
  }
  removeCronJob(config) {
    try {
      const currentCron = execSync2("crontab -l", { encoding: "utf8" });
      const lines = currentCron.split(`
`).filter((line) => !line.includes(config.root));
      const newCron = lines.join(`
`);
      const tmpFile = path2.join(os2.tmpdir(), `cron-${Date.now()}`);
      fs2.writeFileSync(tmpFile, newCron);
      execSync2(`crontab "${tmpFile}"`, { stdio: "ignore" });
      fs2.unlinkSync(tmpFile);
    } catch {}
  }
  stop(config) {
    if (isWindows()) {
      try {
        execSync2(`taskkill /F /IM node.exe /FI "WINDOWTITLE eq ${config.name}"`, { stdio: "ignore" });
      } catch {}
    } else if (isMac()) {
      try {
        execSync2(`launchctl stop com.${config.name}`, { stdio: "ignore" });
      } catch {}
    } else if (isTermux()) {
      try {
        execSync2(`sv stop ${config.name}`, { stdio: "ignore" });
      } catch {}
    } else if (hasSystemd()) {
      try {
        execSync2(`systemctl --user stop ${this.serviceName}`, { stdio: "ignore" });
      } catch {}
    }
    const pidFile = path2.join(config.root, `.${config.name}.pid`);
    if (fs2.existsSync(pidFile)) {
      try {
        const pid = parseInt(fs2.readFileSync(pidFile, "utf8"));
        process.kill(pid, "SIGTERM");
      } catch {}
      fs2.unlinkSync(pidFile);
    }
  }
  uninstall(config) {
    this.stop(config);
    if (isWindows()) {
      const startupPath = path2.join(os2.homedir(), "AppData", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
      const batchFile = path2.join(startupPath, `${config.name}.bat`);
      if (fs2.existsSync(batchFile)) {
        fs2.unlinkSync(batchFile);
      }
    } else if (isMac()) {
      const plistFile = path2.join(os2.homedir(), "Library", "LaunchAgents", `com.${config.name}.plist`);
      if (fs2.existsSync(plistFile)) {
        try {
          execSync2(`launchctl unload "${plistFile}"`, { stdio: "ignore" });
        } catch {}
        fs2.unlinkSync(plistFile);
      }
    } else if (isTermux()) {
      try {
        execSync2(`sv-disable ${config.name}`, { stdio: "ignore" });
      } catch {}
      const serviceDir = path2.join(process.env.PREFIX || "/data/data/com.termux/files/usr", "var", "service", config.name);
      if (fs2.existsSync(serviceDir)) {
        fs2.rmSync(serviceDir, { recursive: true });
      }
    } else if (hasSystemd()) {
      try {
        execSync2(`systemctl --user stop ${this.serviceName}`, { stdio: "ignore" });
        execSync2(`systemctl --user disable ${this.serviceName}`, { stdio: "ignore" });
      } catch {}
      const serviceFile = path2.join(os2.homedir(), ".config", "systemd", "user", `${this.serviceName}.service`);
      if (fs2.existsSync(serviceFile)) {
        fs2.unlinkSync(serviceFile);
        execSync2("systemctl --user daemon-reload", { stdio: "ignore" });
      }
    }
    this.removeCronJob(config);
  }
};
var TUI = class {
  constructor(options = {}) {
    this.title = options.title || "";
    this.screen = options.screen || new Screen;
    this.keyboard = options.keyboard || new Keyboard;
  }
  clear() {
    this.screen.clear();
  }
  createHeader() {
    const width = Math.min(this.screen.getWidth() - 2, 60);
    const isCompact = this.screen.getWidth() < 80;
    if (isCompact) {
      const line = "═".repeat(width);
      return `\x1B[36m${bold(line)}${reset()}
\x1B[36m${bold(`  ${this.title}`)}${reset()}
\x1B[36m${bold(line)}${reset()}`;
    } else {
      const lines = drawBox(width, 3, BoxStyles.Double);
      const padding = Math.floor((width - this.title.length - 2) / 2);
      const titleLine = "║" + " ".repeat(padding) + this.title + " ".repeat(width - padding - this.title.length - 2) + "║";
      return `\x1B[36m${bold(lines[0])}${reset()}
\x1B[36m${bold(titleLine)}${reset()}
\x1B[36m${bold(lines[2])}${reset()}`;
    }
  }
  createStatusSection(title, items) {
    const lines = [];
    lines.push(`
\x1B[35m${bold(`▶ ${title}`)}${reset()}`);
    lines.push(`\x1B[35m  ${"─".repeat(title.length)}${reset()}
`);
    items.forEach((item) => {
      const statusColor = item.status ? {
        success: "\x1B[32m",
        warning: "\x1B[33m",
        error: "\x1B[31m",
        info: "\x1B[36m"
      }[item.status] : "";
      const icon = item.status ? {
        success: "✓",
        warning: "⚠",
        error: "✗",
        info: "ℹ"
      }[item.status] : "";
      const iconStr = icon ? `${statusColor}${bold(icon)} ${reset()}` : "";
      const isCompact = this.screen.getWidth() < 80 || item.label.length + item.value.length > 50;
      if (isCompact) {
        lines.push(`${iconStr}${statusColor}${item.label}: ${item.value}${reset()}`);
      } else {
        const spacing = " ".repeat(Math.max(1, 20 - item.label.length));
        lines.push(`${iconStr}${statusColor}${item.label}:${spacing}${item.value}${reset()}`);
      }
    });
    return lines.join(`
`);
  }
  async prompt(label, defaultValue = "", password = false) {
    const input = new Input(this.screen, this.keyboard, {
      placeholder: label,
      value: defaultValue,
      password
    });
    return new Promise((resolve) => {
      input.on("submit", (value) => {
        input.clear();
        this.keyboard.stop();
        resolve(value);
      });
      this.keyboard.start();
      input.focus();
      input.render();
    });
  }
  async select(label, options, defaultIndex = 0) {
    const select = new Select(this.screen, this.keyboard, {
      options: options.map((opt) => ({ label: opt, value: opt })),
      selected: defaultIndex
    });
    return new Promise((resolve) => {
      select.on("submit", (value) => {
        select.clear();
        this.keyboard.stop();
        resolve(value);
      });
      this.keyboard.start();
      select.focus();
      select.render();
    });
  }
  async confirm(label, defaultValue = false) {
    const checkbox = new Checkbox(this.screen, this.keyboard, {
      label,
      checked: defaultValue
    });
    return new Promise((resolve) => {
      checkbox.on("submit", (value) => {
        checkbox.clear();
        this.keyboard.stop();
        resolve(value);
      });
      this.keyboard.start();
      checkbox.focus();
      checkbox.render();
    });
  }
  showError(message, details) {
    console.log(`
\x1B[31m${bold("✗ Error:")}${reset()} ${message}`);
    if (details) {
      console.log(`  ${dim(details)}`);
    }
  }
  showSuccess(message) {
    console.log(`
\x1B[32m${bold("✓ Success:")}${reset()} ${message}`);
  }
  showWarning(message) {
    console.log(`
\x1B[33m${bold("⚠ Warning:")}${reset()} ${message}`);
  }
  showInfo(message) {
    console.log(`
\x1B[36mℹ Info:${reset()} ${message}`);
  }
  showProgress(label, current, total) {
    const progress = new ProgressBar(this.screen, this.keyboard, {
      total,
      width: Math.min(40, this.screen.getWidth() - 20)
    });
    progress.setValue(current);
    progress.render();
    if (current >= total) {
      process.stdout.write(`
`);
    }
  }
  createSpinner(text) {
    return new Spinner(this.screen, this.keyboard, { text });
  }
  close() {
    this.keyboard.stop();
  }
};

// script/update.ts
var __filename2 = fileURLToPath(import.meta.url);
var __dirname3 = path3.dirname(__filename2);

class AirUpdater {
  config;
  ui;
  constructor() {
    const paths = getPaths();
    this.config = {
      root: paths.root,
      name: "air",
      env: "development"
    };
    this.ui = new TUI({ title: "Air System Updater" });
    this.loadConfig();
  }
  loadConfig() {
    const configPath = path3.join(this.config.root, "air.json");
    if (fs3.existsSync(configPath)) {
      try {
        const existing = JSON.parse(fs3.readFileSync(configPath, "utf8"));
        if (existing.name) {
          this.config.name = existing.name;
        }
        if (existing.env) {
          this.config.env = existing.env;
        }
        if (existing[existing.env]) {
          const envConfig = existing[existing.env];
          if (envConfig.domain) {
            this.config.domain = envConfig.domain;
          }
          if (envConfig.ssl) {
            this.config.ssl = envConfig.ssl;
          }
        }
      } catch (e) {
        this.ui.showWarning("Could not parse config file");
      }
    }
  }
  async run() {
    try {
      this.ui.clear();
      console.log(this.ui.createHeader());
      const tasks = [];
      let hasErrors = false;
      const gitResult = await this.gitPull();
      tasks.push({
        label: "Git repository",
        value: gitResult.success ? gitResult.message : "Failed",
        status: gitResult.success ? "success" : "error"
      });
      if (!gitResult.success)
        hasErrors = true;
      const npmResult = await this.packageUpdate();
      tasks.push({
        label: "Package dependencies",
        value: npmResult.success ? npmResult.message : "Failed",
        status: npmResult.success ? "success" : "error"
      });
      if (!npmResult.success)
        hasErrors = true;
      if (this.config.domain && this.config.domain !== "localhost") {
        const sslResult = await this.renewSSL();
        tasks.push({
          label: "SSL certificate",
          value: sslResult.success ? sslResult.message : "Failed",
          status: sslResult.success ? "success" : "warning"
        });
      }
      const serviceResult = await this.restartService();
      tasks.push({
        label: "Service restart",
        value: serviceResult.success ? serviceResult.message : serviceResult.message,
        status: serviceResult.success ? "success" : "warning"
      });
      const statusSection = this.ui.createStatusSection("Update Results", tasks);
      console.log(statusSection);
      if (hasErrors) {
        this.ui.showWarning("Update completed with some errors");
      } else {
        this.ui.showSuccess("All updates completed successfully!");
      }
    } catch (err) {
      this.ui.showError("Update failed", err.message);
      process.exit(1);
    } finally {
      this.ui.close();
    }
  }
  async gitPull() {
    try {
      execSync3("git status", { stdio: "ignore", cwd: this.config.root });
      const status = execSync3("git status --porcelain", { encoding: "utf8", cwd: this.config.root });
      if (status.trim()) {
        execSync3("git stash", { stdio: "ignore", cwd: this.config.root });
      }
      const output = execSync3("git pull", { encoding: "utf8", cwd: this.config.root });
      if (output.includes("Already up to date")) {
        return { success: true, message: "Already up to date" };
      } else {
        return { success: true, message: "Updated from repository" };
      }
    } catch (e) {
      return { success: false, message: "Not a git repository" };
    }
  }
  async packageUpdate() {
    try {
      const isBun = typeof Bun !== "undefined";
      if (isBun) {
        execSync3("bun update", { stdio: "ignore", cwd: this.config.root });
        return { success: true, message: "Bun packages updated" };
      } else {
        execSync3("npm update", { stdio: "ignore", cwd: this.config.root });
        try {
          execSync3("npm audit fix", { stdio: "ignore", cwd: this.config.root });
        } catch {}
        return { success: true, message: "NPM packages updated" };
      }
    } catch (e) {
      return { success: false, message: "Package update failed" };
    }
  }
  async renewSSL() {
    try {
      if (this.config.ssl) {
        const keyExists = fs3.existsSync(this.config.ssl.key);
        const certExists = fs3.existsSync(this.config.ssl.cert);
        if (keyExists && certExists) {
          try {
            const certInfo = execSync3(`openssl x509 -enddate -noout -in "${this.config.ssl.cert}"`, { encoding: "utf8" });
            const expiryMatch = certInfo.match(/notAfter=(.+)/);
            if (expiryMatch) {
              const expiryDate = new Date(expiryMatch[1]);
              const daysUntilExpiry = Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysUntilExpiry > 30) {
                return { success: true, message: `Valid for ${daysUntilExpiry} days` };
              }
            }
          } catch {}
        }
      }
      if (hasSudo()) {
        try {
          execSync3("which certbot", { stdio: "ignore" });
          const output = execSync3("sudo certbot renew --quiet", { encoding: "utf8" });
          if (output && output.includes("renewed")) {
            return { success: true, message: "Certificate renewed" };
          } else {
            return { success: true, message: "Certificate up to date" };
          }
        } catch {}
      }
      return { success: true, message: "Manual renewal required" };
    } catch (e) {
      return { success: false, message: "SSL check skipped" };
    }
  }
  async restartService() {
    const service = new ServiceManager(`air-${this.config.name}`);
    try {
      const pidFile = path3.join(this.config.root, `.${this.config.name}.pid`);
      if (fs3.existsSync(pidFile)) {
        try {
          const pid = parseInt(fs3.readFileSync(pidFile, "utf8"));
          try {
            process.kill(pid, 0);
            process.kill(pid, "SIGTERM");
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const runtime = typeof Bun !== "undefined" ? "bun" : "node";
            const mainFile = runtime === "bun" ? "src/main.ts" : "dist/main.js";
            const startCmd = `${runtime} ${path3.join(this.config.root, mainFile)}`;
            execSync3(`${startCmd} > /dev/null 2>&1 &`, {
              cwd: this.config.root,
              shell: "/bin/bash"
            });
            return { success: true, message: "Process restarted" };
          } catch {
            fs3.unlinkSync(pidFile);
          }
        } catch {}
      }
      if (isWindows()) {
        const startupPath = path3.join(process.env.APPDATA || "", "..", "Roaming", "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
        const batchFile = path3.join(startupPath, `air-${this.config.name}.bat`);
        if (fs3.existsSync(batchFile)) {
          return { success: true, message: "Restart on next login" };
        }
      } else if (isMac()) {
        try {
          execSync3(`launchctl stop com.air.${this.config.name}`, { stdio: "ignore" });
          await new Promise((resolve) => setTimeout(resolve, 1000));
          execSync3(`launchctl start com.air.${this.config.name}`, { stdio: "ignore" });
          return { success: true, message: "launchd service restarted" };
        } catch {}
      } else if (isTermux()) {
        try {
          execSync3(`sv restart air-${this.config.name}`, { stdio: "ignore" });
          return { success: true, message: "Termux service restarted" };
        } catch {}
      } else if (hasSystemd()) {
        try {
          execSync3(`systemctl --user restart air-${this.config.name}`, { stdio: "ignore" });
          return { success: true, message: "User service restarted" };
        } catch {
          if (hasSudo()) {
            try {
              execSync3(`sudo systemctl restart air-${this.config.name}`, { stdio: "ignore" });
              return { success: true, message: "System service restarted" };
            } catch {}
          }
        }
      }
      return {
        success: false,
        message: "No service found (start manually)"
      };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }
}
var updater = new AirUpdater;
updater.run().catch((e) => {
  console.error("Update failed:", e.message);
  process.exit(1);
});
