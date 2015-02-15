"use strict";

function launch(prefix, container, config) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    config = config || {};
    var deps = [
        "scanner.js",
        "tape.js",
        "preset-manager.js",
        "element-factory.js"
    ];
    var loaded = 0;
    for (var i = 0; i < deps.length; i++) {
        var elem = document.createElement('script');
        elem.src = prefix + deps[i];
        elem.onload = function() {
            if (++loaded < deps.length) return;

            var sourceRoot = config.sourceRoot || '../eg/';

            var matchbox = (new Matchbox()).init({});
            var output;

            var controlPanel = yoob.makeDiv(container);
            var presetSelect = yoob.makeSelect(controlPanel, "Preset:", []);

            var makeContainer = function() {
                var c = yoob.makeDiv(container);
                c.style.display = 'inline-block';
                c.style.verticalAlign = 'top';
                return c;
            };

            var prog1Ctr = makeContainer();
            var run1Btn = yoob.makeButton(prog1Ctr, "Run", function() {
                output.innerHTML =  matchbox.run(prog1ta.value);
            });
            yoob.makeLineBreak(prog1Ctr);
            var prog1ta = yoob.makeTextArea(prog1Ctr, 20, 20);

            var prog2Ctr = makeContainer();
            var run2Btn = yoob.makeButton(prog2Ctr, "Run", function() {
                output.innerHTML =  matchbox.run(prog2ta.value);
            });
            yoob.makeLineBreak(prog2Ctr);
            var prog2ta = yoob.makeTextArea(prog2Ctr, 20, 20);

            var resultCtr = makeContainer();
            var findRacesBtn = yoob.makeButton(
                resultCtr, "Find Race Conditions", function() {
                output.innerHTML =  matchbox.findRaceConditions(
                    prog1ta.value, prog2ta.value
                );
            });
            output = yoob.makeDiv(resultCtr);

            var p = new yoob.PresetManager();
            p.init({
                'selectElem': presetSelect,
                'setPreset': function(n) {
                    matchbox.loadSourceFromURL(sourceRoot + n, function(p1, p2) {
                        prog1ta.value = p1;
                        prog2ta.value = p2;
                    });
                }
            });
            p.add('basic-race.mbox');
            p.add('basic-no-race.mbox');
            p.add('petersons-no-race.mbox');
            p.select('basic-race.mbox');

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

    this.findRaceConditions = function(prog1text, prog2text) {
        var regs1 = (new yoob.Tape()).init({ default: 0 });
        regs1.style = "color: black; background: white;";
        var prog1 = this.parse(prog1text).setRegisters(regs1);

        var regs2 = (new yoob.Tape()).init({ default: 0 });
        regs2.style = "color: white; background: black;";
        var prog2 = this.parse(prog2text).setRegisters(regs2);

        var mem = (new yoob.Tape()).init({ default: 0 });

        var html = '';
        var results = {};
        var resultCount = 0;
        var interleavings = prog1.getAllInterleavingsWith(prog2);
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
                if (results[key] === undefined) {
                    results[key] = true;
                    resultCount++;
                }
            }
            html += '<br/>';
        }

        if (resultCount === 1) {
            html += '<span style="color: white; background: green;">PASS</span>';
        } else {
            html += '<span style="color: white; background: red;">FAIL</span>';
        }

        return html;
    };
};
