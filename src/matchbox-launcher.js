"use strict";

/*
 * The contents of this file are in the public domain.
 * See the file UNLICENSE in the root directory for more information. 
 */

function launch(prefix, container, config) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    config = config || {};
    var deps = [
        "yoob/scanner.js",
        "yoob/tape.js",
        "yoob/preset-manager.js",
        "yoob/element-factory.js",
        "matchbox.js"
    ];
    var loaded = 0;
    for (var i = 0; i < deps.length; i++) {
        var elem = document.createElement('script');
        elem.src = prefix + deps[i];
        elem.onload = function() {
            if (++loaded < deps.length) return;

            var output;
            var status;

            var matchbox = (new Matchbox()).init({
                'workerURL': config.workerURL || "../src/matchbox-worker.js",
                'displayInterleaving': function(html) {
                    output.innerHTML = html;
                },
                'updateStatus': function(html) {
                    status.innerHTML += html + '<br/>';
                    status.scrollTop = Math.max(status.scrollHeight - status.clientHeight, 0);
                },
                'progStyles': [
                    '',
                    'padding-left: 3em;'
                ]
            });

            var controlPanel = yoob.makeDiv(container);
            var presetSelect = yoob.makeSelect(controlPanel, "", []);
            presetSelect.style.verticalAlign = 'top';
            var description = yoob.makePre(controlPanel);
            description.style.textAlign = 'left';
            description.style.display = 'inline-block';

            var makeContainer = function() {
                var c = yoob.makeDiv(container);
                c.style.display = 'inline-block';
                c.style.verticalAlign = 'top';
                c.style.textAlign = 'left';
                c.style.paddingRight = '3px';
                return c;
            };

            var prog1Ctr = makeContainer();
            var run1Btn = yoob.makeButton(prog1Ctr, "Run", function() {
                matchbox.runSingleProgram(prog1ta.value);
            });
            yoob.makeLineBreak(prog1Ctr);
            var prog1ta = yoob.makeTextArea(prog1Ctr, 20, 20);

            var prog2Ctr = makeContainer();
            var run2Btn = yoob.makeButton(prog2Ctr, "Run", function() {
                matchbox.runSingleProgram(prog2ta.value);
            });
            yoob.makeLineBreak(prog2Ctr);
            var prog2ta = yoob.makeTextArea(prog2Ctr, 20, 20);

            var resultCtr = makeContainer();
            var findRacesBtn = yoob.makeButton(
                resultCtr, "Find Race Conditions", function() {
                    matchbox.findRaceConditions(prog1ta.value, prog2ta.value); 
                }
            );
            var stopBtn = yoob.makeButton(
                resultCtr, "Stop", function() {
                    matchbox.stop();
                }
            );

            output = yoob.makeDiv(resultCtr);
            output.style.background = '#ffffc0';
            output.style.color = 'black';
            output.style.font = '12px monospace';
            output.style.minWidth = '20em';
            output.style.overflow = 'auto';

            var statusCtr = makeContainer();
            var clearBtn = yoob.makeButton(
                statusCtr, "Clear", function() {
                    status.innerHTML = "Ready.<br/>";
                }
            );
            status = yoob.makeDiv(statusCtr);
            status.style.background = 'black';
            status.style.color = 'white';
            status.style.font = '12px monospace';
            status.style.minWidth = '20em';
            status.style.overflow = 'auto';

            var getExampleProgram = function(n) {
                for (var i = 0; i < examplePrograms.length; i++) {
                    if (examplePrograms[i].filename === n) {
                        return examplePrograms[i].contents;
                    }
                }
                return "";
            }
            var p = new yoob.PresetManager();
            p.init({
                'selectElem': presetSelect,
                'setPreset': function(n) {
                    matchbox.reset();
                    var source = getExampleProgram(n);
                    var texts = matchbox.splitIntoProgramTexts(source);
                    description.innerHTML = texts[0];
                    prog1ta.value = texts[1];
                    prog2ta.value = texts[2];
                }
            });
            for (var i = 0; i < examplePrograms.length; i++) {
                p.add(examplePrograms[i].filename);
            }
            p.select('basic-race.mbox');

            status.innerHTML = 'Ready.<br/>';
        };
        document.body.appendChild(elem);
    }
}
