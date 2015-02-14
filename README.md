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
which they write to and read from is shared between them.

It then computes all possible interleavings of these two programs, and
executes them all, each on a freshly-zeroed shared memory.  Unless _all_
the interleavings leave the memory in exactly the same state after execution,
the programs have a race condition.

Example
-------

These two programs do not have a race condition.  The reason is that
Matchbox's `INC` instruction atomically updates memory; two `INC`s cannot
run at the same time.

    PROG 0
    
    INC M0

    PROG 1
    
    INC M1

But the following two programs _do_ have a race condition:

    PROG 0
    
    MOV M0, R0
    INC R0
    MOV R0, M0
    
    PROG 1
    
    MOV M0, R0
    INC R0
    MOV R0, M0

The reason is that the second program's `MOV M0, R0` might happen before
the first program's `MOV R0, M0` — in which case M0 = 1 at the end — or it
might happen after — in which case M0 = 2.

TODO
----

*   display final judgment
*   animate
*   discard impossible run traces (once we have WAIT)
*   ability to break on first inconsistent result (for long programs)
*   more instructions
*   better error handling
*   load both programs from single source file
*   write a few words about atomic operations
*   implement some of those classic race-condition-free algorithms w/o
    atomic operations that can be found on Wikipedia
