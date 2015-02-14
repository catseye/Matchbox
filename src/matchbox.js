"use strict";

function launch(prefix, container, config) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    config = config || {};
    var deps = [
        "scanner.js",
        "element-factory.js"
    ];
    var loaded = 0;
    for (var i = 0; i < deps.length; i++) {
        var elem = document.createElement('script');
        elem.src = prefix + deps[i];
        elem.onload = function() {
            if (++loaded < deps.length) return;

            var prog1ta = yoob.makeTextArea(container, 20, 10);
            var prog2ta = yoob.makeTextArea(container, 20, 10);

            prog1ta.value = "MOV M0, R0\nINC R0\nMOV R0, M0";
            prog2ta.value = "MOV M0, R0\nINC R0\nMOV R0, M0";

            var interleaveBtn = yoob.makeButton(container, "Interleave");

            var output = yoob.makePre(container);

            initScanner();

            interleaveBtn.onclick = function() {
                var x = parseCode(prog1ta.value);
                var y = parseCode(prog2ta.value);

                output.innerHTML = '';
                var interleavings = findAllInterleavings(x, y);
                for (var i = 0; i < interleavings.length; i++) {
                    output.innerHTML += '[' + interleavings[i] + ']\n';
                }
            };

        };
        document.body.appendChild(elem);
    }
}

var matchboxScanner;

function initScanner() {
    matchboxScanner = (new yoob.Scanner());
    matchboxScanner.init([
        ['immediate', "^(\\d+)"],
        ['register',  "^([rR]\\d+)"],
        ['memory',    "^([mM]\\d+)"],
        ['opcode',    "^([a-zA-Z]+)"],
        ['comma',     "^(,)"]
    ]);
}

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
