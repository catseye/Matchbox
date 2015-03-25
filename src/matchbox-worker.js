/*
 * The contents of this file are in the public domain.
 * See the file UNLICENSE in the root directory for more information. 
 */

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

addEventListener('message', function(e) {
    if (e.data[0] === 'interleave') {
        postMessage(findAllInterleavings(e.data[1], e.data[2]));
    }
});
