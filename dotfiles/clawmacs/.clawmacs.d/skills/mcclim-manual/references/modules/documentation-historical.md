# McCLIM Historical Documents


## 0-9-1-mothering-sunday


```text

RELEASE NOTES FOR McCLIM 0.9.1, "Mothering Sunday":

Changes to the McCLIM Installation Process
==========================================

McCLIM now comes with a native ASDF system definition in mcclim.asd,
along with the traditional (still ASDF-compatible) system.lisp. See
INSTALL.ASDF for details.

Changes to Backends
===================

Support for Copy&Paste of selections (both into and out from McCLIM
applications) in the X11 backend was added. Copying text from McCLIM
into some applications (and vice versa) like KDE's Konsole is broken,
unfortunately. In other cases, Shift + left-mouse-drag and Shift +
mouse-middle-down now activate a selection and paste, respectively.

There is now rudimentary support for printing non-Latin1 characters to
X11 ports on SBCL.

Beagle, A new experimental backend using Mac OS X's Cocoa bindings was
added. Note that this backend is still incomplete and breaks in some
places. It is not loaded automatically. To try it out, consult
Backends/beagle/README.

Changes to the Manual
=====================

A chapter on presentation types was added.

The chapter on command tables was improved.

Changes to Contributed Applications and Examples
================================================

Clouseau, a graphical Inspector application was added.

The CLIM Listener saw many improvements, among these: package
graphing, better directory stack handling and a new Edit Definition
command.

A Method Browser was added to the examples.

Status of the CLIM 2 Spec Implementation
========================================

Here is a list of what we think works, organized by chapters and
sections of the CLIM 2 specification.

  Chapter 3 Regions

    Mostly finished. There are some troublesome parts of the
    specification that may not be implemented for all possible
    regions, for instance region-contains-region-p. There may not
    be an efficient way of implementing this function for all kinds
    of regions.

  Chapter 4, Bounding rectangles

    Finished

  Chapter 5, Affine transformations

    Finished

  Chapter 6, Overview of window facilities

    Finished

  Chapter 7, Properties of sheets

    Finished, though the correct behavior of sheet transformations may
    not have been tested.

  Chapter 8, Sheet protocols

    Finished

  Chapter 9, Ports, Grafts, and Mirrored sheets

    Finished

  Chapter 10, Sheet and medium output facilities

    Finished

  Chapter 11, Text styles

    Finished

  Chapter 12, Graphics

    Finished

  Chapter 13, Drawing in Color

    I am note sure about the state of this. I thought we were doing
    only full opacity and full transparency, but I see traces of more
    general designs.

  Chapter 14, General Designs 
   
    The composition of designs is not supported. We do support regions
    as designs.

  Chapter 15, Extended Stream Output

    Extended output streams are fully supported.

  Chapter 16, Output Recording

    Output recording is mostly implemented. We do not have a true
    standard-tree-output-record type or the R-tree type of real CLIM,
    so some operations may be slow with lots of output
    records. make-design-from-output-record is not
    implemented. *Note*: the coordinates in output records are
    relative to the stream. This is in conformance with the Spec, but
    not necessarily compatible with other CLIM implementations.

    There is now a protocol in place for Drag-and-Drop of output
    records.

    Output recording inside formatting-tables now works.
    
  Chapter 17, Table Formatting

    Table formatting is completely implemented.

  Chapter 18, Graph Formatting

    Graph formatting is fully implemented. The :hash-table argument
    to format-graph-from-roots is ignored.

  Chapter 19, Bordered Output 

    Bordered output is fully supported.
    The :move-cursor argument to surrounding-output-with-border is now
    working.

  Chapter 20, Text Formatting
    
    With the exception of the :after-line-break-initially argument to
    filling-output, this chapter is fully implemented.

  Chapter 21 Incremental Redisplay

    The updating-output interface to incremental redisplay is
    implemented. McCLIM makes no effort to move i.e., bitblit, output
    records; they are always erased and redrawn if their position
    changes. This is much more compatible with support for partial
    transparency. The :x, :y, :parent-x and :parent-y arguments to
    redisplay-output-record are ignored. McCLIM follows the spirit of
    21.3 "Incremental Redisplay Protocol", but we have not tried very
    hard to implement the vague description in the
    Spec. augment-draw-set, note-output-record-child-changed and
    propagate-output-record-changes-p are not implemented.

    Incremental redisplay in McCLIM can suffer from performance
    problems because there are no spatially-organized compound
    output record types.

    The generic function incremental-redisplay is now implemented.
    
  Chapter 22, Extended Stream Input

    The implementation of extended input streams is quite
    complete. (setf* pointer-position) is not implemented. There is no
    stream numeric argument, so that slot of the accelerator-gesture
    condition is always 1.

    drag-output-record and dragging-output are now implemented.

  Chapter 23 Presentation Types

    Most of the literal specification of this chapter is
    implemented. Specific accept and present presentation methods for some
    types are not implemented, so the default method may be
    surprising.

    The output record bounding rectangle is always used or highlighting
    and pointer testing.

    presentation-default-processor is not implemented.

    The presentation method mechanism supports all method
    combinations. The body of a presentation method is surrounded
    with a block of the same name as the presentation method, not just
    the magic internal name. The method by which presentation type
    parameters and options are decoded for the method bodies is a bit
    different from real CLIM. In particular, you cannot refer to the
    type parameters and options in the lambda list of the method.


    The NIL value of presentation-single-box is now supported.

    Presentation type histories are now partially implemented. The
    gesture C-M-y should recall the last entered presentation.

    define-drag-and-drop-translator is now implemented.
    
  Chapter 24 Input Editing and Completion Facilities

    with-input-editor-typeout is not implemented.

    The noise strings produced by input-editor-format and the strings
    produced by presentation-replace-input are not read-only. This
    could lead to interesting "issues" if the user edits them.

    Only a few of the suggested editing commands are implemented. An
    additional command that is implemented is control-meta-B, which
    drops into the debugger. add-input-editor-command is not
    implemented.

    with-accept-help is not implemented.

  Chapter 25 Menu Facilities

    The protocol is implemented, but McCLIM doesn't use it to draw
    command table menus.

  Chapter 26 Dialog Facilities

    McCLIM contains a basic, somewhat buggy implementation of
    accepting-values. There is little user feedback as to what has
    been accepted in a dialog. The user has to press the "Exit" button
    to exit the dialog; there are no short cuts. There are no special
    accept-present-default methods for member or subset presentation
    types. Command-buttons are not implemented. There is no
    gadget-based implementation of accepting-values. own-window is not
    supported.

    The internal structure of accepting-values should be "culturally
    compatible" with real CLIM; if you have some spiffy hack, check
    the source.

  Chapter 27 Command Processing

    command-line-complete-input is not implemented (the
    functionality does exist in the accept method for command-name).

    display-command-table-menu and menu-choose-command-from-table are
    not implemented. Menu-command-parser is not implemented, though the
    functionality obviously is. Nothing is done about partial menu
    commands. There is no support for numeric arguments.

    The command-or-form presentation type is not implemented.


  Chapter 28 Application Frames

    raise-frame, bury-frame and notify-user are not implemented.

    :accept-values panes are not implemented.

    frame-maintain-presentation-histories,
    frame-drag-and-drop-feedback and frame-drag-and-drop-highlighting
    are not implemented.

    execute-frame-command ignores the possibility that frame and the
    current frame might be different.

    display-command-menu isn't implemented.

    command-enabled is now implemented.

  Chapter 29 Panes

    Due to the way the space-allocation protocol is implemented, it is
    not easy to create application-specific layout-panes. Client code
    needs to know about :AROUND methods to compose-space, but they are
    not mentioned in the spec.
  
    restraining-pane is partially implemented.

  Chapter 30 Gadgets

    This chapter is implemented.

```


