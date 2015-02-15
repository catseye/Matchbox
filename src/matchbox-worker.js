importScripts('matchbox.js');

addEventListener('message', function(e) {
    if (e.data[0] === 'interleave') {
        postMessage(findAllInterleavings(e.data[1], e.data[2]));
    }
});
