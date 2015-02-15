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

Basic Examples
--------------

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

Syntax and Semantics
--------------------

Each line may contain a pragma, an instruction, a comment, or be blank.
Comments and blank lines are ignored.  Comments begin with a `;` in the
first column.

There is one pragma, `PROG`.  It is only used when the source is a single
text file; it specifies which program is being given next in the file.
If the two programs are being given separately, for example in individual
textboxes in a GUI, it is not used.

Instructions consist of an opcode which is followed by zero, one, or
two data references.

A data reference may be an immediate value (denoted by an integer
literal,) a register reference (denoted by an `R` immediately followed
by an integer literal,) or a memory reference (denoted by an `M`
immediately followed by an integer literal.)

When an instruction has two data references, often the first data reference
is called the _source_ and the second is called the _destination_.
In this case, the destination may not be an immediate value.

All instructions are atomic in their execution.

### Instructions ###

`MOV` takes 2 data references.  It reads a value from the source,
and writes that value into the destination.  Thus it can write a
constant value into a register or memory, copy a register to
another register or to a memory location, or copy a memory
location to another location in memory or to a register.

`INC` takes one data reference, which may not be an immediate value.
It increments the value stored at the given register or memory
location.

`WAIT` (not yet implemented) takes a memory reference and an immediate
value, and simulates a busy wait for that memory location to contain
that value.  Note that this is merely a simulation: if the memory
location does not contain that value, the program run is merely discarded.
This is justified on the grounds that, if it _were_ a busy wait for that
value, the present interleaving would simply never have occurred.

Discussion
----------

### Why should I care?  I don't program in assembler! ###

Doesn't matter; you still have race conditions.  Race conditions are
_everywhere_, and every software developer should be familiar with them
(I like to use the questions "Can you tell me what a race condition is?
Can you give me an example?  Can you tell me about one you had to find
and fix?" during phone screens.)

A huge example that is relevant to virtually every programmer is the
filesystem.  It's a big, shared, mutable store.  Some operations, like
rename, are often guaranteed to be atomic.  But most of them aren't.

### Limitations ###

There are of course two significant limitations to this toy machine language:
it has no loops, and no indirect references.

This is because both of those features would add significantly more dynamic
factors to the run.  Taking account of them would add a lot of overhead,
while not adding much to the basic presentation.

However, to consider how they might work:

To handle loops, we would probably want to split each program up into basic
blocks, and run every basic block alongside every other basic block, to see
if there are any race conditions there.

Even that is not quite enough in practice, for there is nothing stopping
there from being, for example, a loop in-between two mutexes.  In this case,
we would probably report some false positives — race conditions which look
like they can happen, in theory, but would never happen in practice.

To handle indirect references (computed offsets, like arrays with indexes,)
would not be terribly difficult — unless they were combined with loops.  Then
we would need to determine the entire range of possible memory locations
that could be affected, and check all of them.

These features would be better handled with abstract interpretation, than
with direct simulation like we're doing here.

TODO
----

*   animate
*   discard impossible run traces (once we have WAIT)
*   ability to break on first inconsistent result (for long programs)
*   more instructions
*   better error handling
*   write a few words about atomic operations
*   implement some of those classic race-condition-free algorithms w/o
    atomic operations that can be found on Wikipedia
