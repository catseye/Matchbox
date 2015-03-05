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
            var description = yoob.makePre(container);

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
            var presetSelect = yoob.makeSelect(controlPanel, "Preset:", []);

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

            var outputCtr = makeContainer();
            output = yoob.makeDiv(outputCtr);
            output.style.background = '#ffffc0';
            output.style.color = 'black';
            output.style.font = '12px monospace';
            output.style.minWidth = '20em';
            output.style.overflow = 'auto';

            var statusCtr = makeContainer();
            status = yoob.makeDiv(statusCtr);
            status.style.background = 'black';
            status.style.color = 'white';
            status.style.font = '12px monospace';
            status.style.minWidth = '20em';
            status.style.overflow = 'auto';

            var sourceRoot = config.sourceRoot || '../eg/';
            var p = new yoob.PresetManager();
            p.init({
                'selectElem': presetSelect,
                'setPreset': function(n) {
                    matchbox.loadSourceFromURL(sourceRoot + n, function(texts) {
                        description.innerHTML = texts[0];
                        prog1ta.value = texts[1];
                        prog2ta.value = texts[2];
                    });
                }
            });
            p.add('basic-race.mbox');
            p.add('basic-no-race.mbox');
            p.add('petersons-no-race.mbox');
            p.select('basic-race.mbox');

            status.innerHTML = 'Ready.<br/>';
        };
        document.body.appendChild(elem);
    }
}
