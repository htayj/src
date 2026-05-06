
# McCLIM User’s Manual

Copyright © 2004,2005,2006,2007,2008,2017,2019 the McCLIM hackers.

## Table of Contents

- [Introduction](#Introduction)
  - [Standards](#Standards)
  - [How CLIM Is Different](#How-CLIM-Is-Different)
- [1 User manual](#User-manual)
  - [1.1 Building McCLIM](#Building-McCLIM)
    - [1.1.1 Examples and demos](#Examples-and-demos)
    - [1.1.2 Applications](#Applications-1)
  - [1.2 The first application](#The-first-application)
    - [1.2.1 A bit of terminology](#A-bit-of-terminology)
    - [1.2.2 How CLIM applications produce output](#How-CLIM-applications-produce-output)
    - [1.2.3 Panes and Gadgets](#Panes-and-Gadgets)
    - [1.2.4 Defining Application Frames](#Defining-Application-Frames)
    - [1.2.5 A First Attempt](#A-First-Attempt)
    - [1.2.6 Executing the Application](#Executing-the-Application)
    - [1.2.7 Adding Functionality](#Adding-Functionality)
    - [1.2.8 An application displaying a data structure](#An-application-displaying-a-data-structure)
  - [1.3 Using incremental redisplay](#Using-incremental-redisplay)
  - [1.4 Using presentation types](#Using-presentation-types)
    - [1.4.1 What is a presentation type](#What-is-a-presentation-type)
    - [1.4.2 A simple example](#A-simple-example)
  - [1.5 Using views](#Using-views)
  - [1.6 Using command tables](#Using-command-tables)
  - [1.7 Using menu bar](#Using-menu-bar)
    - [1.7.1 Creating Menu bar](#Creating-Menu-bar)
    - [1.7.2 Modifying Menu bar](#Modifying-Menu-bar)
- [2 Reference manual](#Reference-manual)
  - [2.1 Concepts](#Concepts)
    - [2.1.1 Coordinate systems](#Coordinate-systems)
    - [2.1.2 Arguments to drawing functions](#Arguments-to-drawing-functions)
  - [2.2 Sheet hierarchies](#Sheet-hierarchies)
    - [2.2.1 Computing the native transformation](#Computing-the-native-transformation)
    - [2.2.2 Computing the native region](#Computing-the-native-region)
    - [2.2.3 Moving and resizing sheets and regions](#Moving-and-resizing-sheets-and-regions)
    - [2.2.4 Scrolling](#Scrolling)
  - [2.3 Drawing functions](#Drawing-functions)
    - [2.3.1 Windowing system drawing](#Windowing-system-drawing)
    - [2.3.2 CLIM drawing](#CLIM-drawing)
  - [2.4 Panes](#Panes)
    - [2.4.1 Creating panes](#Creating-panes)
    - [2.4.2 Pane names](#Pane-names)
    - [2.4.3 Redisplaying panes](#Redisplaying-panes)
    - [2.4.4 Layout protocol](#Layout-protocol)
      - [2.4.4.1 Space composition](#Space-composition)
      - [2.4.4.2 Space allocation](#Space-allocation)
      - [2.4.4.3 Change-space Notification Protocol](#Change_002dspace-Notification-Protocol)
  - [2.5 Output Protocol](#Output-Protocol)
  - [2.6 Command Processing](#Command-Processing)
  - [2.7 Incremental redisplay](#Incremental-redisplay)
- [3 Developer manual](#Developer-manual)
  - [3.1 Coding conventions](#Coding-conventions)
    - [3.1.1 Packages](#Packages)
    - [3.1.2 Examples](#Examples)
  - [3.2 Pointer cursors](#Pointer-cursors)
  - [3.3 Writing backends](#Writing-backends)
    - [3.3.1 Different types of backends](#Different-types-of-backends)
    - [3.3.2 Backend protocol](#Backend-protocol)
    - [3.3.3 Event handling](#Event-handling)
    - [3.3.4 Graft protocol](#Graft-protocol)
    - [3.3.5 Medium drawing](#Medium-drawing)
    - [3.3.6 Medium operation](#Medium-operations)
    - [3.3.7 Port protocol](#Port-protocol)
    - [3.3.8 Frame manager, panes and gadgets](#Frame-manager)
    - [3.3.9 Pointer protocol (events?)](#Pointer-protocol-_0028events_003f_0029)
    - [3.3.10 Text size](#Text-size)
    - [3.3.11 Additional output destinations](#Additional-output-destinations)
    - [3.3.12 Miscellaneous](#Miscellaneous)
    - [3.3.13 Obsolete](#Obsolete)
  - [3.4 PostScript backend](#PostScript-backend)
    - [3.4.1 Postscript fonts](#Postscript-fonts)
    - [3.4.2 Additional functions](#Additional-functions)
- [4 Extensions](#Extensions)
  - [4.1 Frame redefinition semantics](#Frame-redefinition-semantics)
  - [4.2 Frame and sheet icons](#Frame-and-sheet-icons)
  - [4.3 Frame and sheet names](#Frame-and-sheet-names)
  - [4.4 Frame and sheet shrinking](#Frame-and-sheet-shrinking)
  - [4.5 Frame command table change](#Frame-command-table-change)
  - [4.6 Text editor substrate](#Text-editor-substrate)
  - [4.7 Extended text formatting](#Extended-text-formatting)
    - [4.7.1 Page abstraction](#Page-abstraction)
    - [4.7.2 FILLING-OUTPUT extension](#FILLING_002dOUTPUT-extension)
  - [4.8 Extended blank area presentation type](#Extended-blank-area-presentation-type)
  - [4.9 Tab Layout](#Tab-Layout)
  - [4.10 Fonts and Extended Text Styles](#Fonts-and-Extended-Text-Styles)
    - [4.10.1 Extended Text Styles](#Extended-Text-Styles)
    - [4.10.2 Listing Fonts](#Listing-Fonts)
  - [4.11 Raster Images](#Raster-Images)
  - [4.12 Drawing backends](#Drawing-backends)
    - [4.12.1 Interactive backend as a medium](#Interactive-backend-as-a-medium)
    - [4.12.2 PostScript](#PostScript)
    - [4.12.3 PDF](#PDF)
    - [4.12.4 SVG](#SVG)
    - [4.12.5 RasterImage](#RasterImage)
    - [4.12.6 Adding new backends](#Adding-new-backends)
  - [4.13 Additional arguments to drawing functions](#Additional-arguments-to-drawing-functions)
  - [4.14 Gestures and Gesture Names extensions](#Gestures-and-Gesture-Names-extensions)
- [5 Applications](#Applications)
  - [5.1 Debugger](#Debugger)
    - [5.1.1 Debugger usage](#Debugger-usage)
    - [5.1.2 Keyboard shortcuts](#Keyboard-shortcuts)
    - [5.1.3 Debugger API](#Debugger-API)
  - [5.2 Inspector](#Inspector)
    - [5.2.1 Usage](#Usage)
      - [5.2.1.1 Quick Start](#Quick-Start)
      - [5.2.1.2 The Inspector Window](#The-Inspector-Window)
      - [5.2.1.3 Objects and Places](#Objects-and-Places)
      - [5.2.1.4 Evaluating Forms](#Evaluating-Forms)
      - [5.2.1.5 Navigating](#Navigating)
      - [5.2.1.6 Handling of Specific Object Types](#Handling-of-Specific-Object-Types)
      - [5.2.1.7 Updating the Inspected Object](#Updating-the-Inspected-Object)
    - [5.2.2 Extending Clouseau](#Extending-Clouseau)
      - [5.2.2.1 Running Example](#Running-Example)
      - [5.2.2.2 State and Style of Presented Objects](#State-and-Style-of-Presented-Objects)
      - [5.2.2.3 Defining Inspection Methods for Objects](#Defining-Inspection-Methods-for-Objects)
    - [5.2.3 API](#API)
      - [5.2.3.1 Functions for Invoking Clouseau](#Funtions-for-Invoking-Clouseau)
      - [5.2.3.2 Functions for Extending Clouseau](#Functions-for-Extending-Clouseau)
      - [5.2.3.3 Other Functions](#Other-Functions)
      - [5.2.3.4 Deprecated Functions](#Deprecated-Functions)
  - [5.3 Listener](#Listener)
    - [5.3.1 Usage](#Listener-usage)
      - [5.3.1.1 Quick start](#Listener-quick-start)
      - [5.3.1.2 Commands](#Commands)
    - [5.3.2 The \#! macro character](#The-_0023_0021-macro-character)
    - [5.3.3 Calling commands from lisp](#Calling-commands-from-lisp)
    - [5.3.4 Command output destinations](#Command-output-destinations)
    - [5.3.5 Debugger integration](#Debugger-integration)
- [Auxiliary material](#Auxiliary-material)
  - [Glossary](#Glossary)
  - [Development History](#Development-History)
- [Concept index](#Concept-index)
- [Function and macro and variable and type index](#Function-and-macro-and-variable-and-type-index)



## Introduction

CLIM is a large layered software system that allows the user to customize it at each level. The most simple ways of using CLIM is to directly use its top layer, which contains application frames, panes, and gadgets, very similar to those of traditional windowing system toolkits such as GTK, Tk, and Motif.

But there is much more to using CLIM. In CLIM, the upper layer with panes and gadgets is written on top of a basic layer containing more basic functionality in the form of sheets. Objects in the upper layer are typically instances of classes derived from those of the lower layer. Thus, nothing prevents a user from adding new gadgets and panes by writing code that uses the sheet layer.

Finally, since CLIM is written in Common Lisp, essentially all parts of it can be modified, replaced, or extended.

For that reason, a user’s manual for CLIM must contain not only a description of the protocols of the upper layer, but also of all protocols, classes, functions, macros, etc. that are part of the specification.

- [Standards](#Standards)
- [How CLIM Is Different](#How-CLIM-Is-Different)



### Standards

This manual documents McCLIM 0.9.8 which is a mostly complete implementation of the CLIM 2.0 specification and its revision 2.2. To our knowledge version 2.2 of the CLIM specification is only documented in the “CLIM 2 User’s Guide” by Franz. While that document is not a formal specification, it does contain many cleanups and is often clearer than the official specification; on the other hand, the original specification is a useful reference. This manual will note where McCLIM has followed the 2.2 API.

Also, some protocols mentioned in the 2.0 specification, such as parts of the incremental redisplay protocol, are clearly internal to CLIM and not well described. It will be noted here when they are partially implemented in McCLIM or not implemented at all.



### How CLIM Is Different

Many new users of CLIM have a hard time trying to understand how it works and how to use it. A large part of the problem is that many such users are used to more traditional GUI toolkits, and they try to fit CLIM into their mental model of how GUI toolkits should work.

But CLIM is much more than just a GUI toolkit, as suggested by its name, it is an *interface manager*, i.e. it is a complete mediator between application “business logic” and the way the user interacts with objects of the application. In fact, CLIM doesn’t have to be used with graphics output at all, as it contains a large collection of functionality to manage text.

Traditional GUI toolkits have an *event loop*. Events are delivered to GUI elements called *gadgets* (or *widgets*), and the programmer attaches *event handlers* to those gadgets in order to invoke the functionality of the application logic. While this way of structuring code is sometimes presented as a virtue (“Event-driven programming”), it has an unfortunate side effect, namely that event handlers are executed in a null context, so that it becomes hard to even remember two consecutive events. The effect of event-driven programming is that applications written that way have very rudimentary interaction policies.

At the lowest level, CLIM also has an event loop, but most application programmers never have any reason to program at that level with CLIM. Instead, CLIM has a *command loop* at a much higher level than the event loop. At each iteration of the command loop:

1.  A command is acquired. You might satisfy this demand by clicking on a menu item, by typing the name of a command, by hitting some kind of keystroke, by pressing a button, or by pressing some visible object with a command associated with it;
2.  Arguments that are required by the command are acquired. Each argument is often associated with a *presentation type*, and visible objects of the right presentation type can be clicked on to satisfy this demand. You can also type a textual representation of the argument, using completion, or you can use a context menu;
3.  The command is called on the arguments, usually resulting in some significant modification of the data structure representing your application logic;
4.  A *display routine* is called to update the views of the application logic. The display routine may use features such as incremental redisplay.

Instead of attaching event handlers to gadgets, writing a CLIM application therefore consists of:

- writing CLIM commands that modify the application data structures independently of how those commands are invoked, and which may take application objects as arguments;
- writing display routines that turn the application data structures (and possibly some "view" object) into a collection of visible representations (having presentation types) of application objects;
- writing completion routines that allow you to type in application objects (of a certain presentation type) using completions;
- independently deciding how commands are to be invoked (menus, buttons, presentations, textual commands, etc).

By using CLIM as a mediator of command invocation and argument acquisition, you can obtain some very modular code. Application logic is completely separate from interaction policies, and the two can evolve separately and independently.



## 1 User manual

- [Building McCLIM](#Building-McCLIM)
- [The first application](#The-first-application)
- [Using incremental redisplay](#Using-incremental-redisplay)
- [Using presentation types](#Using-presentation-types)
- [Using views](#Using-views)
- [Using command tables](#Using-command-tables)
- [Using menu bar](#Using-menu-bar)



### 1.1 Building McCLIM

The McCLIM source distribution comes with a number of demos, examples and applications. They are intended to showcase specific CLIM features, demonstrate programming techniques or provide useful tools.

These demos and applications are available in the `Examples` and `Apps` subdirectories of the source tree’s root directory. The following sections give a brief overview of the included examples and applications and explain how to compile, load and run them. Furthermore, the `INSTALL` file in the source tree’s root directory contains more detailed McCLIM installation instructions for your Common Lisp implementation.

- [Examples and demos](#Examples-and-demos)
- [Applications](#Applications-1)

#### 1.1.1 Examples and demos

Demos are meant to be run after loading the `clim-examples` system from the frame created with `(clim-demo:demodemo)`.

The easiest way to try this is to use the *Quicklisp* library manager. Assuming that Quicklisp has already been set up, trying out the demos is straightforward:

``` lisp-preformatted
(ql:quickload :clim-examples)
(clim-demo:demodemo)
```

Alternatively, for the more courageous (which requires separately downloading dependencies and setting a local repository), `asdf` also works well starting from the McCLIM source code directory.

``` lisp-preformatted
(asdf:load-system "clim-examples")
(clim-demo:demodemo)
```

The source code of all demos can be found in the `Examples` directory.

#### 1.1.2 Applications

Additionally McCLIM has a few bundled applications:

`Apps/Listener`  
CLIM-enabled Lisp listener. System name is `clim-listener`. See [Listener](#Listener) for more information.

``` lisp-preformatted
(asdf:load-system "clim-listener")
(clim-listener:run-listener)
```

`Apps/Clouseau`  
CLIM-enabled Lisp inspector. System name is `clouseau`. See [Inspector](#Inspector) for more information.

``` lisp-preformatted
(asdf:load-system "clouseau")
(clouseau:inspect clim:+indian-red+)
```

`Apps/Debugger`  
Common Lisp debugger implemented in McCLIM. It uses the portable debugger interface for `sldb` (part of Slime project). System name is `clim-debugger`. See [Debugger](#Debugger) for more information.

``` lisp-preformatted
(asdf:load-system "clim-debugger")
(clim-debugger:with-debugger
 (break "simple-break"))
```

`Apps/Functional-Geometry`  
Peter Henderson idea, see [http://www.ecs.soton.ac.uk/\~ph/funcgeo.pdf](http://www.ecs.soton.ac.uk/~ph/funcgeo.pdf) and [http://www.ecs.soton.ac.uk/\~ph/papers/funcgeo2.pdf](http://www.ecs.soton.ac.uk/~ph/papers/funcgeo2.pdf) implemented in Lisp by Frank Buss. CLIM Listener interface by Rainer Joswig. System name is `functional-geometry`.

``` lisp-preformatted
(asdf:load-system 'functional-geometry)
(functional-geometry:run-functional-geometry)
(clim-plot *fishes*) ; from a listener
```



### 1.2 The first application

- [A bit of terminology](#A-bit-of-terminology)
- [How CLIM applications produce output](#How-CLIM-applications-produce-output)
- [Panes and Gadgets](#Panes-and-Gadgets)
- [Defining Application Frames](#Defining-Application-Frames)
- [A First Attempt](#A-First-Attempt)
- [Executing the Application](#Executing-the-Application)
- [Adding Functionality](#Adding-Functionality)
- [An application displaying a data structure](#An-application-displaying-a-data-structure)



#### 1.2.1 A bit of terminology

CLIM was developed before the GUI toolkits widely used at the moment. Qt, GTK and others appeared much later than CLIM and the difference of terminology reflects this.

A CLIM application is made up of a hierarchy of an *application frame*, *panes* and *gadgets* (gadgets are special kinds of panes):

application frame  
An *application frame* is what would usually be called an application.

panes  
At a very high level, panes describe an application frame’s visual building blocks: a side bar, a menu bar, a table displaying a list of items, a text input are all panes. They can be used by application programmers to compose the top-level user interface of their applications, as well as auxiliary components such as menus and dialogs. In addition, panes can be more abstract such as layout panes such as `hbox`, `vbox` to arrange other panes horizontally or vertically, etc.

gadgets  
*gadgets* correspond to what other toolkits call *widgets* and *control*. Frequently used CLIM gadgets are `button`s, `slider`s, etc.



#### 1.2.2 How CLIM applications produce output

Although it is easy to imagine panes in terms of their appearance on screen, they are much richer: they are actually the series of operations that produces that appearance. They are not only the end product visible on a screen, but they contain all the step-by-step information that led to that representation.

More precisely, CLIM panes record the series of operations that generates an output. This means that such a pane maintains a display list, consisting of a sequence of output records, ordered chronologically, from the first output record to be drawn to the last.

This display list is used to fill in damaged areas of the pane, for instance as a result of the pane being partially or totally covered by other panes, and then having some or all of its area again becoming visible. The output records of the display list that have some parts in common with the exposed area are partially or totally replayed (in chronological order) to redraw the contents of the area.

An application can have a pane establish this display list in several fundamentally different ways, each more sophisticated:

Simple application  
Very simple applications have no internal data structure to keep track of application objects, and simply produce output to the pane from time to time as a result of running commands, occasionally perhaps erasing the pane and starting over. Such applications typically use text or graphics output as a result of running commands. CLIM maintains the display list for the pane, and adds to the end of it, each time also producing the pixels that result from drawing the new output record. If the pane uses scrolling (which it typically does), then CLIM must determine the extent of the pane so as to update the scroll bar after each new output.

Application with a static display function  
More complicated applications use a display function. Before the display function is run, the existing display list is typically deleted, so that the purpose of the display function becomes to establish an entirely new display list. The display function might for instance produce some kind of form to be filled in, and application commands can use text or graphics operations to fill in the form. A game of tic-tac-toe could work this way, where the display function draws the board and commands draw shapes into the squares.

Application with a dynamic display function  
Even more complicated applications might have some internal data structure that has a direct mapping to output, and commands simply modify this internal data structure. In this case, the display function is run after each time around the command loop, because a command can have modified the internal data structure in some arbitrary ways. Some such applications might simply want to delete the existing display list and produce a new one each time (to minimize flicker, double buffering could be used). This is a very simple way of structuring an application, and entirely acceptable in many cases. Consider, for instance, a board game where pieces can be moved (as opposed to just added). A very simple way of structuring such an application is to have an internal representation of the board, and to make the display function traverse this data structure and produce the complete output each time in the command loop.

Application with an incremental static display function  
Some applications have very large internal data structures to be displayed, and it would cause a serious performance problem if the display list had to be computed from scratch each time around the command loop. To solve this problem, CLIM contains a feature called incremental redisplay. It allows many of the output records to be kept from one iteration of the command loop to the next. This can be done in two different ways. The simplest way is for the application to keep the simple structure which consists of traversing the entire data structure each time, but at various points indicate to CLIM that the output has not changed since last time, so as to avoid actually invoking the application code for computing it. This is accomplished by the use of `updating-output`. The advantage of `updating-output` is that the application logic remains straightforward, and it is up to CLIM to do the hard work of recycling output records. The disadvantage is that for some very demanding applications, this method might not be fast enough.

Programmer does it all  
The other way is more complicated and requires the programmer to structure the application differently. Essentially, the application has to keep track of the output records in the display list, and inform CLIM about modifications to it. The main disadvantage of this method is that the programmer must now write the application to keep track of the output records itself, as opposed to leaving it to CLIM.



#### 1.2.3 Panes and Gadgets

A CLIM application is made up of a hierarchy of *panes* and *gadgets* (gadgets are special kinds of panes). These elements correspond to what other toolkits call *widgets*. Frequently used CLIM gadgets are `button`s, `slider`s, etc, and typical panes are the layout panes such as `hbox`, `vbox`, `hrack`, etc.



#### 1.2.4 Defining Application Frames

Each CLIM application is defined by an *application frame*. An application frame is an instance of the class `application-frame`. As a CLIM user, you typically define a class that inherits from the class `application-frame`, and that contains additional slots needed by your application. It is considered good style to keep all your application-specific data in slots in the application frame (rather than, say, in global variables), and to define your application-specific application frame in its own package.

The usual way to define an application frame is to use the macro **define-application-frame**. This macro works much like **defclass**, but also allows you to specify the hierarchy of *panes* and *gadgets* to use.



#### 1.2.5 A First Attempt

Let us define a very primitive CLIM application. For that, let us put the following code in a file:

``` lisp-preformatted
(in-package :common-lisp-user)

(defpackage :my-first-app
  ;; Imports the appropriate CLIM library
  (:use :clim :clim-lisp)

  ;; The package will only export a function to run the app
  (:export run-my-first-app))

;; Good practice
(in-package :my-first-app)

;; Definition of the structure of a minimum app
(define-application-frame my-first-clim-app ()
  ()

  ;; This app only has 1 pane
  (:panes
   (my-interactor :interactor
                  :height 400
                  :width 600))

  ;; :layouts section describes how the pane is positioned inside
  ;; the application frame.
  ;; With 1 pane, no point getting complicated, Default is fine...
  (:layouts
    (my-default my-interactor)))

;; Now that the structure of the app is defined, need a function
;; to launch an instance of this app. (The user could run
;; several instances of the same app.)
(defun run-my-first-app ()
  (run-frame-top-level (make-application-frame 'my-first-clim-app)))
```

As we can see in this example, we have put our application in a separate package, here a package named `MY-FIRST-APP`. While not required, putting the application in its own package is good practice.

The package for the application uses two packages: `CLIM` and `CLIM-LISP`. The `CLIM` package is the one that contains all the symbols needed for using CLIM. The `CLIM-LISP` package replaces the `COMMON-LISP` package for CLIM applications. It is essentially the same as the `COMMON-LISP` package as far as the user is concerned.

In our example, we export the symbol that corresponds to the main function to start our application, here called `run-my-first-app`.

The most important part of the code in our example is the definition of the application-frame. In our example, we have defined an application frame called `my-first-clim-app`, which becomes a CLOS class that automatically inherits from some standard CLIM application frame class.

The second argument to **define-application-frame** is a list of additional superclasses from which you want your application frame to inherit. In our example, this list is empty, which means that our application frame only inherits from the standard CLIM application frame.

The third argument to **define-application-frame** is a list of CLOS slots to be added to any instance of this kind of application frame. These slots are typically used for holding all application-specific data. The current instance of the application frame will always be the value of the special variable `*application-frame*`, so that the values of these slots can be accessed. In our example, we do not initially have any further slots.

The rest of the definition of an application frame contains additional elements that CLIM will allow the user to define. In our example, we have two additional (mandatory) elements: `:panes` and `:layouts`.

The `:panes` element defines a collection of CLIM panes that each instance of your application may have. Each pane has a name, a type, and perhaps some options that are used to instantiate that particular type of pane. Here, we have a pane called `my-interactor` of type `:interactor` with a height of 400 units and a width of 600 units. In McCLIM, the units are initially physical units (number of pixels) of the native windowing system.

The `:layouts` element defines one or more ways of organizing the panes in a hierarchy. Each layout has a name and a description of a hierarchy. In our example, only one layout, named `my-default`, is defined. The layout called `my-default` is the one that is used by CLIM at startup. In our example, the corresponding hierarchy is trivial, since it contains only the one element `my-interactor`, which is the name of our only pane.



#### 1.2.6 Executing the Application

In order to run a CLIM application, you must have a Lisp system that contains McCLIM. If you use CMUCL or SBCL, you either need a `core` file that already has McCLIM in it, or else, you have to load the McCLIM compiled files that make up the McCLIM distribution. The first solution is recommended so as to avoid having to load the McCLIM files each time you start your CLIM application.

To execute the application, load the file containing your code (possibly after compiling it) into your running Lisp system. Then start the application. Our example can be started by typing `(my-first-app:run-my-first-app)`.



#### 1.2.7 Adding Functionality

In a serious application, you would probably want some area where your application objects are to be displayed. In CLIM, such an area is called an *application pane*, and would be an instance (direct or indirect) of the CLIM class `application-pane`. In fact, instances of this class are in reality also *streams* which can be used in calls both to ordinary input and output functions such as `format` and `read` and to CLIM-specific functions such as `draw-line`.

Let’s consider an improved example, where the *my-* names have been replaced by shorter versions for brevity:

``` lisp-preformatted
(in-package :common-lisp-user)

(defpackage :app
  (:use :clim :clim-lisp)
  (:export run-app))

(in-package :app)

(define-application-frame superapp ()
  ()
  (:pointer-documentation t)
  (:panes

   ;; Let's add an additional pane
   (app :application

        ;; :DISPLAY-TIME specifies when this pane should be displayed
        ;; in the command loop. Note that the refresh is
        ;; pane-specific, not application-wide.
        :display-time nil
        :height 400
        :width 600)

   (int :interactor
        :height 200
        :width 600))

  (:layouts

   ;; This time we explicitly specify that the 2 defined panes
   ;; should be stacked vertically.
   (default (vertically ()
              app int))))

;;
;; Let's also define commands that will act on the application.
;;

;; How to leave the application.
;; Note the '-superapp-' part of the command definition, coming from
;; the name of the application frame.
(define-superapp-command (com-quit :name t) ()
  (frame-exit *application-frame*))


;; This is an additional command that will be used in the next
;; example, so its content is not important. However, it is useful to
;; describe some aspects of the command loop. See below.
(define-superapp-command (com-parity :name t) ((number 'integer))
  (format t "~a is ~a~%" number
          (if (oddp number)
              "odd"
              "even")))


(defun run-app ()
  (run-frame-top-level (make-application-frame 'superapp)))
```

In this example we have such an application pane, the name of which is `app`. As you can see, we have defined it with an option `:display-time nil`. The default value for this option for an application pane is `:command-loop`, which means that the pane is cleared after each iteration in the command loop, and then redisplayed using a client-supplied *display function*. The default display function does nothing, and we have not supplied any, so if we had omitted the `:display-time nil` option, the `parity` command would have written to the pane. Then, at the end of the command loop, the pane would have been cleared, and nothing else would have been displayed. The net result is that we would have seen no visible output. With the option `:display-time nil`, the pane is never cleared, and output is accumulated every time we execute the `parity` command.

For this example, we also added a few *commands*. Such commands are defined by the use of a macro called **`define-`*name*`-command`**, where *name* is the name of the application, in our case `superapp`. This macro is automatically defined by `define-application-frame`.

In addition, we added a pane that automatically provides documentation for different actions on the pointer device. This was done by including `(:pointer-documentation t)` in the frame definition.

If you execute this example, you will find that you now have three different panes—the application pane, the interactor pane, and the pointer documentation pane. In the pointer documentation pane, you will see the text ‘`R possibilities`’ which indicates that if you click the right mouse button, you will automatically see a popup menu that lets you choose a command. In our case, you will have the default commands that are automatically proposed by McCLIM plus the commands that you defined yourself, in this case `quit` and `parity`.

[Figure 1.1](#fig_003afigex2) shows what ought to be visible on the screen.

![View of the improved example](figures/ex2-screenshot.png)

**Figure 1.1:** View of the improved example.

Notice that commands, in order to be available from the command line, must have an option of `:name t`. The reason is that some commands will be available only from menus or by some other mechanism.

You may notice that if the output of the application is hidden (say by the window of some other application) and then re-exposed, the output reappears normally, without any intervention necessary on the part of the programmer. This effect is accomplished by a CLIM mechanism called *output recording*. Essentially, every piece of output is not only displayed in the pane, but also captured in an *output record* associated with the pane. When a pane is re-exposed, its output records are consulted and if any of them overlap the re-exposed region, they are redisplayed. In fact, some others may be redisplayed as well, because CLIM guarantees that the effect will be the same as when the initial output was created. It does that by making sure that the order between (partially) overlapping output records is respected.

Not all panes support output recording, but application panes certainly do, so it is recommended that you use some subclass of `application-pane` to display application-specific objects, so that output recording is done automatically.



#### 1.2.8 An application displaying a data structure

Many applications use a central data structure that is to be on display at all times, and that is modified by the commands of the application. CLIM allows for a very easy way to write such an application. The main idea is to store the data structure in slots of the application frame, and to use a *display function* that after each iteration of the command loop displays the entire data structure to the application pane.

Here is a variation of the previous application that shows this possibility:

``` lisp-preformatted
(in-package :common-lisp-user)

(defpackage "APP"
  (:use :clim :clim-lisp)
  (:export "APP-MAIN"))

(in-package :app)

(define-application-frame superapp ()
  ;; New addition of a slot to the application frame, which defines a
  ;; application-specific slot. The slot is simply a number.
  ((current-number :initform nil
                    :accessor current-number))

  ;; We no longer specify :DISPLAY-TIME (see below), and we supply our
  ;; own :DISPLAY-FUNCTION. The rest of the application frame is
  ;; unchanged.
  (:pointer-documentation t)
  (:panes
    (app :application
         :height 400
         :width 600
         :display-function 'display-app)
    (int :interactor
         :height 200
         :width 600))
  (:layouts
    (default (vertically ()
              app int))))

;; The display function for the "app" pane. It simply prints the
;; number from the application frame slot, and whether it is odd or
;; even. Note that the print stream of `format' is PANE.
(defun display-app (frame pane)
  (let ((number (current-number frame)))
    (format pane "~a is ~a"
            number
            (cond ((null number) "not a number")
                  ((oddp number) "odd")
                  (t "even")))))

(define-superapp-command (com-quit :name t) ()
  (frame-exit *application-frame*))

(define-superapp-command (com-parity :name t) ((number 'integer))
  (setf (current-number *application-frame*) number))


(defun app-main ()
  (run-frame-top-level (make-application-frame 'superapp)))
```

Here, we have added a slot that is called `current-number` to the application frame. It is initialized to `NIL` and it has an accessor function that allow us to query and to modify the value.

Observe that in this example, we no longer have the option `:display-time nil` set in the application pane. By default, then, the `:display-time` is `:command-loop`, which means that the pane is erased after each iteration of the command loop. Also observe the option `:display-function` in the application pane definition, which takes the name of a function that will be called to display the pane after it has been cleared. In this case, the function is `display-app`, which we have defined immediately after the application frame.

Instead of immediately displaying information about its argument, the command `com-parity` instead modifies the new slot of the application frame. Think of this function as being more general, for instance a command to add a new object to a set of graphical objects in a figure drawing program, or as a command to add a new name to an address book. Notice how this function accesses the current application frame by means of the special variable `*application-frame*`.

A display function is called with the frame and the pane as arguments. It is good style to use the pane as the stream in calls to functions that will result in output. This makes it possible for the same function to be used by several different frames, should that be called for. In our simple example, the display function only displays the value of a single number (or `NIL`), but you could think of this as displaying all the objects that have been drawn in some figure drawing program or displaying all the entries in an address book.



### 1.3 Using incremental redisplay

While the example in the previous section is a very simple way of structuring an application (let commands arbitrarily modify the data structure, and simply erase the pane and redisplay the structure after each iteration of the command loop), the visual result is not so great when many objects are to be displayed. There is most often a noticeable flicker between the moment when the pane is cleared and the objects are drawn. Sometimes this is inevitable (as when nearly all objects change), but most of the time, only an incremental modification has been made, and most of the objects are still in the same place as before.

In simple toolkits, the application programmer would have to figure out what has changed since the previous display, and only display the differences. CLIM offers a mechanism called *incremental redisplay* that automates a large part of this task. As we mentioned earlier, CLIM captures output in the form of *output records*. The same mechanism is used to obtain incremental redisplay.

To use incremental redisplay, client code remains structured in the simple way that was mention above: after each iteration of the command loop, the display function output the entire data structure as usual, except that it helps the incremental redisplay mechanism by telling CLIM which piece of output corresponds to which piece of output during the previous iteration of the command loop. It does this by giving some kind of *unique identity* to some piece of output, and some means of indicating whether the contents of this output is *the same* as it was last time. With this information, the CLIM incremental redisplay mechanism can figure out whether some output is new, has disappeared, or has been moved, compared to the previous iteration of the command loop. As with re-exposure, CLIM guarantees that the result is identical to that which would have been obtained, had all the output records been output in order to a blank pane.

The next example illustrates this idea. It is a simple application that displays a fixed number (here 20) of lines, each line being a number. Here is the code:

``` lisp-preformatted
(in-package :common-lisp-user)

(defpackage "APP"
  (:use :clim :clim-lisp)
  (:export "APP-MAIN"))

(in-package :app)

(define-application-frame superapp ()
  ((numbers :initform (loop repeat 20 collect (list (random 100000000)))
            :accessor numbers)
   (cursor :initform 0 :accessor cursor))
  (:pointer-documentation t)
  (:panes
    (app :application
         :height 400 :width 600
         :incremental-redisplay t
         :display-function 'display-app)
    (int :interactor :height 200 :width 600))
  (:layouts
    (default (vertically () app int))))

;; As usual, the displaying code relates to a pane, not the application frame.
(defun display-app (frame pane)

  (loop
     ;; Taking items one-by-one from the frame slot 'numbers'...
     for current-element in (numbers frame)

     ;; ...and increasing line-by-line...
     for line from 0

     ;; ...print a star if the cursor is on that line...
     ;; (Note that here, there is no incremental redisplay. The output
     ;; record of the star will be printed at each call of the display
     ;; function, i.e. at each iteration of the command loop.)
     do (princ (if (= (cursor frame) line) "*" " ") pane)

     ;; ...and incrementally update the rendering instructions of the
     ;; number on that line.
     ;; (Note that 'numbers' was defined as a list of lists, each
     ;; sublist holding an individual number. The reason for that is
     ;; explained below, but this is why (car current-element) is
     ;; needed.)
     do (updating-output (pane :unique-id   current-element
                               :id-test     #'eq
                               :cache-value (car current-element)
                               :cache-test  #'eql)
          (format pane "~a~%" (car current-element)))))


;;
;; Command definitions
;;

;; Increase the value of the number on the current line.
(define-superapp-command (com-add :name t) ((number 'integer))
  (incf (car (elt (numbers *application-frame*)
                  (cursor *application-frame*)))
        number))

;; Move the cursor one line down (increasing the cursor position),
;; looping back to the beginning if going too far.
(define-superapp-command (com-next :name t) ()
  (incf (cursor *application-frame*))
  (when (= (cursor *application-frame*)
           (length (numbers *application-frame*)))
    (setf (cursor *application-frame*) 0)))

;; Move the cursor one line up
(define-superapp-command (com-previous :name t) ()
  (decf (cursor *application-frame*))
  (when (minusp (cursor *application-frame*))
    (setf (cursor *application-frame*)
          (1- (length (numbers *application-frame*))))))

;; Command to quit the app
(define-superapp-command (com-quit :name t) ()
  (frame-exit *application-frame*))


;; Exported function to launch an instance of the application frame
(defun app-main ()
  (run-frame-top-level (make-application-frame 'superapp)))
```

We store the numbers in a slot called `numbers` of the application frame. However, we store each number in its own list. This is a simple way to provide a unique identity for each number. We could not use the number itself, because two numbers could be the same and the identities would not be unique. Instead, we use the cons cell that store the number as the unique identity. By using `:id-test #'eq` we inform CLIM that it can figure out whether an output record is the same as one that was issued previous time by using the function `eq` to compare them. But there is a second test that has to be verified, namely whether an output record that was issued last time has to be redisplayed or not. That is the purpose of the cache-value. Here we use the number itself as the cache value and `eql` as the test to determine whether the output is going to be the same as last time.

For convenience, we display a `*` at the beginning of the current line, and we provide two commands `next` and `previous` to navigate between the lines.

Notice that in the declaration of the pane in the application frame, we have given the option `:incremental-redisplay t`. This informs CLIM not to clear the pane after each command-loop iteration, but to keep the output records around and compare them to the new ones that are produced during the new iteration.



### 1.4 Using presentation types

- [What is a presentation type](#What-is-a-presentation-type)
- [A simple example](#A-simple-example)



#### 1.4.1 What is a presentation type

The concept of *presentation types* is central to CLIM. Client code can choose to output graphical or textual representations of application objects either as just graphics or text, or to associate such output with an arbitrary Common Lisp object and a presentation type. The presentation type is not necessarily related to the idea Common Lisp might have of the underlying object.

When a CLIM command or some other client code requests an object (say as an argument) of a certain presentation type, the user of the application can satisfy the request by clicking on any visible output labeled with a compatible presentation type. The command then receives the underlying Common Lisp object as a response to the request.

CLIM presentation types are usually distinct from Common Lisp types. The reason is that the Common Lisp type system, although very powerful, is not quite powerful enough to represent the kind of relationships between types that are required by CLIM. However, every Common Lisp class (except the built-in classes) is automatically a presentation type.

A presentation type has a name, but can also have one or more *parameters*. Parameters of presentation types are typically used to restrict the type. For instance, the presentation type `integer` takes as parameters the low and the high values of an interval. Such parameters allow the application to restrict objects that become clickable in certain contexts, for instance if a date in the month of March is requested, only integers between 1 and 31 should be clickable.



#### 1.4.2 A simple example

Consider the following example:

``` lisp-preformatted
(in-package :common-lisp-user)

(defpackage :app
  (:use :clim :clim-lisp)
  (:export #:app-main))

(in-package :app)

(define-application-frame superapp ()
  ()
  (:pointer-documentation t)
  (:panes
    (app :application :display-time t :height 300 :width 600)
    (int :interactor :height 200 :width 600))
  (:layouts
    (default (vertically () app int))))

(defun app-main ()
  (run-frame-top-level (make-application-frame 'superapp)))

(define-superapp-command (com-quit :name t) ()
  (frame-exit *application-frame*))

(define-presentation-type name-of-month ()
  :inherit-from 'string)

(define-presentation-type day-of-month ()
  :inherit-from 'integer)

(define-superapp-command (com-out :name t) ()
  (with-output-as-presentation (t "The third month" 'name-of-month)
    (format t "March~%"))
  (with-output-as-presentation (t 15 'day-of-month)
    (format t "fifteen~%")))

(define-superapp-command (com-get-date :name t)
    ((name 'name-of-month) (date 'day-of-month))
  (format (frame-standard-input *application-frame*)
      "the ~a of ~a~%" date name))
```

In this application, we have two main panes, an application pane and an interactor pane. The application pane is given the option `:display-time t` which means that it will not be erased before every iteration of the command loop.

We have also defined two presentation types: `name-of-month` and `day-of-month`. The `out` command uses `with-output-as-presentation` in order to associate some output, a presentation type, and an underlying object. In this case, it will show the string “March” which is considered to be of presentation type `name-of-month` with the underlying object being the character string `"The third month"`. It will also show the string “fifteen” which is considered to be of presentation type `day-of-month` with the underlying object being the number 15. The argument `t` to `with-output-as-presentation` indicates that the stream to present on is `*standard-output*`.

Thus, if the `out` command has been executed, and then the user types ‘`Get Date`’ in the interactor pane, the `get-date` command will try to acquire its arguments, the first of presentation type `name-of-month` and the second of type `day-of-month`. At the first prompt, the user can click on the string ‘`March`’ but not on the string ‘`fifteen`’ in the application pane. At the second prompt it is the string ‘`fifteen`’ that is clickable, whereas ‘`March`’ is not.

The `get-date` command will acquire the underlying objects. What is finally displayed (in the interactor pane, which is the standard input of the frame), is ‘`the 15 of The third month`’.



### 1.5 Using views

The CLIM specification mentions a concept called a *view*, and also lists a number of predefined views to be used in various different contexts.

In this chapter we show how the *view* concept can be used in some concrete programming examples. In particular, we show how to use a single pane to show different views of the application data structure at different times. To switch between the different views, we supply a set of commands that alter the `stream-default-view` feature of all CLIM extended output streams.

The example shown here has been stripped to a bare minimum in order to illustrate the important concepts. A more complete version can be found in `Examples/views.lisp` in the McCLIM source tree.

Here is the example:

``` lisp-preformatted
(cl:in-package #:clim-user)

;;; part of application "business logic"
(defclass person ()
  ((%last-name :initarg :last-name :accessor last-name)
   (%first-name :initarg :first-name :accessor first-name)
   (%address :initarg :address :accessor address)
   (%membership-number :initarg :membership-number :reader membership-number)))

;;; constructor for the PERSON class.  Not strictly necessary.
(defun make-person (last-name first-name address membership-number)
  (make-instance 'person
                 :last-name last-name
                 :first-name first-name
                 :address address
                 :membership-number membership-number))

;;; initial list of members of the organization we imagine for this example
(defparameter *members*
  (list (make-person "Doe" "Jane" "123, Glencoe Terrace" 12345)
        (make-person "Dupont" "Jean" "111, Rue de la Republique" 54321)
        (make-person "Smith" "Eliza" "22, Trafalgar Square" 121212)
        (make-person "Nilsson" "Sven" "Uppsalagatan 33" 98765)))

;;; the CLIM view class that corresponds to a list of members, one member
;;; per line of text in a CLIM application pane.
(defclass members-view (view) ())

;;; since this view does not take any parameters in our simple example,
;;; we need only a single instance of it.
(defparameter *members-view* (make-instance 'members-view))

;;; the application frame.  It contains instance-specific data
;;; such as the members of our organization.
(define-application-frame views ()
  ((%members :initform *members* :accessor members))
  (:panes
   (main-pane :application :height 500 :width 500
              :display-function 'display-main-pane
              ;; notice the initialization of the default view of
              ;; the application pane.
              :default-view *members-view*)
   (interactor :interactor :height 100 :width 500))
  (:layouts
   (default (vertically ()
              main-pane
              interactor))))

;;; the trick here is to define a generic display function
;;; that is called on the frame, the pane AND the view,
;;; whereas the standard CLIM display functions are called
;;; only on the frame and the pane.
(defgeneric display-pane-with-view (frame pane view))

;;; this is the display function that is called in each iteration
;;; of the CLIM command loop.  We simply call our own, more elaborate
;;; display function with the default view of the pane.
(defun display-main-pane (frame pane)
  (display-pane-with-view frame pane (stream-default-view pane)))

;;; now we can start writing methods on our own display function
;;; for different views.  This one displays the data each member
;;; on a line of its own.
(defmethod display-pane-with-view (frame pane (view members-view))
  (loop for member in (members frame)
        do (with-output-as-presentation
               (pane member 'person)
             (format pane "~a, ~a, ~a, ~a~%"
                     (membership-number member)
                     (last-name member)
                     (first-name member)
                     (address member)))))

;;; this CLIM view is used to display the information about
;;; a single person.  It has a slot that indicates what person
;;; we want to view.
(defclass person-view (view)
  ((%person :initarg :person :reader person)))

;;; this method on our own display function shows the detailed
;;; information of a single member.
(defmethod display-pane-with-view (frame pane (view person-view))
  (let ((person (person view)))
    (format pane "Last name: ~a~%First Name: ~a~%Address: ~a~%Membership Number: ~a~%"
            (last-name person)
            (first-name person)
            (address person)
            (membership-number person))))

;;; entry point to start our applciation
(defun views-example ()
  (run-frame-top-level (make-application-frame 'views)))

;;; command to quit the application
(define-views-command (com-quit :name t) ()
  (frame-exit *application-frame*))

;;; command to switch the default view of the application pane
;;; (which is the value of *standard-output*) to the one that
;;; shows a member per line.
(define-views-command (com-show-all :name t) ()
  (setf (stream-default-view *standard-output*) *members-view*))

;;; command to switch to a view that displays a single member.
;;; this command takes as an argument the person to display.
;;; In this application, the only way to satisfy the demand for
;;; the argument is to click on a line of the members view.  In
;;; more elaborate application, you might be able to type a
;;; textual representation (using completion) of the person.
(define-views-command (com-show-person :name t) ((person 'person))
  (setf (stream-default-view *standard-output*)
        (make-instance 'person-view :person person)))
```

The example shows a stripped-down example of a simple database of members of some organization.

The main trick used in this example is the `display-main-pane` function that is declared to be the display function of the main pane in the application frame. The `display-main-pane` function trampolines to a generic function called `display-pane-with-view`, and which takes an additional argument compared to the display functions of CLIM panes. This additional argument is of type `view` which allows us to dispatch not only on the type of frame and the type of pane, but also on the type of the current default view. In this example the view argument is simply taken from the default view of the pane.

A possibility that is not obvious from reading the CLIM specification is to have views that contain additional slots. Our example defines two subclasses of the CLIM `view` class, namely `members-view` and `person-view`.

The first one of these does not contain any additional slots, and is used when a global view of the members of our organization is wanted. Since no instance-specific data is required in this view, we follow the idea of the examples of the CLIM specification to instantiate a singleton of this class and store that singleton in the `stream-default-view` of our main pane whenever a global view of our organization is required.

The `person-view` class, on the other hand, is used when we want a closer view of a single member of the organization. This class therefore contains an additional slot which holds the particular person instance we are interested in. The method on `display-pane-with-view` that specializes on `person-view` displays the data of the particular person that is contained in the view.

To switch between the views, we provide two commands. The command `com-show-all` simply changes the default view of the main pane to be the singleton instance of the `members-view` class. The command `com-show-person` is more complicated. It takes an argument of type person, creates an instance of the `person-view` class initialized with the person that was passed as an argument, and stores the instance as the default view of the main pane.



### 1.6 Using command tables

A *command table* is an object that is used to determine what commands are available in a particular context and the ways in which commands can be executed.

Simple applications do not manage command tables explicitly. A default command table is created as a result of a call to the macro `define-application-frame` and that command table has the same name as the application frame.

Each command table has a *name* and that CLIM manages a global *namespace* for command tables.

Function:

**find-command-table \[clim\]** `name &key (errorp t)` [¶](#index-find_002dcommand_002dtable-_005bclim_005d)

This function returns the command table with the name `name`. If there is no command table with that name, then what happens depends on the value of `errorp`. If `errorp` is *true*, then an error of type `command-table-not-found` is signaled. If `errorp` is *false*, otherwise `nil` is returned.



### 1.7 Using menu bar

Menu bar has become essential part of every GUI system, including McCLIM. Ideally, McCLIM should try to use the menu bar provided by host window system via McCLIM backends, but the current `clx-backend` doesn’t supports native menu bars. That’s why it has some quirks of its own, like you need to keep mouse button pressed while accessing the sub-menus.

- [Creating Menu bar](#Creating-Menu-bar)
- [Modifying Menu bar](#Modifying-Menu-bar)



#### 1.7.1 Creating Menu bar

McCLIM makes creating menu bar quite easy.

``` lisp-preformatted
(clim:define-application-frame foo ()
      ;; ...
      (:menu-bar t)
      ;; ...
      )
```

The only argument for `:menu-bar` can be:

`T (default)`  
McCLIM will provide the menu bar. Later, when you start defining commands, you can provide a `(:menu t)` argument to command definition that will add this command to menu bar.

`NIL`  
McCLIM won’t provide the menu bar.

`command-table`  
If you provide a named command table as argument, that command table is used to provide the menu bar (See [Using command tables](#Using-command-tables)).

To add a sub-menu to menu bar, you need to change the type of menu-item from `:command` to `:menu` (which requires another `command-table` as argument) which is described in the next section.



#### 1.7.2 Modifying Menu bar

Menu bar can be changed anytime by changing `command-table` associated with the current `frame`.

``` lisp-preformatted
(setf (frame-command-table *application-frame*)
      new-command-table)
```

Example above changes menu bar of `*application-frame*` by replacing current `command-table` (accessible with `frame-command-table` function) with `new-command-table`.

#### Modifying menu items of command table

Function:

**add-menu-item-to-command-table \[clim\]** `command-table string type value &rest args &key documentation after keystroke text-style errorp` [¶](#index-add_002dmenu_002ditem_002dto_002dcommand_002dtable-_005bclim_005d)

Adds menu item to the command table.

Function arguments:

`command-table`  
Command table to which we want to add the menu item.

`string`  
Name of the menu item as it will appear on the menu bar. Its character case is ignored e.g. you may give it ‘`file`’ or ‘`FILE`’ but it will appear as ‘`File`’.

`type and value`  
`type` can be one of `:command`, `:function`, `:menu` and `:divider`. Value of `value` depends on `type`:

`:command`  
`value` must be a command or a cons of command name and its arguments. If you omit the arguments McCLIM will prompt for them.

`:function`  
`value` must be a function having indefinite extent that, when called, returns a command. The function must accept two arguments: the gesture (keyboard or mouse press event) and a `numeric argument`.

`:menu`  
`value` must be another command table. This type is used to add sub-menus to the menu.

`:divider`  
`value` is ignored and `string` is used as a divider string. Using ‘`|`’ as string will make it obvious to users that it is a divider.

`documentation`  
You can provide the documentation (for non-obvious menu items) which will be displayed on pointer-documentation pane (if you have one).

`after (default ``:end``)`  
This determines where item will be inserted in the menu. The default is to add it to the end. Other values could be `:start`, `:sort` (add in alphabetical order) or `string` which is name of existing menu-item to add after it.

`keystroke`  
If `keystroke` is supplied, it will be added to comand tables keystroke accelerator table. Value must be a keyboard gesture name e.g. `(:s :control)` for Control + s.

`text-style`  
Either a text style spec or `NIL`. It is used to indicate that the command menu item should be drawn with the supplied text style in command menus.

`error-p`  
If `T` and the item already exists in the menu, it signal a `command-already-present` error. If `NIL`, it will first remove the existing item and add the new item to the command-table.

To remove items from command table, the following function is used:

Function:

**remove-menu-item-from-command-table \[clim\]** `command-table string &key errorp` [¶](#index-remove_002dmenu_002ditem_002dfrom_002dcommand_002dtable-_005bclim_005d)

Removes item from the `command-table`.

Where `command-table` is command-table-designator and `string` is the menu item’s name (it is case-insensitive). You can provide `:error-p nil` to suppress the error if item is not in the command-table.

Note that both of the above functions *do not* automatically update the menu bar. For that you need to replace the existing `frame-command-table` with the modified command table using `setf`. The typical way to do this is to use `let` to create a copy of `frame-command-table`, modify it and at the end call `setf` to replace the original.



## 2 Reference manual

- [Concepts](#Concepts)
- [Sheet hierarchies](#Sheet-hierarchies)
- [Drawing functions](#Drawing-functions)
- [Panes](#Panes)
- [Output Protocol](#Output-Protocol)
- [Command Processing](#Command-Processing)
- [Incremental redisplay](#Incremental-redisplay)



### 2.1 Concepts

- [Coordinate systems](#Coordinate-systems)
- [Arguments to drawing functions](#Arguments-to-drawing-functions)



#### 2.1.1 Coordinate systems

CLIM uses a number of different coordinate systems and transformations to transform coordinates between them.

The coordinate system used for the arguments of drawing functions is called the *[user coordinate system](#User-coordinates)*, and coordinate values expressed in the user coordinate system are known as *[user coordinates](#User-coordinates)*.

Each sheet has its own coordinate system called the *[sheet coordinate system](#Sheet-coordinates)*, and positions expressed in this coordinate system are said to be expressed in *[sheet coordinates](#Sheet-coordinates)*. User coordinates are translated to *[sheet coordinates](#Sheet-coordinates)* by means of the *[user transformation](#User-transformation)* also called the *[medium transformation](#Medium-transformation)*. This transformation is stored in the *medium* used for drawing. The medium transformation can be composed temporarily with a transformation given as an explicit argument to a drawing function. In that case, the user transformation is temporarily modified for the duration of the drawing.

Before drawing can occur, coordinates in the sheet coordinate system must be transformed to *[native coordinates](#Native-coordinates)*, which are coordinates of the coordinate system of the native windowing system. The transformation responsible for computing native coordinates from sheet coordinates is called the *[native transformation](#Native-transformation)*. Notice that each sheet potentially has its own native coordinate system, so that the native transformation is specific for each sheet. Another way of putting it is that each sheet has a mirror, which is a window in the underlying windowing system. If the sheet has its own mirror, it is the *[direct mirror](#Direct-mirror)* of the sheet. Otherwise its mirror is the direct mirror of one of its ancestors. In any case, the native transformation of the sheet determines how sheet coordinates are to be translated to the coordinates of that mirror, and the native coordinate system of the sheet is that of its mirror.

The composition of the user transformation and the native transformation is called the *[device transformation](#Device-transformation)*. It allows drawing functions to transform coordinates only once before obtaining native coordinates.

Sometimes, it is useful to express coordinates of a sheet in the coordinate of its parent. The transformation responsible for that is called the *[sheet transformation](#Sheet-transformation)*.



#### 2.1.2 Arguments to drawing functions

Drawing functions are typically called with a sheet as an argument.

A sheet often, but not always, corresponds to a window in the underlying windowing system.



### 2.2 Sheet hierarchies

CLIM sheets are organized into a hierarchy. Each sheet has a sheet transformation and a sheet region. The sheet tranformation determines how coordinates in the sheet’s own coordinate system get translated into coordinates in the coordinate system of its parent. The sheet region determines the *[potentially visible area](#Potentially-visible-area)* of the otherwise infinite drawing plane of the sheet. The sheet region is given in the coordinate system of the sheet.

In McCLIM, every grafted sheet has a *[native transformation](#Native-transformation)*. The native transformation is used by drawing functions to translate sheet coordinates to *[native coordinates](#Native-coordinates)*, so that drawing can occur on the (not necessarily immediate) mirror of the sheet. It would therefore be enough for sheets that support the *output protocol* to have a native transformation. However, it is easier to generalize it to all sheets, in order to simplify the programming of the computation of the native transformation. Thus, in McCLIM, even sheets that are mute for output have a native transformation.

In McCLIM, every grafted sheet also has a *[native region](#Native-region)*. The native region is intersection the sheet region and the region of all of its ancestors, except that the native region is given in *native coordinates*, i.e. the coordinates obtained after the application of the *native transformation* of the sheet.

- [Computing the native transformation](#Computing-the-native-transformation)
- [Computing the native region](#Computing-the-native-region)
- [Moving and resizing sheets and regions](#Moving-and-resizing-sheets-and-regions)
- [Scrolling](#Scrolling)



#### 2.2.1 Computing the native transformation



#### 2.2.2 Computing the native region



#### 2.2.3 Moving and resizing sheets and regions



#### 2.2.4 Scrolling



### 2.3 Drawing functions

- [Windowing system drawing](#Windowing-system-drawing)
- [CLIM drawing](#CLIM-drawing)



#### 2.3.1 Windowing system drawing

A typical windowing system provides a hierarchy of rectangular areas called windows. When a drawing functions is called to draw an object (such as a line or a circle) in a window of such a hierarchy, the arguments to the drawing function will include at least the window and a number of coordinates relative to (usually) the upper left corner of the window.

To translate such a request to the actual altering of pixel values in the video memory, the windowing system must translate the coordinates given as argument to the drawing functions into coordinates relative to the upper left corner of the entire screen. This is done by a composition of translation transformations applied to the initial coordinates. These transformations correspond to the position of each window in the coordinate system of its parent.

Thus a window in such a system is really just some values indicating its height, its width, and its position in the coordinate system of its parent, and of course information about background and foreground colors and such.



#### 2.3.2 CLIM drawing

CLIM generalizes the concept of a hierarchy of window in a windowing system in several different ways. A window in a windowing system generalizes to a *sheet* in CLIM. More precisely, a window in a windowing system generalizes to the *[sheet region](#Sheet-region)* of a sheet. A CLIM sheet is an abstract concept with an infinite *drawing plane* and the *region* of the sheet is the potentially visible part of that drawing plane.

CLIM *sheet region*s don’t have to be rectangular the way windows in most windowing systems have to be. Thus, the width and the height of a window in a windowing system generalizes to an arbitrary *region* in CLIM. A CLIM region is simply a set of mathematical points in a plane. CLIM allows this set to be described as a combination (union, intersection, difference) of elementary regions made up of rectangles, polygons and ellipses.

Even rectangular regions in CLIM are generalizations of the width+height concept of windows in most windowing systems. While the upper left corner of a window in a typical windowing system has coordinates *(0,0)*, that is not necessarily the case of a CLIM region. CLIM uses that generalization to implement various ways of scrolling the contents of a sheet. To see that, imagine just a slight generalization of the *width+height* concept of a windowing system into a rectangular region with *x+y+width+height*. Don’t confuse the *x* and *y* here with the position of a window within its parent, they are different. Instead, imagine that the rectangular region is a hole into the (infinite) drawing plane defined by all possible coordinates that can be given to drawing functions. If graphical objects appear in the window with respect to the origin of some coordinate system, and the upper-left corner of the window has coordinates *(x,y)* in that coordinate system, then changing *x* and *y* will have the effect of scrolling.

CLIM sheets also generalize windows in that a window typically has pixels with integer-value coordinates. CLIM sheets, on the other hand, have infinte resolution. Drawing functions accept non-integer coordinate values which are only translated into integers just before the physical rendering on the screen.

The x and y positions of a window in the coordinate system of its parent window in a typical windowing system is a translation transformation that takes coordinates in a window and transform them into coordinates in the parent window. CLIM generalizes this concepts to arbitrary affine transformations (combinations of translations, rotations, and scalings). This generalization makes it possible for points in a sheet to be not only translated compared to the parent sheet, but also rotated and scaled (including negative scaling, giving mirror images). A typical use for scaling would be for a sheet to be a zoomed version of its parent, or for a sheet to have its y-coordinate go the opposite direction from that of its parent.

When the shapes of, and relationship between sheets are as simple as those of a typical windowing system, each sheet typically has an associated window in the underlying windowing system. In that case, drawing on a sheet translates in a relativly straightforward way into drawing on the corresponding window. CLIM sheets that have associated windows in the underlying windowing system are called *mirrored sheets* and the system-dependent window object is called the *mirror*. When shapes and relationships are more complicated, CLIM uses its own transformations to transform coordinates from a sheet to its parent and to its grandparent, etc., until a *mirrored sheet* is found. To the user of CLIM, the net effect is to have a windowing system with more general shapes of, and relationships between windows.



### 2.4 Panes

Panes are subclasses of sheets. Some panes are *layout panes* that determine the size and position of its children according to rules specific to each particular type of layout pane. Examples of layout panes are vertical and horizontal boxes, tables etc.

According to the CLIM specification, all CLIM panes are *rectangular objects*. For McCLIM, we interpret that phrase to mean that:

- CLIM panes appear rectangular in the native windowing system;
- CLIM panes have a native transformation that does not have a rotation component, only translation and scaling.

Of course, the specification is unclear here. Panes are subclasses of sheets, and sheets don’t have a shape per-se. Their *regions* may have a shape, but the sheet itself certainly does not.

The phrase in the specification *could* mean that the *sheet-region* of a pane is a subclass of the region class *rectangle*. But that would not exclude the possibility that the region of a pane would be some non-rectangular shape in the *native coordinate system*. For that to happen, it would be enough that the *sheet-transformation* of some ancestor of the pane contain a rotation component. In that case, the layout protocol would be insufficient in its current version.

McCLIM panes have the following additional restrictions:

- McCLIM panes have a coordinate system that is only a translation compared to that of the frame manager;
- The parent of a pane is either nil or another pane.

Thus, the panes form a *prefix* in the hierarchy of sheets. It is an error for a non-pane to adopt a pane.

Notice that the native transformation of a pane need not be the identity transformation. If the pane is not mirrored, then its native transformation is probably a translation of that of its parent.

Notice also that the native transformation of a pane need not be the composition of the identity transformation and a translation. That would be the case only of the native transformation of the top level sheet is the identity transformation, but that need not be the case. It is possible for the frame manager to impose a coordinate system in (say) millimeters as opposed to pixels. The native transformation of the top level sheet of such a frame manager is a scaling with coefficients other than 1.

- [Creating panes](#Creating-panes)
- [Pane names](#Pane-names)
- [Redisplaying panes](#Redisplaying-panes)
- [Layout protocol](#Layout-protocol)



#### 2.4.1 Creating panes

There is some confusion about the options that are allowed when a pane is created with `make-pane`. Some parts of the specification suggest that stream panes such as application panes and interactor panes can be created using `make-pane` and an option `:scroll-bars`. Since these application panes do not in themselves contain any scroll bars, using that option results in a pane hierarchy being created with the topmost pane being a pane of type `scroller-pane`.

As far as McCLIM is concerned, this option to `make-pane` is obsolete. [¹](#FOOT1)

This does not apply for using this option together with the equivalent keyword, i.e., `:application` or `:interactor`, in the `:panes` section of `define-application-frame`, because they are created by the function `make-clim-stream-pane` which does specify this argument.

Instead, we recommend following the examples of the specification, where scroll bars are added in the `layouts` section of `define-application-frame`.

When specification talks about panes in a fashion implying some order (i.e “first application-pane”) McCLIM assumes order of definition, not order of appearing in layout. Particularly that means, that if one pane is put before another in `:panes` option, then it precedes it. It is relevant to `frame-standard-output` (therefore binding of `*standard-output*`) and other similar functions.



#### 2.4.2 Pane names

Every pane class accepts the initialization argument `:name` the value of which is typically a symbol in the package defined by the application. The generic function `pane-name` returns the value of this initialization argument. There is no standard way of changing the name of an existing pane. Using the function `reinitialize-instance` may not have the desired effect, since the application frame may create a dictionary mapping names to panes, and there is no way to invalidate the contents of such a potential dictionary.

The function `find-pane-named` searches the pane hierarchy of the application frame, consulting the names of each pane until a matching name is found. The CLIM specification does not say what happens if a name is given that does not correspond to any pane. McCLIM returns `nil` in that case. If pane names are not unique, it is unspecified which of several panes is returned by a call to this function.

If the advice of [Creating panes](#Creating-panes) is followed, then the name given in the `:panes` option of the macro `define-application-frame` will always be the name of the top-level pane returned by the `body` following the pane name.

If that advice is not followed, then the name given to a pane in the `:panes` option of the macro `define-application-frame` may or may not become the name of the pane that is constructed by the `body` that follows the name. Recall that the syntax of the expression that defines a pane in the `:panes` option is `(name . body)`. Currently, McCLIM does the following:

- If the `body` creates a pane by using a keyword, or by using an explicitly mentioned call to `make-pane`, then the name is given to the pane of the type explicitly mentioned, even when the option `:scroll-bars` is given.
- If the `body` creates a pane by calling some arbitrary form other than a call to `make-pane`, then the name is given to the topmost pane returned by the evaluation of that form.

We reserve the right to modify this behavior in the future. Application code should respect the advice given in [Creating panes](#Creating-panes).



#### 2.4.3 Redisplaying panes

Recall that *redisplay* refers to the creation of the output history of a pane. There are two typical ways of creating this output history:

- The application maintains some data structure that needs to be reflected in the text and graphics of the pane. In this case, a pane of type `application-pane` is typically used, and the default value of the `:display-time` option is used, which means that some kind of application-supplied *display function* is executed at the end of each iteration of the command loop. In this situation, the output history is either recomputed from scratch in each iteration, or the programmer can use the *incremental redisplay* facility to reuse some of the existing output records in the history.
- The application does not keep any data structure, and instead generates output incrementally, either as a result of some user action, or of some data arriving from an external source. In this case, the `:display-time` option is either going to be `t` or `nil`. With both of these options, the output history is maintained intact after each iteration of the command loop. Instead, when user actions are issued, more output records are simply added to the existing output history.

For the second possibility, the pane is never redisplayed. Instead, the action of updating the pane contents is referred to as *replaying* the output history. The remainder of this section is entirely dedicated to the *redisplay* action.

It is occasionally necessary for the application to redisplay a pane explicitly, as opposed to letting the command loop handle it. For example, if the application data structure is updated in some way, but this update is not the result of a command, then after such an update, the redisplay function needs to be executed explicitly. Such an update could be the result of a timer event, or of communication with an external process.

Generic Function:

**redisplay-frame-pane \[clim\]** `frame pane &key force-p` [¶](#index-redisplay_002dframe_002dpane-_005bclim_005d)

Calling this generic function causes an immediate redisplay of `pane`. When `force-p` is false and the incremental redisplay facility is in use for `pane`, then output records are reused as appropriate. Supplying a true value for `force-p` causes the entire output history to be recomputed from scratch.

Notice that this function does not check whether the pane has been marked to need redisplay, as indicated by a call to the generic function `pane-needs-redisplay`. It results in an unconditional redisplay of `pane`.

Generic Function:

**redisplay-frame-panes \[clim\]** `frame &key force-p` [¶](#index-redisplay_002dframe_002dpanes-_005bclim_005d)

Calling this generic function causes an immediate redisplay of all the panes of `frame` that are visible in the current layout. This function simply calls `redisplay-frame-pane` for each visible pane of `frame`.

Again, notice that no check is being made as to whether the visible panes have been marked as needing redisplay. This function calls `redisplay-frame-pane` unconditionally for each visible pane, and since `redisplay-frame-pane` redisplays the pane unconditionally, it follows that all visible panes are unconditionally redisplayed.

Also notice that the implication of this unconditional behavior on the part of `redisplay-frame-panes` means that this is not the function called by the standard command loop. The standard command loop only redisplays panes that have been marked as needing redisplay, though when the value of the `:display-time` option is `:command-loop` for some pane, then it is always marked as needing redisplay in each iteration of the command loop.



#### 2.4.4 Layout protocol

There is a set of fundamental rules of CLIM dividing responsibility between a parent pane and a child pane, with respect to the size and position of the region of the child and the *sheet transformation* of the child. This set of rules is called the *layout protocol*.

The layout protocol is executed in two phases. The first phase is called the *space compostion* phase, and the second phase is called the *space allocation* phase.

- [Space composition](#Space-composition)
- [Space allocation](#Space-allocation)
- [Change-space Notification Protocol](#Change_002dspace-Notification-Protocol)



#### 2.4.4.1 Space composition

The space composition is accomplished by the generic function **compose-space**. When applied to a pane, **compose-space** returns an object of type *space-requirement* indicating the needs of the pane in terms of preferred size, minimum size and maximum size. The phase starts when compose-space is applied to the top-level pane of the application frame. That pane in turn may ask its children for their space requirements, and so on until the leaves are reached. When the top-level pane has computed its space requirments, it asks the system for that much space. A conforming window manager should respect the request (space wanted, min space, max space) and allocate a top-level window of an acceptable size. The space given by the system must then be distributed among the panes in the hierarchy `space-allocation`.

Each type of pane is responsible for a different method on **compose-space**. Leaf panes such as *labelled gadgets* may compute space requirements based on the size and the text-style of the label. Other panes such as the vbox layout pane compute the space as a combination of the space requirements of their children. The result of such a query (in the form of a space-requirement object) is stored in the pane for later use, and is only changed as a result of a call to **note-space-requirement-changed**.

Most *composite panes* can be given explicit values for the values of `:width`, `:min-width`, `:max-width`, `:height`, `:min-height`, and `:max-height` options. If such arguments are not given (effectively making these values nil), a general method is used, such as computing from children or, for leaf panes with no such reasonable default rule, a fixed value is given. If such arguments are given, their values are used instead. Notice that one of `:height` and `:width` might be given, applying the rule only in one of the dimensions.

Subsequent calls to **compose-space** with the same arguments are assumed to return the same space-requirement object, unless a call to note-space-requirement-changed has been called in between.



#### 2.4.4.2 Space allocation

When **allocate-space** is called on a pane `P`, it must compare the space-requirement of the children of `P` to the available space, in order to distribute it in the most preferable way. In order to avoid a second recursive invokation of **compose-space** at this point, we store the result of the previous call to **compose-space** in each pane.

To handle this situtation and also explicitly given size options, we use an `:around` method on **compose-space**. The `:around` method will call the primary method only if necessary (i.e., `(eq (slot-value pane 'space-requirement) nil)`), and store the result of the call to the primary method in the `space-requirement` slot.

We then compute the space requirement of the pane as follows:

``` lisp-preformatted
     (setf (space-requirement-width ...)  (or explicit-width
           (space-requirement-width request)) ...
           (space-requirement-max-width ...)  (or explicit-max-width
           explicit-width (space-requirement-max-width request)) ...)
```

When the call to the primary method is not necessary we simply return the stored value.

The `spacer-pane` is an exception to the rule indicated above. The explicit size you can give for this pane should represent the margin size. So its primary method should only call compose on the child. And the around method will compute the explicit sizes for it from the space requirement of the child and for the values given for the surrounding space.



#### 2.4.4.3 Change-space Notification Protocol

The purpose of the change-space notification protocol is to force a recalculation of the space occupied by potentially each pane in the *pane hierarchy*. The protocol is triggerred by a call to **note-space-requirement-changed** on a pane `P`. In McCLIM, we must therefore invalidate the stored space-requirement value and re-invoke **compose-space** on `P`. Finally, the *parent* of `P` must be notified recursively.

This process would be repeated for all the panes on a path from `P` to the top-level pane, if it weren’t for the fact that some panes compute their space requirements independently of those of their children. Thus, we stop calling **note-space-requirement-changed** in the following cases:

- when `P` is a `restraining-pane`,
- when `P` is a `top-level-sheet-pane`, or
- when `P` has been given explicit values for `:width` and `:height`

In either of those cases, **allocate-space** is called.

**Issue:** *This description is wrong. **note-space-requirement-change** is called by CLIM after the space requirements has changed. Application programmer should call **change-space-requirements** to indicate that **compose-space** may now return something different from the previous invocation and/or to update user space requirements options. This may (but doesn’t have to) trigger *layout-protocol*. Macro **changing-space-requirements** should be described too. — JD*



### 2.5 Output Protocol

The CLIM specification says that the output record should capture its clipping region. However this is not a feasible solution because when the output record is moved, it is impossible to tell whether the clip should be moved with it or not.

For example, we may want to clip all output to happen in a heart-shaped region - this clip should never move. Then we format a list of items and each item is clipped with a circle - these clips should be moved with their corresponding records.

The only solution that embraces both cases is to treat the clipping region as a compound output record. Then whether it is moved or not depends on whether it is a child or a parent of the moved output record.

Generic Function:

**medium-miter-limit \[clim-extensions\]** `medium` [¶](#index-medium_002dmiter_002dlimit-_005bclim_002dextensions_005d)

If `line-style-joint-shape` is `:miter` and the angle between two consequent lines is less than the values return by `medium-miter-limit`, `:bevel` is used instead.

Generic Function:

**line-style-effective-thickness \[clim-extensions\]** `line-style medium` [¶](#index-line_002dstyle_002deffective_002dthickness-_005bclim_002dextensions_005d)

Returns the thickness in device units of a line, rendered on `medium` with the style `line-style`.

Generic Function:

**line-style-effective-dashes \[clim-extensions\]** `line-style medium` [¶](#index-line_002dstyle_002deffective_002ddashes-_005bclim_002dextensions_005d)

Return a dash length or a sequence of dash lengths device units for a dashed line, rendered on `medium` with the style `line-style`.

Generic Function:

**(setf output-record-parent) \[clim\]** `parent record` [¶](#index-_0028setf-output_002drecord_002dparent_0029-_005bclim_005d)

Additional protocol generic function. `parent` may be an output record or `nil`.

Generic Function:

**replay-output-record \[clim\]** `record stream &optional region x-offset y-offset` [¶](#index-replay_002doutput_002drecord-_005bclim_005d)

Displays the output captured by `record` on the `stream`, exactly as it was originally captured. The current user transformation, line style, text style, ink and clipping region of `stream` are all ignored. Instead, these are gotten from the output record.

Only those records that overlap `region` are displayed.

Function:

**map-over-output-records \[clim\]** `function record &optional x-offset y-offset &rest function-args` [¶](#index-map_002dover_002doutput_002drecords-_005bclim_005d)

Maps over all of the children of `record`, calling `function` on each one. It is a function of one or more arguments and called with all of `function-args` as `apply` arguments.

Generic Function:

**map-over-output-records-containing-position \[clim\]** `function record x y &optional x-offset y-offset &rest function-args` [¶](#index-map_002dover_002doutput_002drecords_002dcontaining_002dposition-_005bclim_005d)

Maps over all of the children of `record` that contain the point at (`x`,`y`), calling `function` on each one. `function` is a function of one or more arguments, the first argument being the record containing the point. `function` is also called with all of `function-args` as `apply` arguments.

If there are multiple records that contain the point, `map-over-output-records-containing-position` hits the most recently inserted record first and the least recently inserted record last. Otherwise, the order in which the records are traversed is unspecified.

Generic Function:

**map-over-output-records-overlapping-region \[clim\]** `function record region &optional x-offset y-offset &rest function-args` [¶](#index-map_002dover_002doutput_002drecords_002doverlapping_002dregion-_005bclim_005d)

Maps over all of the children of `record` that overlap the `region`, calling `function` on each one. `function` is a function of one or more arguments, the first argument being the record overlapping the region. `function` is also called with all of `function-args` as `apply` arguments.

If there are multiple records that overlap the region and that overlap each other, `map-over-output-records-overlapping-region` hits the least recently inserted record first and the most recently inserted record last. Otherwise, the order in which the records are traversed is unspecified.

Class:

**standard-output-recording-stream \[clim\]** [¶](#index-standard_002doutput_002drecording_002dstream-_005bclim_005d)

Class precedence list:

standard-output-recording-stream,

output-recording-stream,

standard-object,

slot-object, t

Slots:

- `local-record-p`

  This flag is used for dealing with streams outputting strings char-by-char.

This class is mixed into some other stream class to add output recording facilities. It is not instantiable.

Generic Function:

**add-output-record \[clim\]** `child record` [¶](#index-add_002doutput_002drecord-_005bclim_005d)

Sets `record` to be the parent of `child`.

Generic Function:

**delete-output-record \[clim\]** `child record &optional errorp` [¶](#index-delete_002doutput_002drecord-_005bclim_005d)

If `child` is a child of `record`, sets the parent of `child` to `nil`.

Generic Function:

**clear-output-record \[clim\]** `record` [¶](#index-clear_002doutput_002drecord-_005bclim_005d)

Sets the parent of all children of `record` to `nil`.

Generic Function:

**invoke-with-new-output-record \[clim\]** `stream continuation record-type constructor &key parent &allow-other-keys` [¶](#index-invoke_002dwith_002dnew_002doutput_002drecord-_005bclim_005d)

Same as in CLIM 2.2 (missing `constructor` added).

Macro:

**with-new-output-record \[clim\]** `(stream &optional record-type record &rest initargs) &body body` [¶](#index-with_002dnew_002doutput_002drecord-_005bclim_005d)

Creates a new output record of type `record-type` and then captures the output of `body` into the new output record, and inserts the new record into the current "open" output record associated with `stream`. If `record` is supplied, it is the name of a variable that will be lexically bound to the new output record inside the body. `initargs` are CLOS initargs that are passed to `make-instance` when the new output record is created. It returns the created output record. The `stream` argument is a symbol that is bound to an output recording stream. If it is `t`, `*standard-output*` is used.

Macro:

**with-output-to-output-record \[clim\]** `(stream &optional record-type record &rest initargs) &body body` [¶](#index-with_002doutput_002dto_002doutput_002drecord-_005bclim_005d)

Creates a new output record of type `record-type` and then captures the output of `body` into the new output record. The cursor position of `stream` is initially bound to (0,0). If `record` is supplied, it is the name of a variable that will be lexically bound to the new output record inside the body. `initargs` are CLOS initargs that are passed to `make-instance` when the new output record is created. It returns the created output record. The `stream` argument is a symbol that is bound to an output recording stream. If it is `t`, `*standard-output*` is used.



### 2.6 Command Processing

Macro:

**define-command-table \[clim\]** `name &key inherit-from menu inherit-menu` [¶](#index-define_002dcommand_002dtable-_005bclim_005d)

Function:

**make-command-table \[clim\]** `name &key inherit-from inherit-menu (errorp t)` [¶](#index-make_002dcommand_002dtable-_005bclim_005d)

By default command tables inherit from `global-command-table`. A command table inherits from no command table if `nil` is passed as an explicit argument to `inherit-from`.



### 2.7 Incremental redisplay

CLIM applications are most often structured around the *command loop*. The various steps that such an application follow are:

- A *command* is acquired because the user, either typed the name of the command to an interactive prompt, selected a menu item representing a command, or clicked on an active object that translates to a command.
- The *arguments* to that command are acquired. As with the acquisition of the command itself, various gestures can be used to supply the arguments.
- The command is *executed* with the acquired arguments. Typically, the command modifies some part of the *model* [²](#FOOT2) contained in one or more slots in the application frame.
- The *redisplay functions* associated with the visible panes of the application are executed. Typically, the redisplay function erases all the output and traverses the entire model in order to produce a new version of that output. Since output exists in the form of *output records*, this process involves deleting the existing output records and computing an entirely new set of them.

This way of structuring an application is very simple. The resulting code is very easy to understand, and the relationship between the code of a redisplay function and the output it produces is usually obvious. The concept of output records storing the output in the application pane is completely hidden, and instead output is produced using textual or graphic drawing functions, or more often produced indirectly through the use of `present` or `with-output-as-presentation`.

However, if the model contains a large number of objects, then this simple way of structuring an application may penalize performance. In most libraries for creating graphic user interfaces, the application programmer must then rewrite the code for manipulating the model, and especially for incrementally altering the output according to the modification of the model resulting from the execution of a command.

In CLIM, a different mechanism is provided called *incremental redisplay*. This mechanism allows the user to preserve the simple logic of the display function with only minor modifications while still being able to benefit in terms of performance.



## 3 Developer manual

- [Coding conventions](#Coding-conventions)
- [Pointer cursors](#Pointer-cursors)
- [Writing backends](#Writing-backends)
- [PostScript backend](#PostScript-backend)



### 3.1 Coding conventions

In the McCLIM codebase, we try to follow certain coding conventions for consistency and better maintainability. We default to conventions mentioned in the [specification](http://bauhh.dyndns.org:8000/clim-spec/2.html) and to the [usual conventions](http://www.cs.umd.edu/~nau/cmsc421/norvig-lisp-style.pdf). The conventions described in the following sections cover aspects not discussed in these documents.

- [Packages](#Packages)
- [Examples](#Examples)

#### 3.1.1 Packages

In addition to the packages mentioned in the specification, McCLIM defines the packages `clim-extensions` and `clim-backend`. Both are used by the `clim-internals` package to avoid conflicts.

`clim-extensions` (which has the nickname `clime`) exports all extensions provided by McCLIM. While each extension may define its own package for implementation purposes, application programmers should access symbols only via the `clim-extensions` package.

`clim-backend` (which has the nickname `climb`) exports symbols which are intended for use by backend writers. It uses the packages `clim` and `clim-extensions`.

#### 3.1.2 Examples

Examples and demos which are distributed with McCLIM are loaded from a separate system named `clim-examples`. Each example should be put either directly in the package `clim-demo` or live in its own package the name of which should be start with `clim-demo.`, for instance `clim-demo.foobar-example`.



### 3.2 Pointer cursors

CLIM specifies the protocol to set the pointer cursor but does not specify what are its valid values.

McCLIM specifies an obligaory set of system cursors designated by a symbol. They are listed in the table below.

Backends may implement other valid cursor values. Backends are also encouraged to support designs of the class `image-pattern`.

`:default`  
Normal cursor (i.e an arrow).

`:prompt`  
The element underneath the cursor is editable (i.e an i-beam).

`:button`  
The element underneath the cursor is actionable (i.e a hand).

`:busy`  
Cursor signaling that the application is busy (i.e a hourglass).

`:not-allowed`  
Cursor signaling that the action is not allowed.

`:position`  
Precise cursor for selecting a point (i.e a crosshair).

`:move`  
The element underneath the cursor is being moved (i.e four arrows).

`:arrow-we`  
The element underneath the cursor may be dragged horizontally.

`:arrow-ns`  
The element underneath the cursor may be dragged vertically.

`:grab`  
The element underneath the cursor is being grabbed (i.e a clenched hand).

`:help`  
The element underneath the cursor is inspectable (i.e a question mark).



### 3.3 Writing backends

- [Different types of backends](#Different-types-of-backends)
- [Backend protocol](#Backend-protocol)
- [Event handling](#Event-handling)
- [Graft protocol](#Graft-protocol)
- [Medium drawing](#Medium-drawing)
- [Medium operation](#Medium-operations)
- [Port protocol](#Port-protocol)
- [Frame manager, panes and gadgets](#Frame-manager)
- [Pointer protocol (events?)](#Pointer-protocol-_0028events_003f_0029)
- [Text size](#Text-size)
- [Additional output destinations](#Additional-output-destinations)
- [Miscellaneous](#Miscellaneous)
- [Obsolete](#Obsolete)



#### 3.3.1 Different types of backends

Backend provides platform specific API for low level drawing operations, getting events, managing window geometry properties and providing native look-and-feel to the application.

There are three types of backends:

Draw-only backend  
This type doesn’t implement any kind of events and allows only drawing on it. A good example of it is the See [PostScript backend](#PostScript-backend) which is part of *CLIM II* specification.

Basic backend  
OpenGL, X, or HTML 5 canvas are resources which provide only drawing and event handling primitives. In this case we need to wrap their APIs for McCLIM to use. McCLIM will then use these drawing and windowing primitives to implement portable widgets.

Native backend  
Native backend is based on already complete GUI library which provides a rich set of widgets (for example Cocoa or Win32 API). Additionally to the things needed to be implement in the first two cases, we can also map these native look and feel widgets in McCLIM.

The `clim-null` backend can be used as a template to start with a new backend. If the underlying library you write backend for manages window hierarchy, positioning and events, it is possible to base new pane types on `mirrored-sheet-mixin` class which provides native handles into native windowing system. Mirrored and “native lisp” sheets may be freely mixed in the pane hierarchy.



#### 3.3.2 Backend protocol

``` verbatim
NEW CLASS FOR BACKEND `FOO'
---------------------------
foo-frame-manager
foo-native-frame-manager (optional)
foo-graft
foo-port
foo-medium
foo-pointer
```



#### 3.3.3 Event handling

``` verbatim
EVENT HANDLING (in port.lisp)
-----------------------------
;;; Originally in CLIM-INTERNALS
synthesize-pointer-motion-event
```



#### 3.3.4 Graft protocol

``` verbatim
GRAFT (in grafts.lisp)
-----------------------------------
;;; Originally in CLIM
graft        ; root window/screen
graft-height ; screen height
graft-width  ; screen width
```



#### 3.3.5 Medium drawing

``` verbatim
MEDIUM DRAWING (in medium.lisp)
-------------------------------
;;; Originally in CLIM
medium-draw-ellipse*
medium-draw-line*
medium-draw-lines*
medium-draw-point*
medium-draw-points*
medium-draw-polygon*
medium-draw-rectangle*
medium-draw-rectangles*
medium-draw-text*
```



#### 3.3.6 Medium operation

``` verbatim
MEDIUM OPERATIONS (in medium.lisp)
----------------------------------
;;; Originally in CLIM
make-medium ; make medium for a given sheet
medium-beep
medium-buffering-output-p
medium-clear-area
medium-copy-area
medium-finish-output
medium-force-output
medium-line-style
medium-text-style
```



#### 3.3.7 Port protocol

``` verbatim
PORT (BRIDGE) TO GUI (A SERVER LIKE)
------------------------------------
;;; Originally in CLIM
destroy-port

;;; Originally in CLIM-INTERNALS
enable-mirror
disable-mirror
set-mirror-name
set-mirror-icon
set-mirror-geometry
port-force-output
set-sheet-pointer-cursor
```



#### 3.3.8 Frame manager, panes and gadgets

``` verbatim
FRAME MANAGER, PANES AND GADGETS
--------------------------------
;;; Originally in CLIM
;; in frame-manager.lisp
make-pane-1
note-space-requirements-changed
adopt-frame

;; in port.lisp or pane.lisp/gadget.lisp
allocate-space
destroy-mirror
handle-repaint
realize-mirror
```



#### 3.3.9 Pointer protocol (events?)

``` verbatim
POINTER (port.lisp or pointer.lisp)
-----------------------------------
;;; Originally in CLIM
pointer-button-state
pointer-position
```



#### 3.3.10 Text size

``` verbatim
TEXT SIZE (medium.lisp)
-----------------------
;;; Originally in CLIM-INTERNALS
text-style-character-width
;;; Originally in CLIM
text-size
text-style-ascent
text-style-descent
text-style-height
text-style-mapping
text-style-width
```



#### 3.3.11 Additional output destinations

A backend implementation may register additional output destination types for the `:output-destination` keyword parameter accepted by some commands. Doing so allows the command to be invoked with `*standard-output*` bound to a stream provided by the backend that redirects the command’s output to a non-default destination such as a vector graphics or raster image file.

To support this protocol in a backend, three things are required:

1.  A new output destination class (usually a subclass of `clim-backend:output-destination` or one of its subclasses).
2.  A method on [**clim-backend:invoke-with-standard-output**](#Generic_002dFunction-clim_002dbackend_003ainvoke_002dwith_002dstandard_002doutput) specialized to the new output destination class.
3.  A call to [**clim-backend:register-output-destination-type**](#Function-clim_002dbackend_003aregister_002doutput_002ddestination_002dtype) in order to register the new output destination.

Generic Function:

**invoke-with-standard-output \[clim-backend\]** `continuation destination` [¶](#index-invoke_002dwith_002dstandard_002doutput-_005bclim_002dbackend_005d)

Call `continuation` (with no arguments) with `*standard-output*` rebound according to `destination`.

Function:

**register-output-destination-type \[clim-backend\]** `name class-name` [¶](#index-register_002doutput_002ddestination_002dtype-_005bclim_002dbackend_005d)

Register `class-name` as an additional output destination type under the name `name`. `class-name` must name a subclass of `clim-backend:output-destination`. A method on [**clim-backend:invoke-with-standard-output**](#Generic_002dFunction-clim_002dbackend_003ainvoke_002dwith_002dstandard_002doutput) must be applicable to an instance of `class-name`.



#### 3.3.12 Miscellaneous

``` verbatim
MISC
----
;;; Originally in CLIM-EXTENSIONS
medium-miter-limit          ; determine a draw for miter < sina/2
```



#### 3.3.13 Obsolete

``` verbatim
NO LONGER NEEDED IN BACKEND
---------------------------
queue-callback                  ; moved to clim-core
medium-clipping-                ; moved to clim-basic
```



### 3.4 PostScript backend

- [Postscript fonts](#Postscript-fonts)
- [Additional functions](#Additional-functions)



#### 3.4.1 Postscript fonts

Font mapping is a cons, the car of which is the name of the font (FontName field in the AFM file), and the cdr is the size in points. Before establishing the mapping, an information about this font should be loaded with the function `load-afm-file`.



#### 3.4.2 Additional functions

Package `clim-postscript` exports the following functions:

Function:

**load-afm-file** `afm-filename` [¶](#index-load_002dafm_002dfile)

Loads a description of a font from the specified AFM file.



## 4 Extensions

- [Frame redefinition semantics](#Frame-redefinition-semantics)
- [Frame and sheet icons](#Frame-and-sheet-icons)
- [Frame and sheet names](#Frame-and-sheet-names)
- [Frame and sheet shrinking](#Frame-and-sheet-shrinking)
- [Frame command table change](#Frame-command-table-change)
- [Text editor substrate](#Text-editor-substrate)
- [Extended text formatting](#Extended-text-formatting)
- [Extended blank area presentation type](#Extended-blank-area-presentation-type)
- [Tab Layout](#Tab-Layout)
- [Fonts and Extended Text Styles](#Fonts-and-Extended-Text-Styles)
- [Raster Images](#Raster-Images)
- [Drawing backends](#Drawing-backends)
- [Additional arguments to drawing functions](#Additional-arguments-to-drawing-functions)
- [Gestures and Gesture Names extensions](#Gestures-and-Gesture-Names-extensions)



### 4.1 Frame redefinition semantics

By default when the application frame class is redefined with the macro `clim:define-application-frame` panes and layouts of the existing instances are not changed. To update the frame programmer must call the function `reinitialize-instance`. The function may be called on a running frame ouside of its event loop.

McCLIM extends the macro `clim:define-application-frame` to update existing frames automatically when the new option `:reinitialize-frames` is not `nil`. Instances are updated by defining a method `update-instance-for-redefined-class :after` and making all instances obsolete. Then a slot of each adopted frame is read to trigger the update without delay.

- When the option is `nil` (a default) then nothing happens.
- When the option is `t` then all instances are updated by calling on them the function `reinitialize-instance` (running frames are updated immedietely and the reset whenever the implementation chose to call the function `update-instance-for-redefined-class`).
- When the option is a plist then additionally this plist is prepended to initargs applied to the function `reinitialize-instance`.

The following initargs when present in the class definition are applied to `reinitialize-instance`: `:current-layout`, `:pretty-name`, `:icon`, `:command-table`, `:menu-bar` and `:pointer-documentation`. For example:

``` lisp-preformatted
(define-application-frame example-frame ()
  ((xxx :initarg :xxx :reader xxx))
  (:panes (i :interactor)
          (y :push-button :label "BAMasdf  DIM DOM"))
  (:layouts (l1 (vertically () i y))
            (l2 (vertically () y)))
  (:pointer-documentation t)
  (:current-layout l2)
  (:pretty-name "hellobo")
  (:reinitialize-frames :pretty-name "foo" :xxx 15))
```

After compiling the above form all instances of the class example-frame will be reinitialized with:

``` example-preformatted
(reinitialize-instance instance :pretty-name "foo"
                                :xxx 15
                                :current-layout 'l2
                                :pretty-name "hellobo"
                                :pointer-documentation T)
```



### 4.2 Frame and sheet icons

According to the CLIM specification, an icon can be defined for an application frame class using the `:icon` initarg of the **define-application-frame** macro. McCLIM extends this design to top-level sheets and adds

Generic Function:

**sheet-icon \[clim-extensions\]** `sheet` [¶](#index-sheet_002dicon-_005bclim_002dextensions_005d)

Return the icon or icons of `sheet`.

These icons are typically used by window managers to represent windows that are not currently visible or added to other representations of windows to make them more easily recognizable.

Generic Function:

**(setf sheet-icon) \[clim-extensions\]** `new-value sheet` [¶](#index-_0028setf-sheet_002dicon_0029-_005bclim_002dextensions_005d)

Set icon or icons of `sheet` to `new-value`.

`new-value` must be a `clim-extensions:image-pattern` or a sequence of those. If a sequence is supplied, the window manager is instructed to prefer the first element, if possible. Some window managers select different icons for different purposes based on the icon sizes.

Generic Function:

**frame-icon \[clim-extensions\]** `frame` [¶](#index-frame_002dicon-_005bclim_002dextensions_005d)

Return the icon or icons of `frame`.

The return value is either a `clim-extensions:image-pattern` or sequence of those. These icons are typically used – via the top-level sheet of `frame` – by window managers to represent windows that are not currently visible or added to other representations of windows to make them more easily recognizable.

Generic Function:

**(setf frame-icon) \[clim-extensions\]** `new-value frame` [¶](#index-_0028setf-frame_002dicon_0029-_005bclim_002dextensions_005d)

Set icon or icons of `frame` to `new-value`.

`new-value` must be a `clim-extensions:image-pattern` or a sequence of those. If a sequence is supplied, the window manager is instructed to prefer the first element, if possible. Some window managers select different icons for different purposes based on the icon sizes. This function also sets `new-value` as the icon(s) of the top-level sheet of `frame`.

Generic Function:

**note-frame-icon-changed \[clim-extensions\]** `frame-manager frame new-icon` [¶](#index-note_002dframe_002dicon_002dchanged-_005bclim_002dextensions_005d)

Notify client that the pretty name of `frame`, managed by `frame-manager`, changed to `new-icon`.

`frame-manager` can be `nil` if `frame` is not owned by a frame manager at the time of the change.



### 4.3 Frame and sheet names

According to the CLIM specification, a frame has a name and a pretty name the latter of which can be changed. McCLIM extends this design to top-level sheets in form of the following protocol:

Generic Function:

**sheet-name \[clim-extensions\]** `sheet` [¶](#index-sheet_002dname-_005bclim_002dextensions_005d)

Return the name of `sheet`. The returned name is a symbol and does not change. For sheets which are also panes, the returned name is identical to the pane name.

Generic Function:

**sheet-pretty-name \[clim-extensions\]** `sheet` [¶](#index-sheet_002dpretty_002dname-_005bclim_002dextensions_005d)

Return the pretty name of `sheet`. The returned name is a string and may change over time. The pretty name usually corresponds to the title of the associated window.

Generic Function:

**(setf sheet-pretty-name) \[clim-extensions\]** `new-value sheet` [¶](#index-_0028setf-sheet_002dpretty_002dname_0029-_005bclim_002dextensions_005d)

Set `sheet`’s pretty name to `new-value`. `new-value` must be a string. Changing the pretty name of `sheet` usually changes the title of the window associated with it.

The class `clim-extensions:top-level-sheet-mixin` can be added as a superclass to sheet classes that implement the above protocol. Otherwise default methods on `clim-extensions:sheet-name` and `clim-extensions:sheet-pretty-name` return `nil` and `"(Unnamed sheet)"` respectively.

Furthermore McCLIM provides a way for clients to be notified when the pretty name of a frame changes:

Generic Function:

**note-frame-pretty-name-changed \[clim-extensions\]** `frame-manager frame new-name` [¶](#index-note_002dframe_002dpretty_002dname_002dchanged-_005bclim_002dextensions_005d)

Notify client that the pretty name of `frame`, managed by `frame-manager`, changed to `NEW-NAME`. `frame-manager` can be `NIL` if `frame` is not owned by a frame manager at the time of the change.



### 4.4 Frame and sheet shrinking

According to the CLIM specification, a frame may be shrunk the function **shrink-frame**. This operation disables a top-level sheet by minimizing it.

McCLIM extends this design to top-level sheets and ports in form of the following protocol:

Generic Function:

**shrink-sheet \[clim-extensions\]** `sheet` [¶](#index-shrink_002dsheet-_005bclim_002dextensions_005d)

Calling this method on a top-level sheet should disable the sheet and minimize the window associated with the sheet.

Generic Function:

**shrink-mirror \[clim-backend\]** `port sheet` [¶](#index-shrink_002dmirror-_005bclim_002dbackend_005d)

Calling this method on a port and on a mirrored sheet should minimize the window associated with the sheet.



### 4.5 Frame command table change

When the command table is changed this may result in necessity to change the menu. Menu is managed by the frame manager so McCLIM adds the appropriate notification protocol.

Generic Function:

**clim-extensions:note-frame-command-table-changed** `frame-manager frame new-command-table` [¶](#index-clim_002dextensions_003anote_002dframe_002dcommand_002dtable_002dchanged)

McCLIM extension: Notify client that the command-table of FRAME, managed by FRAME-MANAGER, changed to NEW-COMMAND-TABLE.



### 4.6 Text editor substrate

For brievity only basic topics common to all substrates are covered in the manual. Drei documentation is provided as a separate document.


  \[[Contents](#SEC_Contents "Table of contents")\]\[[Index](#Concept-index "Index")\]

#### Text field gadget


  \[[Contents](#SEC_Contents "Table of contents")\]\[[Index](#Concept-index "Index")\]

#### Text editor pane



### 4.7 Extended text formatting

`standard-extended-output-stream` has been extended by protocols complementary to already defined ones. Some were clearly missing given how it is specified - like margins and word wrap. Some are useful in contemporary text displaying applications like text direction and alignment.

- [Page abstraction](#Page-abstraction)
- [FILLING-OUTPUT extension](#FILLING_002dOUTPUT-extension)

#### 4.7.1 Page abstraction

Function:

**page-initial-position \[clime\]** `stream` [¶](#index-page_002dinitial_002dposition-_005bclime_005d)

Function:

**page-final-position \[clime\]** `stream` [¶](#index-page_002dfinal_002dposition-_005bclime_005d)

Both functions return two values, x and y coordinates of the respective position. Initial position is where the cursor is placed on a fresh page, and the final position is where the cursor is placed right before the page ends. Coordinates depend on current margins and text alignment.

Function:

**stream-page-region \[clime\]** `stream` [¶](#index-stream_002dpage_002dregion-_005bclime_005d)

This function returns a region which corresponds to the stream page format. This region corresponds the stream margins.

Macro:

**with-temporary-margins \[clime\]** `(stream &key (move-cursor t) left right top bottom) &body body` [¶](#index-with_002dtemporary_002dmargins-_005bclime_005d)

Execute `body` in a dynamic environment where `stream`’s margins are augmented with `left`, `right`, `top` and `bottom`. Not all margins have to be specified. If they are not current margin values are taken as defaults.

Each margin must be in one of following formats: `(:relative ``space``)` or `(:absolute ``space``)`. `space` may be specified as for `:x-spacing` and `:y-spacing` for horizontal and vertical margins accordingly. If a margin is “absolute” then it corresponds to its exact placement in stream coordinates. “relative” margins are relative to the stream viewport region.

If the Boolean `move-cursor` is `T` then the cursor is left where it was placed after the last operation. Otherwise upon completion of `body`, the cursor position is restored to its previous value.

Programmers using `clime:with-temporary-margins` should begin `body` with a call to the function `clim:stream-set-cursor-position` which will set the cursor to `clime:page-initial-position`.

#### 4.7.2 FILLING-OUTPUT extension

The macro `clim:filling-output` behaves the same as before with a few additions:

`:after-line-break-subsequent` is complementary to `:after-line-break-initially`, it decides whether `:after-line-break` is printed for lines after the first break. It defaults to `T`.

`:after-line-break-composed` decides whether `after-line-break` from the external `filling-output` should be called as well (defaults to `T`).

`:after-line-break` may be a string or a function accepting two arguments: a stream and a flag indicating whether it is a soft newline or not. The function will be executed conditionally depending on values of `:after-line-break-initially` and `:after-line-break-subsequent` flags.

The macro preserves a `text-style`, `ink` and indentation from state in which it was invoked. That means in particular that `indenting-output` may be called from inside `filling-output` and `after-line-break` will be printed without this indent.



### 4.8 Extended blank area presentation type

CLIM specifies `clim:blank-area` as a special presentation type that represents places at which no other presentation is applicable given the current input context. The value of `clim:*null-presentation*` is specified to a presentation instance with presentation type `clim:blank-area`. The specification implies that there is only one such instance. McCLIM slightly deviates from this by

1.  allowing multiple presentation instances with presentation type `clim:blank-area`.
2.  adding keyword parameters to the `clim:blank-area` presentation type: `&key sheet region`.

When the system constructs a presentation instance with presentation type `clim:blank-area` for a pointer motion or click at position (`x`,`y`) on sheet `sheet`:

- The object of the presentation instance is a pointer event with sheet `sheet` and position (`x`,`y`).
- The value of the `sheet` presentation type parameter is `sheet`.
- The value of the `region` presentation type parameter is a `clim:point` instance with position (`x`,`y`).

The subtype relation for `clim:blank-area` presentation types with supplied parameters is based on the sheet matching if supplied and the region of the subtype being contained in the region of the supertype if supplied.



### 4.9 Tab Layout

The tab layout is a composite pane arranging its children so that exactly one child is visible at any time, with a row of buttons allowing the user to choose between them.

See also the `tabdemo.lisp` example code located under `Examples` in the McCLIM distribution. It can be started using `(clim-demo:demodemo)`.

Class:

**tab-layout \[clim-tab-layout\]** [¶](#index-tab_002dlayout-_005bclim_002dtab_002dlayout_005d)

Class precedence list:

tab-layout,

sheet-multiple-child-mixin,

basic-pane,

sheet-parent-mixin, pane,

standard-repainting-mixin,

standard-sheet-input-mixin,

sheet-transformation-mixin,

basic-sheet, sheet,

bounding-rectangle,

standard-object,

slot-object, t

The abstract tab layout pane is a composite pane arranging its children so that exactly one child is visible at any time, with a row of buttons allowing the user to choose between them. Use `with-tab-layout` to define a tab layout and its children, or use the `:pages` argument to specify its contents when creating it dynamically using `make-pane`.

Class:

**tab-layout-pane \[clim-tab-layout\]** [¶](#index-tab_002dlayout_002dpane-_005bclim_002dtab_002dlayout_005d)

Class precedence list:

tab-layout-pane,

tab-layout,

sheet-multiple-child-mixin,

basic-pane,

sheet-parent-mixin, pane,

standard-repainting-mixin,

standard-sheet-input-mixin,

sheet-transformation-mixin,

basic-sheet, sheet,

bounding-rectangle,

standard-object,

slot-object, t

A pure-lisp implementation of the tab-layout, this is the generic implementation chosen by the CLX frame manager automatically. Users should create panes for type `tab-layout`, not `tab-layout-pane`, so that the frame manager can customize the implementation.

Class:

**tab-page \[clim-tab-layout\]** [¶](#index-tab_002dpage-_005bclim_002dtab_002dlayout_005d)

Class precedence list:

tab-page,

standard-object,

slot-object, t

Instances of `tab-page` represent the pages in a `tab-layout`. For each child pane, there is a `tab-page` providing the page’s title and additional information about the child. Valid initialization arguments are `:title`, `:pane` (required), `:presentation-type` and `:drawing-options` (optional).

Macro:

**with-tab-layout \[clim-tab-layout\]** `(default-presentation-type &rest initargs &key name &allow-other-keys) &body body` [¶](#index-with_002dtab_002dlayout-_005bclim_002dtab_002dlayout_005d)

Return a `tab-layout`. Any keyword arguments, including its name, will be passed to `make-pane`. Child pages of the `tab-layout` can be specified using `body`, using lists of the form (`title pane &key presentation-type drawing-options enabled-callback`). `default-presentation-type` will be passed as `:presentation-type` to pane creation forms that specify no type themselves.

Generic Function:

**tab-layout-pages \[clim-tab-layout\]** `tab-layout` [¶](#index-tab_002dlayout_002dpages-_005bclim_002dtab_002dlayout_005d)

Return all `tab-page`s in `tab-layout`, in order from left to right. Do not modify the resulting list destructively. Use the `setf` function of the same name to assign a new list of pages. The `setf` function will automatically add tabs for new page objects, remove old pages, and reorder the pages to conform to the new list.

Generic Function:

**tab-page-tab-layout \[clim-tab-layout\]** `tab-page` [¶](#index-tab_002dpage_002dtab_002dlayout-_005bclim_002dtab_002dlayout_005d)

Return the `tab-layout` `tab-page` belongs to.

Generic Function:

**tab-page-title \[clim-tab-layout\]** `tab-page` [¶](#index-tab_002dpage_002dtitle-_005bclim_002dtab_002dlayout_005d)

Return the title displayed in the tab for `tab-page`. Use the `setf` function of the same name to set the title dynamically.

Generic Function:

**tab-page-pane \[clim-tab-layout\]** `tab-page` [¶](#index-tab_002dpage_002dpane-_005bclim_002dtab_002dlayout_005d)

Return the CLIM pane `page` displays. See also `sheet-to-page`, the reverse operation.

Generic Function:

**tab-page-presentation-type \[clim-tab-layout\]** `tab-page` [¶](#index-tab_002dpage_002dpresentation_002dtype-_005bclim_002dtab_002dlayout_005d)

Return the type of the presentation used when `tab-page`’s header gets clicked. Use the `setf` function of the same name to set the presentation type dynamically. The default is `tab-page`.

Generic Function:

**tab-page-drawing-options \[clim-tab-layout\]** `tab-page` [¶](#index-tab_002dpage_002ddrawing_002doptions-_005bclim_002dtab_002dlayout_005d)

Return the drawing options of `tab-page`’s header. Use the `setf` function of the same name to set the drawing options dynamically.

|                                                                                                                                                                           |
|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Note: Not all implementations of the tab layout will understand all drawing options. In particular, the Gtkairo backends understands only the `:ink` option at this time. |

Function:

**add-page \[clim-tab-layout\]** `page tab-layout &optional enable` [¶](#index-add_002dpage-_005bclim_002dtab_002dlayout_005d)

Add `page` at the left side of `tab-layout`. When `enable` is true, move focus to the new page. This function is a convenience wrapper; you can also push page objects directly into `tab-layout-pages` and enable them using `(setf tab-layout-enabled-page)`.

Function:

**remove-page \[clim-tab-layout\]** `page` [¶](#index-remove_002dpage-_005bclim_002dtab_002dlayout_005d)

Remove `page` from its tab layout. This is a convenience wrapper around `sheet-disown-child`, which can also be used directly to remove the `page`’s pane with the same effect.

Generic Function:

**tab-layout-enabled-page \[clim-tab-layout\]** `tab-layout` [¶](#index-tab_002dlayout_002denabled_002dpage-_005bclim_002dtab_002dlayout_005d)

The currently visible tab page of `tab-layout`, or `nil` if the tab layout does not have any pages currently. Use the `setf` function of the name to change focus to another tab page.

Function:

**sheet-to-page \[clim-tab-layout\]** `sheet` [¶](#index-sheet_002dto_002dpage-_005bclim_002dtab_002dlayout_005d)

For `sheet` that is a child of a tab layout, return the page corresponding to `sheet`. See also `tab-page-pane`, the reverse operation.

Function:

**find-tab-page-named \[clim-tab-layout\]** `name tab-layout` [¶](#index-find_002dtab_002dpage_002dnamed-_005bclim_002dtab_002dlayout_005d)

Find the tab page with the specified `name` in `tab-layout`. Note that uniqueness of names is not enforced; the first page found will be returned.

Function:

**switch-to-page \[clim-tab-layout\]** `page` [¶](#index-switch_002dto_002dpage-_005bclim_002dtab_002dlayout_005d)

Move the focus in `page`’s tab layout to `page`. This function is a one-argument convenience version of `(setf tab-layout-enabled-page)`, which can also be called directly.

Function:

**remove-page-named \[clim-tab-layout\]** `title tab-layout` [¶](#index-remove_002dpage_002dnamed-_005bclim_002dtab_002dlayout_005d)

Remove the tab page with the specified `title` from `tab-layout`. Note that uniqueness of titles is not enforced; the first page found will be removed. This is a convenience wrapper, you can also use `find-tab-page-named` to find and the remove a page yourself.

Generic Function:

**note-tab-page-changed \[clim-tab-layout\]** `layout page` [¶](#index-note_002dtab_002dpage_002dchanged-_005bclim_002dtab_002dlayout_005d)

This internal function is called by the `setf` methods for `tab-page-title` and `tab-page-drawing-options` to inform `page`’s tab-layout about the changes, allowing it to update its display. Only called by the `tab-layout` implementation and specialized by its subclasses.



### 4.10 Fonts and Extended Text Styles

- [Extended Text Styles](#Extended-Text-Styles)
- [Listing Fonts](#Listing-Fonts)



#### 4.10.1 Extended Text Styles

McCLIM extends the legal values for the `family` and `face` arguments to `make-text-style` to include strings (in additional to the portable keyword symbols), as permitted by the CLIM spec, section 11.1.

Each backend defines its own specific syntax for these family and face names.

The CLX backend maps the text style family to the X font’s *foundry* and *family* values, separated by a dash. The face is mapped to *weight* and *slant* in the same way. For example, the following form creates a text style for *-misc-fixed-bold-r-\*-\*-18-\*-\*-\*-\*-\*-\*-\**:

``` lisp-preformatted
(make-text-style "misc-fixed" "bold-r" 18)
```

In the GTK backend, the text style family and face are used directly as the Pango font family and face name. Please refer to Pango documentation for details on the syntax of face names. Example:

``` lisp-preformatted
(make-text-style "Bitstream Vera Sans" "Bold Oblique" 54)
```



#### 4.10.2 Listing Fonts

McCLIM’s font listing functions allow applications to list all available fonts available on a `port` and create text style instances for them.

Example:

``` lisp-preformatted
* (find "Bitstream Vera Sans Mono"
        (clim-extensions:port-all-font-families (clim:find-port))
        :key #'clim-extensions:font-family-name
        :test #'equal)
#<CLIM-GTKAIRO::PANGO-FONT-FAMILY Bitstream Vera Sans Mono>

* (clim-extensions:font-family-all-faces *)
(#<CLIM-GTKAIRO::PANGO-FONT-FACE Bitstream Vera Sans Mono, Bold>
 #<CLIM-GTKAIRO::PANGO-FONT-FACE Bitstream Vera Sans Mono, Bold Oblique>
 #<CLIM-GTKAIRO::PANGO-FONT-FACE Bitstream Vera Sans Mono, Oblique>
 #<CLIM-GTKAIRO::PANGO-FONT-FACE Bitstream Vera Sans Mono, Roman>)

* (clim-extensions:font-face-scalable-p (car *))
T

* (clim-extensions:font-face-text-style (car **) 50)
#<CLIM:STANDARD-TEXT-STYLE "Bitstream Vera Sans Mono" "Bold" 50>
```

Class:

**font-family \[clim-extensions\]** [¶](#index-font_002dfamily-_005bclim_002dextensions_005d)

Class precedence list:

font-family,

standard-object,

slot-object, t

The protocol class for font families. Each backend defines a subclass of font-family and implements its accessors. Font family instances are never created by user code. Use port-all-font-families to list all instances available on a port.

Class:

**font-face \[clim-extensions\]** [¶](#index-font_002dface-_005bclim_002dextensions_005d)

Class precedence list:

font-face,

standard-object,

slot-object, t

The protocol class for font faces Each backend defines a subclass of font-face and implements its accessors. Font face instances are never created by user code. Use font-family-all-faces to list all faces of a font family.

Generic Function:

**port-all-font-families \[clim-extensions\]** `port &key invalidate-cache &allow-other-keys` [¶](#index-port_002dall_002dfont_002dfamilies-_005bclim_002dextensions_005d)

Returns the list of all `font-family` instances known by PORT. With INVALIDATE-CACHE, cached font family information is discarded, if any.

Generic Function:

**font-family-name \[clim-extensions\]** `font-family` [¶](#index-font_002dfamily_002dname-_005bclim_002dextensions_005d)

Return the font family’s name. This name is meant for user display, and does not, at the time of this writing, necessarily the same string used as the text style family for this port.

Generic Function:

**font-family-port \[clim-extensions\]** `font-family` [¶](#index-font_002dfamily_002dport-_005bclim_002dextensions_005d)

Return the port this font family belongs to.

Generic Function:

**font-family-all-faces \[clim-extensions\]** `font-family` [¶](#index-font_002dfamily_002dall_002dfaces-_005bclim_002dextensions_005d)

Return the list of all font-face instances for this family.

Generic Function:

**font-face-name \[clim-extensions\]** `font-face` [¶](#index-font_002dface_002dname-_005bclim_002dextensions_005d)

Return the font face’s name. This name is meant for user display, and does not, at the time of this writing, necessarily the same string used as the text style face for this port.

Generic Function:

**font-face-family \[clim-extensions\]** `font-face` [¶](#index-font_002dface_002dfamily-_005bclim_002dextensions_005d)

Return the font family this face belongs to.

Generic Function:

**font-face-all-sizes \[clim-extensions\]** `font-face` [¶](#index-font_002dface_002dall_002dsizes-_005bclim_002dextensions_005d)

Return the list of all font sizes known to be valid for this font, if the font is restricted to particular sizes. For scalable fonts, arbitrary sizes will work, and this list represents only a subset of the valid sizes. See font-face-scalable-p.

Generic Function:

**font-face-text-style \[clim-extensions\]** `font-face &optional size` [¶](#index-font_002dface_002dtext_002dstyle-_005bclim_002dextensions_005d)

Return an extended text style describing this font face in the specified size. If size is nil, the resulting text style does not specify a size.



### 4.11 Raster Images

This extension has the goal to provide a fast and flexible way to display images in the screen. An image is a rectangular object and is represented as a rectangular pattern and follows pattern protocol. Pixel values are represented as 32-bit RGBA numbers.

collapse-pattern make-pattern-from-bitmap-file

define-bitmap-file-reader define-bitmap-file-writer bitmap-format-supported-p bitmap-output-supported-p read-bitmap-file write-bitmap-file

Images are read with `read-bitmap-file`. Images are wrote with `write-bitmap-file`.

Images are created with `make-image`. Images are cloned with `clone-image`. Images are copied with `copy-image`. Images are blended with `blend-image`. Images are filled with `fill-image`.

Operations having source and destination image as arguments may use the same image without copying it.

To draw an image use `draw-pattern*` or `draw-design`. Image may be also used as an ink in other drawing functions.



### 4.12 Drawing backends

CLIM specification defines a macro `with-output-to-postscript-stream` that is used to create a backend including a medium that implements:

- CLIM’s medium protocol, and
- CLIM’s output stream protocol.

McCLIM generalizes this operator by defining a macro and a specializable generic function:

Macro:

**with-output-to-drawing-stream \[clime\]** `(stream-var backend destination &rest options) &body body` [¶](#index-with_002doutput_002dto_002ddrawing_002dstream-_005bclime_005d)

Generic Function:

**invoke-with-output-to-drawing-stream \[clime\]** `(continuation backend destination &rest options)` [¶](#index-invoke_002dwith_002doutput_002dto_002ddrawing_002dstream-_005bclime_005d)

Within `body`, `stream-var` is bound to a stream that implements the output protocols so it is suitable as a stream or medium argument to any CLIM output utility, such as `draw-line*` or `write-string`.

The value of `backend` must be a server path that is a suitable argument to the function `find-port`, for example `:ps` or `niL`.

The value of `options` depends on the actual backend and allows to specify the backend-specific options (for example `:width` and `:height`).

- [Interactive backend as a medium](#Interactive-backend-as-a-medium)
- [PostScript](#PostScript)
- [PDF](#PDF)
- [SVG](#SVG)
- [RasterImage](#RasterImage)
- [Adding new backends](#Adding-new-backends)

#### 4.12.1 Interactive backend as a medium

When the macro is used with an interactive backend then the default method opens a window stream with `open-window-stream`. `options` are as for this function except for that the `:port` keyword parameter is supplied by the default method.

The only valid value of `destination` in this default method is `nil`.

#### 4.12.2 PostScript

This backend symbol designator is `:ps`.

Valid values of `destination` are:

- a string or a pathname denoting the file to create
- a character or a binary output stream the file contents will be written to

This backend accepts the following `options`:

- device-type
- orientation
- multi-page
- scale-to-fit
- header-comments

#### 4.12.3 PDF

This backend symbol designator is `:pdf`.

Valid values of `destination` are:

- a string or a pathname denoting the file to create
- a binary output stream the file contents will be written to

This backends accepts the same set of options as the PostScript backend.

#### 4.12.4 SVG

This backend symbol designator is `:svg`. To make this backend available load the system `"mcclim-svg"`.

Valid values of `destination` are:

- a string or a pathname denoting the file to create
- an output stream the file contents will be written to

This backend accepts the following `options`:

- scale-to-fit - scale and move graphics so they fill whole viewport
- width - width in `:units` units, defaults to `:compute`
- height - height in `:units` units, defaults to `:compute`
- dpi - density used to calculate device units, defaults to `96`
- units - graft units, defaults to `:device`
- orientation - graft orientation, defaults to `:default`
- preview - opens the file with xdg-open

#### 4.12.5 RasterImage

This backend symbol designator is `:raster`.

Valid values of `destination` are:

- a string or a pathname
- a binary output stream
- a keyword :pattern

This backend accepts the following `options`:

- width - defaults to :compute
- height - defaults to :compute
- format - output format (unless implicit from the destination)
- target - when the destination is :pattern, then try to reuse the target
- recording-p - when true, then the second returned value is the history

`format` is a symbol that names the type of the image. Valid values are `:png`, `:jpg`, `:jpeg`, `tiff`, `tif`, `gif`, `pbm`, `pgm`, and `ppm`. Its default value is `:png`.

#### 4.12.6 Adding new backends

Describe here howe to specialize `invoke-with-output-to-drawing-stream`.



### 4.13 Additional arguments to drawing functions

Functions `draw-arrow` and `draw-arrow*` can take a `:head-filled` keyword argument, which is a generalized boolean, and is false by default. If true, any arrow heads are filled in; otherwise, they are drawn as lines.



### 4.14 Gestures and Gesture Names extensions

McCLIM extends the set of gesture types and specs with the following:

- `:pointer-button`

  This gesture type is the same but the set of allowed buttons is extended with: `(member :wheel-up :wheel-down :wheel-left :wheel-right)`. When the user scrolls the pointer then the backend will send events matching types: `:pointer-scroll`, `:pointer-button-press` and `:ponter-button-release`.

- `:pointer-motion`

  This gesture type will match all pointer-motion events. The gesture spec accepts the same set of buttons as the `:pointer-button` but it may be a list. For example:

  ``` lisp-preformatted
  (define-gesture-name whoosh :pointer-motion ((:left :right) :control))
  ```

- `:pointer-scroll`

  This gesture type will match the scroll events. The gesture spec is similar to `:pointer-button`, but the name of a pointer button is of type `(member :wheel-up :wheel-down :wheel-left :wheel-right)`.

- `:timer`

  This gesture type will match the timer events. The gesture spec is a keyword that is the timer event qualifier to distinguish them.

  ``` lisp-preformatted
  (define-gesture-name cookie :timer :cookie)
  (define-gesture-name school :timer :school)

  ;;; cookie in 20s!
  (schedule-timer-event my-sheet :cookie 20)
  ;;; school in 2 hours!
  (schedule-timer-event my-sheet :school (* 2 60 60))
  ```

- `:indirect`

  This gesture type will match other gesture names. It is possible to create “group” gestures and configurable gesture sets for different programs.

  ``` lisp-preformatted
  (defun use-wsad ()
    (define-gesture-name move-north :indirect wsad-up)
    (define-gesture-name move-south :indirect wsad-down)
    (define-gesture-name move-west  :indirect wsad-left)
    (define-gesture-name move-east  :indirect wsad-right))

  (defun use-arrows ()
    (define-gesture-name move-north :indirect arrow-up)
    (define-gesture-name move-south :indirect arrow-down)
    (define-gesture-name move-west  :indirect arrow-left)
    (define-gesture-name move-east  :indirect arrow-right))

  (define-gesture movement-group :indirect move-north :unique t)
  (define-gesture movement-group :indirect move-south :unique nil)
  (define-gesture movement-group :indirect move-west  :unique nil)
  (define-gesture movement-group :indirect move-east  :unique nil)
  ```



## 5 Applications

- [Debugger](#Debugger)
- [Inspector](#Inspector)
- [Listener](#Listener)



### 5.1 Debugger

The debugger is used for interactively inspecting stack frames when an unhandled condition is encountered. Given high enough `debug` settings, the debugger can inspect frame-local variables, evaluate code in particular stack frame and invoke available restarts.

- [Debugger usage](#Debugger-usage)
- [Keyboard shortcuts](#Keyboard-shortcuts)
- [Debugger API](#Debugger-API)



#### 5.1.1 Debugger usage

To get up and running quickly with Debugger:

1.  With Quicklisp loaded, invoke in REPL:

    `(ql:quickload 'clim-debugger)`

2.  Run simple test condition:

    `(clim-debugger:with-debugger () (error "test"))`

The debugger is inspired by SLIME’s debugger and uses Swank to gain portability across implementations. The application is still under development and some details may change in the future.

Clicking frame with the mouse pointer toggles the display of its details and selects it. Each locale value may be inspected by selection with mouse pointer. The selected frame is distinguished from others with red color. The `Eval in frame` command evaluates expression in the selected frame.



#### 5.1.2 Keyboard shortcuts

Warning: these key accelerators may change in the future.

M-p  
Mark previous frame active

M-n  
Mark next frame active

m  
Show more frames

e  
Eval in active frame

TAB  
Toggle active frame details

\[0-9\]  
Invoke nth restart

q  
Quit debugger



#### 5.1.3 Debugger API

function:

**debugger \[clim-debugger\]** `condition me-or-my-encapsulation` [¶](#index-debugger-_005bclim_002ddebugger_005d)

Starts debugger with `condition`. `me-or-my-encapsulation` should be supplied by the Lisp implementation allowing to encapsulate or supply different debugger for recursive debugger calls.

macro:

**with-debugger \[clim-debugger\]** `options &body body` [¶](#index-with_002ddebugger-_005bclim_002ddebugger_005d)

Executes the code in `body` invoking the CLIM debugger when an unhandled condition is signalled. The macro binds `*debugger-hook*` to `#'debugger`. Bindings are inherited by new threads. `options` are not used at the moment.

function:

**install-debugger \[clim-debugger\]** [¶](#index-install_002ddebugger-_005bclim_002ddebugger_005d)

Installs `clim-debugger` globally (no need to wrap body in `with-debugger`).



### 5.2 Inspector

“Clouseau” is used for interactively inspecting Common Lisp objects. It lets you look inside objects, inspect slots, disassemble and trace functions, view keys and values in hash tables, and quite a few other things as well. It can be extended to aid in debugging of specific programs, similar to the way the Lisp printer can be extended with **print-object**. The inspector can be used as a standalone application or embedded into CLIM applications.

The inspector should be portable, but has only been tested in SBCL, CCL and ECL so far. Some features of the inspector have to use non-standard features of implementations and are thus not available in all implementations.

- [Usage](#Usage)
- [Extending Clouseau](#Extending-Clouseau)
- [API](#API)



#### 5.2.1 Usage

- [Quick Start](#Quick-Start)
- [The Inspector Window](#The-Inspector-Window)
- [Objects and Places](#Objects-and-Places)
- [Evaluating Forms](#Evaluating-Forms)
- [Navigating](#Navigating)
- [Handling of Specific Object Types](#Handling-of-Specific-Object-Types)
- [Updating the Inspected Object](#Updating-the-Inspected-Object)



#### 5.2.1.1 Quick Start

To get up and running quickly with Clouseau:

1.  Load the `clouseau` system with `(ql:quickload "clouseau")`. Alternatively, use `(asdf:load-system "clouseau")`, potentially after manually loading `mcclim/Apps/Clouseau/clouseau.asd`.

2.  Inspect an object with `(`[**`clouseau:inspect`**](#Function-clouseau_003ainspect)` ``object``)` where `object` can be any Lisp object. If you use a multithreaded Lisp implementation, you can also include the `:new-process` keyword argument. If it is true, then Clouseau is started in a separate thread, causing the above call to return immediately.

    For example, executing the following code

    ``` lisp-preformatted
    (defclass foo () ((a :initarg :a) (b :initform #(1 2 3)) (c :initarg :c)))
    (clouseau:inspect (make-instance 'foo :c (make-instance 'foo)))
    ```

    should cause a window similar to the one shown below to open:

    ![The initial Clouseau window](figures/clouseau-startup-screenshot.png)

3.  Interactively explore the object graph:
    - Left-click an object to expand or collapse it.
    - Middle-click an object to make it the new root (as in the SLIME inspector).
    - Right-click an object to open a context menu containing other commands applicable to the object.

That’s really all you need to know to get started. The best way to learn how to use Clouseau is to start inspecting your own objects.



#### 5.2.1.2 The Inspector Window

After starting the inspector, a window similar to the one shown below should appear:

![Parts of the Clouseau window](figures/clouseau-window-screenshot.png)

The central pane shows the tree of objects currently being inspected. In the above example, the root object is an instance of a class named `FOO` with three slots, `A`, `B` and `C`. Commands can be issued by clicking on objects in the central pane or by typing command names into the pane below it. The bottom pane shows available commands for the object under the mouse pointer and how to invoke them.

By default, Clouseau will display a CLIM interactor pane for typing named commands and printing command output. The keyboard shortcut C-i (control key and "i" key pressed at the same time) toggles visibility of the interactor pane.



#### 5.2.1.3 Objects and Places

Within the currently displayed object tree, each visible object is either *collapsed*, meaning it is displayed compactly and objects contained in it are not displayed, or *expanded*, meaning that it is displayed in more detail and objects immediately contained in it are displayed (those objects are initially collapsed but may be expanded). The collapsed representation of an object may be something like `#<STANDARD-CLASS SALAD-MIXIN>`. To expand collapsed objects, left-click on them. Left-click on them again and they will go back to a collapsed form.

> **Note:** When collapsing objects, make sure not to click on one of the object’s children since that expands the child instead of collapsing the object. The object that would be affected by a mouse click at the current pointer position is always indicated by surrounding it with a black rectangle that is updated as the pointer moves. In addition, the pointer-documentation pane at the bottom of the window always describes the available actions for the object currently under the pointer.

An expanded object is related to its children through “places”. For example, a standard object has a place for each of its slots and a child object for each of its *bound* slots. Other examples of places include:

- Elements of lists (including “key” and “value” places in association lists and property lists)
- Elements of arrays
- “Key” and “value” places in hash-tables
- Fill pointer and length of a vector

Places are generally visually represented as some kind of bullet or arrow symbol. Examples include: •, ⁃ and →. Immutable places (such as the length of a non-adjustable vector) are displayed in orange, mutable places (such as object slots, vector elements or the length of an adjustable array) are displayed in purple.

![Objects and places](figures/clouseau-objects-and-places-screenshot.png)

Places provide their own commands which are to some extent independent of the respective objects they contain. The applicable commands for a given place can be seen by right-clicking it. Some common place commands are:

`Copy Place Value`  
This command copies the value of the place into another place. The source place must have a value (i.e. if it is a slot, it must be bound). The target place must be mutable and accept the type of object stored in the source place. This command can be invoked by clicking the source place and dragging it onto the target place.

`Swap Place Values`  
This command swaps the values of two places. It is similar to `Copy Place Value` except that it requires the source place to be mutable as well. It can be invoked via drag-and-drop by holding down the control key.

`Set Place`  
This command sets the value of a place to the result of evaluating a form. Only mutable places support this. The command can be invoked by holding down the meta key and left-clicking the place. It will ask for a form to evaluate, evaluate the specified form and attempt to set the place to the value produced by evaluating the form. See [Evaluating Forms](#Evaluating-Forms).

`Remove Place Value`  
This command removes the value of a place. Not all mutable places support this. Here are some examples of places that do:

- If the place corresponds to a slot in a standard object or structure object, the slot is made unbound.
- If the slot corresponds to the symbol function of a symbol, the symbol function is removed.
- List, array and hash-table elements can be removed as well.

`Set Place To True`  
Some places have specialized commands. For example, if the type of a place is known to be Boolean and the current value is false, this command sets the value of the place to `t`. Similarly, `Set Place To False` sets the value to `nil`.

`Increment Place`  
If the value of a place is an integer *x*, this command replaces the value of the place with the integer *x + 1*. Similarly, `Decrement Place` replaces the value with *x - 1*. These commands will be particularly handy when it will become possible to bind them to mousewheel-up and mousewheel-down gestures.



#### 5.2.1.4 Evaluating Forms

The context menu of every object provides an `Evaluate a form in this context` command. When invoked, this commands asks for a form in the interactor pane. Any valid Common Lisp form can be entered.

Generally, the commands `Set Place`, `Eval With Context`, `Eval Inspect` and `Eval` all read a form and evaluate it. During the evaluation of the form, the special variable `cl:**` is bound to the root object. If the command has been invoked on an object or place, `cl:*` is bound to that object or the current value of that place.



#### 5.2.1.5 Navigating

There are two ways of navigating inspected objects:

Retaining the current object tree  
The basic and most used operation is expanding and collapsing objects (See [Objects and Places](#Objects-and-Places)). Toggling an object between the collapsed and expanded states can be accomplished by clicking the left mouse button while the cursor is positioned over any part of the object that is not associated with a more specific command.

Some types of objects provide additional display styles. For example, the slots of standard object and structure objects can be displayed as a “flat” list or they can be grouped according to the superclass containing the direct slot. These additional display styles can be selected in the context menu of the object.

Replacing the object tree  
The context menu for every object contains a `Select …` command. This command replaces the current tree of inspected objects with a new one rooted at the selected object. This is useful to focus on an object of interest after “drilling down” by expanding a number of irrelevant parent objects.

Another way of replacing the object tree is the named command `Eval Inspect`. Typing ‘`Eval Inspect`’ in the interactor initiates the command which will ask for a form to evaluate and then replace the tree of inspected objects with a new one rooted at the object that is the result of evaluating the given form.



#### 5.2.1.6 Handling of Specific Object Types

Clouseau can handle numerous object types in different ways. Here are some handy features you might miss if you don’t know to look for them:

Standard Objects  
Standard objects have their slots shown, either grouped by superclass or as a “flat” list. The `Change Class` command can be used to change the class of the inspected object.

Structures  
Structures are inspected the same way as standard objects except that the `Change Class` command is not available.

Functions  
You can disassemble functions with the `Show Disassembly` command. If the disassembly is already shown, `Hide Disassembly` hides it. Named functions can also be traced and untraced with the `Trace Function` and `Untrace Function` commands.

Generic Functions  
In addition to everything possible with standard objects and functions, you can remove methods from generic functions with the `Remove Place Value` and `Remove all Methods` commands.

Symbols  
The value, function and type “slots” of a symbol are mutable places and can thus be manipulated using the usual place commands[³](#FOOT3).

Lists and Conses  
Lists and conses can be displayed in either the classic format (such as `(1 3 (4 . 6) "Hello" 42)`), as a list, or a more graphical cons-cell diagram format. The default is the classic format when collapsed and a list when expanded, but this can be toggled with the `Conses as List` and `Conses as Graph` commands.

The graphical cons cell diagram looks like this:

![List presented as graph](figures/clouseau-list-as-graph-screenshot.png)



#### 5.2.1.7 Updating the Inspected Object

Sometimes the contents of inspected objects changes over time. Consider an object corresponding to a rigid body in a dynamics simulation: its position, velocity and acceleration usually change with each simulation step. In some cases, it is useful to have such changes automatically reflected in the inspector’s display of the object. Assuming the client has the ability to call the inspector after relevant changes have happened, the following pattern can be used:

1.  Call [**clouseau:inspect**](#Function-clouseau_003ainspect) with `:new-process t` and hold on to the second return value which is the application frame of the inspector instance.
2.  At a suitable point in time, run `(setf (clouseau:root-object ``frame`` :run-hook-p t) ``object``)` where `object` can be the same root object as before. This call causes the inspector to redisplay inspected objects using their state at the time of the call.

Here is a complete example:

``` lisp-preformatted
(let* ((list  (list #C(1 0))) ; mutable object
       (frame (nth-value 1 (clouseau:inspect        ; make inspector, keep frame
                            list :new-process t)))) ; runs in its own thread
  ;; Now change the object by replacing the car of the cons cell, then
  ;; notify the inspector. Repeat 30 times a second.
  (loop :for i :from 0 :by 0.1
        :do (setf (first list) (complex (* 1 (cos i)) (* 1 (sin i))))
            (setf (clouseau:root-object frame :run-hook-p t) list)
            (sleep 1/30)))
```



#### 5.2.2 Extending Clouseau

Sometimes Clouseau’s built-in inspection abilities aren’t enough, and you want to extend it to inspect one of your own classes in a special way. Clouseau supports this, and it’s fairly simple and straightforward.

- [Running Example](#Running-Example)
- [State and Style of Presented Objects](#State-and-Style-of-Presented-Objects)
- [Defining Inspection Methods for Objects](#Defining-Inspection-Methods-for-Objects)



#### 5.2.2.1 Running Example

Suppose that you’re writing a statistics program and you want to specialize the inspector for your application. When you’re looking at a sample of some characteristic of a population, you want to be able to inspect it and see some statistics about it, like the average. This is easy to do.

We define a class for a statistical sample. We’re keeping this very basic, so it’ll just contain a list of numbers:

``` lisp-preformatted
(cl:in-package #:clim-user)

(defclass sample ()
  ((%data :initarg :data
          :accessor data
          :type list
          :initform '()))
  (:documentation "A statistical sample"))

(defgeneric sample-size (sample)
  (:documentation "Return the size of a statistical sample"))

(defmethod sample-size ((sample sample))
  (length (data sample)))
```

The **print-object** method we define will print samples unreadably, just showing their sample size. For example, a sample with nine numbers will print as `#<SAMPLE n=9>`. We create such a sample and call it `*my-sample*`:

``` lisp-preformatted
(defmethod print-object ((object sample) stream)
  (print-unreadable-object (object stream :type t)
    (format stream "n=~D" (sample-size object))))

(defparameter *my-sample*
  (make-instance 'sample
                 :data '(12.8 3.7 14.9 15.2 13.66
                         8.97 9.81 7.0 23.092)))
```

We need some basic statistics functions. First, we’ll do sum:

``` lisp-preformatted
(defgeneric sum (sample)
  (:documentation "The sum of all numbers in a statistical
sample"))

(defmethod sum ((sample sample))
  (reduce #'+ (data sample)))
```

Next, we want to be able to compute the mean. This is just the standard average that everyone learns: add up all the numbers and divide by how many of them there are. It’s written *\overline {x}*.

``` lisp-preformatted
(defgeneric mean (sample)
  (:documentation "The mean of the numbers in a statistical
sample"))

(defmethod mean ((sample sample))
  (/ (sum sample) (sample-size sample)))
```

Finally, to be really fancy, we’ll throw in a function to compute the standard deviation which is a measurement of how spread out or bunched together the numbers in the sample are. It’s called *s*, and it’s computed like this: *s = \sqrt{{1 \over N-1} \sum\_{i=1}^N (x_i - \overline {x})^2}*.

``` lisp-preformatted
(defgeneric standard-deviation (sample)
  (:documentation "Find the standard deviation of the numbers
in a sample. This measures how spread out they are."))

(defmethod standard-deviation ((sample sample))
  (let ((mean (mean sample)))
    (sqrt (/ (loop for x in (data sample)
                   sum (expt (- x mean) 2))
             (1- (sample-size sample))))))
```

This is all very nice, but when we inspect `*my-sample*` all we see is its class and its single slot. Since we just defined two methods for summarizing samples, there’s a lot of potential being missed here. How do we take advantage of it?



#### 5.2.2.2 State and Style of Presented Objects

Let us start by taking a closer look at how the inspector presents inspected objects. Each occurrence of an inspected object on the screen [⁴](#FOOT4) has an associated *state* which in turn stores a presentation *style* for the object. The state and style control how an object is presented and which commands can be applied to it. Object states and thus styles for each occurrence of an object are independent from those associated with other occurrences of the same object.

The state characterizes the object and the class of the state can depend on the particular object. State classes are generally subclasses of `clouseau:inspected-object`. Objects are presented with **clim:present** using the name of the class of the state as the presentation type. The class of the state therefore determines which commands are applicable to a given object.

The style indicates how the object or certain parts of the object should *currently* be presented. The style is stored in the state and can be replaced with a different style via certain commands such as `Expand` and `Collapse`. Clouseau comes with a basic hierarchy of styles:

![Included object presentations styles](figures/clouseau-object-styles-hierarchy.png)

The figure below illustrates for a `vector` as an example of an inspected object which parts of the visible output are produced by the [**clouseau:inspect-object-using-state**](#Generic_002dFunction-clouseau_003ainspect_002dobject_002dusing_002dstate) methods specialized to the respective style keywords. The colors of the borders correspond the colors in the previous figure.

![Included object presentations styles](figures/clouseau-object-styles-example.png)



#### 5.2.2.3 Defining Inspection Methods for Objects

We can define specialized inspection methods for our objects. To do this, we define methods on [**clouseau:inspect-object-using-state**](#Generic_002dFunction-clouseau_003ainspect_002dobject_002dusing_002dstate) which expects the object, the associated state, the current style and a target stream as its arguments. To change how `sample` objects are presented in the `:collapsed` and `:expanded` styles, we could define methods which are specialized to those styles. However, because we defined **print-object** for the `sample` class to be as informative as we want the simple representation to be, we don’t need to define a [**clouseau:inspect-object-using-state**](#Generic_002dFunction-clouseau_003ainspect_002dobject_002dusing_002dstate) method for the `:collapsed` style. We will, define methods for the `:expanded-header` and `:expanded-body` styles, though:

``` lisp-preformatted
(defmethod clouseau:inspect-object-using-state
    ((object sample)
     (state  clouseau:inspected-instance)
     (style  (eql :expanded-header))
     (stream t))
  (format stream "SAMPLE n=~D" (sample-size object)))

(defmethod clouseau:inspect-object-using-state
    ((object sample)
     (state  clouseau:inspected-instance)
     (style  (eql :expanded-body))
     (stream t))
  (clouseau:formatting-place (object 'clouseau:reader-place 'mean
                              present-place present-object)
    (write-string "mean" stream) ; label
    (present-place stream)       ; place indicator for the "slot"
    (present-object stream))     ; the value of the "slot" is the object
  (fresh-line stream)
  (clouseau:formatting-place (object 'clouseau:reader-place 'standard-deviation
                              present-place present-object)
    (write-string "std. dev." stream) ; label
    (present-place stream)            ; place indicator for the "slot"
    (present-object stream)))         ; the value of the "slot" is the object
```

With the above methods in place, our object is presented like this for the `:expanded` style:

![figures/clouseau-inspect-object-1](figures/clouseau-inspect-object-1.png)

This is already pretty functional: our statistical summaries are presented as a label, an immutable place and a value. The places and values behave as expected with respect to presentation highlighting and available commands.

Presenting the place indicators using the usual style would make their nature more obvious. What we also want is something visually more closely adapted to our needs. It would be nice if we could just have a table of things like *\overline {x} = 12.125776* and have them come out formatted nicely. Before we attempt mathematical symbols, let’s focus on getting the basic layout right. For this, we can use CLIM’s table formatting, Clouseau’s convenience function [**clouseau:format-place-row**](#Function-clouseau_003aformat_002dplace_002drow) and the `clouseau:reader-place` place class:

``` lisp-preformatted
(defmethod clouseau:inspect-object-using-state
    ((object sample)
     (state  clouseau:inspected-instance)
     (style  (eql :expanded-body))
     (stream t))
  (formatting-table (stream)
    (clouseau:format-place-row
     stream object 'clouseau:reader-place 'mean :label "mean")
    (clouseau:format-place-row
     stream object 'clouseau:reader-place 'standard-deviation
     :label "std. dev.")))
```

[**clouseau:format-place-row**](#Function-clouseau_003aformat_002dplace_002drow) creates one instance of `clouseau:reader-place` for each of our statistical functions **mean** and **standard-deviation**. Each of these place instances together with the values returned by the respective function are then presented as a table row with three cells corresponding to the label, the place and the value.

This refinement gets us most of the way towards the goal:

![figures/clouseau-inspect-object-2](figures/clouseau-inspect-object-2.png)

Finally, for our amusement and further practice, we’ll try to get some mathematical symbols — in this case we’ll just need *\overline {x}*. We can get this by printing an italic *x* and drawing a line over it:

``` lisp-preformatted
(defun xbar (stream)
  "Draw an x with a bar over it"
  (with-room-for-graphics (stream)
    (with-text-face (stream :italic)
      (princ #\x stream)
      (draw-line* stream 0 0 (text-size stream #\x) 0))))

(defmethod clouseau:inspect-object-using-state
    ((object sample)
     (state  clouseau:inspected-instance)
     (style  (eql :expanded-body))
     (stream t))
  (formatting-table (stream)
    (clouseau:format-place-row
     stream object 'clouseau:reader-place 'mean
     :label #'xbar)
    (clouseau:format-place-row
     stream object 'clouseau:reader-place 'standard-deviation
     :label #\S :label-style '(:text-face :italic))))
```

Finally, to illustrate the use of the `:expanded-header` style, suppose that we want the ‘`n=9`’ (or whatever the sample size *n* equals) part to have an italicized *n*: easily:

``` lisp-preformatted
(defmethod clouseau:inspect-object-using-state
    ((object sample)
     (state  clouseau:inspected-instance)
     (style  (eql :expanded-header))
     (stream t))
  (clouseau::inspect-class-as-name (class-of object) stream)
  (write-char #\Space stream)
  (with-drawing-options (stream :text-family :serif :text-face :italic)
    (write-char #\n stream))
  (format stream "=~D" (sample-size object)))
```

Our final version looks like this:

![figures/clouseau-inspect-object-4](figures/clouseau-inspect-object-4.png)

For more examples of how to extend the inspector, you can look at the files in the `Apps/Clouseau/src/objects/` directory.



#### 5.2.3 API

The following symbols are exported from the `clouseau` package:

- [Functions for Invoking Clouseau](#Funtions-for-Invoking-Clouseau)
- [Functions for Extending Clouseau](#Functions-for-Extending-Clouseau)
- [Other Functions](#Other-Functions)
- [Deprecated Functions](#Deprecated-Functions)



#### 5.2.3.1 Functions for Invoking Clouseau

Function:

**inspect \[clouseau\]** `object &key new-process handle-errors` [¶](#index-inspect-_005bclouseau_005d)

Inspect `object` in a new inspector window.

Return two values: 1) `object` 2) the created inspector application frame.

If `new-process` is false (the default), this function returns to the caller after the inspector window has been closed. If `new-process` is true, this function returns to the caller immediately and the inspector frame executes in a separate thread.

`handle-errors` controls whether errors signaled when printing and inspecting objects should be handled. `handle-errors` must be a valid type specifier (`t` and `nil` are legal values). Signaled errors of the specified type will be handled by printing an error messages in place of the inspected object. Other errors will not be handled and might invoke the debugger in the usual way.



#### 5.2.3.2 Functions for Extending Clouseau

The following functions and macro can be used to add support for custom object types to Clouseau:

Generic Function:

**inspect-object-using-state \[clouseau\]** `object state style stream` [¶](#index-inspect_002dobject_002dusing_002dstate-_005bclouseau_005d)

Present `object` to `stream` according to `state` and `style`.

`state` stores information that is permanently associated with `object`.

`style` on the other hand consists of transient information such as whether `object` should be presented in expanded or collapsed form.

`stream` is the stream to which `object` should be presented.

Example:

``` lisp-preformatted
(defmethod clouseau:inspect-object-using-state
    ((object symbol)
     (state  clouseau:inspected-object)
     (style  (eql :expanded-body))
     (stream t))
  (clouseau:formatting-place
      (object 'clouseau:reader-place 'symbol-name
       present-place present-object)
    (write-string "Symbol name" stream)
    (present-place stream)
    (present-object stream)))
```

Generic Function:

**note-object-occurrence \[clouseau\]** `object state presentation stream` [¶](#index-note_002dobject_002doccurrence-_005bclouseau_005d)

Note that `presentation` is a representation of `object` in `stream`.

`state` is the state associated with `object`.

The main purpose of this generic function is tracking multiple occurrences of objects so the circularity can be indicated.

function:

**call-without-noting-object-occurrences \[clouseau\]** `thunk` [¶](#index-call_002dwithout_002dnoting_002dobject_002doccurrences-_005bclouseau_005d)

Call `thunk` with [**clouseau:note-object-occurrence**](#Generic_002dFunction-clouseau_003anote_002dobject_002doccurrence) calls devoid of effects.

Macro:

**without-noting-object-occurrences \[clouseau\]** `() &body` [¶](#index-without_002dnoting_002dobject_002doccurrences-_005bclouseau_005d)

Execute `body` with [**clouseau:note-object-occurrence**](#Generic_002dFunction-clouseau_003anote_002dobject_002doccurrence) calls devoid of effects.

Macro:

**formatting-place \[clouseau\]** `(container place-class cell present-place present-object &key place-var) &body` [¶](#index-formatting_002dplace-_005bclouseau_005d)

Execute `body` with `present-place` and `present-object` bound to print functions.

Before `body` is executed, an instance of `place-class` representing the child of `container` selected by `place-class` and `cell` is created and stored in the place associated with `container` unless such an instance already exists.

`place-class` must be a symbol naming a class or a class object and is passed to `make-instance` to create the object which represents the place.

`cell` indicates the cell within the place that is being formatted. For example, if `container` is a one-dimensional array and `place-class` designates (a subclass of) `array-element-place`, a suitable value for `cell` is any array index that is valid for `container`.

`present-place` is bound to a function that, when called with a stream as its sole argument, outputs a presentation corresponding to the created place to the stream. The produced presentation will be of presentation-type `place`.

`present-object` is bound to a function that, when called with a stream as its sole argument, outputs a presentation corresponding to the child of `container` selected by `place-class` and `cell`.

Example:

This application of the macro

``` lisp-preformatted
(clouseau:formatting-place
    (object 'clouseau:reader-place 'symbol-name
     present-place present-object)
  (write-string "Symbol name" stream) ; Label
  (present-place stream)              ; Write place presentation
  (present-object stream))            ; Write value presentation
```

outputs the name of the symbol `object` as an immutable place to `stream` like this:

``` example-preformatted
Symbol name → <value>
^ Label       ^ Value presentation
            ^ Place presentation
```

In the above example a place of type `clouseau:reader-place` is created and the cell for that place is the symbol `symbol-name`. For this combination, the value of the place is the result of evaluating `(symbol-value object)`.

Function:

**format-place-cells \[clouseau\]** `stream object place-class cell &key label label-style place-style object-style` [¶](#index-format_002dplace_002dcells-_005bclouseau_005d)

Present the child of `object` selected by `place-class` and `cell` to `stream`.

Retrieve an existing place instance for the child of `object` selected by `place-class` and `cell` or make a new instance of `place-class`.

Each of the following is written to `stream` within a separate **clim:formatting-cell**:

1.  If non-`nil`, `label` is written to `stream`. If `label` is a function, it is called with `stream` as its sole argument.

    If `label-style` is non-`nil`, it must be either a keyword naming one of the styles known to **clouseau:call-with-style** or a list of arguments suitable for **clim:invoke-with-drawing-options**. Either way, the specified style is applied when outputting `label`.

2.  The place instance is presented using **clim:present** with the presentation type `clouseau:place`.

    `place-style` works like `label-style`.

3.  The child of `object` selected by `place-class` and `cell` is inspected using [**clouseau:inspect-place**](#Generic_002dFunction-clouseau_003ainspect_002dplace).

    `object-style` works like `label-style`.

Example:

The call

``` lisp-preformatted
(clouseau:format-place-cells
 stream symbol 'clouseau:reader-place 'symbol-name
 :label "Symbol name")
```

outputs the name of `symbol` as an immutable place to `stream` in three table cells like this:

``` example-preformatted
cell 1        cell 2   cell 3
v             v        v
Symbol name | →      | <value>
^ Label                ^ Value presentation
              ^ Place presentation
```

Function:

**format-place-row \[clouseau\]** `stream object place-class cell &key label label-style place-style object-style` [¶](#index-format_002dplace_002drow-_005bclouseau_005d)

Like [**clouseau:format-place-cells**](#Function-clouseau_003aformat_002dplace_002dcells) but surrounded by an additional **clim:formatting-row**.



#### 5.2.3.3 Other Functions

It should normally not be necessary to directly call or define methods on the following generic functions:

Generic Function:

**inspect-place \[clouseau\]** `place stream` [¶](#index-inspect_002dplace-_005bclouseau_005d)

Present `place` to `stream`.

By default, retrieve the value of `place` and inspect it using `inspect-object`.

User code normally does not have to define methods on this generic functions.

Generic Function:

**inspect-object \[clouseau\]** `object stream` [¶](#index-inspect_002dobject-_005bclouseau_005d)

Present `object` to `stream`.

By default, calls `inspector-object-using-state`.

`stream` is the stream to which `object` should be presented.

User code normally does not have to define methods on this generic functions.



#### 5.2.3.4 Deprecated Functions

A previous version of Clouseau provided the following functions and macros which are now deprecated:

Generic Function:

**inspect-object-briefly \[clouseau\]** `object pane` [¶](#index-inspect_002dobject_002dbriefly-_005bclouseau_005d)

A brief version of **inspect-object**. The output should be short, and should try to fit on one line.

[TABLE]

Macro:

**inspector-table \[clouseau\]** `(object pane) header \body body` [¶](#index-inspector_002dtable-_005bclouseau_005d)

Present `object` in tabular form on `pane`, with `header` evaluated to print a label in a box at the top. `body` should output the rows of the table, possibly using `inspector-table-row`.

[TABLE]

Macro:

**inspector-table-row \[clouseau\]** `(pane) left right` [¶](#index-inspector_002dtable_002drow-_005bclouseau_005d)

Output a table row with two items, produced by evaluating `left` and `right`, on `pane`. This should be used only within `inspector-table`.

When possible, you should try to use this and `inspector-table` for consistency, and because they handle quite a bit of effort for you.

[TABLE]

Generic Function:

**define-inspector-command \[clouseau\]** `name args &rest body` [¶](#index-define_002dinspector_002dcommand-_005bclouseau_005d)

This is just an inspector-specific version of **define-command**. If you want to define an inspector command for some reason, use this.

[TABLE]



### 5.3 Listener

The McCLIM Listener provides an interactive toplevel with full access to the graphical capabilities of CLIM and a set of built-in commands intended to be useful for Lisp development and experimentation. Present features include:

- Reading/evaluation of Lisp expressions
- Ability to run external programs, through the `Run` command or `#!` macro
- Commands for inspecting classes (superclasses/subclasses, slots, etc.)
- Navigation of the filesystem, including a directory stack
- Launching of external programs sensitive to file type (determined by `mailcap` and `mime.types` files)

&nbsp;

- [Usage](#Listener-usage)
- [The \#! macro character](#The-_0023_0021-macro-character)
- [Calling commands from lisp](#Calling-commands-from-lisp)
- [Command output destinations](#Command-output-destinations)
- [Debugger integration](#Debugger-integration)



#### 5.3.1 Usage

- [Quick start](#Listener-quick-start)
- [Commands](#Commands)



#### 5.3.1.1 Quick start

To get up and running quickly with the Listener:

1.  Load the `clim-listener` system with `(ql:quickload "clim-listener")`. Alternatively, use `(asdf:load-system "clim-listener")`, potentially after manually loading `mcclim/Apps/Listener/clim-listener.asd`.
2.  Once loaded, you can run the Listener using: `(clim-listener:run-listener)`. If you use a multithreaded Lisp implementation, you can also include the `:new-process` keyword argument. If it is true, then the Listener is started in a separate thread, causing the above call to return immediately.

After starting the Listener, a typical Lisp prompt will be displayed, with the package name preceding the prompt. You may type Lisp forms or commands to this prompt. The , (comma) character starts a command, every other input will be treated by the Listener as a form to be evaluated.

At the bottom of the window is a “wholine” which shows various things such as the username/hostname, package, current directory (`*default-pathname-defaults*`), the depth of the directory stack (if not empty), and the current memory usage. Some of these items will be sensitive to pointer gestures.



#### 5.3.1.2 Commands

The command `Help (with) Commands` will produce a list of available commands.

General Commands

`Help`

`Clear Output History`

Clears the screen

`Exit`

Basic Lisp Commands

`Apropos`

`Describe`

`Room`

`Trace`

`Untrace`

`Eval`

`Load File`

`Compile File`

`Compile and Load`

CLOS Commands

`Show Class Superclasses`

`Show Class Subclasses`

`Show Class Slots`

`Show Class Generic Functions`

`Show Applicable Methods`

Filesystem Commands

`Show Directory`  
`Up Directory`  
`Edit File`  
Probably broken

`Show File`  
Almost certainly broken

Directory Stack Commands

`Display Directory Stack`

`Push Directory`

`Pop Directory`

`Swap Directory`

`Drop Directory`

Other Commands

`Run`  
Run an external program

`Background Run`  
As above, but don’t wait for program to complete



#### 5.3.2 The \#! macro character

Although there are commands for running external programs, the \#! macro character tries to provide a nicer interface. It allows you to run external programs as a lisp function call, and attempts to transform the arguments in some meaningful way. Several transformations are performed:

- Keywords are converted to options. Single character keywords are turned into an option with a single dash (e.g., `:v` becomes `-v`). Longer keywords become an option preceded by two dashes (e.g., `:verbose` becomes `--verbose`)
- Sequences are flattened into separate arguments
- Wild pathnames are expanded (currently subject to brokenness in the `directory` function of various CL environments)

My apologies to anyone doing something more useful with this macro character if I have clobbered your readtable.



#### 5.3.3 Calling commands from lisp

Calling CLIM commands from Lisp is straightforward. By convention, the pretty names used at the interactor map to a function name which implements the command body by upcasing the name, replacing spaces with hyphens, and prepending `COM-` (e.g., `Show Directory` becomes `COM-SHOW-DIRECTORY`).



#### 5.3.4 Command output destinations

McCLIM’s implementation of the **clim:define-command** macro accepts a `:provide-output-destination-keyword` keyword argument which allows redirecting the output of the command from `*standard-output*` to some other destination. The Listener code supplies this argument for many of the defined commands. As a result, many Listener commands can be invoked with the `:output-destination` keyword, for example

``` lisp-preformatted
CLIM-USER> ,Show Class Superclasses (class) standard-class
  (keywords) :output-destination
  (output-destination) Postscript File
  (destination file) /tmp/output.ps
```

will redirect the command’s output to the file `/tmp/output.ps`.



#### 5.3.5 Debugger integration

When a command executed in the Listener signals an error, the default behavior consists in invoking the McCLIM Debugger (see [Debugger](#Debugger)). This behavior can be controlled by supplying a Boolean value for the `:debugger` keyword argument when calling the `clim-listener:run-listener` function.



## Auxiliary material

- [Glossary](#Glossary)
- [Development History](#Development-History)



### Glossary

**Active gadget**

An active gadget is available for input. For most gadgets, this means processing events when active and ignoring events when not active.

**Armed gadget**

The exact definition of arming and disarming varies between kinds of gadgets, but typically a gadget becomes armed when the pointer is moved into its region.

**Device transformation**

TODO

**Direct mirror**

A *[mirror](#Mirror)* of a sheet which is not shared with any of the ancestors of the sheet. All grafted McCLIM sheets have mirrors, but not all have direct mirrors. A McCLIM sheet that does not have a direct mirror uses the direct mirror of its first ancestor having a direct mirror for graphics output. Asking for the direct mirror of a sheet that does not have a direct mirror returns `nil`.

Whether a McCLIM sheet has a direct mirror or not, is decided by the frame manager. Some frame managers may only allow for the graft to be a mirrored sheet. Even frame managers that *allow* hierarchical mirrors may decide not to allocate a direct mirror for a particular sheet. Although sheets with a direct mirror must be instances of the class `mirrored-sheet-mixin`, whether a McCLIM sheet has a direct mirror or not is not determined statically by the class of a sheet, but dynamically by the frame manager.

**Medium**

An object that contains the state information required for producing output on a particular sheet.

**Medium transformation**

A transformation that converts the coordinates presented to the drawing functions to the medium’s coordinate system. The identity transformation by default.

**Mirror**

A device window such as an X11 window that parallels a *sheet* in the CLIM *sheet hierarchy*. A *sheet* having such a *direct* mirror is called a *[mirrored sheet](#Mirrored-sheet)*. When *drawing functions* are called on a *mirrored sheet*, they are forwarded to the host windowing system as drawing commands on the *mirror*.

CLIM *sheet*s that are not mirrored must be *descendents* (direct or indirect) of a *[mirrored sheet](#Mirrored-sheet)*, which will then be the *sheet* that receives the drawing commands.

**Mirrored sheet**

A *sheet* in the CLIM *sheet hiearchy* that has a direct parallel (called the *[direct mirror](#Direct-mirror)*) in the host windowing system. A mirrored sheet is always an instance of the class `mirrored-sheet-mixin`, but instances of that class are not necessarily mirrored sheets. The sheet is called a mirrored sheet only if it currently has a direct mirror. There may be several reasons for an instance of that class not to currently have a direct mirror. One is that the sheet is not *grafted*. Only grafted sheets can have mirrors. Another one is that the *frame manager* responsible for the look and feel of the sheet hierarchy may decide that it is inappropriate for the sheet to have a direct mirror, for instance if the underlying windowing system does not allow nested windows inside an application, or that it would simply be a better use of resources not to create a direct mirror for the sheet. An example of the last example would be a stream pane inside a the *viewport* of a *scroller pane*. The graphics objects (usually text) that appear in a stream pane can have very large coordinate values, simply because there are many lines of text. Should the stream pane be mirrored, the coordinate values used on the mirror may easily go beyond what the underlying windowing system accepts. X11, for instance, can not handle coordinates greater than 64k (16 bit unsigned integer). By not having a direct mirror for the stream pane, the coordinates will be translated to those of the (not necessarily direct) mirror of the *viewport* before being submitted to the windowing system, which gives more reasonable coordinate values.

It is important to realize the implications of this terminology. A mirrored sheet is therefore not a sheet that has a mirror. All grafted sheets have mirrors. For the sheet to be a mirrored sheet it has to have a *direct* mirror. Also, a call to **sheet-mirror** returns a mirror for all grafted sheets, whether the sheet is a mirrored sheet or not. A call to **sheet-direct-mirror**, on the other hand, returns `nil` if the sheet is not a mirrored sheet.

**Mirror transformation**

The transformation that transforms coordinates in the coordinate system of a mirror (i.e. the native coordinates of the mirror) to native coordinates of its parent in the underlying windowing system. On most systems, including X, this transformation will be a simple translation.

**Native coordinates**

Each mirror has a coordinate system called the native coordinate system. Usually, the native coordinate system of a mirror has its origin in the upper-left corner of the mirror, the x-axis grows to the right and the y-axis downwards. The unit is usually pixels, but the frame manager can impose a native coordinate system with other units, such as millimeters.

The native coordinate system of a sheet is the native coordinate system of its mirror (direct or not). Thus, a sheet without a direct mirror has the same native coordinate system as its parent. To obtain native coordinates of the parent of a mirror, use the *[mirror transformation](#Mirror-transformation)*.

**Native region**

The native region of a sheet is the intersection of its region and the sheet region of all of its parents, expressed in the *[native coordinates](#Native-coordinates)* of the sheet.

**Native transformation**

TODO

**Potentially visible area**

A bounded area of an otherwise infinte drawing plane that is visible unless it is covered by other *[visible areas](#Visible-area)*.

**Sheet coordinates**

The coordinate system of coordinates obtained by application of the *[user transformation](#User-transformation)*.

**Sheet region**

The *region* of a sheet determines the visible part of the drawing plane. The dimensions of the sheet region are given in *[sheet coordinates](#Sheet-coordinates)*. The location of the visible part of a sheet within its *parent sheet* is determined by a combination of the *[sheet transformation](#Sheet-transformation)* and the position of the sheet region.

For instance, assuming that the sheet region is a rectangle with its upper-left corner at *(2, 1)* and that the sheet transformation is a simple translation *(3, 2)*. Then the origin of the *[sheet coordinate system](#Sheet-coordinates)* is at the point *(3, 2)* within the *sheet coordinate system* of its *parent sheet*. The origin of its coordinate system is not visible, however, because the visible region has its upper-left corner at *(2, 1)* in the *sheet coordinate system*. Thus, the visible part will be a rectangle whose upper-left corner is at *(5, 3)* in the *sheet coordinate system* of the *parent sheet*.

Panes and gadgets alter the region and *sheet transformation* of the underlying sheets (panes and gadgets are special kinds of sheets) to obtain effects such as scrolling, zooming, coordinate system transformations, etc.

**Sheet transformation**

The transformation used to transform *[sheet coordinates](#Sheet-coordinates)* of a sheet to *sheet coordinates* of its *parent sheet*. The sheet transformation determines the position, shape, etc. of a sheet within the coordinate system of its parent.

Panes and gadgets alter the transformation and *[sheet region](#Sheet-region)* of the underlying sheets (panes and gadgets are special kinds of sheets) to obtain effects such as scrolling, zooming, coordinate system transformations, etc.

**Clipping region**

TODO

**User clipping region**

A *[clipping region](#Clipping-region)* used to limit the effect of *drawing functions*. The user *clipping region* is stored in the *[medium](#Medium)*. It can be altered either by updating the *medium*, or by passing a value for the `:clipping-region` *drawing option* to a *drawing function*.

**User coordinates**

The coordinate system of coordinates passed to the *drawing functions*.

**User transformation**

A transformation used to transform *[user coordinates](#User-coordinates)* into *[sheet coordinates](#Sheet-coordinates)*. The user transformation is stored in the *[medium](#Medium)*. It can be altered either by updating the *medium*, or by passing a value for the :transformation *drawing option* to a *drawing function*.

**Visible area**

TODO



### Development History

Mike McDonald started developing McCLIM in 1998. His initial objective was to be able to run the famous “address book” demo, and to distribute the first version when this demo ran. With this in mind, he worked “horizontally”, i.e., writing enough of the code for many of the chapters of the specification to be able to run the address book example. In particular, Mike wrote the code for chapters 15 (Extended Stream Output), 16 (Output Recording), and 28 (Application Frames), as well as the code for interactor panes. At the end of 1999, Mike got too busy with other projects, and nothing really moved.

Also in 1998, Gilbert Baumann started working “vertically”, writing a mostly-complete implementation of the chapters 3 (Regions) and 5 (Affine Transformations). At the end of 1999, he realized that he was not going to be able to finish the project by himself. He therefore posted his code to the free-CLIM mailing list. Gilbert’s code was distributed according to the GNU Lesser General Public License (LGPL).

Robert Strandh picked up the project in 2000, starting from Gilbert’s code and writing large parts of chapters 7 (Properties of Sheets) and 8 (Sheet Protocols) as well as parts of chapters 9 (Ports, Grafts, and Mirrored Sheets), 10 (Drawing Options), 11 (Text Styles), 12 (Graphics), and 13 (Drawing in Color).

In early 2000, Robert got in touch with Mike and eventually convinced him to distribute his code, also according to the LGPL. This was a major turning point for the project, as the code base was now sufficiently large that a number of small demos were actually running. Robert then spent a few months merging his code into that produced by Mike.

Arthur Lemmens wrote the initial version of the code for the gadgets in June of 2000.

Bordeaux students Iban Hatchondo and Julien Boninfante were hired by Robert for a 3-month summer project during the summer of 2000. Their objective was to get most of the pane protocols written (in particular space composition and space allocation) as well as some of the gadgets not already written by Arthur, in particular push buttons. The calculator demo was written to show the capabilities of their code.

In July of 2000, Robert invited Gilbert to the LSM-2000 meeting in Bordeaux (libre software meeting). This meeting is a gathering of developers of free software with the purpose of discussing strategy, planning future projects, starting new ones, and working on existing ones. The main result of this meeting was that Gilbert managed to merge his code for regions and transformations into the main code base written by Mike, Robert, Iban, and Julien. This was also a major step towards a final system. We now had one common code base, with a near-complete implementation of regions, transformations, sheet protocols, ports, grafts, graphics, mediums, panes, and gadgets.

Meanwhile, Mike was again able to work on the project, and during 2000 added much of the missing code for handling text interaction and scrolling. In particular, output recording could now be used to redisplay the contents of an interactor pane. Mike and Robert also worked together to make sure the manipulation of sheet transformations and sheet regions as part of scrolling and space-allocation respected the specification.

Robert had initially planned for Iban and Julien to work on McCLIM for their fifth-year student project starting late 2000 and continuing until end of march 2001. For reasons beyond his control, however, he was forced to suggest a different project. Thus, Iban and Julien, together with two other students, were assigned to work on Gsharp, an interactive score editor. Gsharp was the original reason for Robert to start working on CLIM as he needed a toolkit for writing a graphical user interface for Ghsarp. The lack of a freely-available version of a widely-accepted toolkit such as CLIM made him decide to give it a shot. Robert’s idea was to define the student project so that a maximum of code could be written as part of McCLIM. The result was a complete rewrite of the space-allocation and space-composition protocols, and many minor code snippets.

As part of the Gsharp project, Robert wrote the code for menu bars and for a large part of chapter 27 (Command Processing).

Julien was hired for six months (April to September of 2001) by Robert to make major progress on McCLIM. Julien’s first task was to create a large demo that showed many of the existing features of McCLIM (a “killer app”). It was decided to use Gsharp since Julien was already familiar with the application and since it was a sufficiently complicated application that most of the features would be tested. An additional advantage of a large application was to serve as a “smoke test” to run whenever substantial modifications to the code base had been made. As part of the Gsharp project, Julien first worked on adding the possibility of using images as button labels.

Early 2001, Robert had already written the beginning of a library for manipulating 2-dimensional images as part of McCLIM. A group of four fourth-year students (Gregory Bossard, Michel Cabot, Cyrille Dindart, Lionel Vergé) at the university of Bordeaux was assigned the task of writing efficient code for displaying such images subject to arbitrary affine transformations. This code would be the base for drawing all kinds of images such as icons and button labels, but also for an application for manipulating document images. The project lasted from January to May of 2001.

Another group of four fourth-year students (Loïc Lacomme, Nicolas Louis, Arnaud Rouanet, Lionel Salabartan) at the university of Bordeaux was assigned the task of writing a file-selector gadget presented as a tree of directories and files, and with the ability to open and close directories, to select files, etc. The project lasted from January to May of 2001.

One student in particular, Arnaud Rouanet started becoming interested in the rest of CLIM as well. During early 2001, he fixed several bugs and also added new code, in particular in the code for regions, graphics, and clx-mediums.

Arnaud and Lionel were hired by Robert for the summer of 2001 to work on several things. In particular, they worked on getting output recording to work and wrote CLIM-fig, a demo that shows how output recording is used. They also worked on various sheet protocols, and wrote the first version of the PostScript backend.

Alexey Dejneka joined the project in the summer of 2001. He wrote the code for table formatting, bordered output and continued to develop the PostScript output facility.

In the fall of 2001 Tim Moore became interested in the presentation type system. He implemented presentation type definition and presentation method dispatch. Wanting to see that work do something useful, he went on to implement present and accept methods, extended input streams, encapsulating streams, and the beginnings of input editing streams. In the spring of 2002 he wrote the core of Goatee, an Emacs-like editor. This is used to implement CLIM input editing.

Brian Spilsbury became involved towards the beginning of 2001. His motivation for getting involved was in order to have internationalization support. He quickly realized that the first step was to make SBCL and CMUCL support Unicode. He therefore worked to make that happen. So far (summer 2001) he has contributed a number of cosmetic fixes to McCLIM and also worked on a GTK-like gadget set. He finally started work to get the OpenGL backend operational.



## Concept index

|            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Jump to:   | [**A**](#Concept-index_cp_letter-A)   [**B**](#Concept-index_cp_letter-B)   [**C**](#Concept-index_cp_letter-C)   [**D**](#Concept-index_cp_letter-D)   [**E**](#Concept-index_cp_letter-E)   [**G**](#Concept-index_cp_letter-G)   [**I**](#Concept-index_cp_letter-I)   [**L**](#Concept-index_cp_letter-L)   [**M**](#Concept-index_cp_letter-M)   [**N**](#Concept-index_cp_letter-N)   [**O**](#Concept-index_cp_letter-O)   [**P**](#Concept-index_cp_letter-P)   [**R**](#Concept-index_cp_letter-R)   [**S**](#Concept-index_cp_letter-S)   [**T**](#Concept-index_cp_letter-T)   [**U**](#Concept-index_cp_letter-U)   [**V**](#Concept-index_cp_letter-V)   [**W**](#Concept-index_cp_letter-W)   |

[TABLE]

|            |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Jump to:   | [**A**](#Concept-index_cp_letter-A)   [**B**](#Concept-index_cp_letter-B)   [**C**](#Concept-index_cp_letter-C)   [**D**](#Concept-index_cp_letter-D)   [**E**](#Concept-index_cp_letter-E)   [**G**](#Concept-index_cp_letter-G)   [**I**](#Concept-index_cp_letter-I)   [**L**](#Concept-index_cp_letter-L)   [**M**](#Concept-index_cp_letter-M)   [**N**](#Concept-index_cp_letter-N)   [**O**](#Concept-index_cp_letter-O)   [**P**](#Concept-index_cp_letter-P)   [**R**](#Concept-index_cp_letter-R)   [**S**](#Concept-index_cp_letter-S)   [**T**](#Concept-index_cp_letter-T)   [**U**](#Concept-index_cp_letter-U)   [**V**](#Concept-index_cp_letter-V)   [**W**](#Concept-index_cp_letter-W)   |



## Function and macro and variable and type index

[TABLE]

[TABLE]

[TABLE]


#### Footnotes

##### [(1)](#DOCF1)

In the specification, there is no example of the use of this option to `make-pane` or to the equivalent keywords in the `:panes` section of `define-application-frame`. There is however one instance where the `:scroll-bars` option is mention for pane creation. We consider this to be an error in the specification.

##### [(2)](#DOCF2)

Some authors use the term *business logic* instead of *model*. Both words refer to the representation of the intrinsic purpose of the application, as opposed to superficial characteristics such as how objects are physically presented to the user.

##### [(3)](#DOCF3)

Unless the implementation supports package locks and the symbol’s home package is locked

##### [(4)](#DOCF4)

There can be more than one occurrence. For example, the class `class` occurs twice in the following `list`: `(list (find-class 'class) (find-class 'class))`.
