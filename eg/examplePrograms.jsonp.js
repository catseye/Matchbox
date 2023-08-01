examplePrograms = [
    {
        "contents": "DESC\n\n; Example of a pair of programs which trivially do not\n; have a race condition, because they do not share memory.\n;\n;\n\nPROG 0\nMOV M0, R0\nINC R0\nMOV R0, M0\n\nPROG 1\nMOV M1, R0\nINC R0\nMOV R0, M1\n",
        "filename": "trivial-independent.mbox"
    },
    {
        "contents": "DESC\n\n; Basic example of a pair of programs which have a\n; race condition, because their use of shared memory\n; is not atomic.  See 'petersons-no-race' for a cure.\n;\n\nPROG 0\nMOV M0, R0\nINC R0\nMOV R0, M0\n\nPROG 1\nMOV M0, R0\nINC R0\nMOV R0, M0\n",
        "filename": "basic-race.mbox"
    },
    {
        "contents": "DESC\n\n; Basic example of a pair of programs which do not\n; have a race condition, because they use atomic\n; operations on their shared memory.\n;\n\nPROG 0\nINC M0\n\nPROG 1\nINC M0\n",
        "filename": "basic-no-race.mbox"
    },
    {
        "contents": "DESC\n\n; This is a demonstration of Peterson's algorithm for mutual exclusion,\n; which can be used to prevent race conditions.\n; See http://en.wikipedia.org/wiki/Peterson%27s_algorithm for details.\n; M0 is \"flag[0]\"; M1 is \"flag[1]\"; M2 is \"turn\"; M3 is the target location\n\nPROG 0\nMOV 1, M0\nMOV 1, M2\nWAIT M1, 0\nWAIT M2, 0\n\n; begin c.s.\nMOV M3, R0\nINC R0\nMOV R0, M3\n; end c.s.\n\nMOV 0, M0\n\nPROG 1\nMOV 1, M1\nMOV 0, M2\nWAIT M0, 0\nWAIT M2, 0\n\n; begin c.s.\nMOV M3, R0\nINC R0\nMOV R0, M3\n; end c.s.\n\nMOV 0, M1\n",
        "filename": "petersons-no-race.mbox"
    }
];
