"use strict";

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
                }
            });

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
            status = makeContainer();
            status.style.background = 'black';
            status.style.color = 'white';
            status.style.font = '12px monospace';

            var sourceRoot = config.sourceRoot || '../eg/';
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
