"use strict";

function launch(prefix, container, config) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    config = config || {};
    var deps = [
        "scanner.js",
        "tape.js",
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

            var output = yoob.makeDiv(container);

            initScanner();

            var matchbox = (new Matchbox()).init({});

            interleaveBtn.onclick = function() {
                output.innerHTML =  matchbox.load(prog1ta.value, prog2ta.value);
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
 *   `reg`: yoob.Tape that it will use for its registers
 *   `opcode`: what the instruction does
 *   `srcType`: 'R' or 'M'
 *   `src`: location in registers or memory
 *   `destType`: 'R' or 'M'
 *   `dest`: location in registers or memory
 */
var Instruction = function() {
    this.init = function(cfg) {
        cfg = cfg || {};
        this.reg = cfg.reg;
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

    this.execute = function(mem) {
        if (this.opcode === 'MOV') {
            var val;
            if (this.srcType === 'I') {
                val = this.src;
            } else if (this.srcType === 'R') {
                val = this.reg.get(this.src);
            } else if (this.srcType === 'M') {
                val = mem[this.src] || 0;
            } else {
                alert("Illegal srcType: " + this.srcType);
                return false;
            }
            if (this.destType === 'R') {
                this.reg.put(this.get, val);
            } else if (this.destType === 'M') {
                mem[this.dest] = val;
            } else {
                alert("Illegal destType: " + this.destType);
                return false;
            }
            return true;
        } else if (this.opcode === 'INC') {
            var val;
            if (this.srcType === 'R') {
                this.reg.put(this.src, this.reg.get(this.src));
            } else if (this.srcType === 'M') {
                mem[this.src] += 1;
            } else {
                alert("Illegal srcType: " + this.srcType);
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

    this.toHTML = function() {
        return (
            '<span style="' + this.reg.style + '">' +
            this.toString() +
            '</span>'
        );
    };
};

var Program = function() {
    this.init = function(cfg) {
        cfg = cfg || {};
        this.code = cfg.code || [];
        return this;
    };

    this.parse = function(reg, str) {
        var lines = str.split("\n");
        this.code = [];
        for (var i = 0; i < lines.length; i++) {
            var instr = (new Instruction()).init({
                'reg': reg
            });
            if (!lines[i]) continue;
            if (instr.parse(lines[i])) {
                this.code.push(instr);
            } else {
                alert("Syntax error on line " + (i+1));
            }
        }
        return this;
    };

    this.run = function() {
        var mem = {};
        var code = this.code;

        for (var i = 0; i < code.length; i++) {
            if (!code[i].execute(mem)) {
                alert('Aborted');
                break;
            }
        }
    };

    this.toHTML = function() {
        var s = '';
        var code = this.code;

        for (var i = 0; i < code.length; i++) {
            s += code[i].toHTML();
        }

        return s;
    };

    /*
     * Given another Program object, returns a list of Program objects,
     * with each of these being a possible interleaving of the two Programs. 
     */
    this.getAllInterleavingsWith = function(other) {
        var interleavings = this.findAllInterleavings(this.code, other.code);
        for (var i = 0; i < interleavings.length; i++) {
            interleavings[i] = (new Program()).init({ code: interleavings[i] });
        }
        return interleavings;
    };

    /*
     * All interleavings of A and B is:
     * first element of A prepended to all interleavings of rest of A and B, plus
     * first element of B prepended to all interleavings of A and rest of B
     * (unless A or B is empty of course, in which case, it's just the other)
     */
    this.findAllInterleavings = function(a, b) {
        if (a.length === 0) {
            return [b];
        } else if (b.length === 0) {
            return [a];
        } else {
            var result = [];
    
            var fst = a[0];
            var rst = a.concat([]);
            rst.shift();
            var inters = this.findAllInterleavings(rst, b);
            for (var i = 0; i < inters.length; i++) {
                result.push([fst].concat(inters[i]));
            }
    
            var fst = b[0];
            var rst = b.concat([]);
            rst.shift();
            var inters = this.findAllInterleavings(a, rst);
            for (var i = 0; i < inters.length; i++) {
                result.push([fst].concat(inters[i]));
            }
    
            return result;
        }
    };

};

var Matchbox = function() {
    this.init = function(cfg) {
        cfg = cfg || {};
        return this;
    };

    this.load = function(prog1text, prog2text) {
        var regs1 = (new yoob.Tape()); //.init({});
        regs1.style = "color: black; background: white;";
        var prog1 = (new Program()).parse(regs1, prog1text);

        var regs2 = (new yoob.Tape()); //.init({});
        regs2.style = "color: white; background: black;";
        var prog2 = (new Program()).parse(regs2, prog2text);

        var html = '';
        var interleavings = prog1.getAllInterleavingsWith(prog2);
        for (var i = 0; i < interleavings.length; i++) {
            var prog = interleavings[i];
            html += prog.toHTML() + '<br/>';
            //regs1.clear();
            //regs2.clear();
            prog.run();
        }

        return html;
    };
};
