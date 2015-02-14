Matchbox
========

Matchbox is a tool which finds race conditions.
It is currently a work in progress.

It is not a production-quality tool; rather, it is more of a demonstration.
For that reason, it is implemented in Javascript and runs in a web browser.
It may be educational for understanding what a race condition is, and the
sort of reasoning that is needed to find and prevent them.

Matchbox takes, as input, two programs written in a toy assembly-like language.
These two program each have their own set of registers, but the main memory
which they write to and read from is shared between them.  It also takes a set
of expectations of what the shared memory should be like after running both
programs.

It then computes all possible interleavings of these two programs, and
executes them all.  If any such interleaving leaves the memory in a state
which violates the supplied expectations, the programs have a race condition.
