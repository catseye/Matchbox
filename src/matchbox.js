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

            var matchbox = (new Matchbox()).init({});
            var output;

            var prog1Ctr = yoob.makeDiv(container);
            prog1Ctr.style.display = 'inline-block';
            var run1Btn = yoob.makeButton(prog1Ctr, "Run", function() {
                output.innerHTML =  matchbox.run(prog1ta.value);
            });
            yoob.makeLineBreak(prog1Ctr);
            var prog1ta = yoob.makeTextArea(prog1Ctr, 20, 10);
            prog1ta.value = "MOV M0, R0\nINC R0\nMOV R0, M0";

            var prog2Ctr = yoob.makeDiv(container);
            prog2Ctr.style.display = 'inline-block';
            var run2Btn = yoob.makeButton(prog2Ctr, "Run", function() {
                output.innerHTML =  matchbox.run(prog2ta.value);
            });
            yoob.makeLineBreak(prog2Ctr);
            var prog2ta = yoob.makeTextArea(prog2Ctr, 20, 10);
            prog2ta.value = "MOV M0, R0\nINC R0\nMOV R0, M0";

            var findRacesBtn = yoob.makeButton(
                container, "Find Race Conditions", function() {
                output.innerHTML =  matchbox.findRaceConditions(
                    prog1ta.value, prog2ta.value
                );
            });

            output = yoob.makeDiv(container);
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

    /*
     * Given a yoob.Tape that represents shared memory, execute this
     * Instruction.
     */
    this.execute = function(mem) {
        if (this.opcode === 'MOV') {
            var val;
            if (this.srcType === 'I') {
                val = this.src;
            } else if (this.srcType === 'R') {
                val = this.reg.get(this.src);
            } else if (this.srcType === 'M') {
                val = mem.get(this.src);
            } else {
                alert("Illegal srcType: " + this.srcType);
                return false;
            }
            if (this.destType === 'R') {
                this.reg.put(this.dest, val);
            } else if (this.destType === 'M') {
                mem.put(this.dest, val);
            } else {
                alert("Illegal destType: " + this.destType);
                return false;
            }
            return true;
        } else if (this.opcode === 'INC') {
            var val;
            if (this.srcType === 'R') {
                this.reg.put(this.src, this.reg.get(this.src) + 1);
            } else if (this.srcType === 'M') {
                this.mem.put(this.src, this.mem.get(this.src) + 1);
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

    this.run = function(mem) {
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
        initScanner();
        return this;
    };

    this.tapeToString = function(tape) {
        var s = '';
        tape.foreach(function(pos, val) {
            s += '(' + pos + "=" + val + ")";
        });
        return s;
    };

    this.run = function(progText) {
        var regs = (new yoob.Tape()).init({ default: 0 });
        regs.style = "color: white; background: black;";
        var prog = (new Program()).parse(regs, progText);

        var mem = (new yoob.Tape()).init({ default: 0 });

        prog.run(mem);
        var html = 'R:' + this.tapeToString(regs) + ", M:" + this.tapeToString(mem);

        return html;
    };

    this.findRaceConditions = function(prog1text, prog2text) {
        var regs1 = (new yoob.Tape()).init({ default: 0 });
        regs1.style = "color: black; background: white;";
        var prog1 = (new Program()).parse(regs1, prog1text);

        var regs2 = (new yoob.Tape()).init({ default: 0 });
        regs2.style = "color: white; background: black;";
        var prog2 = (new Program()).parse(regs2, prog2text);

        var mem = (new yoob.Tape()).init({ default: 0 });

        var html = '';
        var interleavings = prog1.getAllInterleavingsWith(prog2);
        for (var i = 0; i < interleavings.length; i++) {
            var prog = interleavings[i];
            html += prog.toHTML();
            regs1.clear();
            regs2.clear();
            mem.clear();
            prog.run(mem);
            html += this.tapeToString(mem);
            html += '<br/>';
        }

        return html;
    };
};
