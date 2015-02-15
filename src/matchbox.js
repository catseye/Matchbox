"use strict";

/*
 * All interleavings of A and B is:
 * first element of A prepended to all interleavings of rest of A and B, plus
 * first element of B prepended to all interleavings of A and rest of B
 * (unless A or B is empty of course, in which case, it's just the other)
 */
function findAllInterleavings(a, b) {
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
                if (s.onType('immediate')) {
                    this.destType = 'I';
                    this.dest = parseInt(s.token, 10);
                    s.scan();
                } else if (s.onType('register')) {
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
     * Instruction.  May return:
     *
     * true, to indicate that the instruction executed successfully;
     * an error string, to indicate that the instruction was malformed; or
     * null, to indicate this interleaving would not be possible.
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
                return "Illegal source reference";
            }
            if (this.destType === 'R') {
                this.reg.put(this.dest, val);
            } else if (this.destType === 'M') {
                mem.put(this.dest, val);
            } else {
                return "Illegal destination reference";
            }
            return true;
        } else if (this.opcode === 'INC') {
            if (this.srcType === 'R') {
                this.reg.put(this.src, this.reg.get(this.src) + 1);
            } else if (this.srcType === 'M') {
                mem.put(this.src, mem.get(this.src) + 1);
            } else {
                return "Illegal source reference";
            }
            return true;
        } else if (this.opcode === 'WAIT') {
            if (this.srcType === 'M' && this.destType === 'I') {
                if (mem.get(this.src) !== this.dest) {
                    return null;
                }
            } else {
                return "Illegal source/destination reference";
            }
            return true;
        } else {
            return "Illegal opcode";
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

    this.addInstruction = function(instr) {
        this.code.push(instr);
    };

    /*
     * Update all Instructions in this Program to use the given
     * yoob.Tape as their register context.  Chainable.
     */
    this.setRegisters = function(reg) {
        var code = this.code;

        for (var i = 0; i < code.length; i++) {
            code[i].reg = reg;
        }

        return this;
    };

    /*
     * May return:
     *
     * true, to indicate that the program executed successfully;
     * an error string, to indicate that an instruction was malformed; or
     * null, to indicate this interleaving would not be possible.
     */
    this.run = function(mem) {
        var code = this.code;

        for (var i = 0; i < code.length; i++) {
            var result = code[i].execute(mem);
            if (result === null || typeof result === "string") {
                return result;
            }
        }

        return true;
    };

    this.toHTML = function() {
        var s = '';
        var code = this.code;

        for (var i = 0; i < code.length; i++) {
            s += code[i].toHTML();
        }

        return s;
    };
};

var Matchbox = function() {
    this.init = function(cfg) {
        cfg = cfg || {};
        this.workerURL = cfg.workerURL;
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

    this.parse = function(str) {
        var prog = (new Program()).init();
        var lines = str.split("\n");
        this.code = [];
        for (var i = 0; i < lines.length; i++) {
            if (!lines[i] || lines[i].charAt(0) === ';') continue;
            var instr = (new Instruction()).init();
            if (instr.parse(lines[i])) {
                prog.addInstruction(instr);
            } else {
                alert("Syntax error on line " + (i+1));
            }
        }
        return prog;
    };

    /*
     * Given a full Matchbox source (containing multiple programs,)
     * split into individual program texts, retaining comments and such.
     */
    this.splitIntoProgramTexts = function(str) {
        var s = matchboxScanner;
        var texts = [[], []];
        var progNum = 0;
        var lines = str.split("\n");
        this.code = [];
        for (var i = 0; i < lines.length; i++) {
            var str = lines[i];
            s.reset(str);
            if (s.onType('opcode') && s.token === 'PROG') {
                s.scan();
                if (s.onType('immediate')) {
                    progNum = parseInt(s.token, 10);
                    continue;
                }
            }
            texts[progNum].push(str);
        }
        return [texts[0].join("\n"), texts[1].join("\n")];
    };

    /*
     * Cribbed from yoob.SourceManager
     */
    this.loadSourceFromURL = function(url, successCallback, errorCallback) {
        var http = new XMLHttpRequest();
        var $this = this;
        if (!errorCallback) {
            errorCallback = function(http) {
                $this.loadSource(
                    "Error: could not load " + url + ": " + http.statusText
                );
            }
        }
        http.open("get", url, true);
        http.onload = function(e) {
            if (http.readyState === 4 && http.responseText) {
                if (http.status === 200) {
                    var progs = $this.splitIntoProgramTexts(http.responseText);
                    successCallback(progs[0], progs[1]);
                } else {
                    errorCallback(http);
                }
            }
        };
        http.send(null);
    };

    this.run = function(progText) {
        var regs = (new yoob.Tape()).init({ default: 0 });
        regs.style = "color: white; background: black;";
        var prog = this.parse(progText).setRegisters(regs);

        var mem = (new yoob.Tape()).init({ default: 0 });

        var html = ''
        var result = prog.run(mem);
        if (typeof result === 'string') {
            html += "Error: " + result + "<br/>";
        } else if (result === null) {
            html += "Program stopped on WAIT<br/>";
        }
        html += 'R:' + this.tapeToString(regs) + ", M:" + this.tapeToString(mem);

        return html;
    };

    this.findRaceConditions = function(prog1text, prog2text, callback) {
        var regs1 = (new yoob.Tape()).init({ default: 0 });
        regs1.style = "color: black; background: white;";
        var prog1 = this.parse(prog1text).setRegisters(regs1);

        var regs2 = (new yoob.Tape()).init({ default: 0 });
        regs2.style = "color: white; background: black;";
        var prog2 = this.parse(prog2text).setRegisters(regs2);

/*
        worker = new Worker(this.workerURL);
        worker.addEventListener('message', function(e) {
            $this.output.innerHTML = e.data;
        });
        this.worker.postMessage(["eval", depict(this.ast)]);
*/

        var interleavings = findAllInterleavings(prog1.code, prog2.code);
        for (var i = 0; i < interleavings.length; i++) {
            interleavings[i] = (new Program()).init({ code: interleavings[i] });
        }

        this.runInterleavings(interleavings, regs1, regs2, callback);
    };

    this.runInterleavings = function(interleavings, regs1, regs2, callback) {
        var mem = (new yoob.Tape()).init({ default: 0 });

        var html = '';
        var results = {};
        var resultCount = 0;
        var canonicalResultKey;

        for (var i = 0; i < interleavings.length; i++) {
            var prog = interleavings[i];
            html += prog.toHTML();
            regs1.clear();
            regs2.clear();
            mem.clear();
            var result = prog.run(mem);
            if (typeof result === 'string') {
                html += "Error: " + result + "<br/>";
                break;
            } else if (result === null) {
                html += "(can't happen)";
            } else {
                var key = this.tapeToString(mem);
                canonicalResultKey = canonicalResultKey || key;
                if (results[key] === undefined) {
                    results[key] = true;
                    resultCount++;
                }
            }
            html += '<br/>';
        }

        if (resultCount === 1) {
            html += '<span style="color: white; background: green;">PASS</span>';
            html += canonicalResultKey;
        } else {
            html += '<span style="color: white; background: red;">FAIL</span>';
        }

        callback(html);
    };
};
