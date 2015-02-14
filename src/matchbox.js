"use strict";

/*
 * A lexical analyzer.
 * Create a new yoob.Scanner object, then call init, passing it an
 * array of two-element arrays; first element of each of these is the
 * type of token, the second element is a regular expression (in a
 * String) which matches that token at the start of the string.  The
 * regular expression should have exactly one capturing group.
 * Then call reset, passing it the string to be scanned.
 * 
 */
var Scanner = function() {
  this.text = undefined;
  this.token = undefined;
  this.type = undefined;
  this.error = undefined;
  this.table = undefined;
  this.whitespacePattern = "^[ \\t\\n\\r]*";

  this.init = function(table) {
    this.table = table;
    return this;
  };

  this.reset = function(text) {
    this.text = text;
    this.token = undefined;
    this.type = undefined;
    this.error = undefined;
    this.scan();
  };
  
  this.scanPattern = function(pattern, type) {
    var re = new RegExp(pattern);
    var match = re.exec(this.text);
    if (match === null) return false;
    this.type = type;
    this.token = match[1];
    this.text = this.text.substr(match[0].length);
    //console.log(this.type, this.token);
    return true;
  };

  this.scan = function() {
    this.scanPattern(this.whitespacePattern, "whitespace");
    if (this.text.length === 0) {
      this.token = null;
      this.type = "EOF";
      return;
    }
    for (var i = 0; i < this.table.length; i++) {
      var type = this.table[i][0];
      var pattern = this.table[i][1];
      if (this.scanPattern(pattern, type)) return;
    }
    if (this.scanPattern("^([\\s\\S])", "unknown character")) return;
    // should never get here
  };

  this.expect = function(token) {
    if (this.token === token) {
      this.scan();
    } else {
      this.error = "expected '" + token + "' but found '" + this.token + "'";
    }
  };

  this.on = function(token) {
    return this.token === token;
  };

  this.onType = function(type) {
    return this.type === type;
  };

  this.checkType = function(type) {
    if (this.type !== type) {
      this.error = "expected " + type + " but found " + this.type + " (" + this.token + ")"
    }
  };

  this.expectType = function(type) {
    this.checkType(type);
    this.scan();
  };

  this.consume = function(token) {
    if (this.on(token)) {
      this.scan();
      return true;
    } else {
      return false;
    }
  };

};

var matchboxScanner = (new Scanner()).init([
    ['immediate', "^(\\d+)"],
    ['register',  "^([rR]\\d+)"],
    ['memory',    "^([mM]\\d+)"],
    ['opcode',    "^([a-zA-Z]+)"],
    ['comma',     "^(,)"]
]);

/*
 * Each instruction is an object with some fields:
 *   `opcode`: what the instruction does
 *   `srcType`: 'R' or 'M'
 *   `src`: location in registers or memory
 *   `destType`: 'R' or 'M'
 *   `dest`: location in registers or memory
 */
var Instruction = function() {
    this.init = function(cfg) {
        cfg = cfg || {};
        this.opcode = cfg.opcode;
        this.srcType = cfg.srcType;
        this.src = cfg.src;
        this.destType = cfg.destType;
        this.dest = cfg.dest;
        return this;
    };

    this.parse = function(str) {
        this.opcode = undefined;
        this.srcType = undefined;
        this.src = undefined;
        this.destType = undefined;
        this.dest = undefined;
        var s = matchboxScanner;
        s.reset(str);
        if (s.onType('opcode')) {
            this.opcode = s.token;
            s.scan();
            if (s.onType('immediate')) {
                this.srcType = 'I';
                this.src = parseInt(s.token, 10);
                s.scan();
            } else if (s.onType('register')) {
                this.srcType = 'R';
                this.src = parseInt(s.token.substr(1), 10);
                s.scan();
            } else if (s.onType('memory')) {
                this.srcType = 'M';
                this.src = parseInt(s.token.substr(1), 10);
                s.scan();
            }
            if (s.consume(',')) {
                if (s.onType('register')) {
                    this.destType = 'R';
                    this.dest = parseInt(s.token.substr(1), 10);
                    s.scan();
                } else if (s.onType('memory')) {
                    this.destType = 'M';
                    this.dest = parseInt(s.token.substr(1), 10);
                    s.scan();
                }
            }
        }
        return this;
    };

    this.execute = function(reg, mem) {
        if (this.opcode === 'MOV') {
            var val;
            if (this.srcType === 'I') {
                val = this.src;
            } else if (this.srcType === 'R') {
                val = reg[this.src] || 0;
            } else if (this.srcType === 'M') {
                val = mem[this.src] || 0;
            } else {
                alert("Illegal srcType: " + this.srcType);
                return false;
            }
            if (this.destType === 'R') {
                reg[this.dest] = val;
            } else if (this.srcType === 'M') {
                mem[this.dest] = val;
            } else {
                alert("Illegal destType: " + this.destType);
                return false;
            }
            return true;
        } else {
            alert("Illegal opcode: " + this.opcode);
            return false;
        }
    };

    this.toString = function() {
        return (
            this.opcode + ' ' +
            (this.srcType === 'I' ? '' : this.srcType) + this.src +
            (this.destType === undefined ? '' : (', ' + this.destType + this.dest))
        );
    };
};

var parseCode = function(str) {
    var lines = str.split("\n");
    var code = [];
    for (var i = 0; i < lines.length; i++) {
        var instr = new Instruction();
        if (!lines[i]) continue;
        if (instr.parse(lines[i])) {
            code.push(instr);
        } else {
            alert("Syntax error on line " + (i+1));
        }
    }
    return code;
};

/*
 * `code` is a list of instructions.
 */
var interpret = function(code) {
    var reg = {};
    var mem = {};

    for (var i = 0; i < code.length; i++) {
        if (!code[i].execute(reg, mem)) {
            alert('Aborted');
            break;
        }
    }
};

/*
 * All interleavings of A and B is:
 * first element of A prepended to all interleavings of rest of A and B, plus
 * first element of B prepended to all interleavings of A and rest of B
 * (unless A or B is empty of course, in which case, it's just the other)
 */
var findAllInterleavings = function(a, b) {
    if (a.length === 0) {
        return [b];
    } else if (b.length === 0) {
        return [a];
    } else {
        var result = [];

        var fst = a[0];
        var rst = a.concat([]);
        rst.shift();
        var inters = findAllInterleavings(rst, b);
        for (var i = 0; i < inters.length; i++) {
            result.push([fst].concat(inters[i]));
        }

        var fst = b[0];
        var rst = b.concat([]);
        rst.shift();
        var inters = findAllInterleavings(a, rst);
        for (var i = 0; i < inters.length; i++) {
            result.push([fst].concat(inters[i]));
        }

        return result;
    }
};