## 0-9-2-laetare-sunday


```text

RELEASE NOTES FOR McCLIM 0.9.2, "Laetare Sunday":

Compatibility
=============

This release works on CMUCL, SBCL, CLISP, OpenMCL, Allegro CL,
LispWorks, and the Scieneer CL, using the CLX X Window bindings.

Changes to the Install Process
==============================

Implementation-specific INSTALL.* files were removed. Generic and
implementation-specific Installation instructions were improved and
merged into the file INSTALL.

This release requires the "spatial-trees" library by Christophe
Rhodes. Get it via asdf-install or at http://cliki.net/spatial-trees.

Changes to Backends
===================

Copy & Paste code in the CLX backend was improved and should now
adhere more strictly to ICCCM.

Support for connecting to a ssh-forwarded display was restored.

Several unused parts (marked with #+unicode) of the CLX backend were
removed, thus restoring buildability on installations of clisp that
have the unicode feature turned on.

Double buffering for panes was implemented. To use it, create panes
with the :double-buffering t initarg.

There is now rudimentary support for entering non-Ascii characters from
X11 ports using SBCL CLX (a.k.a. telent CLX).

McCLIM ships experimental support for TrueType font rendering using
the FreeType libraries and the free Bitstream Vera fonts. To use it,
link Experimental/freetype/mcclim-freetype.asd to one of your
asdf:*central-registry* directories and load the "MCCLIM-FREETYPE"
system.

An experimental "Null" backend was added that should allow testing of
CLIM functionality without requiring a GUI environment to run.

Changes to the Documentation
============================

A new chapter on contributed applications was added.

Several new figures and examples were added to the manual

Clemens Fruhwirth added a CLIM tutorial paper called "A Guided Tour to
CLIM". It is available in Doc/Guided-Tour/.

Changes to Contributed Applications and Examples
================================================

New application: A CLIM Debugger (by Peter Mechlenborg). It resides in
Apps/Debugger/.

New application: Functional-Geometry by Frank Buss and Rainer
Joswig. It resides in Apps/Functional-Geometry/.

The Inspector now is now able to disassemble functions and inspect
pathnames.

The Listener can now produce vertically-aligned graphs.

The Scigraph application now builds on SBCL again.

A demo for drag-and-drop-translators was added.

Further additions to McCLIM
===========================

There is now a test suite, located in Tests/. It contains tests for
regions, bounding rectangles, transformations, commands, and the
PostScript backend. With the addition of the Null backend, we hope to
add several more tests for more chapters of the CLIM spec.

New Extension "conditional-commands": allows activation/deactivation
of commands when other commands are invoked. It resides in
Extensions/conditional-commands/.

Status of the CLIM 2 Spec Implementation
========================================

Here is a list of what we think works, organized by chapters and
sections of the CLIM 2 specification.

  Chapter 3 Regions

    Mostly finished. There are some troublesome parts of the
    specification that may not be implemented for all possible
    regions, for instance region-contains-region-p. There may not
    be an efficient way of implementing this function for all kinds
    of regions.

  Chapter 4, Bounding rectangles

    Finished

  Chapter 5, Affine transformations

    Finished

  Chapter 6, Overview of window facilities

    Finished

  Chapter 7, Properties of sheets

    Finished, though the correct behavior of sheet transformations may
    not have been tested.

  Chapter 8, Sheet protocols

    Finished

  Chapter 9, Ports, Grafts, and Mirrored sheets

    Finished

  Chapter 10, Sheet and medium output facilities

    Finished

  Chapter 11, Text styles

    Mostly complete.

    There is now experimental support for device font text styles (via
    make-device-font-text-style) for the CLX, PostScript, and
    CLX+FreeType backends.

  Chapter 12, Graphics

    Finished

  Chapter 13, Drawing in Color

    I am note sure about the state of this. I thought we were doing
    only full opacity and full transparency, but I see traces of more
    general designs.

  Chapter 14, General Designs 
   
    The composition of designs is not supported. We do support regions
    as designs.

  Chapter 15, Extended Stream Output

    Extended output streams are fully supported.

  Chapter 16, Output Recording

    Output recording is mostly implemented.

    This release ships with a standard-tree-output-record type for the
    first time. The tree output record type speeds up point- and
    region-based queries, but slows down insertion of output records
    by a bit.

    make-design-from-output-record is not implemented. *Note*: the
    coordinates in output records are relative to the stream. This is
    in conformance with the Spec, but not necessarily compatible with
    other CLIM implementations.

  Chapter 17, Table Formatting

    Table formatting is completely implemented.

  Chapter 18, Graph Formatting

    Graph formatting is fully implemented. The :hash-table argument
    to format-graph-from-roots is ignored.

    Support for a :dag graph type was added, as was support for
    vertically oriented graphs and support for the :arc-drawer
    argument to format-graph-from-roots.

  Chapter 19, Bordered Output 

    Bordered output is fully supported.

  Chapter 20, Text Formatting
    
    With the exception of the :after-line-break-initially argument to
    filling-output, this chapter is fully implemented.

  Chapter 21 Incremental Redisplay

    The updating-output interface to incremental redisplay is
    implemented. McCLIM makes no effort to move i.e., bitblit, output
    records; they are always erased and redrawn if their position
    changes. This is much more compatible with support for partial
    transparency. The :x, :y, :parent-x and :parent-y arguments to
    redisplay-output-record are ignored. McCLIM follows the spirit of
    21.3 "Incremental Redisplay Protocol", but we have not tried very
    hard to implement the vague description in the
    Spec. augment-draw-set, note-output-record-child-changed and
    propagate-output-record-changes-p are not implemented.

    Incremental redisplay in McCLIM may still suffer from performance
    problems, despite the presence of spatially-organized compound
    output record types.

  Chapter 22, Extended Stream Input

    The implementation of extended input streams is quite
    complete. (setf* pointer-position) is not implemented. There is no
    stream numeric argument, so that slot of the accelerator-gesture
    condition is always 1.

  Chapter 23 Presentation Types

    Most of the literal specification of this chapter is
    implemented. Specific accept and present presentation methods for some
    types are not implemented, so the default method may be
    surprising.

    The output record bounding rectangle is always used or highlighting
    and pointer testing.

    presentation-default-processor is not implemented.

    The presentation method mechanism supports all method
    combinations. The body of a presentation method is surrounded
    with a block of the same name as the presentation method, not just
    the magic internal name. The method by which presentation type
    parameters and options are decoded for the method bodies is a bit
    different from real CLIM. In particular, you cannot refer to the
    type parameters and options in the lambda list of the method.

    The NIL value of presentation-single-box is now supported.

    Presentation type histories are now partially implemented. The
    gesture C-M-y should recall the last entered presentation.

    define-drag-and-drop-translator is now implemented.
    
  Chapter 24 Input Editing and Completion Facilities

    with-input-editor-typeout is not implemented.

    The noise strings produced by input-editor-format and the strings
    produced by presentation-replace-input are not read-only. This
    could lead to interesting "issues" if the user edits them.

    Only a few of the suggested editing commands are implemented. An
    additional command that is implemented is control-meta-B, which
    drops into the debugger. add-input-editor-command is not
    implemented.

    with-accept-help is not implemented.

  Chapter 25 Menu Facilities

    The protocol is implemented, but McCLIM doesn't use it to draw
    command table menus.

  Chapter 26 Dialog Facilities

    McCLIM contains a basic, somewhat buggy implementation of
    accepting-values. There is little user feedback as to what has
    been accepted in a dialog. The user has to press the "OK" button
    to exit the dialog; there are no short cuts. There are no special
    accept-present-default methods for member or subset presentation
    types. Command-buttons are not implemented. There is no
    gadget-based implementation of accepting-values.

    The internal structure of accepting-values should be "culturally
    compatible" with real CLIM; if you have some spiffy hack, check
    the source.

    :own-window is now supported in accepting-values.

  Chapter 27 Command Processing

    command-line-complete-input is not implemented (the
    functionality does exist in the accept method for command-name).

    display-command-table-menu and menu-choose-command-from-table are
    not implemented. Menu-command-parser is not implemented, though the
    functionality obviously is. Nothing is done about partial menu
    commands. There is no support for numeric arguments.

    The command-or-form presentation type is not implemented.


  Chapter 28 Application Frames

    raise-frame, bury-frame and notify-user are not implemented.

    :accept-values panes are not implemented.

    frame-maintain-presentation-histories is not implemented.

    frame-drag-and-drop-feedback and frame-drag-and-drop-highlighting
    are now implemented.

    execute-frame-command ignores the possibility that frame and the
    current frame might be different.

    display-command-menu isn't implemented.

  Chapter 29 Panes

    Due to the way the space-allocation protocol is implemented, it is
    not easy to create application-specific layout-panes. Client code
    needs to know about :AROUND methods to compose-space, but they are
    not mentioned in the spec.
  
    restraining-pane is partially implemented.

  Chapter 30 Gadgets

    This chapter is implemented.

    with-output-as-gadget is not quite working yet, but it was
    improved since the last release.

```


