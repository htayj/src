# Common Lisp Cookbook Corpus Map

Use this file when the user wants broad cookbook coverage or when the skill should route to the right mirrored chapter quickly.

Cookbook mirror root:
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/`

Extracted heading map:
- `~/external_docs/common-lisp-cookbook/TOC.txt`

## Core corpus

### Index / project overview
- `index.html`
- covers project overview, contributors, and other online CL sources

### License
- `license.html`
- redistribution/derived-form permission notice and disclaimer

### Strings
- `strings.html`
- sections include:
  - accessing substrings
  - accessing individual characters
  - manipulating parts of a string
  - concatenating strings
  - processing a string one character at a time
  - reversing a string by word or character
  - controlling case
  - trimming blanks from the ends of a string
  - converting between symbols and strings
  - converting between characters and strings
  - finding an element of a string
  - finding a substring of a string
  - converting a string to a number
  - converting a number to a string
  - comparing strings

### Dates and Times
- `dates_and_times.html`
- sections include:
  - universal time
  - internal time
  - computing the day of the week

### Hash Tables
- `hashes.html`
- sections include:
  - introduction
  - creating a hash table
  - getting a value from a hash table
  - adding an element to a hash table
  - testing for the presence of a key in a hash table
  - deleting from a hash table
  - traversing a hash table
  - counting the entries in a hash table
  - performance issues: size of your hash table

### Pattern Matching / Regular Expressions
- `pattern_matching.html`
- very small chapter
- practical note: treat as **thin cookbook coverage**

### Functions
- `functions.html`
- sections include:
  - functions that return functions
  - currying functions

### Loop
- `loop.html`
- sections include:
  - background
  - examples

### Input/Output
- `io.html`
- sections include:
  - redirecting standard output
  - faithful output with character streams
  - fast bulk I/O

### Files and Directories
- `files.html`
- sections include:
  - testing whether a file exists
  - opening a file
  - using strings instead of files
  - reading a file one line at a time
  - reading a file one character at a time
  - looking one character ahead
  - random access to a file

### Packages
- `packages.html`
- sections include:
  - list all symbols in a package

### Macros and Backquote
- `macros.html`
- sections include:
  - how macros work
  - backquote
  - getting macros right
  - what macros are for

### CLOS tutorial
- `clos-tutorial/index.html`
- sections include:
  - introduction
  - background
  - references
  - getting started
  - classes and instances
  - defclass
  - classes as instances
  - using CLOS without CLOS objects
  - slots
  - subclasses and inheritance
  - changing a class
  - object-wrapper implementation notes
  - methods
  - defmethod
  - generic functions and next methods
  - non-object specializers
  - qualifiers and method combination
  - generic-function dispatch notes
  - partial class hierarchy appendix

### Sockets
- `sockets.html`
- sections include:
  - introduction
  - addresses
  - server sockets
  - client sockets
  - communication
  - closing
  - complete example

### Interfacing with your OS
- `os.html`
- sections include:
  - accessing environment variables
  - accessing command line arguments
  - forking with CMUCL

### Foreign Function Interfaces
- `ffi.html`
- sections include:
  - calling `gethostname` from CLISP
  - calling `gethostname` from Allegro CL
- practical note: strongly implementation-specific and historical

### Threads
- `process.html`
- sections include:
  - introduction
  - why bother?
  - emergency exits
  - basics
  - where's my output?
  - waiting
  - per-thread state
  - mailboxes
  - interrupts
  - threads and the CAPI windowing system
  - locks
  - a brief warning about timers
  - initializing multithreading

### Defining Systems
- `systems.html`
- sections include:
  - an example
  - cross-platform defsystems
  - system construction for beginners
- practical note: useful historically, may need modern ASDF adaptation

### Setting up an IDE with Emacs on Windows or Mac OS X
- `windows.html`
- sections include:
  - installing Emacs
  - additional Emacs utilities
  - optional online documentation
  - optional CLISP installation
  - optional ACL installation
  - optional LispWorks installation
  - Corman CL installation
  - configuration steps
  - testing the environments
  - sample `.emacs` appendix
- practical note: clearly historical/tooling-specific

### Using Emacs as a Lisp IDE
- `emacs-ide.html`
- sections include:
  - why use Emacs?
  - Emacs Lisp vs Common Lisp
  - Lisp modes in Emacs
  - inferior Lisp mode
  - ILISP
  - ELI
  - which Lisp mode to choose
  - working with Lisp code: editing/evaluating/compiling/searching
  - documentation lookup
  - miscellaneous
  - questions/answers
- attached source examples are important here

### Using the Win32 API
- `win32.html`
- sections include:
  - introduction and scope
  - why use Lisp with Win32?
  - life of a Win32 program
  - Windows character systems and Lisp
  - FLI translation of C headers
  - callbacks from Windows to Lisp
  - starting the program
  - Lisp REPL and Win32 development
  - direct Win32 calls from CAPI
  - interfacing to C
  - RAII and GC
  - COM
  - using the power of Lisp
  - conclusion
  - appendices A–D with sample programs
- practical note: historical and implementation/platform-specific

### Testing
- `testing.html`
- sections include:
  - install RT
  - write a test
  - run a test
  - RT odds and ends
  - other test frameworks

### Miscellaneous
- `misc.html`
- sections include:
  - re-using complex data structures
  - using `adjust-array` instead of consing new sequences with `subseq`

## Coverage policy

When the user asks broadly what the cookbook contains, do **not** stop at only:
- strings
- loop
- macros
- CLOS

The skill must be able to range across the **whole mirrored cookbook**, including:
- old tooling chapters
- Win32 chapters
- systems/testing/misc pages
- license and index context

## Caveat policy

When using this corpus:
- call out **historical/tooling-specific** chapters when relevant
- call out **implementation-specific** chapters when relevant
- call out **thin cookbook coverage** where a chapter is notably sparse
