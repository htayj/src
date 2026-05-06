# McCLIM Manual Index

Source URL: https://mcclim.common-lisp.dev/static/manual/mcclim.html

Converted reference: `references/mcclim-manual.md`

Conversion notes: generated from the upstream HTML with `pandoc --from html-native_divs-native_spans --to gfm-raw_html --wrap=none --markdown-headings=atx`, then Texinfo navigation lines were removed.

Use this index before loading the full manual. Prefer the lookup script for bounded extracts:

```bash
python3 scripts/mcclim_manual_lookup.py --query "incremental redisplay"
python3 scripts/mcclim_manual_lookup.py --section "Raster Images"
python3 scripts/mcclim_manual_lookup.py --list-headings
```

## Topic Hints

- **Getting started**: Building McCLIM; The first application; Defining Application Frames; Executing the Application
- **Application frames and panes**: Defining Application Frames; Panes and Gadgets; Panes; Creating panes; Pane names
- **Commands and menus**: Using command tables; Using menu bar; Command Processing; Frame command table change
- **Presentations and views**: Using presentation types; Using views; Extended blank area presentation type
- **Redisplay and output**: Using incremental redisplay; Output Protocol; Incremental redisplay; Extended text formatting
- **Drawing and media**: Concepts; Drawing functions; Raster Images; Drawing backends; Additional arguments to drawing functions
- **Backends and ports**: Writing backends; Backend protocol; Event handling; Medium drawing; Port protocol
- **Bundled applications**: Debugger; Inspector; Listener; manual-adjacent: Graphic Forms, Drei
- **Extensions**: Frame redefinition semantics; Frame and sheet icons; Text editor substrate; Tab Layout; Fonts and Extended Text Styles

## Section Map