## 0-9-3-all-souls'-day


```text

RELEASE NOTES FOR McCLIM 0.9.3, "All Souls' Day":

Compatibility
=============

This release was tested and found to work on the following
implementations:

 * SBCL
 * OpenMCL
 * Allegro Common Lisp 8.0 in ANSI Mode
 * The Scieneer Common Lisp in ANSI Mode

In our tests, this release of McCLIM did not work on the following
implementations:

 * CLISP (there are some problems with CLISP at the moment, but it is
   possible to run McCLIM there; a HOWTO will be posted to
   http://planet.lisp.org).
 * CMUCL (at the time of this release, the released CMUCL has a bug
   that prevents successful loading of McCLIM; CMUCL 19d + patch 1 and
   the 2006-12 snapshot or later contain a fix for this problem)
 * LispWorks (no known workaround)

Also, McCLIM currently does not support lisps with case-sensitive
readers (ACL "modern mode" and lower-case SCL).

Changes in mcclim-0.9.3 "All Souls' Day" relative to 0.9.2:
===========================================================

From the NEWS file:

 * backend improvement: The Null backend now registers itself in the
   server search path
 * improvement: with-output-as-gadget now sets the correct cursor
   position when incremental redisplay is active.
 * specification compliance: INVOKE-WITH-NEW-OUTPUT-RECORD's argument
   list now is the same as the one in the Franz CLIM user guide.
 * improvement: The text field cursor is now a solid block again.
 * backend improvement: the PostScript backend now outputs correct EPS
 * improvement: Graph nodes can now be dragged
 * improvement: Possibilities when reading from
   COMPLETE-FROM-GENERATOR are now sorted alphabetically.
 * new experimental backend: gtkairo (loads on SBCL, CMUCL and SCL):
   Uses GTK+ for gadgets and cairo for rendering graphics.
 * Bug fix: incremental-redisplay does no longer leak memory
 * improvement: incremental-redisplay is now a little faster
 * Bug fix: Invisible text cursors no longer leave a dangling space
   behind the text output record
 * improvement: commands whose names are shadowed in child command
   tables are now suggested in preference to their parents.
 * Bug fix: (setf stream-cursor-position) and output record replay on
   encapsulating streams work now.
 * Bug fix: Invoking command menu items in frames with no interactor
   works now.
 * Bug fix: DESTROY-PORT removes the port even if an error occurs
   while closing the port
 * Bug fix: make-process now sets the process name on SBCL
 * specification compliance: MENU-CHOOSE now supports almost all
   features demanded in the CLIM 2.0 specification.
 * improvement: new and improved ACCEPT presentation method for
   expressions on interactive streams.
 * specification compliance: LOOKUP-KEYSTROKE-ITEM no longer accepts
   the :errorp argument.
 * Bug fix: incremental redisplay no longer breaks on output records
   that had no children.
 * Bug fix: arrow head sizes are now transformed along with the line thickness.
 * improvement: resizing a viewport's child will now move the viewport's focus.
 * improvement: loading mcclim.asd no longer shows a code deletion note on SBCL.
 * new demo: logic-cube
 * compatibility: Add support for post-1.0 openmcl, and for Allegro
   Common Lisp 8.0 (ansi mode).
 * new example application showing use of CLIM views.

```


