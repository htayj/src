# A Presentation Manager Based on Application Semantics

Authors: Scott McKay, William York, Michael McMahon
Source: local copy `/home/tay/Downloads/73660.73678.pdf`.
Conversion note: extracted with Poppler `pdftotext -raw` from a two-column ACM paper; figure text may be approximate.

## Abstract

We describe a system for associating the user interface
entities of an application with their underlying semantic
objects. The associations are classified by arranging the
user interface entities in a type lattice in an object-oriented
fashion. The interactive behavior of the application is
described by defining application operations in terms of
methods on the types in the type lattice, This scheme
replaces the usual "active region" interaction model, and
allows application interfaces to be specified directly in
terms of the objects of the application itself. We discuss
the benefits of this systemand someof the difficulties we
encountered.

## Introduction

The function of a user interface is to display application
information to the user in a clear, meaningful way and to
provide ameansof interacting with the application via that
information, However, most existing UIMS's provide
only a very weak coupling between the application's
semanticsand the visual entities with which the user inter-
acts. For example, many systemsprovide the ability to cut
and pastedata between applications, but only by reducing
the datato its lowest common denominator, typically text.
The lack in other systems of a good framework in
which to connect application objects to their representation
on the screenis hard on application programmers,because
they must write application code at a relatively low level
of abstraction,typically in termsof events(such as"mouse
enters" and "button press") and callbacks (see[7], [lo],
and [ll]). It is hard on the user, becauseit is often dif-
ficult for the application programmer to provide userinter-
face consistency and good feedback. It is even hard on the
Permission to copy without fee all or part of this materialis
granted provided that the copies are not madeor distributed for
direct commercial advantage, the ACM copyrightnoticeand the
title of the publication and its date appear, and notice is given that
copying is by permission of the Association for Computing
Machinery. To copy otherwise, or to republish, requires a fee
and/or specific permission.
@ 1989 ACM O-89791-335-3/89/001 l/O1 41 $1 SO
programmer developing the UIMS itself. By using a
model that is more closely coupled with the application, it
is simple to provide a consistent user interface and such
features ascontext-sensitive feedback and documentation,
and the application programmer can write the user inter-
face in terms of high-level objects rather than in terms of
events.
By preserving the link between the user interface en-
tities and their underlying application objects, the opera-
tions of an application can be performed directly on the
semantically interesting componentsof the application (see
121,[121, and [IS]). There would then be no need to
"squeeze" the information through a textual representation
that then needs to be reparsed to get back the original
object. (The "live copy/paste" ideas in release 7.0 of the
Macintosh (asdescribedin 111)addressthis issueaswell.)

## Motivation and Design

Wishing to addressthese issues, we set out to provide a
richer framework for connecting user interface entities
with the underlying semantically significant application
objects they represent, while at the same time preserving
the advantagesof maintaining a separation between the
code that implements the application's algorithms and the
code that implements its user interface. We replaced the
ubiquitous "active region" interaction model (see[7]) with
a model that recognizes that each entity displayed on the
screen is simply a visual representation of some applica-
tion object, and that the user interface should be con-
structed in terms of operations on the application objects,
not on the UIMS's data structures. In this model the ap-
plication remains in control of the semantics of the user
interface, but the details of the interactions, such as han-
dling mouse motion and mouse clicks, are managedcom-
pletely by the system.
Any application has its own set of user interface en-
tities that arise naturally from the domain of the applica-
tion. For example, an ECAD editor has device objects,
such as wires, resistors, capacitors, and so on, each of
which may have an associateduser interface entity. The
application must operateon the objects themselves,but the
userinteracts with the user interface entities. It is therefore
necessaryfor the application to associate with each sig-
nificant kind of application object a kind of user interface
entity. Our system takescare of maintaining the associa-
tion between application objects and the entities that
Pemkiou to copy without fee all or part of this material is granted provided that the copies are not made or distributed for direct commercial
advantage, the ACM copyright notice and the title of the publication and its date appear, and notice is given that copying is by permission of the
Association for Computing Machinery. To copy otherwise, or to republish, requires a fee and/or specific permission.

represent those objects.
Figure 1 shows the relationship between the internal
andexternal representationof an application object andthe
input and output primitives (accept and present) which
connect therepresentationsof theseobjects.
Application
/^'ct-t,
accept pruuat
y J
Presentation

#### Figure 1. The relationship between an application object

and its displayed representation.
The system we describe below, called Dynamic Win-
dows, is part of Genera, the operating system used on
Symbolics computers.

### Semantic Types for Application Objects

One of the pieces missing from previous UIMS 's hasbeen
the ability to specify directly the user interface behavior of,
and relationships among, the application's user interface
entities. We introduced a framework, in the form of a
lattice of types, for specifying the behavior and relation-
ships.
Each user interface object is given apresentation type,
which is the semantic type of the object to be shown (that
is, presented)to the user. A presentation type is defined by
the application programmer for each object that par-
ticipates in the user interface for an application. Resen-
tation types form a lattice based on standard type-
inheritance mechanisms such as those found in C++,
SmallTalk, Lisp Flavors, and the Common Lisp Object
System (CLOS) (see[3], [4], [14], [15], and [17]). This
meansthat one presentation type may be defined asa sub-
type of one or more other types, sharing the basic charac-
teristics of its supertype( while specializing other
aspects of its behavior. For example, an application
programmer writing an ECAD editor might define a
general presentation type for devices, upon which they
could build more specialized devices such asresistor and
transistor.
The semanticsof an application can be defined in terms
of the relationships specified in the presentation type lat-
tice. An operation that applies to a broad category of
objects can be defined on a common ancestor supertype,
while more specific operations can be defined directly on
the appropriate subtreeof the type lattice. For example, in
anECAD editor an operation such as"move device" might
apply to all the device entities on the screen, but the
"change capacitance" operation clearly applies only to
capacitors.
We realized several kinds of advantages from using
presentation types. First, because the presentation type
system is based on the inheritance mechanisms found in
ordinary object-oriented languages, application program-
mers have a familiar framework for declaring the relation-
ships among the application objects. By placing each user
interface entity in a type lattice, the application program-
mer can more easily reason about the behavior of the en-
tities. Further, and more profoundly, user interface consis-
tency becomesa by-product of the application's structure,
rather than an artifact of graphic design. Such consistency
provides a user interface that can be more easily under-
stoodby the end-userof an application (see[63).
The presentation type lattice is richer than Common
Lisp's basic data type lattice. One difference between
presentation types and "normal" Lisp types is that presen-
tation types have user interface-specific methods defined
on them, such as methods that are responsible for parsing
or printing an object of the type. Another difference is that
the presentation type for an object may not be directly
related to the primitive data type usedby the application to
implement the object data. For example, while an applica-
tion may implement anIS0 time object as a32-bit integer,
the IS0 time presentation type really has nothing to do
with 32-bit integers.

### Output of Typed Objects

An application needsto display its objects to a user in such
a way that it can track the association between the dis-
played representationsof the objects and the objects them-
selves. Dynamic Windows maintains this association in
data structures called presentations, which are the basic
units of typed output.
A presentation is composed of three parts: the presen-
tation type, the underlying application object, and the dis-
played representation of the object. This structure as-
sociatesthe application object with its displayed represen-
tation, and also associatesthe object with a presentation
wl=
Typed output revolves around two things: creating a
presentation data structure and creating the display on the
screen. Dynamic Windows provides a very general primi-
tive for doing typed output, with-output-as-presentation,
which provides a mechanism for associating an application
object and its presentation type with an arbitrary piece of
textual or graphical output. The application specifies the
object and its presentation type, and then executes code
that produces output. The system then creates a presen-
tation that associatesthe output with the specified object
and presentation type; this presentation is stored in the
output history of the window on which the output is done.
For example, when an ECAD editor displayed a clraw-
ing of a circuit, it would create a presentation for each
object in the circuit, which linked each object with its dis-
play on the screen. Figure 2 shows an example of the kind
of application code (in Lisp) that would be used to draw a
resistor as part of a circuit diagram. The code creates a
presentation that contains the resistor object, the type of
the object (resistor), and a pointer to the displayed
representationof the resistor object, which is drawn by the
application's drawing function, draw-device.

(with-output-as-presentation
(:object Rl
:type 'resistor)
(draw-device Rl x-pos y-pos))
presentation
2.2-K-resistor
RESISTOR
displayed representation
"EC

#### Figure 2. The presentation produced by some application

code.
A more convenient primitive for doing typed output is
present, which establishesawith-output-as-presentation
context for the specified presentation type, and then in-
vokes the method for displaying an object of that type.
This allows the application programmer to display an ob-
ject by simply specifying the object and its presentation
type. For example, (present #<RESISTOR . ..>
'resistor) creates a presentation whose object is the
resistor object #<RESISTOR . . .>, whose presentation
type is resistor, and whose output on the screenis a draw-
i?g of the resistor. (In fact, present could be used in
Figure 2 if the X and Y coordinates for a device object
were attributes of the object itself.)
The display method for a presentation type, called its
printer, registers a standard set of visual appearancesfor
that type. The printer for a type takes an object of that
type and displays someoutput that representsthe object. It
may define both graphical and textual representationsfor
that type. Printers may be inherited from a supertype of
the presentationtype in the standardobject-oriented way.
Dynamic Windows supports multiple views (asin [3]):
a single presentation can have different appearancesat dif-
ferent times. For example, a file namemight be displayed
aseither a text string or asa file-folder shapedicon. Since
presentations and the application objects that they
represent are separateobjects, the sameapplication object
can bedisplayed in multiple placesat the sametime.

### Specification of Typed Objects as Input

Applications should interact with the user in terms of the
application's objects. Since the systemtracks the associa-
tion between the application objects and their displayed
representationson the screen,it remains only to provide a
way for the user to specify an object as input to the ap-
plication via the displayed representationof the object.
Whenever an application requests input of a certain
presentation type from the user, the user can satisfy that
request by selecting a presentation of that type with the
mouse. The presentation type that the application is re-
questing is called the input context. The system automati-
cally makesall presentationswhose type matchesthe input
context eligible as mouse-selectableinput, and highlights
eligible objects when the mouse is pointing at them. Fur-
thermore, presentationswhose type doesnot match the in-
put context arenot eligible. This context-basedselectivity
and highlighting provides feedback that assiststhe user in
determining what user interface entities are selectable at
any point in time (see[5]).
Any presentation whose type is a subtype of the input
context is eligible asinput. If an ECAD editor requestsa
device as input, any presentation whose type is basedon
the general device presentation type will be eligible, but if
the application requestsa transistor, only the transistorsare
eligible and not the whole set of devices. When reading
input, the output view does not matter: only the presen-
tation type is significant. For example, the visual represen-
tation of a file name might be a text string or a file-folder
icon, but that visual representation has no bearing on
whether the underlying object is or is not afile name.
The primitive for doing typed input is accept, which
establishes the desired presentation type asthe input con-
text and then invokes the method for reading an object of
that type. This allows the application programmer to re-
quest an object for input by simply specifying the desired
presentation type. For example, (accept r resistor)
can beusedto requestaresistor device asinput.
It is also useful for an application user to be able to
specify objects by name from the keyboard. The method
for a reading an object of a particular presentation type
from the keyboard is called the purser. A type's parser
specifiesits input syntax, sothat objectsof that type canbe
read from the keyboard. The parser for a type may be
inherited from a supertype of the type, and need not be
defined at all.
Since accept acts as the dual of present, it is usually
desirable for the parser (if there is one) to be the dual of
the printer: the printer, when given an object, should
produce a text string which, when parsed by the parser,
producesthe original object.
When accept invokes theparserfor apresentationtype,
it arranges to handle mouse-driven input as well as
keyboard-driven input. In the casewhere the user chooses
to use the mouseto select the input, the parseris bypassed
entirely.
The combination of both typed output and input con-
texts, and textual printers and parsers allows the creation
of flexible mixed-mode user interfaces: users can fill in
dialog boxes or construct command lines via an arbitrary,
user-chosencombination of mouseclicks andkeyboard in-
put (see[81).

### Nested Presentations and Contexts

In addition to creating presentation types by defining com-
pletely new types or specializing existing ones, the
programmer may build compound presentation types. For
example, a Cartesian coordinate is a pair of real numbers;
reading one from the keyboard might consist of reading a

floating-point number, discarding an intervening comma,
andthen reading another floating-point number. Printing a
Cartesian coordinate object would consist of printing the
two floating-point numbers separatedby a comma. Note
that this sort of aggregation is not an inheritance
mechanism:Cartesian coordinates areneither subtypesnor
supertypesof the floating-point type.
The most.important compound type is the command
presentation type, which is composedof a commandname
followed by the command's operands. This type is the
building block for interacting with an application. We
shall discussthis in more detail later.
Frequently, a presentation may contain other presen-
tations inside itself, or a single user interface entity may
representmore than one underlying application object. In
order to support this, presentations may be nested. For
example, in an ECAD editor, a device may be built up out
of several other more basic devices connected by some
wires. The device itself is a presentation, and the com-
ponentscontained in it arealsopresentations.
Input contexts may also be nested. In the casewhere
presentations are nested, the input context determines
which of the multiple presentationsshould bechosenwhen
the user tries to select it with the mouse. For example,
when an ECAD editor wishes to input a list of devices, the
input context would be (sequence device). The parserfor
the sequence type recursively establishesan input context
for device. While in the inner context, presentations of
both devices and sequencesof devices will be eligible as
input.

### Gestures: Using the Mouse to Select Input

A gesture is a physical action performed by the user. In
particular, a mouse gesture is an action performed using
the mouse, such as clicking a button on the mouse. Ges-
tures areusedto provide a physical connection between an
application operation and presentations having a particular
presentationtype.
Dynamic Windows provides a facility called logical
gestures, which allows a physical gesture to be given a
name. For example, by default, the logical gesturecalled
:select is mappedto the physical gestureMouse-Left (that
is, "click the left-hand mouse button"). Application
programmers should define operations on logical gestures
instead of physical gestures,so that the mapping between
logical gestures and physical mouse gestures can be
tailored by the end-userif desired.
Dynamic Windows provides a standard set of logical
gestureswhich, by convention, are usedin particular ways
by applications. The :select gesture is usually used to
select an operand as is. The :describe gesture (which is
mapped to Mouse-Middle by default) often has context-
sensitive help associated with it. The :menu gesture
(which is mapped to Mouse-Right by default) calls up a
menu which contains the current set of applicable opera-
tions.

### Type Coercion

Whenever an application is requesting input of a specific
presentation type, presentationshaving that type (or any of
its subtypes)may be selectedwith the mouse. However, it
is often useful to be able to select a presentation that has
another type which, although not strictly related by the
type definitions, hassomesort of a conceptual relationship
or can be derived from the other. Dynamic Windows
provides the ability to coercean object having one presen-
tation type to an object of another type. For example, if an
ECAD editor is requesting aresistancevalue (in ohms), we
might wish to satisfy that request by selecting a resistor
with the mouseand extracting the resistancein ohms from
the resistor.
It is not necessaryto have translators that translatefrom
a type to any of its subtypes, since this is handled
automatically by the type inheritance mechanism.
All coercions are explicitly defined by the application
programmer. The code that implements coercion is called
a translator. A translator can be thought of as a method
that specializes on a presentation type and a mouse ges-
ture, and returns an object of another presentation type as
its output. The application programmer specifies at trans-
lator definition time afrom type, a to type, and a gesture.
The following code implements a translator named
resistor-to-ohms that extracts the resistancein ohms from
a resistor object when the application is requesting a resis-
tance as input. and the user usesthe :select gesture on the
presentation of aresistor object:
(define-presentation-translator
resistor-to-ohms
(resistor resistance-in-ohms
:gesture :select)
(resistor)
(resistor-resistance-in-ohms resistor))
Coercion is only available to mouse-driven input, be-
causeinput from the keyboard doesnot have any particular
presentation type associatedwith it. In effect, the presen-
tation type of input from the keyboard is the sametype as
the input context.
Dynamic Windows provides a special kind of trans-
lator, called an action, that does not return a value but
instead executes a side-effect. After the side-effect has
beenexecuted, the pending input requestremains in effect.
An example of an action that is context-sensitive (and
whose behavior is mediated by the application) is one that
might display a menu of possible completions while an
application is requesting input of some presentation type.
An example of actions that are context-independent (and
are provided by the system as a standard service) are the
textual cut andpasteactions.

### Selection of Translators

The set of applicable translators is determined by search-
ing all of the known translators, matching thefrom type of
each translator against the type of the presentation (what
the mouse is pointing at), matching the to type of each
translator against the input context (what the application is
requesting), and matching eachtranslator's gestureagainst
the user's gesture.
Rememberthat Dynamic Windows doesnot simply do
an exact type match: the presentation's type can be a sub-
type of the translator'sfrom type, and the input context can
be a supertype of the translator's to type. Nested presen-
tations and nested input contexts make the matching algo-
rithm more complex. If there arenestedinput contexts, the
systemsearchesoutward from the innermost input context
in order to find a context which hasat least one applicable

handler. If there are nested presentations, the system
choosesthe innermost presentation which has at least one
applicable translator.
The selection of translators can be refined by meansof
a tester that is called once a translator has passedthe type
discrimination tests. The tester serves as a filter, letting
the application contribute more directly to the choice of
translators.
Selecting a translator can also depend on the object
returned by the translator. The input context can be
"reduced" to a supertype combined with a predicate that
tests the object returned by the translator. For example,
consider a translator whose to type is command, and an
input context of (command :command-table "Global").
The translator could return a command in any command
table, but the input context only acceptscommandsin the
command table named "Global". Since command is a
supertypeof (command :command-table "Global") (not
a subtype), the translator would not ordinarily be selected.
However, since the input context "reduces" to command
along with a predicate that tests whether the command is
available in the "Global" command table, the translator
tentatively matchesand its body is executed. If the object
returned by the translator satisfies the predicate, then the
translator will be selected,otherwise it is ignored.
The algorithm for selecting a translator canresult in the
selection of many applicable translators. It is the respon-
sibility of the application programmer to choose the ges-
tures for the various translators in such a way that the
number of "collisions" is kept to a minimum. However,
such collisions can still occur, so Dynamic Windows
provides a priority mechanism that allows the application
programmer to decide which of several conflicting trans-
lators should be selected. An application user may also
use the :menu gesture at any time to get a menu of all of
the translatorswhich apply at any given moment.
Because many translators might be applicable at any
given time, Dynamic Windows provides additional feed-
back in the form of two "mouse documentation" lines at
the bottom of the screenthat are used to display what the
current set of applicable translators are, what they do, and
what physical mousegesturesthey areassignedto.

### Application Architecture

An application is composed of four major parts: the ob-
jects in the application and their current state,the code that
implements the application itself, the layout of the applica-
tion (screen real estate), and the operations that are in-
voked by the uservia commands. This paper concentrates
on the part of the application relevant to its user interface:
the presentation types of the application's objects and the
user-invokable operations on thoseobjects.
In general, an application interacts with auser by read-
ing a command and its operands from the user. It then
executesthe operation specified by the command and up-
dates its internal data structures. Finally, the application
updatesthe display on the screen. The code which imple-
ments this structure is called the top-level command loop
of the application. For example, in an ECAD editor, the
user may specify that he or she wishes to change the
capacitance of a capacitor. The ECAD editor reads the
command's operands,and then executescode that changes
the state of the capacitor. After doing so, it updates the
display of the circuit drawing to reflect the new
capacitance.
To assistthe application programmer in implementing
this, Dynamic Windows provides a generic top-level com-
mand loop which is responsible for reading application
commands, executing the code that implements the com-
mands, and then calling an application-specific redisplay
function to updatethe display.
Commands: the Interface to an Application's
Operations
The interface to aparticular application operation is called
a command. The definition of a command specifies its
operands and a small body of code that calls the applica-
tion to perform the operation. Commands are stored in a
per-application structure called acommandtable.
The programmer defines an application's commandsby
specifying for eachcommand the presentation type of each
operand and a small body of code which calls the applica-
tion to perform the operation. The definition of a com-
mand can be thought of asagrammar which specifies how
a command "sentence" is constructed from a "verb" (the
actual command name, such as "Move Device" in a
graphic editor), "nouns" (the objects on which the com-
mand operates, such as the devices in an ECAD editor),
andmodifiers. The body of the command, and the applica-
tion code which implements an operation, need not know
anything about how the operands of the command were
read; the systemguaranteesthat all the parameterspassed
to the application are objects of the specified type. This
makes it simple to separatethe interface of an operation
from the algorithms that implement the operation.
Dynamic Windows provides a standard command
reader (called the command processor) that reads an in-
vocation of a command by sequentially calling accept for
a command name and then for each operand. Since each
operand is read with accept, the user can supply operands
by using either the keyboard or the mouse. The command
processor parses its input interactively, unlike traditional
systemssuchasUnix, which parsethe input only when the
user types an end-of-line character. This interactive pars-
ing is the basis for context-sensitive prompting and help
facilities.
The commandprocessorprovides somedefault ways to
read commands (for example, textual command lines,
command menus, and dialogs) and is also responsible for
executing commands once they have been read. An ap-
plication user can choose which way he or she wishes to
supply commands. Furthermore, an application program-
mer can change or extend the ways in which command
sentencesare read without having to modify the applica-
tion itself. For example, Genera's Graphic Editor has a
direct-manipulation user interface style for many of its
common operations, such asshaping or moving a graphical
entity. The direct-manipulation style was implemented in
termsof ordinary translators.
Note that the concept of typed operandssupportsother
styles of interactions besidesthe reading of commands. In
particular, dialogs can also be specified in terms of the
types of the objects to be read. The details of laying out

the dialog aremanagedby the system,unlessthe program-
mer specifiesotherwise.
The command presentation type is a compound type:
the command name and its operands are read via succes-
sive calls to accept. Sinceevery invocation of a command
is an instance of the command presentation type and the
top-level loop of the application uses accept to read
command objects, the application programmer can write
translators that translate from some application-specific
presentation type to an application command. Using such
translators, the application programmer can build a user
interface in which mouse gesturesact ascontext-sensitive
commands. For example, the following translator causes
the "Change Resistance" command to be executed when
the userclicks on apresentation whosetype is resistor.
(define-presentation-translator
change-resistance command
(resistor
:gesture :modify)
(resistor)
'(corn-change-resistance ,resistor))

### Building an Application

By breaking down the interface of an application into
(typed) application objects and a setof operations on those
objects, we are provided with a natural sequence for
developing the user interface for an application. First the
application programmer defines the presentation types that
describe the significant objects of the application. Then
the programmer defines the command interfaces to the
operations on objects of those types. Finally, the prograrn-
mer defines sometranslators that associatemousegestures
with commands on those objects. The commands and
translators act as the links from a presentation to the ap-
plication operations defined on the object that is
represented by the presentation. The top-level command
loop supplied by Dynamic Windows is responsible for
both reading and executing the commands. The applica-
tion itself is responsible only for implementing the opera-
tions for which the commands are the interface, and for
displaying the user interface entities.

### Design Details

In the above description of Dynamic Windows, we have
omitted some details and simplified many things for pur-
poses of clarity. In fact, what we implemented is richer
and more complete than the description indicates.

### Further Specialization of Presentation Types

The semantics of a presentation type can be refined via
parameters to the type, called data arguments. The data
arguments for a type affect what objects are instances of
the presentation type. For example, the integer presen-
tation type has as data arguments an upper and a lower
bound. The syntax (that is, the visual appearance)of a
presentation type can be refined via parameters to the
type's methods, called presentation arguments. For ex-
ample, the integer presentation has as presentation ar-
gument the radix in which it should be read and printed.
Thus, a presentation type to specify the integers between
zero and ten (inclusive) that should be read and printed in
base2is ((integer 0 10) :base 2).
A simple form of type restriction is supported via the
special and presentation type, which is usedin conjunction
with a satisfies clause. For example, the type (and in-
teger (satisfies oddp)) specifies the family of all
odd integers.
A simple form of multiple inheritance is supported via
the special or presentation type. This is particularly useful
in specifying types that include a set of special tokens in
addition to the basic type. For instance, the type (or
integer (member :a11 :none) ) specifies a type that
includes the two tokens "All" and "None" in addition to all
of the integers.

### Further Presentation Type Operations

The application programmer can supply definitions for a
number of standardmethodson presentation types in order
to tailor the behavior of the type. We have already men-
tioned the parser and the printer. Other methods include
the describer, which provides a description of the type for
use in prompts and help messages,for example, "an in-
teger between one and ten". The describer is used to sup-
port Dynamic Windows' context-sensitive help facility.
Another method describes how items of this type are dis-
played in a dialog box. For example, the enumeration type
(called member) might be displayed as Macintosh-style
radio push-buttons, or the boolean type might bedisplayed
asacheck-box.
The typed output component of Dynamic Windows al-
lows a set of viewspecs to be associated with a presen-
tation. These viewspecs provide advice to the printer on
how a presentation should be displayed, and can be
changed at the behest of the application user. For ex-
ample, the viewspecs for a file'directory listing include a
sorting predicate, such as whether the lines in the listing
should be ordered alphabetically by file name or by the
file's creation date. This sorting predicate can be changed
by a menu. A standardtranslator provided by the system
is one that expands the viewspecs of a presentation in or-
der to show more or lessdetail.
Note that presentation argumentsdiffer from viewspecs
in that presentation argumentsarespecified by the applica-
tion programmer in the application's code, but viewspecs
can be changedby the application user in order to alter the
appearanceof apresentation.

### Application-Building Aids

The typed input facility in Dynamic Windows provides a
number of tools for writing parsers, such as a general-
purpose completion facility. It also provides tools for
tailoring context-sensitive help. For example, the defini-
tions of commandsand translators may specify code which
provides documentation, prompting, and feedback in the
mousedocumentation lines.
Many prepackagedpresentation types are provided by
the system, such as integer, string, boolean, pathname,the
member enumeration type, and so on. The sequence type
allows the specification of a sequenceof any other presen-
tation types.
Genera itself provides tools for laying out entire ap-
plications .

### Experiences and Evaluation

### Implementation Details and Problems

Becausewe implemented Dynamic Windows in Common
Lisp, we chose to use the Common Lisp type system asa
model for the presentation type system. Ideally, the
presentation type system would be simply an extension of
the Common Lisp type system,but unfortunately we could
not implement it this way for anumber of reasons.
Since CLOS did not exist when we implemented
Dynamic Windows, we used Flavors instead. Unfor-
tunately, the Flavors system does not allow defining
methodson primitive types and structures(such asintegers
and strings). Since presentation type methodssuch aspar-
sers and printer require this, an extension to the Flavors
type system had to be implemented. Since CLOS will
allow class methods to be defined on primitive types and
structures,this extension will no longer benecessary.
Neither Flavors nor CLOS provides any way to refine
basic types, as is done by presentation type data ar-
guments. Another extension to the type systemwasneces-
sary to support this.
The handling of dataandpresentation argumentsunfor-
tunately cannot be handled at compile-time. For the sake
of efficiency, the system maintains a cache of how data
argumentsmight affect presentation type inheritance. Fur-
thermore, the selection of application translators for a
given presentation type in a given input context can be
very expensive, so the systemmaintains a cachefor this as
well. However, there is no advertisedconvention for when
to clear these caches, which can result in mysterious
problems.
In Dynamic Windows, translators aredefined globally.
When there are many translators, the selection of ap-
plicable translators can be time-consuming. Storing an
application's translatorsin its commandtable could greatly
reduce the amount of time required to choose applicable
translators.
Since we designed Dynamic Windows to assist in the
development of programs written in Lisp, it provides a
feature that allows the Lisp data-type of the object in a
presentation to be treated as though it is the presentation
type. This allows many translators to be useful on presen-
tations of "raw" Lisp objects, but at the cost of greatly
increasing the number of translators that might be con-
sidered in any input context. This increasecausesnotice-
ableperformanceproblems.
Right now, the parsers and printers for compound
presentation types are specified procedurally rather than
declaratively. Furthermore, since theparserandthe printer
are duals, the procedures that implement the parser and
printer for a compound type usually parallel each other
very closely. In practice, this has proved to be annoying
and error-prone. A better schemewould be to specify the
syntax of compound presentation types with some sort of
simple grammar.
The support for multiple views could be made much
more powerful by allowing a separatespecification for a
graphical view (if there is one) and a textual view (if there
is one). The system could then decide which view to use
based on the type of output device or the context of the
application. Right now, there is no way for application
users to specify a general preference for the kind of view
they wish to see.
The usersof Dynamic Windows have cited the lack of
support for graphical input facilities to match the support
for graphical output. For example, the system could
provide a more complete set of "gadgets" such as dials,
gauges,andsliders. In fact, gadgetscould be implemented
asaform of multiple views.

### Observations

There are two complementary observations one might
makeregarding Dynamic Windows asit presently stands.
l "The Unix observation": In an application that uses a
command line interface style where all objects have tex-
tual representations,there is little need for the ability to
click on a presentation to recover its exact semantics.
With acarefully designedsetof cut andpastecommands,
one canjust as well use the mouse to click on text and
have a parser recover the semantics. In fact, Dynamic
Windows doessupport textual cutting and pasting, but it
is much more powerful to sharehigh-level datastructures
amongapplications. Having to resort to cutting andpast-
ing alsomeansthat application writers must write parsers
and printers that might otherwise be unnecessary. Also,
it may not even be possible to recover the exact seman-
tics of an object from a textual representation.
l "The Macintosh observation": In Genera, many applica-
tions associatepresentation semanticsonly with piecesof
text (asopposedto graphics or icons). This gives those
applications an archaic appearancewhen compared to
systemssuch asthe Macintosh. This bias is not inhenznt
to Dynamic Windows, but is an artifact of the ageof the
applications, many of which were written before this sys-
tem was in place. In fact, Dynamic Windows is ideally
suited for graphical user interfaces becauseit is possible
for the user to request an operation on an exact applica-
tion object without having to resort to specifying the ob-
ject by sometextual representation.

### Comparison with Conventional Toolkits

Presentation types are not like conventional user interface
widget toolkits (see[7] and [16]). Conventional widgets
are intended as layout tools, and to insulate the applica-
tions programmer from having to deal directly with the
underlying window system. Such widgets operate at a
fairly low level: the application yields control to the widget
manager,which waits for events (such as "mouse enters",
"mouse leaves", "button press", and so on) and communi-
cates with the applications in terms of those events by
using callbacks or resources. All the semanticsof the ap-
plication are implemented via the callbacks; the widgets
themselves are usually careful not to supply any sort of
semantics.
In Dynamic Windows, the top-level command loop of
the application remains in control andrequestseventsfrom
the system. These events take the form of actual applica-
tion objects and commands. Events such as "mouse
enters" and "button press" arehidden from the application,
unless the application explicitly requests that level of
detail.
Presentationtypes do not act asa framework for laying
out the overall appearanceof the user interface (such asin
[9] or [13]). There are higher-level tools in Dynamic

Windows to indicate that the application programmer
wishes to display, for example, a menu or a dialog, but the
actual layout of the menu or dialog is typically managed
automatically. Genera provides other tools for laying out
the overall appearanceof an entire application.

## Conclusions

When we designed Dynamic Windows, we set out to
createa systemwhich would allow programmersto devel-
op good user interfaces for applications, in which the inter-
actions with the user interface could be describe in terms
of the objects in the applications using the object-oriented
paradigms with which we were familiar. We wanted to
free the application programmer from the burden of writ-
ing the user interface in very low-level terms, so that the
programmer would be free to concentrate of the applica-
tion itself or would be able to experiment with alternate
user interface styles without having to rewrite any of the
application. We wanted the resulting applications to have
consistent, predictable, robust user interfaces. In these
goals, we succeeded. Unfortunately, the performance
goals we set for ourselves have never been completely
met: the performance of Dynamic Windows is good, but
not asgood asthe performance provided by more conven-
tional user interface toolkits. We also wanted to provide
programmers a good setof user interface design tools, but
thesetools have yet to cometo full fruition.
In practice, Dynamic Windows has proved to be a
powerful and flexible tool for easily constructing applica-
tions and their interfaces. For example, it was used to
construct the interface to Genera's hypertext documen-
tation system, Concordia [19]. The third author built
Genera's font editor and graphical editor (which uses a
hybrid direct-manipulation user interface style) using it. A
graphically oriented interface for Genera's debugger is
also built on Dynamic Windows. The first author built a
simple direct-manipulation business graphics package
(including spreadsheets,charts, and graphs) using this sys-
tem.
The original version of Dynamic Windows was
developed in Symbolics Common Lisp during 1986 and
1987, an initial version was delivered to Symbolics cus-
tomers in 1987, and an improved version was releasedin
early 1988. The development of a portable Common Lisp
successorto Dynamic Windows based on CLOS, called
CLIM (Common Lisp Interface Manager), is now in
progress. The design of CLlM builds upon the ex-
periences gained with Dynamic Windows, and addresses
the problems we have discovered in Dynamic Windows.
Applications written using CLIM will be portable across
hosts running various window systems,such asX, Quick-
Draw, andMicrosoft Windows.

## Acknowledgments

The authors would like to thank Dave Moon, Dennis
Doughty and John Aspinall for excellent review com-
ments. Jan Walker, Polle Zellweger, and Jock Mackinlay
provided crucial guidance on how to structure the paper to
makeit readable.
The design and implementation of Dynamic Windows
was a large joint effort that could not have been done
without the contributions of many engineers at Symbolics;
many thanks to all of them.

## References

1. SystemSofhvareRelease7.0 -Data Publication
Manager. SystemSoftware Release7.0 (preliminary) edi-
tion, Apple Computer, Inc., 1989.
2. E. C. Ciccarelli. PresentationBasedUser Interfaces.
Tech. Rept. Al-TR 794, MIT A.I. Laboratory, 1984.
3. A. Goldberg andD. Robson. SmallTalk-80: theLan-
guage and its Implementation. Addison-Wesley, 1983.
4. S.Keene. Object Oriented Programming in Common
Lisp. Addison-Wesley, 1989.
5. H. Lieberman. "There's more to Menu Systemsthan
Meets the Eye". Computer Graphics: SIGGRAPH 1985
ConferenceProceedings, (July 1985),pp. 181-189.
6, H. Lieberman. Using Prototypical Objects to Imple-
ment SharedBehavior in Object-Oriented Systems. Proc.
OOPSLA 1986,ACM, 1986.
7. J. McCormack, et al.. X Toolkit Zntrinsics - C Lan-
guageInterface. MIT, 1988.
8. M. McMahon. A Practical Systemfor Managing
Mixed-mode User Interfaces. Unpublished. Forthcoming.
9. B. A. Myers. "Creating Interaction Techniques by
Demonstration". IEEE Computer Graphics and Applica-
tions , (September1987),pp. 51-60.
10. A. Nye. Xlib Programming Manual. O'Reilly & As-
sociates,1988.
11. A. Nye (editor). Xlib ReferenceManual. O'Reilly &
Associates, 1988.
12. D. Olsen. "ACM SIGGraph Workshop on Software
Tools for User-Interface Management". Computer
Graphics, (April 1987),pp. 71-147.
13. K. J. Schmucker. "MacApp: An Application
Framework". Byte, (August 1986),pp. 189-193.
14. G. L. Steele,Jr.. CommonLisp: theLanguage. Digi-
tal Press,1984.
15. B. Stroustrup. The C+ + Programming Language.
Addison-Wesley, 1986.
16. R. Swick, et al.. X Toolkit Athena Widgets- C Lan-
guageInterface. MIT, 1988.
17. Symbolics CommonLisp -Language Concepts.
Genera7.0 edition, Symbolics, Inc., 1986.
18. P. Szekely. "Modular Implementation of
Presentations". Proc. SIGCHI+GI 1987, (April 1987),pp.
235-240.
19. J.Walker. "Supporting Documentation Development
with Concordia". IEEE Computer, (January 1988),pp.
48-59.