- line 2: McCLIM User’s Manual
- line 142:   Introduction
- line 157:     Standards
- line 165:     How CLIM Is Different
- line 191:   1 User manual
- line 203:     1.1 Building McCLIM
- line 212:       1.1.1 Examples and demos
- line 232:       1.1.2 Applications
- line 272:     1.2 The first application
- line 285:       1.2.1 A bit of terminology
- line 302:       1.2.2 How CLIM applications produce output
- line 329:       1.2.3 Panes and Gadgets
- line 335:       1.2.4 Defining Application Frames
- line 343:       1.2.5 A First Attempt
- line 403:       1.2.6 Executing the Application
- line 411:       1.2.7 Adding Functionality
- line 499:       1.2.8 An application displaying a data structure
- line 568:     1.3 Using incremental redisplay
- line 673:     1.4 Using presentation types
- line 680:       1.4.1 What is a presentation type
- line 692:       1.4.2 A simple example
- line 748:     1.5 Using views
- line 887:     1.6 Using command tables
- line 903:     1.7 Using menu bar
- line 912:       1.7.1 Creating Menu bar
- line 939:       1.7.2 Modifying Menu bar
- line 950:       Modifying menu items of command table
- line 1010:   2 Reference manual
- line 1022:     2.1 Concepts
- line 1029:       2.1.1 Coordinate systems
- line 1045:       2.1.2 Arguments to drawing functions
- line 1053:     2.2 Sheet hierarchies
- line 1068:       2.2.1 Computing the native transformation
- line 1072:       2.2.2 Computing the native region
- line 1076:       2.2.3 Moving and resizing sheets and regions
- line 1080:       2.2.4 Scrolling
- line 1084:     2.3 Drawing functions
- line 1091:       2.3.1 Windowing system drawing
- line 1101:       2.3.2 CLIM drawing
- line 1117:     2.4 Panes
- line 1148:       2.4.1 Creating panes
- line 1162:       2.4.2 Pane names
- line 1179:       2.4.3 Redisplaying panes
- line 1210:       2.4.4 Layout protocol
- line 1222:       2.4.4.1 Space composition
- line 1234:       2.4.4.2 Space allocation
- line 1255:       2.4.4.3 Change-space Notification Protocol
- line 1271:     2.5 Output Protocol
- line 1393:     2.6 Command Processing
- line 1407:     2.7 Incremental redisplay
- line 1424:   3 Developer manual
- line 1433:     3.1 Coding conventions
- line 1440:       3.1.1 Packages
- line 1448:       3.1.2 Examples
- line 1454:     3.2 Pointer cursors
- line 1497:     3.3 Writing backends
- line 1515:       3.3.1 Different types of backends
- line 1534:       3.3.2 Backend protocol
- line 1549:       3.3.3 Event handling
- line 1560:       3.3.4 Graft protocol
- line 1573:       3.3.5 Medium drawing
- line 1592:       3.3.6 Medium operation
- line 1611:       3.3.7 Port protocol
- line 1631:       3.3.8 Frame manager, panes and gadgets
- line 1651:       3.3.9 Pointer protocol (events?)
- line 1663:       3.3.10 Text size
- line 1681:       3.3.11 Additional output destinations
- line 1705:       3.3.12 Miscellaneous
- line 1716:       3.3.13 Obsolete
- line 1727:     3.4 PostScript backend
- line 1734:       3.4.1 Postscript fonts
- line 1740:       3.4.2 Additional functions
- line 1752:   4 Extensions
- line 1771:     4.1 Frame redefinition semantics
- line 1808:     4.2 Frame and sheet icons
- line 1854:     4.3 Frame and sheet names
- line 1888:     4.4 Frame and sheet shrinking
- line 1908:     4.5 Frame command table change
- line 1920:     4.6 Text editor substrate
- line 1927:       Text field gadget
- line 1932:       Text editor pane
- line 1936:     4.7 Extended text formatting
- line 1943:       4.7.1 Page abstraction
- line 1973:       4.7.2 FILLING-OUTPUT extension
- line 1987:     4.8 Extended blank area presentation type
- line 2004:     4.9 Tab Layout
- line 2182:     4.10 Fonts and Extended Text Styles
- line 2189:       4.10.1 Extended Text Styles
- line 2209:       4.10.2 Listing Fonts
- line 2313:     4.11 Raster Images
- line 2331:     4.12 Drawing backends
- line 2361:       4.12.1 Interactive backend as a medium
- line 2367:       4.12.2 PostScript
- line 2384:       4.12.3 PDF
- line 2395:       4.12.4 SVG
- line 2414:       4.12.5 RasterImage
- line 2434:       4.12.6 Adding new backends
- line 2440:     4.13 Additional arguments to drawing functions
- line 2446:     4.14 Gestures and Gesture Names extensions
- line 2505:   5 Applications
- line 2513:     5.1 Debugger
- line 2523:       5.1.1 Debugger usage
- line 2541:       5.1.2 Keyboard shortcuts
- line 2568:       5.1.3 Debugger API
- line 2590:     5.2 Inspector
- line 2602:       5.2.1 Usage
- line 2614:       5.2.1.1 Quick Start
- line 2642:       5.2.1.2 The Inspector Window
- line 2654:       5.2.1.3 Objects and Places
- line 2697:       5.2.1.4 Evaluating Forms
- line 2705:       5.2.1.5 Navigating
- line 2721:       5.2.1.6 Handling of Specific Object Types
- line 2749:       5.2.1.7 Updating the Inspected Object
- line 2772:       5.2.2 Extending Clouseau
- line 2782:       5.2.2.1 Running Example
- line 2858:       5.2.2.2 State and Style of Presented Objects
- line 2874:       5.2.2.3 Defining Inspection Methods for Objects
- line 2979:       5.2.3 API
- line 2990:       5.2.3.1 Functions for Invoking Clouseau
- line 3006:       5.2.3.2 Functions for Extending Clouseau
- line 3149:       5.2.3.3 Other Functions
- line 3177:       5.2.3.4 Deprecated Functions
- line 3217:     5.3 Listener
- line 3237:       5.3.1 Usage
- line 3244:       5.3.1.1 Quick start
- line 3257:       5.3.1.2 Commands
- line 3335:       5.3.2 The \#! macro character
- line 3347:       5.3.3 Calling commands from lisp
- line 3353:       5.3.4 Command output destinations
- line 3368:       5.3.5 Debugger integration
- line 3374:   Auxiliary material
- line 3381:     Glossary
- line 3483:     Development History
- line 3523:   Concept index
- line 3537:   Function and macro and variable and type index
- line 3546:       Footnotes
- line 3548:         [(1)](#DOCF1)
- line 3552:         [(2)](#DOCF2)
- line 3556:         [(3)](#DOCF3)
- line 3560:         [(4)](#DOCF4)