## 0-9-4-orthodox-new-year


```text

RELEASE NOTES FOR McCLIM 0.9.4, "Orthodox New Year":

Compatibility
=============

This release was tested and found to work on the following
implementations:

 * SBCL
 * OpenMCL
 * CLISP
 * Allegro Common Lisp 8.0 in ANSI Mode

In our tests, this release of McCLIM did not work on the following
implementations:

 * CMUCL (at the time of this release, the released CMUCL has a bug
   that prevents successful loading of McCLIM; CMUCL 19d + patch 1 and
   the 2006-12 snapshot or later contain a fix for this problem)

Also, McCLIM currently does not support lisps with case-sensitive
readers (ACL "modern mode" and lower-case SCL).

Known Bugs
==========

Due to the radical changes introduced by the new editor substrate,
some bugs may surface in day-to-day use. We would very much like to
hear about them on mcclim-devel@common-lisp.net. As a work-around, you
can enable the old input substrate by using
	(setf climi::*use-goatee* t)
on the REPL when clim is loaded.

The following bugs are known to exist:

* McCLIM freetype can interact poorly with Drei under some
  circumstances
* Drei does not handle most reader macros well
* Sometimes, the ENTER key is not very responsive when editing forms
  with Drei
* Calling stream-input-buffer is still buggy.

Changes in mcclim-0.9.4 "Orthodox New Year" relative to 0.9.3:
===========================================================

From the NEWS file:

* cleanup: removed the obsolete system.lisp file.
* backend improvements: Gtkairo
** Double buffering is now supported (fixes disappearing widgets on Windows).
** X errors no longer terminate the lisp process.
** Some bugfixes, including CMUCL support and better key event handling.
** Native implementation of context menus, list panes, label panes, and
    option panes.
** Draw text using Pango.  (Bug fix: Fixed-width font supported on Windows
    now.  Multiple lines of output in TEXT-SIZE supported now.
    TEXT-STYLE-FIXED-WIDTH-P works correctly now.)
* Improvement: Added new editor substrate ("Drei").
* Improvement: Improved the pathname presentation methods considerably.
* specification compliance: DELETE-GESTURE-NAME function now implemented.
* specification compliance: PRESENTATION-TYPE-SPECIFIER-P presentaion
   function now implemented.
* specification compliance: DISPLAY-COMMAND-TABLE-MENU function now
   implemented.
* specification compliance: DISPLAY-COMMAND-MENU function now
   implemented.
* specification compliance: POINTER-PLACE-RUBBER-BAND-LINE* function
   now implemented.
* specification compliance: POINTER-INPUT-RECTANGLE* function now
   implemented.
* specification compliance: POINTER-INPUT-RECTANGLE function now
   implemented.
* Improvement: Added font listing support, see section "Fonts and Extended
   Text Styles" in the manual.
* Improvement: Added support for bezier splines (Robert Strandh).
   To be documented.
* better PRESENTATION-SUBTYPEP (more likely to give the right answer
   on some-of and all-of presentation types)
* Improvement: M-n/M-p gestures for navigating presentation histories.

```


## 0-9-5-eastern-orthodox-liturgical-new-year


```text

RELEASE NOTES FOR McCLIM 0.9.5, "Eastern Orthodox Liturgical New Year":

Compatibility
=============

This release was tested and found to work on the following
implementations:

 * SBCL
 * OpenMCL
 * CLISP (requires "Telent" CLX)
 * Allegro Common Lisp 8.0 in ANSI Mode

In our tests, this release of McCLIM did not work on the following
implementations:

 * CMUCL (at the time of this release, the released CMUCL has a bug
   that prevents successful loading of McCLIM; CMUCL 19d + patch 1 and
   the 2006-12 snapshot or later contain a fix for this problem)

Also, McCLIM currently does not support lisps with case-sensitive
readers (Allegro CL "modern mode" and lower-case Scieneer CL).


Changes in mcclim-0.9.5 "Eastern Orthodox Liturgical New Year" 
relative to 0.9.4:
==============================================================

From the NEWS file:

* Changes in mcclim-0.9.5 relative to 0.9.4:
** Installation: the systems clim-listener, clim-examples,
   and clouseau can now be loaded without loading the system mcclim
   first. Users with existing McCLIM installations should use the 
   provided script:
   		./symlink-asd-files.sh /path/to/asdf-central-registry/
** New extension: tab-layout. This extension allows keeping a stack of panes 
   whose foreground pane is controlled by a tab bar. This layout can be 
   customized in backends and frame managers. For examples, see the
   gtkairo backend and the pixie frame manager.
** New extension function: SHEET-RGB-IMAGE: makes a screenshot of a sheet 
   in the CLX backend. (Supported on truecolor visuals only for now.)
** New experimental extension: tree-with-cross-edges are an extension to
   the graph formatter.
** New experimental backend: clim-graphic-forms: native widgets on Windows. 
   This backend is still very experimental (it doesn't run demos yet).
** New inspector feature: The inspector now displays more useful information
   about hash tables and generic functions.
** Specification compliance: Various layout panes no longer quite as
   aggressive at eating the space requirements of their children.
** Specification compliance: There is now a rudimentary implementation of 
   NOTIFY-USER
** Usability: Text editors and text input panes now use click-to-focus.
** Improvement: the ACCEPTING-VALUES command table was renamed to 
   ACCEPT-VALUES (as this is the name that the other clim-2 implementation 
   uses)
** Improvement: the CLX backend should no longer cause focus stealing
   when an application has text-editor panes.  This change comes with
   a rudimentary click-to-focus-keyboard widget policy.
** Improvement: define-application-frame now allows a :default-initargs
   option. (This is not exactly a "specification compliance" fix, as 
   d-a-frame is not defined to accept this option.).
** Improvement: menu-choose menus now look a little prettier.
** Improvement: added more styles for bordered-output: :rounded, :ellipse
** Improvement: Toggle button values now default to NIL.
** Improvement: Frame layouts are now inherited from the frame's 
   superclass.
** Improvement: The Lisp Syntax is much improved: now recognizes 
   delimiter characters, and more types of Lambda lists.
** Bug fix: Bezier designs should now draw in the right place in all 
   backends.
** Bug fix: Text in Drei no longer "walks" to the left.
** Bug fix: Drei now has better support for delimiter gestures.
** Bug fix: Partial commands now work better when invoked from the menu.

```


## 0-9-6-st-george's-day


```text

RELEASE NOTES FOR McCLIM 0.9.6, "St. George's Day":

Compatibility
=============

This release was tested and found to work on the following
implementations:

 * SBCL
 * CMUCL 19d
 * Clozure CL 1.2 (RC 1)
 * CLISP 2.41 (requires "Telent" CLX)
 * Allegro Common Lisp 8.1 in ANSI Mode

McCLIM currently does not support lisps with case-sensitive
readers (Allegro CL "modern mode" and lower-case Scieneer CL).

To run McCLIM on Mac OS X 10.5, it is currently necessary to pass
an explicit DISPLAY argument to work around incompatibility between
Leopard's X11 auto-start facility and CLX.


Changes in mcclim-0.9.6 "St. George's Day" relative to 0.9.5:
==============================================================

From the NEWS file:
* New extension: mcclim-truetype: provides a 100% lisp path for 
  AA fonts with CLX using cl-vectors and zpb-ttf, as an alternative
  to mcclim-freetype.
* Improvement: Faster drawing and AA text rendering. AA text requires
  a fix to the Xrender support of CLX, available in Christophe Rhodes's
  current CLX distribution from darcs.
* Improvement: Look up arbitrary truetype fonts by name via fontconfig.
* Drei improvements
** New redisplay engine that is faster and has more features.
** Support for "views" concept.
** Support for modes a la Emacs "mini-modes".
** Improvement: Goal-columns for line movement.
** Improvement: More Emacs-like expression movement for Lisp syntax.
** Bug fix: Input prompting now works for directly recursive calls to
   ACCEPT.
* Specification compliance: READ-BITMAP-FILE and
  MAKE-PATTERN-FROM-BITMAP-FILE from CLIM 2.2. Includes new example
  program, IMAGE-VIEWER.
* Specification compliance: The :inherit-menu keyword argument to
  DEFINE-COMMAND-TABLE and MAKE-COMMAND-TABLE is now implemented with
  CLIM 2.2 semantics. The :keystrokes value is not handled yet.
* Specification compliance: :PRINTER functions for MENU-CHOOSE are
  now called with the menu item, not the display object.
* Bug fix: ESA's help commands are better at finding bindings and
  describing them
* Bug fix: Some missing methods and functions have been implemented
  for the Null backend, allowing headless operation for many
  applications.
* Bug fix: correct computation of bounding rectangle after
   clear-output-record and recompute-extent-for-new-child.
* Bug fix: label panes no longer have a restrictive maximum width.
* Bug fix: ellipses with a zero radius no longer cause errors.
* Bug fix: bezier drawing in CLIM-FIG less likely to cause errors.
* Bug fix: restored somewhat working undo in CLIM-FIG.

```


## 0-9-7-imbolc


```text

RELEASE NOTES FOR McCLIM 0.9.7, "Imbolc":

Announcement
============

After 10 years of development we are proud to present a new McCLIM release 0.9.7
"Imbolc". Due to a long time of development only major changes are listed.

Compatibility
=============

This release was tested and found to work on the following implementations:

 * Clozure CL 1.11
 * Embeddable CL 16.1.3
 * SBCL 1.3.20

McCLIM currently does not support lisps with case-sensitive
readers (Allegro CL "modern mode" and lower-case Scieneer CL).


Major changes in mcclim-0.9.7 "Imbolc" relative to 0.9.6:
===============================================================

* Bug fix: tab-layout fixes.
* Bug fix: formatting-table fixes.
* Bug fix: scrolling and viewport fixes and refactor.
* Feature: raster image draw backend extension.
* Feature: bezier curves extension.
* Feature: new tests and demos in clim-examples.
* Feature: truetype rendering is now default on clx.
* Feature: additions to region, clipping rectangles and drawing.
* Feature: clim-debugger and clim-listener improvmenets.
* Feature: mop is now done with CLOSER-MOP.
* Feature: threading is now done with BORDEAUX-THREADS.
* Feature: clx-fb backend (poc of framebuffer-based backend).
* Feature: assumption that all panes must be mirrored has been removed.
* Cleanup: many files cleaned up from style warnings and such.
* Cleanup: removal of PIXIE.
* Cleanup: removal of CLIM-FFI package.
* Cleanup: changes to directory structure and asd definitions.
* Cleanup: numerous manual additions and corrections.
* Cleanup: broken backends has been removed.
* Cleanup: goatee has been removed in favour of Drei.
* Cleanup: all methods have now corresponding generic function declarations.

```


## 0-9-armistice


```text

The OpenGL backend hasn't been tested recently.

Here is a list of what we think works, organized by chapters and
sections of the CLIM 2 specification.

  Chapter 3 Regions

    Mostly finished.  There are some troublesome parts of the
    specification that may not be implemented for all possible
    regions, for instance region-contains-region-p.  There may not
    be an efficient way of implementing this function for all kinds
    of regions.

  Chapter 4, Bounding rectangles

    Finished

  Chapter 5, Affine transformations

    Finished

  Chapter 6, Overview of window facilities

    Finished

  Chapter 7, Properties of sheets

    Finished, though the correct behavior of sheet transformations may
    not have been tested.  

  Chapter 8, Sheet protocols

    Finished

  Chapter 9, Ports, Grafts, and Mirrored sheets

    Finished

  Chapter 10, Sheet and medium output facilities

    Finished

  Chapter 11, Text styles

    Finished

  Chapter 12, Graphics

    Finished

  Chapter 13, Drawing in Color

    I am note sure about the state of this.  I thought we were doing
    only full opacity and full transparency, but I see traces of more
    general designs.  

  Chapter 14, General Designs
   
    The composition of designs is not supported. We do support regions
    as designs.

  Chapter 15, Extended Stream Output

    Extended output streams are fully supported.

  Chapter 16, Output Recording

    Output recording is mostly implemented. We do not have a true
    standard-tree-output-record type or the R-tree type of real CLIM,
    so some operations may be slow with lots of output
    records. make-design-from-output-record is not
    implemented. *Note*: the coordinates in output records are
    relative to the stream. This is in conformance with the Spec, but
    not necessarily compatible with other CLIM implementations.

  Chapter 17, Table Formatting

    Table formatting is completely implemented.

  Chapter 18, Graph Formatting

    Graph formatting is fully implemented.  The :hash-table argument
    to format-graph-from-roots is ignored.

  Chapter 19, Bordered Output

    Bordered output is fully supported with the exception of the
    :move-cursor argument to surrounding-output-with-border.

  Chapter 20, Text Formatting
    
    With the exception of the :after-line-break-initially argument to
    filling-output, this chapter is fully implemented.

  Chapter 21 Incremental Redisplay

    The updating-output interface to incremental redisplay is
    implemented. McCLIM makes no effort to move i.e., bitblit, output
    records; they are always erased and redrawn if their position
    changes. This is much more compatible with support for partial
    transparency. The :x, :y, :parent-x and :parent-y arguments to
    redisplay-output-record are ignored. McCLIM follows the spirit of
    21.3 "Incremental Redisplay Protocol", but we haven't tried very
    hard to implement the vague description in the
    Spec. augment-draw-set, note-output-record-child-changed and
    propagate-output-record-changes-p are not implemented. The
    function incremental-redisplay is not implemented.

    Incremental redisplay in McCLIM can suffer from performance
    problems because there isn't any spatially-organized compound
    output record type.

  Chapter 22, Extended Stream Input

    The implementation of extended input streams is quite
    complete. (setf* pointer-position) is not implemented. There is no
    stream numeric argument, so that slot of the accelerator-gesture
    condition is always 1. drag-output-record and dragging-output are
    not implemented.

  Chapter 23 Presentation Types

    Most of the literal specification of this chapter is
    implemented. Specific accept and present presentation methods for some
    types are not implemented, so the default method may be
    surprising.

    The NIL value of presentation-single-box is not supported. The
    output record bounding rectangle is always used or highlighting
    and pointer testing.

    Presentation type histories are not implemented.

    The presentation method mechanism supports all method
    combinations.  The body of a presentation method is surrounded
    with a block of the same name as the presentation method, not just
    the magic internal name.  The method by which presentation type
    parameters and options are decoded for the method bodies is a bit
    different from real CLIM. In particular, you can't refer to the
    type parameters and options in the lambda list of the method.

    presentation-default-processor are define-drag-and-drop-translator
    not implemented.

  Chapter 24 Input Editing and Completion Facilities

    with-input-editor-typeout is not implemented.

    The noise strings produced by input-editor-format and the strings
    produced by presentation-replace-input are not read-only. This
    could lead to interesting "issues" if the user edits them.

    Only a few of the suggested editing commands are implemented. An
    additional command that is implemented is control-meta-B, which
    drops into the debugger. add-input-editor-command is not
    implemented.

    with-accept-help is not implemented.

  Chapter 25 Menu Facilities

    The protocol is implemented, but McCLIM doesn't use it  to draw
    command table menus.

  Chapter 26 Dialog Facilities

    McCLIM contains a  basic, somewhat buggy implementation of
    accepting-values.  Thes is little user feedback as to what has
    been accepted in a dialog.  The user has to press the "Exit"
    button to exit the dialog; there are no short cuts. There are no
    special accept-present-default methods for member or subset
    presentation types.  Command-buttons are not implemented.  There
    is not gadget-based implementation of accepting-values. own-window
    is not supported.

    The internal structure of accepting-values should be "culturally
    compatible" with real CLIM; if you have some spiffy hack, check
    the source.

  Chapter 27 Command Processing

    command-line-complete-input is not implemented (the
    functionality does exist in the accept method for command-name).

    display-command-table-menu and menu-choose-command-from-table are
    not implemented.  Menu-command-parser is not implemented, though the
    functionality obviously is. Nothing is done about partial menu
    commands.  There is no support for numeric arguments.

    The command-or-form presentation type is not implemented.


  Chapter 28 Application Frames

    raise-frame, bury-frame and notify-user are not implemented.

    :accept-values panes are not implemented.

    frame-maintain-presentation-histories,
    frame-drag-and-drop-feedback and frame-drag-and-drop-highlighting
    are not implemented.

    execute-frame-command ignores the possibility that frame and the
    current frame might be different.

    command-enable and display-command-menu aren't implemented.


  Chapter 29 Panes
  
    restraining-pane isn't implemented.

  Chapter 30 Gadgets

    This chapter is implemented.

```


## NEWS


```text

* Changes in mcclim-0.9.7 relative to 0.9.6:


* Changes in mcclim-0.9.6 relative to 0.9.5:
** Bug fix: ESA's help commands are better at finding bindings and
   describing them
** Bug fix: Some missing methods and functions have been implemented
   for the Null backend, allowing headless operation for many
   applications.
** Specification compliance: READ-BITMAP-FILE and
   MAKE-PATTERN-FROM-BITMAP-FILE from CLIM 2.2. Includes new example
   program, IMAGE-VIEWER.
** Drei improvements
*** New redisplay engine that is faster and has more features.
*** Support for "views" concept.
*** Support for modes a la Emacs "mini-modes".
*** Bug fix: Input prompting now works for directly recursive calls to
    ACCEPT.
*** Improvement: Goal-columns for line movement.
*** Improvement: More Emacs-like expression movement for Lisp syntax.
** Bug fix: label panes no longer have a restrictive maximum width.
** Bug fix: ellipses with a zero radius no longer cause errors.
** Bug fix: bezier drawing in CLIM-FIG less likely to cause errors.
** Bug fix: restored somewhat working undo in CLIM-FIG.
** Specification compliance: The :inherit-menu keyword argument to
   DEFINE-COMMAND-TABLE and MAKE-COMMAND-TABLE is now implemented with
   CLIM 2.2 semantics. The :keystrokes value is not handled yet.
** Specification compliance: :PRINTER functions for MENU-CHOOSE are
   now called with the menu item, not the display object.
** Improvement: Faster drawing and AA text rendering. AA text requires
   a fix to the Xrender support of CLX, available in Christophe Rhodes's
   current CLX distribution from darcs.
** Improvement: Look up arbitrary truetype fonts by name via fontconfig.
** New extension: mcclim-truetype: provides a 100% lisp path for 
   AA fonts with CLX using cl-vectors and zpb-ttf, as an alternative
   to mcclim-freetype.
** Bug fix: correct computation of bounding rectangle after
   clear-output-record and recompute-extent-for-new-child.

* Changes in mcclim-0.9.5 relative to 0.9.4:
** Installation: the systems clim-listener, clim-examples,
   and clouseau can now be loaded without loading the system mcclim
   first. Users with existing McCLIM installations should use the 
   provided script:
   		./symlink-asd-files.sh /path/to/asdf-central-registry/
** New extension: tab-layout. This extension allows keeping a stack of panes 
   whose foreground pane is controlled by a tab bar. This layout can be 
   customized in backends and frame managers. For examples, see the
   gtkairo backend and the pixie frame manager.
** New extension function: SHEET-RGB-IMAGE: makes a screenshot of a sheet 
   in the CLX backend. (Supported on truecolor visuals only for now.)
** New experimental extension: tree-with-cross-edges are an extension to
   the graph formatter.
** New experimental backend: clim-graphic-forms: native widgets on Windows. 
   This backend is still very experimental (it doesn't run demos yet).
** New inspector feature: The inspector now displays more useful information
   about hash tables and generic functions.
** Specification compliance: Various layout panes no longer quite as
   aggressive at eating the space requirements of their children.
** Specification compliance: There is now a rudimentary implementation of 
   NOTIFY-USER
** Usability: Text editors and text input panes now use click-to-focus.
** Improvement: the ACCEPTING-VALUES command table was renamed to 
   ACCEPT-VALUES (as this is the name that the other clim-2 implementation 
   uses)
** Improvement: the CLX backend should no longer cause focus stealing
   when an application has text-editor panes.  This change comes with
   a rudimentary click-to-focus-keyboard widget policy.
** Improvement: define-application-frame now allows a :default-initargs
   option. (This is not exactly a "specification compliance" fix, as 
   d-a-frame is not defined to accept this option.).
** Improvement: menu-choose menus now look a little prettier.
** Improvement: added more styles for bordered-output: :rounded, :ellipse
** Improvement: Toggle button values now default to NIL.
** Improvement: Frame layouts are now inherited from the frame's 
   superclass.
** Improvement: The Lisp Syntax is much improved: now recognizes 
   delimiter characters, and more types of Lambda lists.
** Bug fix: Bezier designs should now draw in the right place in all 
   backends.
** Bug fix: Text in Drei no longer "walks" to the left.
** Bug fix: Drei now has better support for delimiter gestures.
** Bug fix: Partial commands now work better when invoked from the menu.


* Changes in mcclim-0.9.4 relative to 0.9.3:
** cleanup: removed the obsolete system.lisp file.
** backend improvements: Gtkairo
*** Double buffering is now supported (fixes disappearing widgets on Windows).
*** X errors no longer terminate the lisp process.
*** Some bugfixes, including CMUCL support and better key event handling.
*** Native implementation of context menus, list panes, label panes, and
    option panes.
*** Draw text using Pango.  (Bug fix: Fixed-width font supported on Windows
    now.  Multiple lines of output in TEXT-SIZE supported now.
    TEXT-STYLE-FIXED-WIDTH-P works correctly now.)
** Improvement: Added new editor substrate ("Drei").
** Improvement: Improved the pathname presentation methods considerably.
** specification compliance: DELETE-GESTURE-NAME function now implemented.
** specification compliance: PRESENTATION-TYPE-SPECIFIER-P presentaion
   function now implemented.
** specification compliance: DISPLAY-COMMAND-TABLE-MENU function now
   implemented.
** specification compliance: DISPLAY-COMMAND-MENU function now
   implemented.
** specification compliance: POINTER-PLACE-RUBBER-BAND-LINE* function
   now implemented.
** specification compliance: POINTER-INPUT-RECTANGLE* function now
   implemented.
** specification compliance: POINTER-INPUT-RECTANGLE function now
   implemented.
** Improvement: Added font listing support, see section "Fonts and Extended
   Text Styles" in the manual.
** Improvement: Added support for bezier splines (Robert Strandh).
   To be documented.
** better PRESENTATION-SUBTYPEP (more likely to give the right answer
   on some-of and all-of presentation types)
** Improvement: M-n/M-p gestures for navigating presentation histories.

* Changes in mcclim-0.9.3 "All Souls' Day" relative to 0.9.2:
** backend improvement: The Null backend now registers itself in the
   server search path
** improvement: with-output-as-gadget now sets the correct cursor
   position when incremental redisplay is active.
** specification compliance: INVOKE-WITH-NEW-OUTPUT-RECORD's argument
   list now is the same as the one in the Franz CLIM user guide.
** improvement: The text field cursor is now a solid block again.
** backend improvement: the PostScript backend now outputs correct EPS
** improvement: Graph nodes can now be dragged
** improvement: Possibilities when reading from
   COMPLETE-FROM-GENERATOR are now sorted alphabetically.
** new experimental backend: gtkairo (loads on SBCL, CMUCL and SCL):
   Uses GTK+ for gadgets and cairo for rendering graphics.
** Bug fix: incremental-redisplay does no longer leak memory
** improvement: incremental-redisplay is now a little faster
** Bug fix: Invisible text cursors no longer leave a dangling space
   behind the text output record
** improvement: commands whose names are shadowed in child command
   tables are now suggested in preference to their parents.
** Bug fix: (setf stream-cursor-position) and output record replay on
   encapsulating streams work now.
** Bug fix: Invoking command menu items in frames with no interactor
   works now.
** Bug fix: DESTROY-PORT removes the port even if an error occurs
   while closing the port
** Bug fix: make-process now sets the process name on SBCL
** specification compliance: MENU-CHOOSE now supports almost all
   features demanded in the CLIM 2.0 specification.
** improvement: new and improved ACCEPT presentation method for
   expressions on interactive streams.
** specification compliance: LOOKUP-KEYSTROKE-ITEM no longer accepts
   the :errorp argument.
** Bug fix: incremental redisplay no longer breaks on output records
   that had no children.
** Bug fix: arrow head sizes are now transformed along with the line thickness.
** improvement: resizing a viewport's child will now move the viewport's focus.
** improvement: loading mcclim.asd no longer shows a code deletion note on SBCL.
** new demo: logic-cube
** compatibility: Add support for post-1.0 openmcl, and for Allegro
   Common Lisp 8.0 (ansi mode).
** new example application showing use of CLIM views.

```


## README.old


```text

McCLIM 0.9.7-dev post-"St. George's Day"

This is McCLIM, an implementation of the "Common Lisp Interface
Manager CLIM II Specification." It currently works on X Windows using
CLX. It works with CMUCL, SBCL, CLISP, OpenMCL, Allegro CL, LispWorks,
and the Scieneer CL.

The INSTALL file in this directory give instructions for each Lisp
implementation. Release notes for each release of McCLIM are in the
NEWS file in this directory.

The other directories of interest are:

Documentation - Various documentation
Documentation/Manual - the start of a manual
Documentation/Specification - The LaTeX source to the CLIM specification.

Apps - sample applications. This includes:
Apps/Debugger - Peter Mechleborg's debugger (similar to SLIME's)
Apps/Functional-Geometry - Frank Buss and Rainer Joswig's functional
                geometry package for drawing "Escher" tiles.
Apps/Inspector - Robert Strandh's inspector (similar to SLIME's)
Apps/Listener - Andy Hefner's incredibly cool Lisp listener
Apps/Scigraph - BBN's graphing package, currently not quite working

Examples - Small examples from the Net or written by the McCLIM
developers. These are of varying quality and style; many of them date
from a time when McCLIM was quite incomplete. In rough order of
relevance they are:

address-book - the canonical CLIM application
clim-fig - a drawing program
postscript-test - shows off the CLIM PostScript stream
gadget-test - fun with CLIM gadgets
calculator - a gadget-based calculator

Please send bug reports and comments to mcclim-devel@common-lisp.net

```
