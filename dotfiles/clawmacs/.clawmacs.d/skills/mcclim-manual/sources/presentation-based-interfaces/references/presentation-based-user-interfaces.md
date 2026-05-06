# Presentation Based User Interfaces

Author: Eugene C. Ciccarelli IV
Source: local copy `/home/tay/Downloads/presentation-user-interfaces.pdf`; original public identifier AI-TR-794 / ADA150311.
Conversion note: extracted with Poppler `pdftotext -raw`; the source PDF is an OCR scan, so some OCR noise remains.

Technical Report 794
Presentation
Based User
Lf Interfaces
*e 0
Eugene C. Ciccarelli IV -
MIT Artificial Intelligence Laboratory
. .... . S
ba t
- e-I
a
$ .e ttsI Ia1 4 1985
j, (-
it
fIJ
S 6

REPOT DCUMNTATON
AGEREAD INSTRUCTIONS
REPOT DCUMNTATON
AGEBEFORE COMPLETING FORM
I REPORT NUMBER 2. GOVT ACZCESSION NO. 3. RECIPIENT'S CATALOG NUMBER
AI-TR-794 /5J /
4. TITLE (and Subtitle) 5. TYPE OF REPORT A PERIOD COVERED
Presentation Based User Interfaces technical report e
6. PERFORMING ORG. REPORT NUMBER
7. AUTH~OR(&) 8. CONTRACT OR GRANT NUMBER(*)
Eugene Cicarelli N00014-75-C-0522
9. PERFORMING ORGANIZATION NAME AND ADDRESS 10. PROGRAM ELEMENT. PROJECT. TASK
Artificial Intelligence Laboratory AREA & WORK UNIT NUMBERS
545 Technology Square
Cambridge, Massachusetts 02139
ICONTROLLING OFFICE NAME AND ADDRESS 12. REPORT DATE
Advanced Research Projects Agency August 1984
1400 Wilson Blvd 13. NUMBER Of PAGES
Arlington, Virginia 22209
4 *4ONITORING AGENCY NAME & AODRESS(Ifditll.,ent from Contrloing Ollie*C) 15. SECURITY CLASS. (of tis report,
Office of Naval Research UNCLASSIFIED
Information Systems
Arlington, Virginia 22217 ISO. D1CAS;ICATIONDOWNGRA.D.NG 0
IS. DISTRIBUTION STATEMENT (of this Report)
Distribution of this document is unlimited.
I7. DISTRIBUTION STATEMENT (of the aborroct enfered in Block 20, II ditiomnt btern Report)
Distribution is unlimited
IS. SUPPLEMENTARY NOTES
None
IS. KEY WORDS (Continue on rower&* side Inecoe"r and identify by block rnumber)
user interfaces editor
presentation systems
programming tools
display
20 ABSTRACT (Continue arn reverse side If necessary and Identify by block numnber)
- A prototype "presentation system base" is described. It offers mechanisms,
tools, and ready-made parts for building user interfaces. A general user inter-
face model underlies the base, organized around the concept of a "presentation":.
a visible text or graphic form conveying information. The base and model em-
phasize domain independence and style independence, to apply to the widest
possible range of interfaces. Thie "primitive presentation system model'"
treats the interface as a system of processes maintaining a semantic relation
DIJ F,"1473 'EDITION OF INOV SB IS OUSOLIETE N AS lED(VR
it
~i 0( UNCASSFIE (OVER
SECURITY CLASSIFICATION OF THIS PAGE (Whom Dole Entered)
dh 79,

Block 20 cont.
.between an "application database" and a "presentation database", the symbolic
screen description containing presentations. A *presenter" continually updates
the the presentation database from the application database. The user manipulates
presentations with a "presentation editor". A "recognizer" translates the user's .
presentation manipulation into application database commands. The primitive
presentation system can be extended to model more complex systems by attaching
additional presentation systems. In order to illustrate the model's generality
and descriptive capabilities, extended model structures for several existing
user interfaces are discussed.
The base provides support for building the application and presentation data
bases, linked together into a single, uniform network, graphics to continuously
display it, and editing functions. A variety of tools and meclanisms help
create and control presenters and recognizers. To demonstrate the base's utility,
three interfaces to an operating system were constructed, embodying different -.
styles: icon, menu, and graphical annotation.,
1!Y-
.' . U. *** * *. o-..
.-.

PRESENTATION BASED) USER INTIER FACES
by
Eugene Charles Ciccarelli IV
B.
S., M'assachusetts Institute ofTechnology
(1975)
M.S.. Massach usetts Institute of Fechnology
(1978)
Artificial Intelligene Laboraatory
Massachusetts Institute 01 Technology
August 1984
(C)Massachusetts Institute of Technology 1984
loo
This isa revised version ofathesis subm-ittcd to the Departmecnt of Electrical Engincering
and Computer Science on August 27, 1984, in partial ftill'illmcnt of the rcquirements for the
degree of Doc-tor of Philosophy.
* This report describes research done at the Artificial Intelligence I.aboratory of the
Massachusetts Institute of Technology. Suipport for the laboratory's artificial intelligence
research is provided in part by the Office of Naval Research under 001-cc or Naval
* Research contract N00014-75-C-0522, inpart by the System De-velopment Foundation, and
inpart by Wang Laboratories.
AccessionFo
NTIS QRAAI
1 TAB 0 1
Availability Codes
:Avail and/or
1)ist1S tal

PRESEN'I'ATION BASEI) USER INTErFACES
by
Eugene Charles Ciccarelli IV
Abstract 0
A prototype presentiwisnsistem base isdescribed. It offers mechanisms, tools, and ready-
made parts br building user interfaces. A general user intcrface model underlies the base,
organized around the concept of a presenlion: a visible text or graphic form conveying
information. The base and model emphasizc domain independence and style
independence, to apply to the widest possible range of interfaces.
The primitive presentation system model treats the interface as a system of processes
maintaining a semantic relation between an applicationdatabase and a presentation data
base, the symbolic screen description containing presentations. A presenter continually
updates the presentation database from the application database. The user manipulates
presentations with a presentation editor. A recognizer translates the user's presentation
manipulation into application database commands. The primitive prescntation systen cin
be extended to model more complex systems by attaching additional presentation systems.
In order to illustrate the model's generality and descriptive capabilities, extended model
structures for several existing user interfaces are discussed.
The base provides support for building the application and presentation databases, . -
linked together into a single uniform network, including descriptions of classes of objects as
well as the objects themselves. The base provides an initial presentation database network,
graphics to continuously display it. and editing functions. A variety of tools and
mechanisms help create and control presenters and recognizers. To demonstrate the base's
utility, three interfaces to an operating system were constructed, embodying different styles:
icon, menu, and graphical annotation.
Thesis Supervisor: Profes~sor Carl Hewitt
Title: Associate Professor of Electrical Engineering and Computer Science
Thesis Supervisor: Dr. Richard Waters
Title: Principal Research Scientist, Artificial Intelligence L.boratory
2__
*7-...-..

## Acknowledgments

My thesis committee. Carl Hewitt.Dick Waters. and Hal Abelson. have been hellrid and
encouraging. They have all aided significantly in shaping this thesis and improving its
quality.
Norton Grcenfeld and Martin Yonke introduced me to the world of the presentation
PI concept. It was while working in their group at BBN that I began to think that the concept .
could serve to explain what was going on in various user interfaces.
Several people have helped with discussions and suggestions at various stages in the
development of the ideas, including Lee Blaine, Ron Brachmnan, Charles Davis, Jeff
- Gibbons. Farl Killian, Henry Liebernian, Fanya Montalvo, Chuck Rich, Jan Walker, Bill
*. Woods, and Frank Zdybel.
Dan Halbert and Bruce Roberts provided information and the sample screen images for
the Xerox Star and Steamer systems, respectively.
" :!i:!!ii}0

-. - ..... -~,.. . .-.. -
. . . . ' - .. . .'-.

## Table of Contents

- - - - - - - - - - - - -- -A--
J.

I6.4 Menu-Style Interface Implementation 178
...

## Table of Figures

Figiire 2-13: PPSCalc Preparing to Copy Formula 46
-6
- ° %* "...........o.%%°........................o.......- . ,o
-. ...... . . . o. .. 'o ,

lFigure 5-6: Conmand Description Support 110 0
Iiguie 5-7: Reference Resolution 113 -
iFig u .
'" Menu-Style Interface 161
7.-..
.. .. ;..-....
-.................................:.:.: : '"". ... ...
I , "i
" " "° - '- *. -I
-
''. j l ° - - ." . . --
.. -
- ° "
- -

## Chapter One: Introduction and Overview

Building good user interfaces is a slow and difficult process. Good user interfaces are
generally large. complex, and hard to understand, and these characteristics tend to be
exacerbated when the interface is modified. All too often, interfaces are built that lack
llexibility in their use, lack some functionality, or lack uniformity with interfaces to different
applications.
The primary result of this research is the development of a prototype presentationsystem
base, called PSBase. PSBase contains tools, mechanisms, and ready-made parts for the
construction of user interfaces. Independence of particular interface styles and application
domains is emphasized, in order to maximize the generality and utility of the base. PSBase
also provides a conceptual framework for user interfaces. Underlying the base isa general
model of user interfaces, called the presentationsystem model. The report claims that, with a
" presentation base, interaice construction iseasier aid quicker, and the results are better.
To demonstrate the utility of' PSBase, a user interface was constructed on top of it, and
three different styles were implemented for this interface. A presentation system base
should be independent of any particular application domain or any particular interface
style. It should support the construction of (and experimentation with) many different
kinds of applications and styles.
For cxample, consider the following spectrum ofstyles. At one end isdirectmanipulation
fShnciderman 83]: the object of intcrest is continually displayed. and the user's actions
appear to be manipulating the object with no intervening command language. An
altcrnativc style is preparing a desircd future version. (This style looks the same as direct
manipulation. but the objcct of interest isnot continually changing -- the specification of the
future version is.). Another style is annotatingthe current view with commands for how to
-..-
. . '..o .- ., , * - -
., - o.- . . -. °. . -.. . . . . . . .
.. , . - " o o-

- 6
change the object. At the other extreme from direct manipulation is a separate command
i nguage for describing the manipulation. IFxamples o1 these alternative styles can be seen 6
%%hcn readers request changes in a draft paper: sometimes the original file is editcd, -.--
soiletimCs anew file iscreated. sometimes the (paper) draft isannotated, and sometimes the
changes are discussed separately.
Another result of this research is the presentation system model itself. 'Ihis is a general
model of user interfaces, and it is the Foundation of PSBase. Even by itself. however, it has
benefits. It aids the understanding of user interlaces in general by providing a unifying set
of concepts for thinking about user interfaces. There are two ways that it helps someone
building a user interface in the absence ofa presentation system base. It serves as achecklist
of the possible kinds of functionality in a user interface. The structure of the model serves
as an architectural framework for the interface.
The model may also be of aid to people studying interface styles in general. One problem
in such a study is the large number and diversity of possible styles. The model defines
various classes of general parameters for interfaces. One can define styles as patterns of 0
these parameter specifications.
The following five sections provide an overview of the five major chapters in this report.
"lhesechapters divide into two groups. The first group. comprising chapters two, three, and -
four, discusses the presentation system model that underlies the presentation system base.
The second group, comprising chapters five and six, discusses the presentation system base
and its application.

### 1.1 The Primitive Presentation System Model

This section introduces the primitive presentation system (PPS) model of user interfaces,
which is discussed further in chapter two. Two simple models of a database interface will S
first be introduced. They will be used to Fcus attention on certain aspects and to motivate
the development of the full PPS model. The first model focuses on the database,
considering a rudimentaryinterface to it. The second modJ. the representation shift model,
- - . .', .-.
. . .. I.......

* focuses ol the user's need lbr a more uscful and coherent representation of tle database
information and commands. The representation shift model isalso useful in itself. as it is a
special case of the fulJ PPS model and applies to some common interl,|ce styles. The PPS
model extends the representation shift model to allow more flexibility in the relationship
between the screen and the database.
A Rudimentary User Interface. Figure 1-I shows the basic intcrface to an application data
base and a rudimentary user interface constructed from it. The database has three external
inputs and outputs. Commands change the state of the database (adding, changing, or
deleting information). Queries allow the state of the database to be examined, producing
the relevant information at the observables output.
These inputs and outputs are not directly usable by a person -- they are in a format
designed for use by programs. (The user is not the only one using databases, after all.) In
order to provide even a rudimentary user interface, sonic simple kind of transducers must be
placed on each input and output line.
The transducer on the command input, for example, might convert a text version of a
command to the binary form required by the database. Thc transducers do not provide a
- different overall model of database use -- the user still must use the commands and queries
provided by the database. The language used to express them has been changed slightly so
that it is printable and mnemonic, much the same kind of translation that a simple
assembler performs.
The rudimentary intcrface is usable, but sufl'rs from two basic problems from the user's
* point of view. First, the user must express the database modification interms of the data .
base comnmands available. Second, the results of sach modification, its
well as any viewing
desired, must be explicitly requested via queries.
Representation Shift. Figure 1-2 shows an expanded user interface. Here, two databases
arc involved, the application database as bclore and a new one, called a presentation of the
database, introduced to allow the user more direct modification and viewing. The.
I0 -3 '.."...
3 ...... . ....
3 .N N . . .. -. .- ... . .- . . . . . .. *
. ."
.. . * . . . .. ."*..." . "-.. ..
.. ,"

#### Figure 1-1: A Rudimentary User Interface

(AS
k N, S
aV
sS
(As cr

presentation database contains the samne infornmiation as the application database, but it is
reprcsented in a way that is directly viewable. i.e., in tcrlns of text and graphic flrms. It is
continuously displayed (on the user's terminal). so that the user does not have to explicitly 0
request inIlornation to be viewed.
The presentation -- or. loosely speaking, the screen -- can be directly edited by the user,
by means of the presentation editor. The editor allows the user to manilulate the forms on
the screen, creating new forms or changing or dcleting existing ones. Conceptually, it
combines capabilities of a text editor with those of a graphics (diagram) editor. As these
changes are made, their results arc immediately visible.
In addition, the commands for presentation editing are chosen to be convenient for the
user. For example, they might include a base of general text-editing and graphics-editing
commands. so that the user does not have to learn a special language fbr each particular .
application database.
The presenter creates the presentation database from the application database. At
appropriatetimes as the user edits the presentations. the recognizer creates a new version of
the application database from the presentation database. In the representation shirt model
the presentation contains all and only the information contained in the application data
base. The presenter uses a single application database query (labeled get-db in the figure)
to get a representation of the entire application database, converts the representation, and
then uses a single presentation database command (labeled Ioad-db) to load the entire
presentation database. Similarly, the recognizer gets the entire presentation contents,
converts it, and loads the entire application database.
In the representation shift model, the presenter relation must be invertible, since the
recognizer must be able to specify the entire application database from the presentation
database, In general the presenter relation isa subset of the recognizer relation, or in other
words, the recognizer will recognize several diffcrent variants of the same presentation,
allowing the user more latitude For example, the recognizer might allow the user to create
any of "12", "12.0", "12.000", etc.. whereas the presenter might always choose "12.0".
9%o° %

#### Figure 1-2: The Representation Shift Model

Prk~t~tc
t9
CtS
All S
Prt~~~enfcto~i cr~nQt~re

The representation shift model isa direct manipulationinterface [Shcnidernian 831. The
screen continuously displays the database. Whenever the database changes, the screen is _...
updated. Similarly, the user manipulates the database by manipulating the forms on the 0
screen, and the database is continually updated from this.
The major restriction of the representation shirt model is that the entire application data
base be viewed (and in an invertible presentation). This can lead to inefficiency. It can also -
lead to the inconvenience of visual clutter -- tie user cannot view just a relevant subset of a
complex database. The ability to control the selection of information to be viewed and the
way it isto be viewed can be crucial to the succcssful use of the database.
The Full PPS Model. The full PPS model, shown in figure 1-3. relaxes the restriction that
" the entire application database must be viewed. The presentation, i.e., the visual database,
may convey only a small part of the information in the application database. The screen "
thus can no longer be recognized in asimple manner as specifying all the information in the
application database. This necessitates a generalization in the recognizer from that in the
* representation shift model: the recognizer tran !ates editing actions into database
commands, rather than translating editing results into database data. (The term editing o
_
*:. actions includes both the editing command and the editing result. Therefore, the PPS :-
-.
recognizer includes, as a special case, the possibility ofjust having to examine the editing .
result.)
The presenter is responsible for making the screen continually show the relevant part of.
the database. It creates the initial display and updates the display when the database
changes. The presenter collects the relevant information from the application database,
converts that information to text and/or graphics, and organizes the layout of this visual
information on the screen.
The recognizer causes the database to change to reflect the user's editing of the
presentation. Specifically, in addition to affecting the screen, the user's editing operations
. are recognized as -- i.e., translated inlo -- operations on the database. Thus, the PPS model
isalso a direct manipulation interface: the database iscontinually presented on the screen,
"°.°,

#### Figure 1-3: Thc Primitive Presenitation Systcm (PPS) Model

preseA te
*6r~rvA
L.0

with sLreen following database changes (by presenter action) and database following screen
changes (by recognizer action).

### 1.2 ('onstructing Larger lPresentation System Models

The primitive presentation system model can be extended to model more complex - --.- -
prcscntalion systems as discussed inchapter three. The basic technique for extending the
presentation system model is to attach an. additional presentation systcm to it, either
replacing or augmenting some part of it. The resulting presentation system may thus
contain several smaller presentation systems. The extensions discussed in this section are
suggested by examining the major limitations ofthe PPS model.
Adding a Planned Database. In the PPS model changes to the database are immediate.
1o avoid this, a second application database can be added to a presentation system: a
future (i.e., planned) version of the original database. The user can edit the planned
version's presentation, separate from the presentation of the current state of the database.
When the planned version looks acceptable, the user gives a do itcommand that causes the
actual database to be updated. .0
Adding a Database or Commands. Inthe PPS model the user cannot see adescription of
the changes or the commands to elTect them presented explicitly. (Only the database that
results from these commands is seen.) Using a technique similar to the previous one of -
adding a planned version of the database, a database of commands can be added. In this
extension, the planned changes are represented in the new database explicitly, and can be
presented in astyle different from the style for the application database.
Adding Inter'aces to PPS Components. In the PPS model the editor, presenter, and
recognizer are not presented; the user only has an intcrlace of primitive signals to them
(e.g.. keystrokes or a pointing device). To circumvent this limitation, presentation system
interlaccs to these components can be added. One technique involves adding a database
for the particular component's state. e.g., some options controlling the presenter's style, and
constructing presenters and recognizers for showing and manipulating it. Alternatively, a
- -,' .'. '..'v
.-.. -.-). ..',...'. .-... .- -- ' .-.--- '.- .-.. °-. - ..- :. -..- .--..
. . . . . .. "..
.......-. .. ' .....-.
..... "..".. -..--..-.-.
..

database of commands for the component can be added, just as in the previous section a
command database was added for the application database.

### 1.3 Describing Presentation Systems

The presentation system model can be used as a descriptive tool. The model provides a
set of concepts for enumerating and categoriing basic functions and interactions in a user
interface, even when that interface was not designed with the model in mind.
In chapter four several user interfaces will be described using the presentation system
model. The selection exhibits a variety of interface styles in order to illustrate the model's
generality. In each example the fiocus will be on those presentation system mechanisms that
play the most important part in defining that particular style. Two interfaces, drawn from
those described inchapter four, are sketched below. .
Xerox Star / Apple Lisa. The Xerox Star [Smith, Irby, Kimball, Verplank & flarslern 83]
and the Apple Lisa [Lisa 84] systems offer an interface using icons -- pictorial presentations
of comnmands and data. Some recognitionis simple reference resolution such as pointing to
al icon that presents a particular command. Other recognition involves more complicated
inter-icon relations such as proximity. For example, in Lisa the user deletes a file by
moving the file's icon to a trash can icon. In both Star and Lisa the user prints the file by
moving its icon to the printer icon.
Emacs Dired. A subsystem of the Emacs editor [Stallman 81], Dired is used to perform
various directory operations. It is an example of an extended presentation system that
provides both direct manipulationof the database (the directory being edited), e.g.. when
certain file properties are changed, and planned operations, e.g., when iles are marked for
later deletion. The planned deletions are presented as annotations to the presentation of the
current directory.
. . -

### 1.4 PSBase: A Presentation System Base

Chapter five discusses PSBase. the prototype presentaton system base that was
implemented in the course ofthis research.
PS ase explicitly incorporates thle presentation systcm ,,odel structure. t it ,cudes
toots,
mcchanisms. and ready-made parts for building an interface consisting of an application 0
database, presentation database. presenters, recognizers, and presentation editor. Domain-
indcpendent and style-independent mechanisms are provided and may be combined largely
independently. These characteristics cause PSBase to be useful in constructing a wide range
of interfaces. 6

#### Figure 1-4 shows the overall structure of PSBase. The data base mechanisms provide

support for building application databases structured in a network somewhat similar to
knowledge representation networks. The network includes descriptions of the classes of 6
objects as well as the ohjects thenselves, and class inheritance is supported. An important
pnilt is th!.t this net,,ork is used to bui!d the presentation database .!s wef!, and the
presentation and application databases are linked together into a large, uniformly
structured database. This uniformity is an important factor in the power of the PSBase
mechanisms. PSBase predcliucs a large part of the presentation database class network.
L
PSBase also provides mechanisms that accompany the presentation database: Graphics
redisplay ensures that the presentation database iscontinuously displayed on the terminal.
Several presentation editorfinctions are provided; the interface builder may select these, as
desired.
Tl'he presenter support and recognizer support modules provide a variety of tools and
mechanisms for creating and controlling presenters and recognizers. Most important among
these mechanisms is a language for describing presentation styles and general presenters
that interpret these languages. The interface builder need only describe how the
presentation strucmre relates to the application database structure, and tile presenters
perform the actual creation and updating of'the presentations.
p. 0
....._............ ........ ,.....,...,~ .,_ , . . . . . ...... ...-..... . . . :: .

#### Figure 1-4: Structure of PSBase

BASIC STYVLE PACKA6ES
AS
PR Ew
ire R RECOcINIZE-A
SU-PPCR'T- SuPPDRT .
(Z^?PH IC-5E0T
FuNcrloN5s
DATA EBASE MV-CHANISt1S
. . .

A number of basic style packages orfer specific components of domain-independent
inter'ace styles that the interface builder may choose to include. Some general presenters
and recogniicrs are provided. For example, a presenter is provided to produce command
menus. As another exaiplc. a recognizer is provided to interpret simple rule descriptions".
in order to recogni/e icon movement, similar to the Xerox Star and Apple IHisa systems (see
section 1.3). 0
No claim is made that PSBase would serve as a production presentation system base. It is
a prototype, and needs more and improved Features of many kinds. It pro ides only a pal
of the presentation editor functions that would be needed. Many more dormain- 6
independent presenters and rccogniiers could be included. The prcsentation ,tyle
description language could be improved and used to drive recognition as well. This would
result in more uniformity in what tile system can present and what it can recognize,
providing the user with increased consistency and power.

### 1.5 Constructing User Interfaces

Inorder to demonstrate the utility of PSBase, three interfaces were constructed using the
PSBase mechanisms and tools. The three interlaces share the same application database.
but embody different styles. Tile first style uses icons, similar to the Xerox Star and Apple
Lisa system described in section 1.3. The second style uses text displays with accompanying S,
command menus. The third style is a graphical annotation style, an extension of the Dired
style described in section 1.3.
Some of the work was done once and shared between de three implementations, namely, 0
the style-independent development of the application database. Once that work was
completed. implementing a particular style was largely amatter of writing a few small pieces
using PSBase tools and choosing some standard PSBase ready-made parts from the basic
style packages module.
. * °*. ., . .. -. .. . . . . . . . . ,.- . . . .-.-.-.-
, °- ., - . o. ,
.- .-. -o % '. . ,.-- - ° . ° -., .. ,° -. -. . - °.
.,.. .-.-..
. . . . . . .-. .,.. . . . . . . . . . . .- ,..
. . . .% . - % "

### 1.6 Related Work

This report discusses two devclopmcnts, a donmain-independcnt. style-independent
presentation system base fior building user interfaces, and its undcrlying model of user
interfaccs. I issection discusses characteristics of the base and the model that distinguish it
Iom other research, Two characteristics of both the base and the model are particiilarly
important:
First. the model and the base attempt to concentrate on general mechanisms, independent
of any particular domain and independcnt of any particular style. lhe intent has been that
they should be free of value judgments concerning styles, Discussing what constitutes a
good style or developing new styles arc separate efforts: this research offers a conccptual
vocabulary in which such a discussion can be phrased and offers a base for experimenting
with or combining alternative styles. 0
Second, the model and the base center about the high-level concept of the presentation.
This concept consiicrs the semantic co~mcction between the screen ind ,hJc iv: tion
The model is structured to show how the presentation is used as a medium for
communication between the user and the application. The emphasis in both the model and
the presentation system base has been on the system aspects: how the system of processes
and databases are structured and interact regarding the presentation relationship. This -
research has not emphasized any one particular part of this system: several other studies
cmphasiie the application database, or the presentation database, or presenters, or
rccognizers.
Other research that this work resembles can be classed into three broad areas: human
factors, systems and techniques, and presentation systems. Although this research is related
to these areas. the author knows of no other research that directly addresses the same goals
of studying and providing support for a system of general user interfaces mechanisms.
Rather than being an alternative approach, this work complements the others that are
mentioned. The third area, presentations systems, i3 the closest to this research, in that its
includes systems for aiding user interface construction, based on concepts similar to the
............. .... ...............-- , -,., , .-. .. ',..-.-. .,, ,-..,..'......-..........
I .-
j
I I l
"
11 " I " l I j ' ] " " 1 1 . - . . . - - - . .. _ _ _ _ _ __]_ _ _ _ _ _ _ _ _ __
I " I

presentation concept used here.
Iluman Factors. At the psychological end of the spectrum, there have bcen several
ellorts to which this research is somewhat rclated. [wo major kinds of* work is described,
first, user modeling and, second, interface specification techniques and guidelines. Some
representative research ismentioned.
There have been efforts to develop models of user behavior, user performance, and user
understanding of systems. Often these studies concentrate on particular classes of users or
interface styles. Shneiderman, for example, has examined aclass of interface styles that he S
terms direct manipulation[Shneiderman 83]. These interfaces are marked by ",isibility of
the object of interest- rapid, reversible, incremental actions; and replacemet of complex
command language syntax by direct manipulation of the object of interest." He discusses
direct manipulation style, and its affect on and acceptance by different kinds of users, in
terms of a semantic/syntactic model of user behavior [Shneidernian & Mayer 791
[Shneiderman 801. According to this model, two kinds of knowledge about user interfaces
reside in long-term memory. syntactic and semantic. Syntactic knowledge includes details
of command syntax; it has an arbitrary character and is easily forgotten unless frequently
used. Semantic knowledge includes the hierarchical!y-structured concepts of functionality
and processes for performing various tasks. Semantic knowledge is largely independent of
particular systems and is more easily retained. The success of the direct manipulation style
follows from the fact that "the object of interest isdisplayed so that actions are directly in
the high-level problem domain," requiring little need for syntactic knowledge.
Modeling the user can be a tool for evaluating the behavioral style of an interface, by 0
studying the match between the interface behavior and the user behavior. The presentation
system model, on the other hand, complements the user model by approaching the problem
from the other end, discussing the kinds and internal structures of interface mechanisms
that will by their interaction produce the particular overall behavior as seen by the user.
Some guidelines and formal techniqucs have been developed for specifying user interface
dialogs, a part of the user interface style. Formalgrammars(or. equivalently, state transition
. . , - . -.',

networks) are one technique fOr describing and designing the dialog between user and
computer [Reisner 81] [Reisner 82] [Bleser & Foley 82] [Jacob 82] [Brown 82]. Formal
grammars describe tie interaction between user actions and system responses. Some
grammars include cognitive information, describing what a user has to learn and remember.
A grammar can be used as a design tool, evaluating designs for consistency and simplicity.
Problcms users might have and mistakes they might make can be predicted.
As with user models, dialog descriptions arc complemented by the work reported here.
One may identify three layers of study. all requiring models and description techniques:
general user interface mechanisms (presentation system Model), overall uscr interface style
(dialog specifications), and the user (user models).
Systems and Techniques. The second area of related work is the building of systems,
from cooperative user interfaces to graphics systems, and the development o'techniques to
use in such systems. Some of these projects tend to concentrate on one side or the other of
the presentation relation: on representing the knowledge in the application database or on
manipulating and displaying the presenution database. Others tend to concentrate on the
development of particular interlhace styles.
Research into cooperative user interfaces, such as the Cousin effort at CMU [Hayes 84]
and the Consul/Cue effort at Information Sciences Institute [Kacnmarek, Mark & "
Wilczynski 83] [Mark 81], study various ways that user interface can be more easily
constructed to actively aid the user. An important part of such systems is the provision of a
uniform view of the applications and a helpful assistant, based on an extensive description
of those applications or the interface styles. Such an assistant might try to understand why 0
the user is having difliculty or try to understand requests made in an unexpected form.
A large part of the Consul/Cue work concentrates on the representation of knowledge
about the application and its commands (services). '[he different applications are described
in a uniform manner. This isseparated from the particular choice of styles used to interface
to these applications, such as windows/pointing, command languages, or natural language. . -
The user interface ssistant understands the database representation and uses it to provide
- -.

explanations. llcxil)le recovery from command language errors, and assistance in using
several diffcrent applications by understanding their functionality.
The research reported here is closer to the Cousin project. T1he Cousin project does not
concentrate on incorporating knowledge about application semantics, but rather on
developing a uniform interface style to support a user interface assistant. The assistant 0
corrects erroneous or abbreviated input, interacts with the user to resolve errors, and offers
integral and automatically generated on-line help and documentation. The Cousin system
provides acommon interface base, separate from the application, that interprets an interface
definition provided by the application builder. This definition expresses the user interface S
as aset of forms, with fields that convey information between the user and the application.
There is an emphasis in these research efforts on developing cooperative styles,
developing techniques for them (such as more intelligent recognizers), and for Consul/Cue, 0
investigating the problems of representing knowledge about the application's functionality.
The work reported inthis report also relies heavily on the separation and uniformity of the
application database mechanism. But this work has not studied die issues of knowledge
representation involved. Nor has it been involved with developing particular styles. And
unlike the cooperative systems projects, this work attempts to be able to model and support
arbitrary existing interface styles.
There are several research efforts studying different uniform styles of information
presentation and interaction, and several efforts at developing presentation and interaction . '
techniques for specific domains. For example, spatial database management systems
[Herot 80] [l)onelson 781, the Boxer system [diSessa 85], die Xerox Star [Purvy, Farrell &
Klose 83] [Smith. Irby, Kimball. Verplank & Harsle 83]. and the Query-by-Example--
based office systems [Zloof 82] [Zloof & de Jong 771 all offer the user a consistent way of
interacting with a variety of applications. In a spatial database management system, the
user accesses information by "moving through" the database -- information from many
different domains is organiicd spatially, with related information nearby. Retrieval is
something like flying over aland of information: information isfound by moving to it, wid
-'i:,~~~~....
.... ....-.-........ ..... ....... .......... ..... *............ ..... .-.. , .... ,.)".-

detail is controlled by 7ooming. In the Query-by-Ixalnple systems, on the other hand, the
user accesses different kinds of information by providing an example of the kind of -
inlormation desired. Several s)stcms have been developed that offer complex presentation
techniques and styles for particular domains. Simulators arc perhaps the most widely
known: the Steamer system [Stevens, Roberts & Stead 83]. discussed in chapter four, isone
example. Another area of increasing interest is the presentation of the organi/ation and
execution of programs, such as the Computer Corporation of America's program
visualiiation system [CCA 79], Henry Lieberman's Tinker system [licberman 84]
[Liebermnan 83], and the Brown University system for program animation [Brown &
Sedgewick 84al [Brown & Sedgewick 84b] [Brown & Sedgewick 84c]. The intent of the
work reported in this report is to develop a model and system that can be used to describe
and build any of these kinds of styles.
The books by Newman and Sproull [Newman & Sproull 79] and Foley and Van Dam
[Foley & Van Dam 82] primarily discuss low-level drawing and interaction techniques for
*,,g,,,j
yteiS. For the most part, they are coiiceriied with only oie kiiad Uf aplatl.oi
database -- geometric models of solids, surfaces, etc. Within the framework of the model of
this report, their books discuss detailed techniques for building presentation editors and
presentation databases. However, concerning the presentation database, their emphasis is
more on representation at a low level, suitable for display processors, and does not attempt
to offer a general representation technique. This is in contrast to the presentation system
base of chapter five, for example. which uses a general description mechanism for both the
presentation database and the application database. The standard graphics systems are less
in need of such a scheme, as they are not involved with any sort of "reasoning" about the S
databases, and instead need to perform computations efficiently. Thus. the graphics system
should be viewed as a low-level component of a presentation database as described in this
report.
Inrorniation Presentation Systems. The research reported in this report most closely
resembles research developing what have been called information presentation systems or
systems for automatically synthesizing graphics environments, for example the Bharat system
'- --. .,. . "

[Gnananigari 811, the View system [Friedell 831, and the AIPS system [Zdybel, Gibbons.
Greenfeld & Yonke 81][/dybcl. Greenfeld, Yonke & Gibbons 81]. these systems all
emphasize a knowledge-based approach to creating what this report would call intelligent
presenters. The systems explicitly incorporate concepts similar to the presentation concept
used here, particularly the AIUS system. All three systems have interesting and individual . -
aspects. but from the point of view of this research, it will suffice to discuss tie AIPS work -
as representative. (It was while working with tile Ai'S group that the author first started
thinking about the presentation's use as an organizing concept for modeling user interfaces.)
The goal of AIPS as an inrormation presentation system is to provide an interface to a
large knowledge base or knowledge-based system. The system automatically generates
displays from content-oriented (i.e., domain) specifications. (E.g., "display the ships in the
Mediterranean.") AIPS is itself a knowledge-based system. Using a large knowledge base
describing how structures of domain information can be related to structures of graphical
displays, the system automatically selects or constructs an appropriate presentation style. A
I6
f itllj; tufioiait
f.oa
prescahttion Sytci i vuI.IIlIcIUUcL i'wCuge about tie use, ge Ica..
domains, a wide variety of presentation styles, and human factors decisions involved in
-
-graphical display.
There are three aspects in which the work reported in this report differs from the AIPS
research, First, this report addresses a more general class of interfaces than information
* presentation systems. Information presentation systems currently exist only in prototype
form: there are many other kinds of interfaces to be supported now and, presumably, even
when full information presentation systems are available. Most interfaces do not have
intelligent or automatic presenters. One reflection of this difibrence is seen in the general
model of interfaces developed in this report.
Second, this report emphasizes the system aspects of the interface, rather than
concentrating on any one component of the system. This isone reason why this research -
and the others are complementary: the AIPS work considers presenters in detail: this work
considers the relationship between presenters and the rest of the user interface system.
- .°.-o.
-.

Third. the most distinguiihing characteristic of the A IPS work is its
emphlsis on issues of"
knowledge representation. This report does not address those issues, again because the -
emphasis here is not on inilcligeni presemers or on techniques of describing presentation
styles. Rclatiw ly simple description techniques sli'lice Ir the I'Sliase system. Ilowever, .-
the results of research into the representation of knowledge about graphical display could be
incorporated into a production version of a presentation system base to great cffect. 0
oS
I - -
-:- ~~~27 ..----- ,
:-: :.:-.:-:

## Chapter Two: The Primitive Presentation System (PPS) Model

'The Primitive I'resentation System (ITS) Model
Ihis chapter discusses the PPS model in detail. Figure 2-1 reproduces figure 1-3 of
chapter one, except that here two new primiti~e-signai inputs are added, controls fbr the
presenter and recogniier. Each of the components of the PPS model will be discussed in
turn in sections below.

### 2.1 PPSCalc

The sections in this chapter use an example program called PI'SCalc. This is a simple .6
spreadsheet program, a trivial version of VisiCalc [Beil 821. PPSCalc was designed
spccifical!y for this explanation -- its behavior strictly follows the PPS model. PPSCalc is
iiiustratcd in igures 2-2 and 2-3.
"lhIe spreadsheet consists of cells, organized in rows and columns. Each cell may be
empty, contain just a numeric value, or contain a formula and a numeric value. In a cell
with a formula, the numcric value iscomputed by the formula from the values in other cells.
Cells which just have a numeric value -- no formula -- are called independent cells. Their
values are set by the user. Cells which have a fonmula are called dependent cells. Their
values are recomputed periodically, as will be discussed below. Cells with neither a formula
nor a value are empty.
PPSCalc has two display modes, formula display and value display, illustrated by the two
figures. Figure 2-2 shows the mode that displays the dependent cells' formulas. Figure
2-3 shows the mode displaying the dependent cells' Values computed by those formulas.
PPSCaic is shown in figure 2-2 with an assignment of cell fiormulas for computing a
simple bill. based on the prices for two kinds of items and the numbers of the items
.......... .......... . ..... . . -__- ,.. ...- ,,--

#### Figure 2-1: Thei Primitike Prcscnmatiot System (PPS) Model

0 4.0
La
+1~.Jq
0II
L V
d0
LS
IA0
OL0
%

A BC
1J 100 I 20 IA1-B1
2 I 75 I5 IA2-B2I
--------- -------------- --------------I
3 iIIC1+C2
---------- -------------- --------------I

#### Figure 2-2: PPSCalc -- Formula Display

A BC
--------- -------------- --------------I
1i 100 I 20 I 2000
--------- -------------- --------------I
2 75 I5 I 375I
31 2375
--------- -------------- --------------I

#### Figure 2-3: PlVSCalc -- Value Display

ourchased. The Al and A2 independent cells specify the prices, and the Il and B2
independent cells specify the number purchased. Dependent cells CI and C2 compute the
amount to be paid for the two items, and dependent cell C3 computes the total amount to
be paid. Cells A3 and B33 arc cmpty.
In both display modes, the visible contents of the cells can be edited, using the text editor
* Fmacs. After a certain amount of editing, typically just changing the contents of one cell,
* the user types the return key. This signals PPSCalc to update the spreadsheet based on the
edits to the visible text. Recalculation isthen performed: each dependent cell, from left to
right, top to bottom, has its formula evaluated and its numeric value recalculated. After
that, the visible text isupdated to display any of the cells that changed.
For example, the user might edit the "5" in the B2 cell display to be "11", in order to
indicate that 11i items or the second kind are being purchased, instead of 5. The display now
* . looks like igure 2-4.
The user types a return, and PPSCalc recalculates the dependent cells C1, C2, and C3. C2

A B C
1 I 100 I 20 I 2000
------------------- ------------- I
2 75 I11 I 375I
--------- -------------- -------------- I
31 2375

#### Figure 2-4: PPSCalc -- After Editing

changes its value because of B32, and C3 because of C2. PPSCalc redisplays the iprcadsheet,
rwshowing the ncw bill, as in figure 2-5.
A B C
--------- -------------- -------------- I
1i 100 I 20 I 2000
--------- -------------- -------------- I
21 75 I 11 I 825 I
---------- -------------- -------------- I
31 2825
I------------------ -------------- I
* Figure 2-5: PPSCalc -- After Recalculation
The user now decides to change the cell formulas, to add accumulation of a 5 percent
* sales tax. The user requests the formula display mode, types Formulas into the previously
empty A3 and B3 cells, and edits the formula in the 03 cell. Cell A3 totals the amounts, cell 0
* 13 coputs th saes axand cell C3 computes the total charge. Trhis isillustr-ated in figure
2-6.
A B C
--------- -------------- -------------- I
1 100 I 20 IAl-81
--------- -------------- -------------- I
2 I 75 I 11 A2-B2
--------- -------------- -------------- I
3 IC+C2 IA3/20 IA3+83I
--------- -------------- -------------- I

#### Figure 2-6: PPSCalc -- New Formulas

When the uscr switches back to displaying the dependent values, tllcsc new formulas
result in the display shown in figure 2-7.
A B C
100 20 2000
--------- -------------- -------------- I
2 75 11 825
3 2825 141 2966
.---------------- i--------- ------------

#### Figure 2-7: PPSCalc -- Values of New Formulas

A question arises as to what should happen when dependent values are being displayed,
and the user edits a dependent value to a different numeric value. PPSCalc has two modes
regarding this. In one mode PPSCalc will ignore the edit -- when the user types return,
PPSCalc beeps, recomputes the dependent value normally, and displays the result. In the
other mode PPSCalc interprets the edit as changing that dependent cell to be an
independent cell with that value.
PPSCalc will be further discussed in the sections below as it is used to illustrate issues in
presentation system modeling.

### 2.2 The Application Data Base

A user interface does not exist by itself-- its whole purpose isto provide the user with the
ability to use something, typically a program or system of programs. It may also be
.smething that the user does not consider to be an active agent -- for example, a collection -
of values, or in general adatabase. In some applications the user's view isof a passive data
base, even though in the background (external or internal to the database) there is some
active agent managing the database. For example, typically a user will view a ile system as
passive, though in the background various operating system programs maintain the integrity
and reliability of the ile system. (Backup and salvager programs are examples.)
Any application can be viewed. from the perspective of the user interface, as a database.
- . . ,.* :- - . . ..

-
. ..- ,
In other words. interi'acing to a database. besides being an important case in itself, can
simulate the situLation with other applications. For example, consider a user interface to an S
application program where there is
no obvious database in the imiplemIentation. One such
example is a process control system, allowing the user to monitor and control the state of a
power generator. say. lere, Much of the state is not in the program blt in the physical
world: tempcratures. pressLires, etc. However, from the point of view of the user interface.
the behavior of the application program issimilar to the behavior ofa database. lhe system
can thus be treated as asystem that nmitains a database describing this world state and the
control options. In the model the job of the user interface system isto let the user view and
manipulate this world description.
Since any application can be viewed as a database, for the model developed in this report
we will treat the user interface as providing the user with access to adatabase. Tlie user's
task will be to view and manipulate the contents of the database.
The PIPSCalc spreadsheet can be considered a database. It has an active component.
namely recalculation, which determines the values of the dependent cells in the spreadsheeL -
World Models. The basic database model being used does not specify anything about
the internals of what is being called the application database. It only matters that the data
base takes commands and qucries and returns observables. Nothing issaid about whether S
the database is implemented by information records, or by computation. or by connection
to the physical world. Its external behavior is that of adatabase.
It may well be reasonable to implement an application that connects to physical objects 0
by having a world modcl. i.e., an explicit description of the world. This situation is really . ..
just an extension of the primitive presentation model proposed for the user interface. Ilere .
the world model database is a representation of the outside world. Figure 2-8 shows this
modularization of the implcncntation. "
In this approach programs (and not only programs of the user interface system) deal with
iadatabase describing the relevant parts of the physical world. Separately. the world model
. -S .

#### Figure 2-8: World Model

\,Jv~t.r .ACc"*.l
cCfe
f 0 p
C4V4 e"'1d
34S

presenter and recognier perform tie job of keeping tile world model up to date and
eflicting changes to the physical world as the world model is manipulated. [he interlrce to
the physical world is much like an interface to another database. Instead of queries, there
are Ct01imands to sensors: instead of database observables, there isthe inlbrination returned -
by those sensors. Instead of database commands, there ar-C commands to effectors. the
hardware that performs sonic physical-world action.
Cascaded Interfaces. This approach to modularizing a system can just as well apply to the
case where there is another database, instead of the physical world. In this case one set of
A programs (user interface programs in the special case) view and manipulate one database,
which is a representation of a second database, viewed and manipulated by another set of
programs.
This is not a symmetrical communication between two groups of programs. The second
set of database programs arc generally unaware of the first set -- the first database is
intended to serve as an extended interface to the second, i.e.. main, database. In the special
case of the user interface, ideally the application programs are unaware or at least not -
dependent on the structure, style, or operation of the presentation database and its
associated programs.
As a final note on this asymmetry, consider the presenter and rccognizer inthe user 0
interface. They are not under shared responsibility of user and application program -- both
are acting entirely/or the user, under the user's control. The entire user interface subsystem
is an internal agent of the user, not au impartial intermediary between two equal
corn municators.

### 2.3 'tePresentation Data Base

We now consider the other components of thc PPS. those strictly within the user interface
. system. The presentation database is the symbolic description of the screen comprising
presentations and their properties and rclatims; it conveys information abotut the database.
Thotigh it is not the purpose of this research to study in detail such representation issues,
S. . . ..-'-.
. . . ..-... .,.
'. . . .
. . . . . . . . . . . . . . . - . . . . .. .. ,*.
- -
....
.-.-. .- "..
.-. ".".
...- '-"..-.- .-,--..,."....."."..
.. "-.-".-"- -'"--.
.---.... . ._. .-. , _ .,?._,2>

this section will identify the basic properties of presentation structure that concern a
presentation system. S
[he Simplicity of Two Databases. An interlace containing two databases, the
presentation database and the application database, may at first seem to bc more complex
ior the user than the rudimentary database user inlerfaIce discussed in chapter one.
However, the situation fior the user is actually much better in a PPS user interface.
Many of the details of the application database's interface are hidden from the user. The
application database still has an interface of commands, queries, and observables, but the
user does not deal with that interface -- only the presenter, recogniter and any outside
programs do. The user is no longer concerned with the access and organization of the
application database -- the user deals only with the presentation database.
The presentation database has a more direct interface than the rudimentary database
model did. The presentation editor has taken the place of the command transducer. The
commands for presentation editing are chosen to be convenient for the user. For example,
they might include a base of general text-editing commands, so that the user does not have
to learn a special language for a particular application database.
Also. as mentioned above, the presentation database is in a form directly viewable by the
user. There is essentially no need for queries to the presentation database, since the .
presentation is directly and continuously viewed. There are only a few vestigial queries,
remaining in the form of viewing commands to scroll the screen, for example.
Name Presentations. Name presentations are the most fundamental of presentations,
conveying no other information other than the identity of a database object. Complex,
structured presentations are built out of name presentations. In PPSCalc, column names
(e.g., "A") are examples of name presentations presenting a particular column. Single digits
are name presentations presenting the numhers 0 through 9. Formula operation symbols
(e.g., "+ ") are name presentations presenting particular arithmetic operations.
+ -. ? .?
i . ? .-. i .+ + . - - . i '. i i: ".. . .
. .
. '
. " -" . . ". .. "" " ' ' " " "" " i .. '-.+

Name presentations do not have parts or properties that are also presentations. A name
presentation may have structure, e.g., smaller text or graphical forms that are part of it. but
any parts are not in themselves presenting domain information. For example. from the
point of view of a map. the letters in the name oloston'". \hile parts of the text string, do
not individually present infbrmation.
(omposite I'resentations. Composite presentations. on the other hand, have graphical
structure inr
which a larger presentation is constructed from smaller presentations. The
composite presentation as a whole presents sonic domain infoirmatiotn, and in addition sonic
of its parts or properties present domain information as well. Generally, the hierarchical
structn ring of sub-presentations into a composite presentation follows a similar structure of
the information in the database. For example, the entire PPSCalc text table is a
presentation of the spreadsheet. The presentation is composed of text string presentations
for the values and formulas of cells, and those cells in turn are parts of the spreadsheet.
In PPSCalc the presentation "A2" iscomposed of the name presentations "A"and "2".
presenting column and row. The presentation "A2" as a whole presents a particular cc'l or
the value contents of it. Similarly the numeral presentation "75" is composed of digit
presentations. Hlowcvcr, the presentation "75" is generally not just a prcsentation of the
number 75 -- in figure 2-2 on page 30, for example, it isa presentation of the number in the
.42 cell, i.e., a presentation of a property of or fact about the A2 cell. It is the value of this 4
property that is the number 75. The presentation style here presents the property by
presenting its value. It is essentially a composite presentation composed of just one sub-
presentation. S
Composite presentations, as well ts
name presentations, may have parts or properties that
are not in themselves presentations. For example, the overall PPSCalc presentation has the
grid as one of its parts. The grid, however, is not a presentation. It serves a purpose in the
o\erall presentation -- it makes the communication more effective -- but it is not itself
presenting anything in the database. It is a kind of template. in which presentations are
placed. A common example of template presentations isa bibliographic reference, such as
1.- ", .
*" " '".
. :..-.:.- ,..v... .
... ,.-. .... , ...................... ..

"[Carrol1651". 'The brackets are a part of the composite presentation, but do not present
anything. The parts "Carroll" and "65", on the other hand, arc presentations.
Relations and Properties. Relations between presentations and properties of
presentations can themselves convey information. Presentation style frequently imposes
strong conventions on such "non-object" presentations. A relation betwecn two 0
presentations, such as nearness, alignment, or comparative size, can be chosen to convey
information, frequently reinforcing intormation presented in some other way. A property
of a presentation, such as its size, color, font, position, or direction, can similarly present
information. The information presented by the property is usually very closely related to
the information presented by the presentation form, just as composite presentation structure
generally fbllows domain structure.
PPSCalc as shown above has no example of property presentations. However, if it were
to display dependent values in a manner different from independent values, e.g., in a
different font. the font of the text would be a property presentation. Many examples of
property presentations can be found in road maps. A line, for example, presents aparticular
road, and the line's color presents the class of road (highway, street, dirt road). Frequently,
a property presentation presents a property of the object presented by the presentation
form. For example, the color of an area of a map may present the amount of rainfall in the
geographical area presented. 0
One common relation presentation is alignment used to present some kind of similarity.
In other words it shows that the domain objects presented by the aligned presentations
share some common property. In the PPSCalc example, the fact that "75" is aligned with 5
"100" above indicates that the cells whose contents arc presented are both in the same data
base column.
"o. - -,'. ,
o', .
. ..
" " -o, . . o-o . . -. . .. . . . . . .

### 2.4 [he Presentation Editor

The presentations can be directly edited by the user by means of the prcsentation editor.
It allows the user to maniptilatc the Ilorms on the screen. creating new IrMins or changing or . -
deleting c\isting ones. It combines capabilities of a text editor \,ith those of a graphics
(diagram) editor. As changes are made, their results are immediately visible.
(rap hics Redisplay. The screei is continuaily updated to reflect changes in the
Kpresentation database, ina process called graphics redisplay. It is this process that involves
traditional irapiiics (drawing) routines. Graphics redisplay isin eff'cot anothcr presentation
system, taking the information in the presentation database, expressed in terms of symbolic
graphic forms (text, circles, lines, etc.), and converting it to a database of pixels, for
instance.
This report will not concentrate on this level of presentation system, for two reasons.
First, it has been studied extensively elsewhere [Newman & Sproull 79] [Foley & Van Dam
R"] Secon,1 it is
',i.ially not the level at which the user is intcraictin, ¢,rin, ordfp
,ly. The
user typically does not think about or use commands that are defined iii terms of pixels, but S
rather in terms of symbolic forms. These symbolic forms are the ones that present the
application database. A presentation style presents a number as text, for example, but it
does not matter whether the graphics system chooses a bitmap or vector display technique
to present that text on the screen.

### 2.5 The Presenter

The presenter process models the decisions and actions of constructing or updating a
presentation. The presenter can be divided into three major parts, the domain collector, the
semantic prcsentcr, and the organizational presenter. as shown in figure 2-9.
This division of the presenter allows the identification and study of its basic functions and
tile interactions between them. They can be classilicd by the kind of knowledge the
functions depend upon: knowledge about the structure of information in the application
database. knowledge about the mapping between domain information and the presentation

S

#### Figure 29: Prescnter Paris 0

S
1-
S
L.
S
S
S
S
S
S

database. and knowledge about purely visual considerations.
The domain collector finds and interpras the relevant part of the database. 'Ihc domain
collector understands the organiization of the application database, the query language. and
the format Of the observables. It is the part of the presenter that connects with the data
base. Given the specification of what is to be selected, it constructs the needed queries and
passes them to the database. The observables (or parts of them) arc then assembled into
the information needed by the semantic presenter.
The domain collector thus has knowledge about the kind of domain information that will
be relevant for the user interface, and about the way that information is represented in the
application database. It does not, on the other hand, know anything about the way such
information will be presented to the user. In PPSCalc the domain collector accesses the
internal variables that implement the database cells, collecting the formulas or cell values
for use by the semantic presenter.
The semantic presenter embodies the primary mapping from database domain to visual
domain, the kind of mapping specified by a map legend, for example. It specifies the
particular visual elements (text strings, circles, lines, etc.) to be used, and those relationships
between them that directly convey database information. It may partially specify sonic of
these relationships, e.g., that some text string (a label) should be near some other object, 0
leaving the organizational presenter to specify the exact position (taking into account purely
spatial relationships, such as overlap and clutter).
In PPSCalc the semantic presenter converts the numeric values and formulas (formulas..
are stored in the database as small programs) to text strings. It also creates the text strings
that label the rows and columns.
The organizational presenter iniposes purely visual organization on the presentation. The .
organizational presenter, unlike the semantic presenter and the domain collector, isdomain-
independent. It uses knowledge about spatial layout and, more generally, about improving
the effectiveness of visual communication. It uses various tabular layouts, alignment.
i' !) i::0
.'----"-'
" - - - .. . . . . . . . . . . . . . . . ..
"..' '.- "' ," "'- '---' " ,.-' S,
..-, ",", ", *-,
-."-.°.. . . . . . . . . .
. ,, .,,,
u" ""e'; " - . . . .

positioning to avoid clulter. lonts, spacing. and highlighting. The semantic presenter might
sometimes partially specify some of these, e.g.. specifying that some text or graphic form
Should he highlighted. [he organiational presenter, however, has the job of pinning down
these specilications. It typically takes into account the other fbrms that will he on the
screCn. Once the semantic presenter has made its typically Iocal decisions about visual
styles, the organizational presenter reasons about the larger groups of fons and their visual
interactions.
This view, that the presenter stages successively restrict the specification of the visual
presentation, can be extended into the presentation database itself. Part of the job of the S
presentation database isto maintain a screen image reflecting the presentation information.
As discussed in section 2.4, this isa task of traditional graphics packages. They too restrict
the specification of the visual presentation, e.g., determining which pixels arc to be set or
choosing fonts if not otherwise specified.
In PPSCalc the organizational presenter uses a tabular layout for the overall presentation.
The organizational presenter also is responsible for creating the table's grid. (Some much
more intelligent organizational presenter might decide whether or not to use a grid,
embodying various kinds of human factors knowledge. The decision is fixed in PPSCaIc.) - -
Within the grid cells, numeric values are aligned in one style (right ends of the number
strings aligned), and formulas are aligned in another style (left justified in the cell). .
One issue not discussed in chapter one is user control of the presenter and recognizer.
The presenter has an input, called presenter control. This is a primitive command signal
interface to the presenter that controls the style it uses and what it will present fiom the data S
base. In PPSCaIc there isjust one such control, a key that toggles whether formulas or
dependent values are presented. In general, there may be difnrent presenter control inputs,
affecting the three components of the presenter.
L0
.
'..' .""."
.i . . . .. "-..-"...".-... .'."".'".".. '.......". .. '... .. .""""" - .
.... "" ".

### 2.6 The Recognizer

The recognizer process observes the user's editing of the screen prescntations and 0
intC1rets this as manipulation of the database. As with presenters, recognizers are divided
into three major parts. namely, the organizational recognizer, the semantic recognizer, and
the domain changer, as shown in figure 2-10.
The organizational recognizer identifies the spatial relationships, presentations, and
actions upon them that are relevant. It imposes a syntactic structure on these.
Organizational recognition is generalized parsing. Text parsing isa special case; the more
gcneral organizational recognition works with text, graphical lorms. visual properties and
relationships, and editing actions. In general, the organizational recognizer is looking for
changes to the presentation structure from the user's editing.
I lie semantic recognizer translates the syntactic structure into a semantic structure
describing charges to the database information. Generally this involves assigning
into,-lr. inofl tot tltext forms, graphic forms, spti'
properties, spadt-il reationships,
editing actions, and the syntactic relationships among these elements. - -
The separation of recognition of presentation structure from recognition of the semantic
structure can be seen in the division of natural language parsers and compilers into syntactic
and semcntic modules.
The domain changer translates this description of changes into the actual database
commands necessary to effect those changes.
In PPSCalc the organizational recognizer, when considering the presentation structure for
the presentation of the C2 cell's formula, for instance. starts by finding the position where
this presentation is located within the grid presentation. It then parses the ibrmula from the
surrounding spaces and decomposes it into tokens (e.g., "A2'. "*', and "B2"). The
semantic recognizer converts this into the program required Ior the database cell. The
domain changer pcrforms the actual modifications of the internal variables.

#### Figure 2-10: Recogn izer Parts

cS
.2'
Its

The PPSCalc example just given illustrates only a special case of recognition. namely
recognition based on just the visible presenutions. the results of whatever editing took S
place. Ibis special case is very similar to the representation shift model discussed earlier.
and is an in,,crse operation to that of the presenter. However, the more general kind of
recognition takes account of the editing actions as well. I)ilfcrent edits that produce the
same result might be recogniled as diflerent changes to the database. (Whether such
recognition is performed, or the extent to which it is pcrformed, depends on the particular
application and user community. But ageneral model should be able to account for such
behavior.)
Consider some examples in PPSCalc. Suppose that the spreadsheet is currently in the
state corresponding to figures 2-2 and 2-3 on page 30. The user is viewing dependent
values, as in figure 2-3. Consider tile possible recognition when the user moves the "2375"
in the C3 cell to the A3 cell, e.g., by deleting the text in the C3 cell, and undeleting it into
the A3 cell. The presentation that results isshown in figure 2-11.
A B C
--------- -------------- -------------- I
1 100 20 2000
--------- -------------- -------------- I
2 75 5 375 -
------- ----------- -------------- I
3 2375 "
--------- -------------- -------------- I

#### Figure 2-I I: PPSCalc -- Value Moved

One possible recognition style is similar to the representation shift model in that it only
* depends onl the visible result. It would recogniie this as two changes. lirst that the C3 cell
become empty. and second that the A3 cell be given an independent value of 2375. This case
is indistinguishable firom that where the user typed "2375" into the A3 cell instead of
moving that text into tile A3 cell. S
Howe%cr. another recognition style might treat that move of "2375" as moving what the
"2375" presents -- the dependent value computed by the formula CI+ C2. Thus moving
%S
~~~..-................................. .----. ,,. .. ...-.-.-.........-.. . .-. .-....- ,-. :

the "2375" from- thc 03 cell to the A3 cell might be recognized ats thle two actions. first that
the A3 cell be given the C3 cell's (6ormul.a CI C2, and second that the C3 cell be emptied
(as before). The ' isihic result is as in figure 2-il above. However, switching into the niodc
*displa'ying lbrmuLlaS Shows the different eff'ect of thle recognition:
A BC
-------- ----------- -------------- I
1 I 100 I 20 IAl-81I
--------- -------------- -------------- I
21 75 I5 A2-B2
--------- -------------- -------------- I
3 IC1+C2III
----- -------- --- I-----------

#### Figure 2-12: PPSCalc -- Formula Moved

p A similar kind of recognition, providing an effect f1ound in commercial spreadsheet
* programs such as VisiCalc, isto recognize certain copy actions as meaning that the formula
be partially copied -- but with changes based on the row or column. For instance, say
duiring the initial creating of the spreadsheet the user had:
A B C
--------- -------------- -------------- I
1 I 100 I 20 I
AB1
------- ----------- -------------- I
21 75 I5 II
I------------I-----------I Ji
--------- -------------- -------------- I

#### Figure 2-13: PPSCalc -- Preparing to Copy Formula

It' the user now uses a copy-with-changes command to copy the "A1*11 formula
presentation from the CI ccll to the C2 cell, recognition would interpret this as putting thc
* formula A2*B32 into the C2 cell. (T]he references to row 1have been changed to row 2.)
% Referene and Reccognition. An important class of present~ation editor commands are
those providing the user with the ability to refer to text, graphic forms, areas. or positions on
the screen. Examples include pointinig de'vices such as tablets and "mice." T1here arc other

possibilities, such as using arrow ke,s to move a pointer around the screen, or keyboard
commands that refer to positions. quadrants, etc. by name or coordinates. The refercncc S
capabilities provided by a pointing device can be extended by tracking the pointer, thus
achieving the ability to refer to areas or groups of forns, for instance. Although reference
does not change the visible prescnUtions, it is an important editor action since it undergoes
recognition.
PPSCalc could be extended to include reference recognition. For example, a reference to
an independent value presentation could be recognized as a command to increment that
value. As another example, a reference to a cell containing a formula and then to a blank
cell could be recognized as a command to copy the formula to the second cell. (This could
perhaps include changes to accommodate different columns and rows as mentioned earlier).
When Recognition Ilappens. In the PI'S model recognition happens continually and isin
effect over the entire screen (i.e., over the entire presentation database). The intent isthat
the screen continually present the state of the database, providing the user with direct
manipulation of the database by continual presenter and recognizer action. Some
presentation editor command sets may allow such continuity at the granularity of single
commands, i.e., allow recognition to happen after every single command. However, in
general there may be groups of commands that, taken together, form a larger atomic unit
from the recognizer's point of view.
For instance, in PPSCalc the recognizer is not be able to act upon a partially typed,
syntactically incomplete formula such as ")+A2". (It would be possible, though, to have a
more tolerant organiational recognizer -- in this case parser -- that allows this string and
assigns some sort of Interpretation to it, such as the interpretation for "()+A2".) In
I'FSCalc typing the return key signals the end of an atomic edit. After each return, the
recognizer isinvoked, the database changed, the presenter invoked, and the presentation
database updated.
Recognizer Controls. Figure 2-10 on page 44 shows recognizer controls, a primitive
command signal that affects the operation of the recognizer. In PPSCalc a single-key
.-.-. ".'...'..''.-.-"'.'-.-'-.""'.
- " ."
, -' - ." . .
. . . . ." . . . . ....
-. . .. "... .".".......--." .. "-"". . ''-'''' '.- ' ' ' ." 2
:,.2,'~~~~~~~~~~~~~~~~- -- - -
.:, ...- "__" - -- ,- -- - - - -. ",""--"-" "
"
. .' . ...... ... ...

command toggles how the rCcogni/Cr will treat edits of a dependent value (110 the mode
when dependen t uli les. not formtlas, are displa, ed). One choice is to treat the cdit as an 0
error and just ignore it. The other choice is to treat the cdit as changing that cell to be an
independent cell with that Value. (The fornula is erased.) In general, there may be
recogni/cr control inputs for each of the recognizer components.

### 2.7 The Representation Shift Model and Direct Manipulation

The representation shift model, introduced in chapter one, is a special case of the PPS
model. It is shown in figure 2-14. In the representation shift model, the presentation data
base contains all and only the information in the application database. As a result, the
presenter and recognizer have simpler, more restricted tasks. The presenter gets a
representation of the entire application database, converts it. and loads the entire
presentation database. The recognizer has the opposite operation: the recognizer gets a
representation of the entire presentation database, converts it, and loads the entire
ar:plic-ation dat base. -
The representation shift model and the PPS model embody different metaphors. In the
representation shift metaphor the presenter creates a picture of the database. The user edits
the picture. At the end of an atomic edit, the recognizer makes the database be what is
depicted. In the PPS metaphor the presenter creates a picture of typically asmall view of a
subset of the database. The user edits the picture. The recognizer watches how the user
makes the changes and changes the database in the same way.
In the representation shift model, the presentation database must contain all the S
information in the application database. This is equivalent to saying that the entire
application database be viewed. (And because of this restriction, the converter can simply
load the entire application database from its translations of the presentation database,)
This restriction can be inefficient for large databases or when rapid user interaction with
the appliction is desired. The restriction isunacceptable when the size of the database gets
so large that the time to perform the translation cycle between the application and
. .
- F. F....
...... .. ".-.... -... -... ....
,--. '..- .-. v-... ........ .- '......-..... . -..

#### Figure 2-14: Representation Shift Model

1 00
-41
LL
cc',
4,J,
L.
B49

presentation databases is slower than the desired interaction time. It also leads to
inconvenient visual clutter: thc User cannot view just a relevant port ion of the database.
T]'his is a serious problem for complex databases. The ability to control the selection of
-ilmation
to be vicwcl and the way it isto be viewed can be crucial. I lowcvcr, lbr small
application databases, the representation shift model can be advantagcous by virtue of its
great simplicity.
Because oI the no-lormula display mode, PPSCalc isnot presenting all the information in
the application database. (The database isthe collection of spreadsheet cells). PPSCalc is
therefore not simply a representation shift i interface, and must be modeled with the full
PPS model. However, if the display of spreadsheet cells were modified to show both the
l
brmula and the value, PPSCalc could be modeled as a representation shift interface.
Because of'the restriction that the presentation I ta base convey all the information in the
application database, the representation shift model has another difference from the PPS
model -- the representation shift recognizer need only look at the current state of the
presentation database, not the sequence of editing operations that produced it. The editing
operations cannot matter: if two editing actions result in the same visual database state,
* they Must be equivalent.
For example, there can be no difference between (1) moving a presentation from one
place to another and (2) first deleting that presentation and then creating at the second
position a new presentation that looks exactly lik,. the first one. Similarly, there can be no
such thing as renaming an object by editing its mune. Editing its name must be equivalent
to deleting the object and then creating a new one with the second name. In fact renaming 6
really has no meaning for the application database, since it isproduced completely from the
rccognizer's data. In other words, all the objects are created anew.
For the full PPS model we assume that the presentalion database conveys only a subset
of the information in the application database, often a small subset. The representation . ..-
shift model can be slightly extended to apply to somc cases of subset presentation. When
(he subset of the application database isseparablefroni the rest of the application database.
". .
...-- ... . -..,.
.,... , . . . ... . . , .. . . , _ _. , ,. .:_ . . . _ . . .

i.e., there are no references into or otit of the Snibse, tihe presentation database can show all
the inlformation of that part of the application database. In l fect. that subset is being 0
treated as an entire application database in its own right.
Ihe restriction of the PPS model that produces the representation shift model can be
summaried by examining the functions between the presentation andI application data 0
bases, as defined by the presenter and recogniter operations. )efine the prec'nrterfunclion
to he the mapping of presentation database states from application database states as
produced by the presenter. Similarly, define the recognizerfunclionto be the mapping of
application database states from presentation database states as produced by the
recognizer.
The presenter function must be invertible, so that the presentation database conveys all
the inlormation about the application database. The recognizer function isan extension of
the presenter's inverse. The recognizer generally extends the inverse for the convenience of
the user: the user can create any of several variations on tile form that tle Dresenter would
have chosen. For example, the PPSCalc recognier allows latitude in positioning of S
fbrmulas within cell presentations, even though tile presenter always aligns the formulas
with the left edge of"the cell. We can say that there are generally sets of presentation data
base states that are equivalent: the presenter produces only one of these states, but the user
and the recognizer interpret the others as conveying the same intormation,
In the PPS model, however, the presenter and recogniier functions are of a different
nature, because of the need to allow operations on only partial presentations. The major
difference is that the domain of the recognizer function is not the range of the presenter
Function. The presenter maps from application database to presentation database. The
recognizer however, maps from seqnences of presetntatiol editing cottitiiaiLds to sequences
of database commands. Figure 2-15 shows a schematic form of the PPf; model that
highlighls these mappings.
A restriction is plaiced onl the decotip11 ug of the preseter andi rccoon ime I'nclt ions il the .
full PS model. [his rcstniction gikc,, the ITlS imodel a direct mantpulation style similar to S
+ ++ , . io

#### Figure 2-15: Functional Mapping in the PPS Model

rS
App IS
-DIIJ S
~NcL52

the style of the representation shift model. Ilhe restriction can be stated by expanding the
notion of inverse presenter and recognizer functions, as discussed fior the rcpresentation
shift model:
Consider sequences of presentation editing cornmands as functions. mapping oneC
presentation database state to another. Similarly, sequences of database commands map
one application database state to another. If P is the presenter relation. R is the recognizer
relation, and C is any particular atomic presentation editing command sequence, the
restriction can be stated in the following form (using "*" for function composition and
- - for cquivalencc of two presentation database states due to recognizcr tolerance): 6
C*P == P*R(C
In other words, the editing commands C acting on a presentation database crcated by the
presenter P should result in the same presentation database as would result from the 0
presentation of the application database that results from recognition of those editing
commands.
There are interfaces where the style of recognition is very different from the style of -
presentation -- i.e., the above rule isnot even approximated. In such an interface the editing
action may directly but temporarily result in a presentation database state very different
from what the presentation database will be after recognition and presenter update. This
report does not attempt to argue whether such a user interface style isgood or bad, nor does
the restriction on the PPS model eliminate such a user interface from consideration. Rather,
the restriction changes the way the user interface would be modeled -- it cannot be modeled
as a PPS. The techniques discussed in chapter three call be used, however, to model such a S
user interface as an extended presentation system. In particular it will be modeled as a
combination of one PPS capturing the presentation and another PPS capturing the
recognition. By modeling the user interface as an extended systern, the very different nature
ofpresentation and recognition ishighlighted.
53.

## Chapter Three: Constructing Larger Presentation System Models

This chapter shows how the primitive presentation system (PPS) model call be extended
to model more complex presentation systems. Chapter four contains several examples of
complex presentation system models of existing user interfaces. The basic technique for
extending a presentation system model is to attach an additional presentation system to it,
either replacing or augmenting some part of it. The resulting presentation system may thus
contain several smaller presentation systems. The particular extensions discussed in this
chapter are suggested by an examination ofthe major limitations of the PPS model:
-The user can only make irnmediate changes to the database -- there is no 0
planning.
-Tho ir ¢in only see the ,urrent state of the application database resultin-
from the commands to change it -- there is no presentation of the commands
themselves or the differences between states.
*The user can only interact with the presentation editor, presenter, and
recognizer through primitive signals -- there are no presentation system
interfaces to these components.
Each of these limitations suggests a particular extension. The limitations and the
extensions are discussed in the following sections.

### 3.1 Adding a Planned Data Base

The First major limitation of the PPS model isthat it only allows immediate changes to the
application database. In the PPS model, as the user edits the presentation, continual
recognition causes the application database to change accordingly. This can be 0
inconvenient if the user would like to see what the result looks like belbre committing to it.
.* Immediate change can also be a more serious problem if the application database changes
.,~..,..... . . . . . . . .

are irreversible. This is often the case when an application program or physical process is
being controlled through the database. Thercfore, if the presentation system model is to -
support the construction 01 user intcrfiaces whcre thc user can postpone the effects of
commands -- i.e.. where the user can plan changes -- the PPS modCl must be extended.
One method of postponing changes isto add anew. second, database that isa future (i.e.,
planned) version of the original database. This is illustrated in figurc 3-1. The user can edit
the planned vcrsion's presentation, separate from the presentation of the actual database,
and when the planned version looks acceptable, give a "do it" command that causes the
actual database to be updated. The "do it" command, like the other commands affecting 0
tle application database, emanates from the recognizer. The user may cause this to happen
either by a direct recognizer control signal or by performing some presentation editing
command that isrecognized as a "do it."
In general the planned version of the application database will behave similarly to the
actual database, ideally reproducing all the active components. For example, in PPSCalc a
planned database ideally would include all the recalculation capabilities of the actual data
base. When this is the case, the user does not lose power or convenience in manipulating
the planned version over what the user would have had manipulating the actual database.
As with the other extensions discussed in this chapter, this is only an illustration of the
technique of extending a presentation system to achieve some goal. This extension
technique may be used in combination with other presentation system structures.
For example, figure 3-2 shows a combination of the straightforward PPS model and the
future database model discussed above. This combination allows the user to have two
presentations at once, one showing the future ,'c:-sion of the database, the other showing the
current version of the database. With two separate presentations and presentation editors,
the user can interact with both, planning some changes and effecting some changes
immediately.
i-S. - "

#### Figure 3-1: Planned Dala Base Extension

r0
Pre s nte0
p~t S -I &t
-,e
Prese 4 Laf 'oS

#### Figure 3-2: FExtension with Both PlIanning and Immediatc Changes

-Pmset~tto t'..
1 O z
b0e Bas
- m a A W,- frv- eoa
f, F~f-, ne

### 3.2 Adding a Data Base of ('onmmands

The second major limitation (o the PIYS model is that the user cannot see a description of
the changes or tile conmmands to effect them presented explicitly. Ihc P'PS model otffers the
uiser a feeling ofdirect manipulation of' the application database contents. However, it is
sometimes safer or more convenient to see and edit a command or a description of the
change to be made. So. although direct manipulation is becoming more and more common 0
and is undeniably useful, a complete model must support the construction of interfaces in
which change is described or seen. Some systems may offer a combination of direct
manipulation and command editing. Others may offer the ability to see or prescribe the
kinds of changes desired -- goals -- without specifying the particular operations needed to
achieve these goals.
Instead of adding a planned version of the database, with content and presentation style
mirroring the actulal database, a database of the plans or commands themselves can be
added. In this extension, the planned changes are represented in the new database
expucitly and can be presented in astyle different from tlat ofthe actual database.

#### Figure 3-3 shows an extended presentation system in which the user can interact with the

application database directly, via the PPS at the top of the figure, and also indirectly, by
giving commands to the application database via the PPS at the bottom of' the figure. lhe
bottom PPS has a database containing commands for the application database above. The S
user can see and edit these commands presented in the presentation database in the bottom
PPS. When the user gives the "do it" command, these database commands are passed to
the application database.
Thus this extension also gives the user a planning capability, and is similar in structure to
the previous extension in that a new database has been added as a buffer. The difference is
that the database in this case has commands, whereas in the previous case it was a copy of
the application database.
As in the future database extension, the figure shows two copies each of the presentation
- .-. - -'.

#### Figure 3-3: Comm~and Data Base Extension

Preseni cS
ru Pr Se
tot I'" 0
bmtS
CAylucatt 0
'Prc Q- v e-0
F're S cn t- I-

editor, presentation database, presenter, and recognizer. Though their general purpose is
tile same and they aic lahelCd tile same. they are in general different. In this extension this
isespecially the ca.sc l1or Lhe presenters and recognizers. The application database in the top
PPS, and tile database of conu,,ands in the bottom PPS, have ,cry difftirent kinds of'
infornation in thcn. The presentation and recognition styles Aill thercibrc in general he
quite different.

### 3.3 Adding Interfaces to PPS Components

The third major limitation of the PPS model isthat the presentation editor, presenter, and -
recognizer are not presented. The user controls them through presentation editing
commands, presenter controls, and recognizer controls. There are two aspects to this
problem in the PPS model:
First. these controls are only primitive signals,such as keystrokes. There is no ability to
see the commands the user is typing, edit them, or get help in their use. The only thing
being seen and edited (i.e., presented) isthe application database.
Second, the user must give commands to affect the editor, presenter, and recognizer. The
user cannot directly see the state of those processes, their modes, control variables, etc. As
the user interface becomes more powerful and complex, the user interface components, as
well as the application database, become important objects to present. The text editor.
* Emacs, for instance, has nearly fifty options variables in its simplest. initial Form. Many
systems have many option variables controlling presenter style, modes, etc.
Instead of primitive signals to control the presentation editor, presenter, and recognizer,
and no ability to present their state, PPS interfaces to these components can be added. This
involves adding a database For the particular component sstate (e.g., a database of the
presenter's options controlling its vi.,,. jle) or using the prcdious technique of adding a
database for the component's commands.

#### Figure 3-4 shows one such interface, providing a representation shift interface to the

60-

#### Figure 3-4: Presentler Intcrface [xtension

Use see.t~ prbs.ApLC 1
ke .
0 -e r-
. . .

presenter. The presenter's state has been expanded into a database presented by the
representation shift presentation system at the top. As with all the addititonal prcsentation
systems in this chapter. there are Many possiblc prescntation systCms that could he added.
A ITS coulId have been used instead of thc repreCsentation sh i t. IfOr example.
In this extended presentation system the user can interact with the application database,
via the main presentation system at the bottom. The user can also interact with the
presenter, via the presctation system at the top, which has replaced the original presenter
control input. The user can change the way the presenter behaves by editing the presenter's
state presentation. -or instance, this might include changing the amount of detail shown in S
the presentation of the application database. It might include changing how the presenter
shows different kinds of domain information, e.g., whether tables or graphs are used.
Finally, it might include changing what parts of the application database are being
presented. (Recall that the PPS model allows that the application database to be only 0
partially presented.)

#### Figure 3-5 shows an alternative extension for controlling the presenter. Here. instead of

editing the presenter's state, the user edits commands to the presenter, just as in the e
previous section the technique was used to allow the user to give commands to the
application database. The top presentation system (again a representatiou shift model, but
as before it could be any kind of presentation system) hooks directly into the presenter
control input to the presenter.
This technique of adding a presentation systcm to allow the user to interact more
convcnicntl) with the prcscnter can be applied to the other presentation system components
ts
well. e.g.. to the presenttion editor and recognizer.

### 3.4 Sh:ired Screen Space g(nd Iresentaion Structure

1his s,1)i tCAMnlilncS ihr .Ckinds l'
shiring that can occur in presentations systems. In
gcneral. sharing tcU rS " hen SOme part tl'a presentation sy stem, e.g.. a particular part of the
screen spac or a p rtiulLir prcsentatim. imtltancously fulfills two diflIcrent roles. There ."'-
. . .
. . o-. ..

#### Figure 3-5: Presenter Commands Extension

Pre S02,tr

-aretradcoffs between benefits of compactness and costs of anbigi ty.
The first kind of'sharing issharing of screen space betwcen two presentation systems, e.g.,
two PPS comfponents in a larger, extended prescntation system. Presentations that
conceptually belong to the different presentation systems are often intermingled within the
same space. For example, in the Emacs Dired system to be discussed in section 4.1, a
directory listing (a presentation in one PIS) isannotatcd with "1)"s,
which are presentations
of plans to delete files and which belong to a separate, coimmand-planning PPS. [his is
contrasted with an interlace that has two such presenution systems occupying completely
separate areas of the screen, e.g., different windows. S
The second kind is sharing of one presentation form between two presentation systems.
The shared presentation presents two different pieces of information, in the two different
application databases. Consider, for example, a directory listing. An interface could use a
directory listing for more than just prescnting a directory: it could also use it as a means of
controlling the directory listing presenter. The user could trim the directory listing to
inform the presenter that certain files should not be included. This editing, and recognition
of it, conceptually occurs in a separate PPS. The directory presentation is shared between
the two PPSs. In the presenter-control PPS, the directory listing functions as a presentation
ofthe presenter's state.
A third kind issharing of one presentation between two presented domain objects in one
PPS. This occurs when one domain object is presented in order to present another domain
object. A typical case is presentation of a file's creation-date property in a directory listing.
To present the property, the value of thatproperlyis presented, namely, the particular date.
(And the process may continue: to present the month property of the date, the particular
month is presented.) Thus, a single presentation form (e.g., the text "3/4/83') presents
both the creation-date property and the particular date (3/4/83) that satisfics that property.
Sharing of screen space or presentation structure can provide convenience to the user
because it results in a compact presentation. Sharing can achieve what might be called
visuallocality: two presentations of related domain objects are locatcd near each other.
--
-- " . " .- """- . ..
".-. -. -. . . ". - ..- - . - .. . - - . ,
.,..--...
. -..
. ... .. ' ..... a.. -. .. --. - .. .- .- .-. - . - . - .. .. :-. - _. ..

Unforttnatcly, sharing can also lead to ambiguity, both Imr the user and for the
implementor. The user nmay not know which editing fIunctions apply to presentations 0
shared between two presentation systems. When screen space is llarcd, the lscrl may not
know what kind of recognition to expect when editing the dif6clrcnt presentations. The
implClentation must also keep the two kinds of prCsentation distinct. sO that tile proper
editing and recognition happen to each. When presentation structure is shared, the user
may not be aware how presentation editor functions are recogniied differently by the
recognizerS in tile two presentation systenis. The implementation must include ameans for
selecting tile recognizer based on the kind of editing performed. The ambiguity is most
severe when the capabilities of the presentation editors overlap. [he choice between the
two recogniters then must depend on context or user choice.
The designer should identify ambiguities in the proposed presentation system, and decide
which ones to resolve. Such a decision must tke into account the prospective users,
conventions in the style of the interface, the particular tasks to be performed, and the
I ' '- Clll-,VliClilil
,,jphica i i.. S,,u,,tligtc,, bc,.,,,n,,,.. Conventions m;ght b . , ,ed on the
kinds of sharing and the methods of user or system resolution. S
However. regardless of the outcome of tile decision, the designer Must consider that there
is always ambiguity due to potentialsharing. The user cannot tell, merely by viewing the
directory listing, whether deleting a line in a directory listing, for example, will mean don't S
present that file (manipulating the presenter). or whether it will mean delete the file
(manipulating the application database). Ambiguity of presentation structure, unlike
ambiguity ofshared space, isan inherent possibility of the view. Resolk ing am ambiguity by
eliminating sharing of prcsenLtion structure does not make the presentation appear
different. (However. another presentation may be introduced nearby to perform the
eliminated function.)
* Sharing of presentation structure within a PPS. such as arises from presenting a property
by presenting its value, isless troublcsome. Its anbiguity can be rcsoklcd by the recognizer,
by deciding which of tile possibilities is appropriate For tile command being rccogniicd.
'. _ .. -
. ... .. .- . . . . . .. .. . . . . . . . . - " "" i -

[or eXamlple. i' uIser editing 01l thle creationl-datle presentation for a file is recoglm/ed as a
change command, then only the creation-date pfloper, fit-, thie recognition -- oniC cannhot
change adate. (Bly changing the prIOpCrty. One isSClC'Clifg atdlil*erCn.t date to be thle value of
thle property. IThe original date VAlue is lel Unchanged.) ThIiis techn iqute is offered by the
PS~lasc system, and so Iurther discussiol ol'th istchnl~iqueC appears insection 5.1.

### 3.5 Concluding Remarks

This chapter hazs disculssed only a few examples of how presentation systems can be
constructed by hooking primitive presentation systems together. There are many more
possibilities, including combining these extensions and creating new kinds of extensions
using similar techniques. ([or example, a system might olffer cascaded presentation
systems, presenting thle presentation database.) In modeling actual user interfaces, the next
chapter illustrates several ol these possibilities.

## Chapter Four: Describing Presentation Systems

l)escribing Presentation Systems
1his chapter illustrates the use of the presentation system model as a descriptive tool.
The model pro%ides a set of concepts for enumerating and categori/ing basic functions and
interactions in user interfaces, whether or not those interfaces were designed with this model
in mind. Jlie behavior of fbur dilTerent user interfaces will be described in tcrms of the S
presentation system model. In each example the focus will be on those presentation system
nechanisms that play the most important part in defining the style of interaction.
A secondary aim of this chapter is to offer support for claims of the model's generality,
i.e., that the model applies to a wide range of user interfaces. The selection of user
interfaces described here has been chosen to show the descriptive process by example. The
reader should then be able to apply this process to other interl'aces and thereby gain
confidence in the model's generality. -
The selection thus emphasizes different approaches in user interface techniques. At the
sa ne time, an effort was made to choose user interfaces that exemplify different aspects of
user interlace research and development. Part of that effort was an in formal poll of people 5
involved with developing, studying, or just interested in user interfaces. They were asked to
name three "exemplary user interfaces." The interfaces used in this chapter all have
followers. There were many favorites and strong opinions, but nothing near a conscuss
except on the Xerox Star [lurvy, Farrell & Klosc 83] [Smith, Irby, Kimball, Verplank &
I-larslem 83] and Apple Lisa systems [lisa 841.
PPSCalc was discussed and modeled inchapter two. Bccalmse PPSCalc isasimple version
of VisiCalc [Beil 82], VisiCalc has already bcen treated to some extent. Actually modeling
VisiCalc would involve describing extensions to the main ITlS. Stch extensions will be
stuggested by those used in modeling the user interfaces of this chapter. To avoid this
-. . .. ..- -~~
~ ~~.
......... '-...... ... '............-.-.'-........'. . .'. -. -.. S .?-'- .-. ''-'--?-. -

* --. wi -v- -. . . . . . .
rcdundancy, VisiCalc or other spreadsheet programs will not be discussed further.

### 4.1 Emacs Dired

Dired is asubsystem of the Emacs editor that allows the user to perform several directory
operations by manipulation a directory listing. The version of Dired described here is the
one in Emacs on the ITS operating system [Stallman 81].
Dired is an extended presentation system, allowing both immediate changes to the
application database (the file system directory) and planned operations. Annotations to the
directory's presentation present the planned operations. Dired has two other component
presentation systems. One recognizes presentation editing as changing the state of the
presenter. The other confirms the user's planned operations by offering an alternative
presentation of the planned operations.
Dired Scenario. The following scenario will illustrate the use of Dired. After the
scenario, the presentation system model of Dired will be discussed.
The user invokes Dired, initially viewing the full directory listing shown below:
MC NSR
FREE BLOCKS #0=1666 #1=625 #13=1163 #15=1461 #14=1549 #16=1149
0 BABYL BUGS 26 +486 4/02/84 14:09:26 (4/02/84) .MAIL.
13 BABYL INFO 27 +488 8/31/83 14:37:09 (11/16/83) .MAIL.
L FIXLIB 209 > EMACSI;FIXLIB > (5/06/83)
13 MAINT BABYL 5 +27 2/18/84 17:01:42 (3/01/84)
1 QUEUE NOTES 2 +83 3/10/84 10:20:13 (3/23/84)
1 TEST VALUES 0 +69 1/17/84 19:20:14 (4/03/84)
I TMSG 2 1 +34 $ 3/28/84 11:03:39 (4/03/84)
1 TMSG 3 1 +20 I 4/03/84 21:53:21 (4/03/84) 0
1 TMSG 4 1 +248 1 4/03/84 21:57:45 (4/03/84)
1 TMSG 5 2 +94 1 4/03/84 22:14:15 (4/03/84)
1 TMSG 6 2 +86 I 4/03/84 23:34:36 (4/03/84)
L TS NSRMAC ==) NSR;TSNSRM > (2/24/84)
15 TSNSRM 1320 13 +463 8/19/83 20:44:23 (2/24/84)
The user wishes to restrict attention to those iles that might plausibly be deleted or
moved to a secondary disk pack. In particular, several files are related to the maintenance
of the mail icadcr Babyl and should dclinitely not be considered lbr deletion. Using the
'.. . .. .--. .. .. .

Fmacs command I)Deltc Matching Lines, lines containing the text "BAIYI." are removed.
Ihis does not delete those fliles -- it only affects the view the user has of the directory. -
resulting in the trim med directory listing shown below:
MC NSR
FREE BLOCKS #0r1666 #1=625 #13=1163 #15=1461 #14=1549 #16=1149
L FIXLIB 209 => EMACSI;FIXLIB > (5/06/83)
1 QUEUE NOTES 2 +83 3/10/84 10:20:13 (3/23/84) 0
1 TEST VALUES 0 +69 1/17/84 19:20:14 (4/03/84)
I 'MSG 2 1 +34 $ 3/28/84 11:03:39 (4/03/84)
I TMSG 3 1 +20 4/03/84 21:53:21 (4/03/84)
1 TMSG 4 1 +248 I 4/03/84 21:57:45 (4/03/84)
1 TMSG 5 2 494 I 4/03/84 22:14:15 (4/03/84)
1 TMSG 6 2 +86 I 4/03/84 23:34:36 (4/03/84) S
L TS NSRMAC ==> NSR;TSNSRM > (2/24/84)
15 TSNSRM 1320 13 +463 8/19/83 20:44:23 (2/24/84)
Dcciding that the file named "QUEUE NOTIES" is no longer needed,the user moves the
Emacs cursor to that line inthe directory and types a "D",marking that lile for deletion.
The file marked for deletion is shown by annotating that line in the directory listing with a
"D". There are several versions of the "TMSG" file. and using the "H" (Delete Help)
c.-mmand ;nrt rk 61-1 s. -....
dclction. The "11"
...
" "' "i c '" "
,,,,,,,ii~
Int ;'r ai
D'Ic deeitoT e" ...... .
marks all but the two most recent versions. However, in this case the version "TMSG 2"
has a property protecting it
fRom automatic deletions or migrations to tape (indicated by the
"$" in the listing). Dircd will therefore leave that version alone. The icsulting directory
listing is
shown below:
MC NSR
FREE BLOCKS #0=1666 #1=625 #13=1163 #15=1461 #14=1549 #16=1149
L FIXLIB 209 ==> EMACS1;FIXLIB > (5/06/83)
D 1 QUEUE NOTES 2 +83 3/10/84 10:20:13 (3/23/84)
1 TEST VALUES 0 +69 1/17/84 19:20:14 (4/03/84)
I TMSG 2 1 +34 $ 3/28/84 11:03:39 (4/03/84)
D I TMSG 3 1 +20 I 4/03/84 21:53:21 (4/03/84)
D 1 TMSG 4 1 +248 I 4/03/84 21:57:45 (4/03/84)
I TMSG 5 2 +94 I 4/03/84 22:14:15 (4/03/84)
I TMSG 6 2 +86 I 4/03/84 23:34:36 (4/03/84)
L TS NSRMAC => NSR;TSNSRM > (2/24/84)
15 TSNSRM 1320 13 +463 8/19/83 20:44:23 (2/24/84)
Next, the user moves the file named "TIST VALUES" from the primary to the
secondary disk pack with the "S"command, changing the line
. .

I TEST VALUES 0 +69 1/17/84 19:20:14 (4/03/84)
S,13 TEST VALUES 0 +69 1/17/84 19:20:14 (4/03/84)
The leftmiost "1"and "13" in these two lines indicate thc disk pack numibers (0and I are
primary packs, 13 is thle secondary pack). The "S" command (akes effect inndiatcly,
moving Lthe File to thc secondary pack when the "S" is typed. In this respect, tile "S"
cornmand is unlike the "1)"and "H" commands, which mark the iles ror later deletion.
rhe "S"command changes the property protecting against automatic deletion. [he user
moves the Enmacs cuirsor to the "TMSG 6" line and types "S". T[hat inmediately sets that
property and updates the display, changing the line
1 TMSG 6 2 +86 1 4/03/84 23:34:36 (4/03/84)
to
I TMSG 6 2 +86 1$ 4/03/84 23:34:36 (4/03/84) -
* The full directory listing now looks like:
*MC NSR
FREE BLOCKS #0=1666 #1=625 #13=1163 #15=1461 #14=1549 #16=1149
L FIXLIB 209 =)EMACSI;FIXLIB > (5/06/83)
D I QUEFUE NOTES 2 +83 3/10/84 10:20:13 (3/23/84)
13 TEST VALUES 0 +69 1/17/84 19:20:14 (4/03/84)
1 TMSG 2 1 +34 $3/28/84 11:03:39 (4/03/84)
D 1 TMSG 3 1 +20 I4/03/84 21:53:21 (4/03/84)
D 1 TMSG 4 1 +248 1 4/03/84 21:57:45 (4/03/84)
1 TMSG 5 2 +94 ! 4/03/84 22:14:15 (4/03/84)
1 TMSG 6 2 +86 !$ 4/03/84 23:34:36 (4/03/84)
L TS NSRMAC =)NSR;TSNSRM > (2/24/84)
15 TSNSRM 1320 13 +463 8/19/83 20:44:23 (2/24/84)
The user types a "Q"to indicate that thle deletion plan iscomplete, and isoffered the
following alternative display ofthe deletion p~lanl for confIirmation:
Deleting the following files:
QUEUE NOTES I TMSG 3 1 TMSG 4
Ok?

The confirmation shows only the files to be deleted and some of their important
properties. For instance, "!"indicates that a file has not yet been backed up on tape. In this
case, that is all right Ibr .MSG 3" and "TMSG 4", since those are not the most recent
versions of the file. (I f the user had marked the most recent version of a file for deletion, a
">" would indicate that fact.) Typing "YES" causes the plan to be executed and the files are
thereby deleted.
Dired Presentation Model. Figure 4-1 shows the structure of the extended presentation
system model of Dired. It has four component presentation systems, labeled "Presenter
Control," "Directory Listing," "Deletion Plwning," and "Confirnation." -
Dirctory Listing lIPS. The main PPS presents the directory and recognizes the
immediate commands, such as "S"(move file to secondary pack) and "$" (change property
protecting against automatic deletion). The presentation database PDB1 comprises the text
that makes up the directory listing. A line of text is a composite presentation presenting a
file or link: the text within the line presents Drocrtices of the file, such as the file's name
("QUEUE NOTES"), creation date ("3/10/84 10:20:13") and last-reference date
("(3/23/84)"). Several of these presentations are in turn composites of smaller
presentations (e.g., "3". "23", and "84" are components of"3/23/84").
The presentation editor PE1 offers the "S" and "$" commands, both of which are
references to the current file presentation within the directory, as well as Emacs commands
for moving the cursor and scrolling text. Recognizer R1 immediately translates the "S"
command into the command to the file system to move the file. Presenter P1 then updates
the directory listing to show the "13" presenting the disk pack. Similarly, the "$" command 0
is translated by the RI into the file system command to change the file property. P1 then
changes the directory listing to show the "$" presenting this property.
Prcsenter Control I'IPS. The PPS at the top of the figure is an interflace to the presenter -
P1 of the directory listing PPS. T[he application data basc of this extension is the state of P1
dcscribing which files are to be listed. The presentation database of (he extension, PDB2, is
sharcd with (lie dircctory listing PPS. In other words, the same presentation database is
.....................- "....
. .. . ... .. ? .... i. ....
,'..'-
......... "....... -.....-i. '-. ."........ .
- -- -i--.. -,-.-.,..: _ .:_. -..-
"-"-'"'"'"
'" 11..".... "-""-.... "".. :.... ".... ..... " "" "
....... ""

Figur41: Dired Model
'IF 2 (32 F:L -r
yy E-
-

involved in both presentation systems.
'he extension's presentation editor, PE2. however, is not the same. It does share ilmacs 0
cursor movement and scrolling commands, however. The primary editing comn nds flor
PF2 are those Fmacs commands that delete lines, such as the )elete Matching Lines
command mentioned in the scenario above. The recogniter R2 translates these line
deletions into changes to the directory presenter P1, inflorming it that certain files (those
files whose presentations were deleted) are no longer to be presented.
Since this extension shares the presentation database of the directory listing PIPS, P2 isan
implicit presenter, tied to P1 in that PI's output (the presentation database) is itself a
presentation of P1. In general, the output of a process can serve as a presentation of the
state of that process.
Deletion PlanningPPS. The third PPS is an extension of the main directory listing PPS
using the technique of adding a database of planned commands. A delete command is
presented by an annotation to the directory listing presentation: a "D"placed at the left of
the line presenting the file to be dcleted. Again there is a close relationship between the - S
presentation database of the deletion planning PPS, PDB3, and that of the directory listing
PPS, PDB1, although the two are not the same in this case. They share some of the same
screen space, but the component text presentations are different.
The deletion planning PPS is a representation shift presentation system: the state of the
presentation database conveys all the information about the delete commands. The
presentation editor PE3 contains the DLired "D" and "H" commands discussed in the
scenario, as well as a wide range of other Enacs editing commands. The user can use "D"
or "H" commands to create the annotation presentations. They simply ins.,t "D"
annotations on file presentation lines. Alternatively, the user can use any Emacs editing
method of inserting a "I)" at the beginning of a line, and that "D" will be recognized as a
delete command.
ConfirmationPPS. The presentation system at the bottom of the figure is an extension to
L

the deletion planning presentation system. The job of the conIirmation systemn is to give the
user a different presentation of the planned delete commands, and recogni/e the "do it"
- signal for the deletion planning commands. When the user types "Q" after creating the
- plan of deletions, the deletion planning PPS is suspended. and control passes to the
conirmation PPS. (If the user does not confirm the deletion plan. control will pass back to
the deletion planning P1'S.) The planned delete commands are presented by presenting the S
files to be deleted -- their names and those properties most frequently useful for checking
the plan.
Unlike the other presentation databases, PDB4 isacompletely separate presentation data S
base. It has a trivial presentation editor, PE4, which allows the user to type in the
confirmation answer. Recognizer R4 watches for these answers, and signals "do it" if the
answer is"YES". (Other than the "do it," R4 sends no commands to the delete-commands
application database.)

### 4.2 Zmacs

Zmacs[Zmacs 84] is the text editor for the MIT Lisp machine [Weinreb, Moon &
Stallman 831. Zmacs has many capabilities, and a complete model of its presentation system
behavior would be very large. This section will describe the major presentation systems
aspects and sample the rest.
Buffer PPS and Screen PPS. Figure 4-2 shows the most important structure of the
presentation system model of Zmacs. The PPS labeled "Buffer PPS" and that labeled
"Screen PPS" model the primary prescntation. In the buffer PPS the application database
ADII is presented as text in the buffer, i.e., PDB1. (Text files are treated here as long-term
storage of presentation databases. Therefore, this section will concentrate only on the
buffer.) The application database can be of many forms and is frequently not realized as
any explicit set of programs or information. For example, when PDBI contains English 5
text. the application database would comprise language constructs (words, sentences,
paragraphs, etc.) and the subject matter they discuss. These things do not exist in the
S,.............. . . ..
:. .... .. ....
~ii.:
7"i " -. "............

#### Figure 4-2: Zrnacs Model

06.*
-S -g
~4J
LC
i -.-
0 L

computer anywhere, but they are nevertheless being presented. When the text is a Lisp
program, on the other hand, the application database is the I isp machinC's computational
environment.
'hc screen PPS cascades with the butllhr PPS, further presenting (ie buffer as tile text
that appears on the screen. Most User interlhces can be fiodeled with this extra stage, but
often the operation at this level is trivial. For Zmacs. however, it is useful to discuss the
screen PPS, as certain Zmacs commands depend on the distinction of PDBI (the buffer) and
PDB2 (the screen).
the buffer contains text (a large amount possible -- much more than fits on the screen).
It has an associated current position called point; user-typed text is inserted at point, for
instance. There is sometimes another position called the mark, wUd the interval between
point and the mark iscalled the region. a
Presenter P2 presents a window of text around point, i.e., a contiguous section of PDB1"
text that N.ill lit on the display window. Point is presented by the cursor. The region is
highlighted on the screen, either by underlining or by reverse video. This choice is made by -
a user option, i.e., a P2 presenter control. In addition to choosing the window of text P2
must also consider what to do with lines of text that are too wide for the window. In Zmacs
these lines are wrapped, so that they continue on the next screen line, with an exclamation
point to present the fact that wrapping has occurred,
Buffer PPS commands. To a large degree, the operation of a text editor concerns only
PILE and PD131, with most user editing going unrecognized until much later. Zmacs is,
however, more than just the combination of PEI and P)131 (and the screen PPS) -- there
are several commands whose behavior involves recognizer and presenter action.
For instance, consider the Fill Paragraph command to PI, which edits the paragraph of
text around point to have lines that achieve a good fit within the margins. As the user types
and edits the text of the p~~agraph, Rl's organizational recognizer determines the block of
text presenting the paragraph, creating that paragraph in AI)B. 'lhe Fill Paragraph
7-0
.. ... -* . . - -- *.-. -- - . . - , '- .- . ..-
* . -, - - " ... " - * - ". . .
-_ . _.,z,_ - ,-- ,_-' - -.

command signals Pl's organizational presenter to perl'nn the Filling, updating the
presentation database to present the -DlB paragraph inthe filled style. Finally, P2 updates
I'[)l2, the screen, and the user sees the result.
Similarly, consider the Indent For lisp command, which indents the culrcnt line of a
ILisp expression according to its syntactic structure. Recognition has been proceeding (in
effect) as the user edits, constructing and editing the lisp object in the lisp environment
ADB. Up to this point, P1's organiiational presenter has followed the user -- i.e., done
nothing to change the text. The Indent For L.isp command signals the organizational
presenter to update the presentation according to the presenter's indenting style. P2 then 0
updates the screen to rcflect the PDB1 changes.
[he Mark Thing command sets the region around some presentation at point, the kind of
presentation being determined by exactly where point is. If point is in a word or Lisp 0
symbol presentation, that presentation is marked. If point is at the start of a Lisp
expression, the whole expression presentation is marked. Recognition of this command
translates into a mark of the object in the ADB followed by presenter update. The PDBI1
region is set to present that selected ADB object. This illustrates the need to consider more
than just text as presentation forms -- the region, and also point and mark separately, can
present in
formation in the application database.
Finally, consider the Evaluate Region and Evaluate Into Buffer commands. Evaluate
iRegion causes the Lisp expression recognized from the region text (or if there is no region,
then the ILisp definition around point) to be evaluated in the Lisp computational
environment. The value is presented in a small window at the bottom of the screen.
Evaluatc Into Buffer takes its text to be recogni/ed from a different area (aminibuffer, to be
discussed below), nd after cvaluation, presents the resulting lisp value in PI)BI as texL
Screen PPS ctmintnds. Most Zmnacs user commands go to PEI, the presentation editor S
* for the buffer PPS. Comiands to the screen PPS components involve the screen
*appc rmnnc as o)ppo, cd to the underlying buffer text. Such commands concern mouse.
references. window scrolling. Aindow reshaping. and any text commands that depend on
A
N--.- . . -_
-
S. . .
S*-
S.... . .. . . -.O. . . .. - . . . . . . .... . . .. " -. -- . .

LS
whether lines are wrapped. (For instance, such a command might move tie cursor down
one screen line. mo ing forward in the buffer text line to a point presented on the screen as
directly below.) Window movement and rcshipino commands go to the prcsenter P2.
Consider the PE2 111ouse comniand to move point. The user points to a hiel'cr position
presented on the screen and clicks a mouse button. Rcco nicr R2 transl tes the relferencc
inscreen coordinates to a reference to the position within P1)1Bls text, the position which is
presented by the referenced screen position, a4id a command to move point to that position.
Presenter P2 then updates the screen so that the cursor presents the new position of point.
Consider also the PE2 mouse command to mark the thing at the mouIse position. The
user points to a presentation. e.g., a word or Lisp expression, and clicks a mouse button.
Again R1 must translate a screen coordinate reference into a buffer text position reference
and a command to move point to that position. In addition the rcficrence translation 6
includes a mark-thing command. That mark-thing command is further recognized, within
the buffer PPS by RI. as described above. Thus, the mouse command to mark a thing
requires action by PE2, R2, R1, P1, and P2.
Command Minibuffer and Completion. The lower half of figure 4-2 shows the model for
the Zmacs exiended command minibuffer, by which Zmacs commands can be given by
name. Many Zmacs commands are connected to keys, so that they may be invokcd by a "
single keystroke. However, all commands may be invoked from the niiriibuffer, relieving
the user of' the need to remember infrequently used keys. Thus, the minibutfer offers a
presentation system to the Zinacs commands. (For simplicity, we will consider only PE1
commands.)
The minibuffer is a two-line buffer at the bottom of the screen and is edited almost
entirely as is the main buffer: i.e.. PE3 is almost a duplicate of IL. P3 does have Some
additional commands, primarily concerning command completion [7.macs 84]. As the user
constructs the command name, the command name recognicr, R3, attempts to determine
the possible commaMds that have the user text as a partial string. Ihe user can signal the
command presenter P3 to aid in constructing the command name by filling in more of' the

name -- as iuch as call iranlbig.OIly be conpleted. (t,.g if the urscl has typed '1, M ."
and the oly] conllllald wNhose first %Nordstarts ith '". and sccond word starts Mith "Me"
is lIisp Mode. thcn 'i Mo" can be completed to "l-isp Mode".) the user causes the
coiflfMland to be executed tb ing Rcturvv, this causes R3 to signal the "do it."
In addition, the user cin in okc acommand that lists the possihlc completions of the text
constructed so far. This command triggers the presenter P4 in the comnand completion list
PPS. It creates a new presentation database PI)B4 on the screen, a window of the
corn pletions. The cornnland i ilibuffcr PS and tile command completion list IPS both
interface to the same application database of PI commands. PE4 allows the user to select
a completion from PI)I34 with the mouse. That reference is recognized by R4 as choosing
that particular PEI command and signalling the "do it"
* Other Presentation Aspects of Zinacs. This section will briefly discuss two of the many
other presentation and interaction mechanisms in Zmacs. Most of those not discussed here
are very similar to the ones that are discussed.
Mode Line. One of the constait features of the Zmacs screen is the mode line, a small
one-line window near the bottom of the screen that presents important information about
the state of Zmacs and the buffer of text being displayed.
For instance, the mode line presents a list of the control modes that affect the action of
presenter P1, recognizer RI 1,
and some of the connections of keystrokes to commands. One
of these is the major mode, which describes the kind of application database information:
text. lisp programs, etc. There are also a set of minor modes, with more localized elfccts; an
example is a mode causing lines to be continually filled as they are heing typed. 'Ihe mode
line's text presents these modes, and thus presents the states of IPS components, with labels
such as ''lct" and "Fill'". the mode line as described thus far \Notild be an example of a
* representation shift except that it cann t be directly edited. (i'or example, one cannot S
change tie aajor mode by editing its preseItation in tile mode line.)
[he node line also :oiltlills a presentation of' the ,cirer PIS presentcr. P2a,
aid Pl)B2's

relation to PDBI. Small arrows pointing tip or down can appear at the right of the mode
line. An upward-pointing arrow. for example. presents the fact that P2 has chosen a
window with more of PDBI above it.
Scroll Bar. The scroll bar is a small display that appears inside the left edge of the Zmacs
window when the mouse moves to that edge. (See figure 4-3.) 'lhe scroll bar consists of a
vertical line segment juxtaposed against the left window border. The line segment. by its
position along the border and its relative size compared with the border, shows the size and
position of the PDB2 window relative to the size of PDB1. In figure 4-3 the P1)IM2 window
isabout one fburth the size of PDBI and isat about the two thirds position in IP)BI.
The line segment presents PDB2; the border 1:.-,e
presents PDB1. By presenting PDB2
and its relation to PDB2, the scroll bar is presenting the state of the presenter P2. (In
general, the state of a process can be presented by presentiag the state of its inputs and/or
outputs.)
The user can interact through the scroll bar using the mouse. For instance, the PD132
window can be scrolled by aquarter of its size by making one kind of mouse reference to a
position a quarter of the way down the line segment (PDB2 presentation). Or, the PDB2
window can be repositioned within P1DB1 by pointing to the relative position along the
border (PDBI presentation). The scroll bar thus offers a simple PPS interface to the
presenter of the screen PPS, P2.

### 4.3 Xerox Star

The Xerox Star [Purvy, Farrell & Klose 83] [,Smnth, Irby, Kimball, Verplank & Harslern
83] and the Apple Lisa [Lisa 84] systems offer an interface organized around the
manipulation of icons -- pictorial presentations ofcommands and data. The two systems are
* similar in many respects. so only the Xerox SLir will be discussed.
Xerox Star Scenario. The Xerox Star models :he user's eiiironment after an office
desktop. (The desktop is. in effect, a directory.) Arranged about the desktop are various
.. ........ ...-.-.. '........'..-......r......................

#### Figure 4-3: Zmacs Scroll Bar

S S.
Always do right. This will gratify
some people, and astonish the rest.
- Mark Twain
When angry, count ten before you
speak; if very angry, an hundred.
- Thomas Jefferson
When angry, count four;
when uery angry, swear. -
- Mark Twain
Nothing so needs reforming
as other people's habits.
- Mark Twain
mI'CS (Text Fill Abbreu) SAMPLE.TXT PS:
|S
* . .. . ......... ". . .____-_______ ._____

documents, in-boxes, out-boxes, and Folders. These aie depicted on tile screen by icons,
small pictures. A document icon looks like a piece of paper with a title on it. An in-box
icon looks like an in-box. Folders contain documents, and their icons look like manila
folders. (Folders arc. in effect. sub-dircctorics.) Figure 4-4 shows asample desktop display.
Also on tile screen are icons for more things than would normally appear on a real desk,
such as printers and lile-drawers. File-drawer icons look like small file cabinets and indicate
directories on remote ile servers.
Interaction involves a mouse and command keys. The user selects something, such as a
document icon, by pointing to it with the mouse and clicking the left mouse button. The
selected icon is highlighted. The user then gives a command that affects the selected icon.
Special keys are provided for several commands.
One important command key is open. It causes the contents of the selected thing to be
displayed. For example, opening a document displays the text of that document. Opening
a folder displays the documents within that folder, Figure 4-5 shows a display after the user
opens the folder Backup. S
There are four universal command keys: move, copy, delete, and properties. These
commands can be applied to any Xerox Star object. In its simplest usage the move
command allows the user to reorganize the visual dcsktop. The user selects the document S
icon and gives the move command. Then, as the user moves the mouse, the document icon
follows it. Clicking again releases the icon from the mouse.
Another important use of the move command is to manipulate the document itself, not
just the organization of the visual display. Tile document is printed by moving the
document icon to a printer icon. The document is moved into a folder by moving its
document icon into the display of the opened Iblder. A document is moved to a directory
on aremote file server by moving tile document icon to the file-drawer icon.
Typing the properties command key produces a property sheet for the selected item.
:-:-i .. ( ,.....

#### Figure 4-4: Xerox Star -- Desktop Display

ccld
mioc rN
' - ..-
r51
.'
.
L- -%-
EI I,
EL
_
:.-'.-'... ,-',
",................................................................-......* ...-
" -...
...
" °" .....
.
" "

#### Figure 4-5: Xerox Star Opened Folder

---1rn ri
LA.s I 4
nIl;
4 ,
** dI
riJLL
M-15E
QQ Q
* -4 I + FLA
84y

igure 4-6 shows [lic part of' the desk top displaying the property shect flir the document
named Chapter 7. 'ilhe property sheet is a tahle, displa~ inr, properties such as the
d eii men
clt\ name11.
Creation date (' ersion ofr"). and \\ hcther to d splay a cov~cr he1el when
-thle th )Ctllmc nt iS p)ICnICd. (A cover sheet con taiins tic(I
his tt helpJ inl Mailing thle dIocuIment,
su~ch asfrwn. to. subject, and an accompanying remark.)
Ilhe user may nmodi ly teic mne and show cover sheet properties. Editing the name
property isthle Way one renamells ado0cument.
A document or lol(Iecr is deleted by selecting its icon and then typing the delete comimand
key. (Similarly, a selected section of docu~ment text in anl opened d0cu~ment is deleted with
tile samec commalld.) Recause dclctioiis avc currently not retraciable, Xerox Star r-equires
conFirmation f7roi11 thle User. A one-I inc mecssage is displayed at the top of the screen,
*together with a yes/no choice. The User confirmis tile deletion by cosn"yes" with thle
miouse. 1igure 4-7 shows thie tipper part of the screen dluring adelete of the Backup folder.
Xerox Star Presentation Model. Figure 4-8 shows thle presentation miodel fo~r the part of
tile Xerox Star system discussed in the prcvious scenario. Tuhe model comprises Iour PP~S
comlponenits. As in the model for Zmacs, a window-display PPS cascades with the primary
PPS.
Desktop ITS. The desiktop PPS is thle p~rimary PPlS. The application database A[)B
contains docu men ts. folders, remlote file servers, in-loxes. out- boxes, and printers. These
are presented by icons and windows in the presentation database P1)81 (the picturle of te
desktop). Windows present domain objects. such as dIocumentI1s, by presenting their
contents or properties.
Icons haivc little presentation structurie, hut even icons are not primitive. i.e.. thley, are not
inme presentations. Two kinds of presentation structurie occur. Icons p~resent thle name or
the dIocument, printer. etc.. and the appearance of thle icon presents thle type of thle object,
7 by depicting a stylied typical example.

#### Figure 4-6: Xerox Star -. Property Sheet

lj~e ul Tn , ....
apt
gr3 .. lc:)(0
XS
Desone anf: DJef8
62 , ailC ~ler.SUNrha
-3 f S
S how
86 ..

#### Figure 4-7: Xerox Sur -- Deltc Conifirmation

Are you sure you want to DELETE that objec:t, eES NO

#### Figure 4-8: Xerox Star Model

AO0
v4S
.4S
) cc

Windows are composite prescntations with many sub-presentations. Folder windows. for
example, present tle collcction of do 'uments and sub-folders in the folder by presenting
them as icons within the window.
Consider the move command discussed in the sccnario, an operation provided by the
presentation editor PEI. The move may go unrecognized, merely changing the position of
icons on the desktop. However. when a document icon is moved next to a printer icon,
recognizer RI translates the move into a.print command. When a document icon ismoved
into a window presenting an opened folder, RI translates the move into a command to
move the document into that folder. In other words, spatial adjacency to a printer icon -
presents the fact that a document is being printed: spatial containment within a folder
window presents the containment of a document within a folder. The user can create these
spatial relations using PEI, and RI implements the commands to create those presented
conditions.
The delete command in the scenario refers to a selected document icon. Recognizer RI
translates this into a delete-documaent command, but does not immediately send it to the .
application database. The delctc-confirrnation PPS isused to allow the user to first confirm
the deletion.
l)lete-Confirmation IPS. The application database of the delete-confirmation PPS :-
contains two rcrognizer control commands: aconfirmation ("do it") and an abort. These
commands are presented in PDB2 by presenting the delete command in the question and by
presenting the choice between the two commands as a yes/no box.
The user references the yes/no box with the mouse, using presentation editor PE2.
Recognizer R2 translates this into the confirmation or abort command and sends the
command to R1. If confirmed, R1 proceeds to send the delete command to A)B. 0 S
Window IPS. Some text and graphical objects in PDBI are within windows for opened
documents, property sheets, etc. From these P)131 objects, presenter P3 selects those
objects that will appear in the window. These visible icons and text are the contents of the
89 -
. .

presentation database PDB3.
Mouse references to text or icons within the window are made with presentation editor 0
PE3 and translated into references to the presentation database PI)11I by recogniicr R3.
These are then further recognized by RI as commands to the application database. ..
P3-Control PPS. The window presenter P3 accepts presenter control commands for 0
scrolling the window. Scroll commands are presented by arrows in the margin of the
window, i.e., in presentation database PDB14, by presenter P4. The user can point to those
arrows with presentation editor PE4. Recognizer R4 translates those references into
selection oFscroll commands, together with a "do it" causing them to be sent to P3.

### 4.4 Steamer

Steamer is a prototype system designed to help train operators of U.S. Navy steam
propulsion systems, incorporating color graphics. knowledge-based instruction, wid
comprehensive simulation models [Stevens, Roberts & Stead 83] [Stevens & Roberts 831.
Only the user interface aspecls of the graphics and its connected simulation model will be
considered here.
Steamer uses a simulation model that consists of about eight thousand state variables,
together with updating functions, which are processed once a second. (The simulation
proceeds in real-time.) The user watches an animated schematic view of the simulaticn.
1'here are several such views, one of which is shown in figure 4-9. 1he schematic is
continually updated, producing an aninated view of the system. Certain elements in the
system can be made to fail (e.g., a valve sticks open), to provide training for emergencies. 0
'[he user controls the systemn by pointing to various parts of the schematic with a mouse
and by using menus. Pointing to a valve icon changes its state, opening or closing it
Throttles are set by pointing to the position within them that indicates the new value. Fluid 0
levels are changed by pointing to a new level position within (he fluid tank icon. In addition
to pointing, another console displays different menus of operations and choices f r
.~.- . . *.
. **
. ... .. . . . .. - - . ... .:,..,

#### Figure 4-9: Sample Steamer Schematic

SE-')E S E KE--- FEED
FrFT EMEF~
[.r
p Jj T
F4 r i) I
J.-Pr I
r:f Tr 11-C
I.
FEE[, [A
T~t~ !Nf91
.[( . . . . . .,

controlling the simulation and choosing displams. Figure 4-10 shms asample display of the
menu console.
In what fo1llows. two kinds of users ,
ill he mentionCd, tile student and he instructor.
Both iuse Steamer's schematic cditor. The instructor uses the schematic editor to bild the
schematic views orlthe system. Ilie student nscs the schematic editor to build controllers Ibr
a process.
The Feedback Minil-ab [Forbus 81] is an extension to Steamer designed to teach control
system concepts. For instance, one exercise is to ensure that the telperature of oil in a
sump remains at a specified value. The student builds a controller by selecting graphical
icons of a measurement device, comparator, actuator, etc., and connecting them together on
the screen. Steamer builds the underlying sintlation for this device and connects it into the
* main simulation model so that the student can study the resulting operation. 0
Steamer Presentation Model. The heart of the Steamer user interface is the continual
schematic view of the state of the simulation. This view is modeled by the PI'S labeled
"SinILu ation Schcma:tic PPS" in figure 4-11. The application database AD)B1 contails the
set of simulation state variables and various functions of these variables. The presentation
database PD131 is the color graphics schematic.
Steamer schematic presentations are constructed from icons, e.g., symbols for valves, 0
gauges. pipes, etc. Figure 4-12 shows a sample of these icons. These present state variables
or functions of state variables. tach kind of icon presents in lormation in a particular way. .
Valve icons are green to present an open valve, red to present a closed valve. Dials have
indicators that point to the presented vahcs. Pipe prescntations (rectangular pathways
between other icons) use color nmap techniques to show animated fluid. Mith small colored
blocks moving through
tlie pipes. The apparent speed of movement presents the speed of
* the fluid, as com1puted from state variables. Ihe kind o1' Iluid (e.g.. stCamn, water, oil) is
presented by the color of the moving blocks.
"he schematic presentation is updated by presenter P1 alter c.:i c,, I(-
oI thc simulatiOni,
0 ,-

* S

#### Figure 410: Stc~trncr Menu Consoic

t
S
I CL
6I 0
- - -rD
a
-r -
* S
* -1
S
C
S
* - -, S
0 -. S
o
* S
* S
* - -. -, -. -A-.-,-................................... . . -

RD-RI59 311 PRESENTATION BASED USER INTERFCES(U) MASSACHUSETTS 2/3
INST OF TECH CAMBRIDGE ARTIFICIAL INTELLIGENCE LAB
E C CICARELLI AUG 84 AI-TR-794 N98914-?5-C-S522
UNCLARSSIFIED F/G 9/2 N
Ehhhhmhmmhhhlm
mhmmhhhhhhlm
""III"""omi
mhhhmhhmml
n

r
12.
l~lN
ill
iill ..
1lis.25 *2
11.
NATIONALBUREAU Of SITANDARDS-
1963-A
'- :*
li u - *- ii,.
. -
" -
-.
..
..
.
.. .... . .- .. -,
.:
.-.
.-
...,..
.. . ..: . .. -.
_ ..1. ,. . . _ .- - ..
.- , . . .-.. -.-
,-o ," " %-,°°-° " °- -" -, -, -° . " -° °" ., °" ." ..o,,,.°°° '.* .".-*°.'-. °" ,L-° ° " ,"

#### Figure 4-11I: Steamer Model

Pit
p'F PiSf e
pi 5- T0
p P-5
R50
9a4
P~x

#### Figure 4-12: Sample of Steamecr Icons

ICON SAMIPLER
Circl
IQ squa re dianimron fHrArI(4l o t. on
ttop val... C
-hn i~ rga.9ol r. jijIn
...
.l p~
digital bar bat- fnr bar jil C lurnn r ir-
multi-pict grph
40 81ii
0 0 Ci

-' . - ~
. - ~ . . . . . . - - ."-
- -
,~ °
when the set of state variables is consistent. Thus the user sees an animated prcsentation of
the ongoing process. This is a different situation from the other user interfaces discussed in
this chapter.
There are two kinds of animation in this presentation. First is the overall schematic
animation just mentioned, produced by continually updating a presentation of a changing
process. The other kind of animation, however, is an explicit graphics technique used as a
presentation itself -- the presentation of fluid flow within pipes. This animation isproduced
by graphics routines from a static descriptionof the process. i.e., computed from a single, "
instantaneous simulation state. (The pipe flow animation continues even when the .
simulation is halted -- just as other information about that single state isstill visible, such as
dial readings or valve colors.)
Presentation editor PEI lets the user interact in the simulation schematic PPS by mouse - 0
references. Recognizer RI interprets these references in many ways, depending on their
positions within the different kinds of icons, translating the references into changes to state
variables.
Presentation editor PEI in the Feedback MiniLab also lets the user create, move, connect, .
and edit icons for the process controller. Recognizer RI translates these created controller
presentations into commands to create the simulation for that controller and connect it to
the rest of the Steamer simulation.
Steamer Menus. Steamer has many menus, occupying a second screen. Several of these
are modeled in figure 4-11. The select-schematic menu PPS models the menu that lets the
user select which schematic to view. This PPS is an interface to the presenter P1, with an
application database of PI commands to select the various schematics. Presentation data , .-
base PDB2 is a menu. a set of text presentations, each naming a schematic. Presentation
editor PE2 models the user's selecting a meuu item with the mouse. Recognizer R2 then 0
translates that into a choice of the presented select-schematic command and sends it to -. .-
presenter P1.
k-', ~~96 ''-i'-
,.°°,*~ a. ., V

TS
The casualty Menu PPS is another interfacc to the main applicalion database AI)BI, the
set of simulation variables. With this menu, the student or instructor chooses a casualty, .
recognized as a command to change sonic set of'variables to simulate the particular device . -
failure.
Creating Views. Tle instructor schematic-editing PPS enables the instructor to build and -
alter the main presenter Pl's schematic views of the simulation. The schematic editing
offired by presentation editor PE4 issimilar to what the student has when creating a process
controller, except for this PPS the simulation is not being changed. Instead, the style of
schematic presentations that P1 builds of the simulation ischanged or extended.
The PPS labeled "Tap PPS" extends the instructor's interface to the recognizer, R4, of the
schematic editing PPS. As the instructor builds a schematic presentation for a new view, R4
must be able to determine what simulation variables or functions on them these new icons
will present. (In Steamer terminology, R4 has the job of establishing tapsfrom the icons to
the state variables.) Presentation database PDB6 in the tL PPS offers a form for the
instructor to fill in, e.g., specifying a expression of some state variables. R4 combines this
information with mouse references to the new icons by PE4 to establish the icon-simulation
specification for the PI style.
a- -x-
W a
4.5 Summary ofStructural Features 4
This section summarizes the features characterizing the structures of the extended
presentation system models used in this chapter to model the computational behavior of the
different user interfaces. Although the interfaces discussed appear very different, there are 0
some strong underlying computational similarities, and the presentation system model
highlights these. The overall appearance to the user, the use of icons versus menus, etc., is
certainly very important to the success of the interface. However, these are questions of
interface style: the presentation system model looks below the style to identify common 0
components and behavior. The success of the presentation system base concept, as
developed in chapter five, depends on this commonality.
V
.
.
Z.'2.'.' .':"
.'."""""."."..".."".."".... ..
"....." .-
".
"
.... , . . ?_-- -..... "......-- ...

The primary structural feature to be discussed is the way in which one PPS is attached to
another. There were several kinds:
PPS to a Presenter. In Dired, the main presentation database. the directory listing, is
also used as a presentation of the directory presenter's state. Editing the directory listing is
recognized as controlling the presenter's state. Presenter scroll commands arc presented by
icons in Xerox Star and the scroll bar in Zmacs. Steamer has two kinds of presenter
interfaces: a menu allows selecting schenatics, and schematics can be edited by the
instructor to change the schematic style. The latter capability issimilar to Dircd's use of the
directory listing.
- PPS with Commands. A PPS with commands to a component in sonic other PPS allows
planning-- to postpone the action while the action is being specified. Dired includes an
annotation interface to the main application database in order to plan delete commands. S
The Zmacs minibuffer interface allows the user to compose a presentation editor command.
Star and Steamer include command interfaces to recognizers. the delete confirmation PPS
in Star and the tap PPS in Steamer.
Multiple PPS Interfaces. An application database can be presented in two or more
separate PPS interfaces. In Dired, the deletion planning PPS and the deletion confirmation
PPS present the same database ofdelete commands. In Zmacs. the command minibuffer
PPS and command completion list PPS both present the same database of presentation .
editor commands. In Steamer, the main (simulation schematic) PPS and the casualty menu
PPS both offer interfaces to the main (simulation) application database.
Cascaded P1PS Interfaces. Zmacs and Xerox Star both include a similar cascade of
screen/window PPS and main (bulTer/desktop) PPS. The screen/window PPS provides
such fcatures as clipping, scrolling, line wrapping, and mouse reference. Some user
commands operate within the screen/window PPS. others within the main PPS, depending
on whether they depend on the visual aspect within the window.
Sharing. Section 3.4 discussed the kinds of sharing that can occur within presentation
: ]&...-.ar .t

systemns. T[wo important cxanilcs have occurred inthis chapter. First, Dircd and Steamer
include at presentation shared be-tween two PPS intcerfaces, the main presentation database -
(dirctzory listing or schematic) and it PPS interface to the main presenter. By editing the
dircctory listing or schematic, the user controls the main presenter's prescniation style.
Second. in Dired. screen space isshared: directory annotations are intermingled with the
parts of the directory listing. Somewhat simpler, hierarchical space sharing occurs in the
Xerox Star, where windows appear within the overall desktop area, and such things as scroll
icons control the window presenter appear within the windows.
LS
.~~ - . .. . . . . . . . . . . . . . . . . . . . . . . . . . ...
I _% t."- :.

## Chapter Five: PSBase: A Presentation System Base

A presentation system base is a collection of mechanisms and t(xls for building user 0
interfaces whose architecture lollows the structure of the presentation system model. A
prototype, called PSBase, has been implemented on the MIT Lisp machine [Weinrcb, Moon
& Stallman 831 and will be discussed in this chapter. With a presentation system base, the
job of building good user interfaces becomes much easier. Chapter six illustrates the utility
of PS Base by discussing the implenientation of an interface built on top of PSBase.
In certain respects the architecture of PSBase resembles the presentation system model
proposed in chapters two and three. Some of the PSBase modules support particular PPS
components, and in general, domain-independent and style-independent mechanisms are
isolated. This structure in turn encourages good modularity in the user interfaces
constructed. Figure 5-1 shows the fundamental support of PSBase modules for PPS _0
components. Figure 5-2 shows the overall structure of PSBase, with arrows indicating uses
relations. The reason the PSBase architecture does not exactly resemble the PPS modcl (see
figure 2-1 on page 29) is due to the different goals of the model and the base. The PPS
model analyzes the activity of a user interface. PSBase is structured to emphasize the
sharing of knowledge: information is not redundantly represented. Also, figure 5-1 shows
only some of the PSBase support: the basic style packagcs module supports the
construction of combinations of PPS components and PPS extensions.
Each PiSBase module will be discussed in a section below. There are three layers in the - .
structure: The database nmechanisms module at the bottom of the figure is (to a large
extent) a general support package, not specific to user interfaces. The four middle-layer
modules represent general presentation-system support, i.e., tools and mechanisms used to
construct various interhace styles. "Ihcbasic style packages module at the top of the figure . . - -
comprises specific components of interfjace styles that the inter-face builder may or may not
.I. 0"'
"-" .°.°...°° o. .o..°.. .. . ".' ' ' - . . o ' " ." .... ".".'.".. . -.. ° o. ' ...°. .,,° ". °° . ....-
o' .
j o°. - -° °.° -, - . °- -. °-
.......-.......................-.............................. ° .- °°.'°
. .. .°.,.°° ° . . '. - ° -.- °-. . q - *.°°-o . . - . ° o.-...°-., - . - .

777777 0

#### Figure 5-1: PSBIasc Support of'PPS Components

IC r
RC-b 1!PL19Y SUPPO/RT !(-)PPOR T

#### Figure 5-2: Structulre of PSBasc

BASIC STYLE PACKAEES
A0
a S Cppo.- SLJPPORT
G 0AHISEn7
DATA BA5E MECF1AWJSM1S
%,71 --

choose to include. Tlhesc packages, however, are independent of any particular application
domain.
..
* 5.1 )ata Base Mechanism
PSBase includes support for building data hases structured as networks of objects. Much
of this support is provided by the Lisp machine's flavor systen for object-orientcd
programming. PSBase imposes certain conventions, provides ai existing flavor structure for
the descriptions, and provides tools for manipulating and extending the network structure.
The I.isp machine flavor mechanisn allows multiple inheritance of classes of objects
(flavors). PS13ase extends this slightly to allow limited inheritance and description of
properties ofobjects (instance variables of flavor instances).
The basic database mechanism is used for building application databases (descriptions of 0
files, directories, mail, and commands, for example) and the presentation database (various
kinds of presentations, their properties, and their relationships). An important point is that
the presentation and application databases arc linked together, so that in effect they are
both part of a large, uniformly structured database. Many of the PSBase mechanisms rely
strongly on the fact that the same database mechanism is used throughout. Because of the
importance of the database mechanisms, they will be discussed in detail in this section.
One example of the benefits of having a uniform representation technique is that the
presenter's domain collector and other domain-dependent modules can be minimized and
more presentation mechanisms can be shared. The interface builder can experiment nd.
change the implementation more easily, changing the presentation styles or adding new 0
presentations, for example. Uniformity facilitates the construction of presenters.
This research did not attempt to build astate-of-the-art knowledge representation system.
However, the database mechanisms in PSBase are inspired by such systems (e.g., KL-One 0
and its successors NIKL and K l-Two [Brachman 78][Brachman & Schniol,e 85] and
Omega [Attardi & Simi 81] [Barber 821), and a full-scale presentation system base may very
well benefit from such a system.
103 "-""-""
,. -.. '" " '.

An important capability of the data hasc mechanism isallowing the description of classcs
of objects and thc relationships between classes -- particularly spccializ~ation and the
* inheritance of' propertics of objects of a class. Figure 5-3 shows an example. part of an
application database network describing Files and directories. T[he application database
* ~contains both class descriptions and also instances Of thMA
The style of the Figure is based on that used for drawing KL-One networks. Ellipses show
class descriptions-, shaded ellipses show instances of classes. 1)ouble-stemrned arrows show
the containing class. Small boxes connected to ellipses show properties; these properties are
inherited by more specialized classes. (In addition, as will be seen later in this chapter, other
* mechanisms in effect "hang of' of particular classes of the database, and these also
undergo asort of inheritance.)
For example, the class file is shown by the ellipse labeled "file"; it is a specialization of
thle class (i.e., a kind of) generalized file, which in turn is a specialization of thle class
* overating system object and dolmin object. Afile link isalso a kind of generalized file. The
network shows that generalized iles have several properties: directorypt/ine,etc. Files
* and links inherit these properties.
- ach particular File in the application database would be represented by ani
instance of
Sle. One such instance is shown. Its reference date property isshown, linking that file..
instance with a particular instance of the class date. The file instance also has several other
properties (directory, path, etc.), linking the file instance to directory, pathnarne, etc.,
instances, though they have not been shown in this figure.
Single-stnined arrows from a box shows the value of that property, or for classes, the
type of such aIValue. Some properties are specified as having a list of values; directories, for
instance, have aproperty whose value is a list of iles. A list property is shown as a box with
acircumscribed circle. (One of the limitations of PSBase isthat these type-restriction links
are not fully implemented in the current implementation. [hey are shown here to better
document the relationships of classes when instantiated. I"lowever, PSiase does include a
f.
simplified type restriction mechanism used for certain parts of the database.)
.*" . .
. .
. . . . . . . . . . . . . . . . . . . . ... . o
. . .

#### Figure 5-3: AClass Description Network

PSBase also offers a rudimentary ability to classify properties. This ability isnot reflected
in these figures, in the interest of clarity. For instance, circles, text. and other presentations
typically have properties defining their positions. The description mechanisms allows these .
properties to be labeled as defining positions. One example of the benefit of such ascheme
occurs in the implementation of the presentation editor function that iUovcs presentations:
tie function can examine the description of the presentation to find its position-defining
properties and change them, without any knowledge about the particular kind of
presentation.
Presentation )ata Base. PSBase provides a mechanism for building the presentation
database. This includes an already-constnicted part of the database network structure that
defines several classes of presentations, inter-presentation relationships, and the properties
that connect the presentation database with the application database. (As already
discussed, they are not really separate databases, but rather different parts of the same, 0
overall database network.) Each presentation can have a record of the presented database
c ta
mid dhe twcsciitatioll style used. Most of' the modules if- .I... (piiiLuIJciCl,
recognizers, graphics redisplay, etc.) depend on the known organization of the presentation
database and on the fact that it ispart of the overall, uniform database structure.

#### Figure 5-4 shows part of the presentation data base and its relation to the application data

base. The main class is presentation. All presentations have a property called presented
domain object, which records the domain object being presented. For example. text
presentation Ti (an instance of thle text presentation class) is shown presenting the file
OZ:<NSR>QUEUE.NOTES. This isrecorded by Ti's presented-domain-object property
linking 77 with the file instance.
[igure 5-5 illustrates three kinds of inter-presentation relationships supported by the
presentation database network structure. First, composite presentations may be
constructed; these have a property whose value is a list of sub-presentations. Second, a S
connecting arrowjoins two presentations; the arrow's end positions (xl, yl, x2, y2) arc
derived from its cnd presentations" positions. Third, two presentations may be attached.
.*-
... -- "- _ .' . '... -. . ,. ... ... . ..-. -......--..
.. ,..
....-... ,.-.,...... .....
.'
"-.'
..'':
. ."."
:. .. .. . .. . '.". . ";- '... '..''.': .. .. . '....'- '. -.
". .".-- ." . .- ,.-. -.. " .-. " .. - '. -. '.
'.

#### Figure 5-4: Sample Presentation [)aLi Base Structure

4J'
CLC
boo

#### Figure 5-5: Inter-Prescn Lation Relationships

-PS
C.,\ n e-

('onnecting arrows cause themselves to be attached to their end presentations: in general,
an) two presentations may be attached. The attachnect relationship is asymmetric and has 0
the l')llowing meaflirng: p/ attached to p2 implies that pl is rcpositioned or deleted whenever
p2 is repositioned or deleted. respectively. In the figure connecting arrow CAI is shown
connecting TexI/ and Text2. If Texil, say, is moved. CA/ will have its end positions
rcderived. lhe arrow will be redrawn, and the arrow will remain connected to the two
pieces of text.
The important Iact about this scheme for structuring the presentation database isthat the
general database mechanism is being used, rather than a represcntation tailored to
particular kinds of pictures. The presentation database lits within an overall database
network with a unilorm method olorganization.
This has four implications. First, the database mechanisms can be shared. Second, the 0
database mechanism does not limit the kinds of presentations that can be used -- the
network can be extended by the interface builder to add new kinds. Third. ancillary
information about the presentation can be recorded; such information can be useful to
presenters, recogrizers, and presentation editing commands that need to make decisions
about the presentation. Fourth, the presentation database can itself be treated as an
application database-- it can be presented.
The last of these is important for matching the structure of the implementation to the
structure of the model. One kind of example is the cascaded presentation systems of Zmacs"
and Xerox Star as modelcd in chapter four.
(onimand Description Support. PSBasc has a mechanism for describing commands in
the database and connecting these descriptions to the actual L.isp machine functions. User
options (Lisp variables) can also be described, and command documentation can refer to
these variable descriptions. Variable descriptions themselves can have associated 0
documentation.
The classes of dcscription involved are shown in ligure 5-6. lhe primary kinds of objects
.... ..... .............. , . .. ,. ....... °, - - .%,o-..........
--.-- ,. . . . .," ' -°°-
. - I . . -
... .. . , '- .". .-.. .

#### Figure 5-6: Command Description SLIpport

.DS
5e trj Apt cA.9
IC "'k

are commands, describing Lisp functions, command sets, describing groups of related
functions, and command applications, describing the invocation of a I.isp function with a list
of argumcnts. A command application has a state, which specifies whether the finction has
not yet been invoked on these arguments, is currently being executed, or has completed.
Functions may be invoked by building acommand application description and then. using
the Lisp machine's flavor-system message-passing. sending the command application object -
an execute message.
In addition to the properties shown in the figure, commands also include properties
specifying the name, documentation, sub-commands, variables used, and the verbs that may
be used to describe the command.
Each command description includes a list of parameter descriptions, which must match
the arguments given to the command application. The command application object checks 0
its arguments for validity when it isformed. Each command parameter description includes
properties specifying name, documentation, and a description of the type of the argument
required. There are several specializations of command parameter type, one for each kind of
argument that may be supplied to user commands.
For example, one of the Lisp functions printing liles takes two arguments: a file and a
printer, which is to say two instances in the application database, a file instance and a -
printer instance. The command instance for this function includes a list of two parameter
descriptions that describe these restrictions: the first parameter specifies the type file, and
the second parameter specifies the type printer. To invoke this function, a command
application instance is created, its argument list containing the particular file and printer 0
instances. As the command application is formed, the arguments are automatically checked
against the parameter types for validity. The command application isthen sent die execute
message, causing the function to be applied to the arguments. and the file isprinted.
Execution Monitor. The command description mechanism is extended by automatic
'-" connections to the L.isp environment, for use by the PSBase execution monitor. When a
command instance is created, the L.isp function it corresponds to is automatically modified
-" ~~~111 ''"" '
'
f.- -.
* . .*** , , ,', _
,-.. . .

so that the execution monitor is notified when tile function is invoked and when it returns.
The execution monitor maintains a stack indicating the current execution state in terms of
the described procedures. In addition, command application descriptions are placed on the
stack while they execute.
Reference Resolution. Presenters and recogniiers must often resolve a presentation
reference to an instance in the database of a particular type (or. in gencral. to an instance
that satisfies some predicate). In the simple case, the value of the presentation's presented
donnain object property isof the correct type and no resolution is needed. For cases when
this is not true, PSBase includes amechanism for finding a related database instance that is
ofthe correct type.
An example will serve to introduce the three kinds of resolution provided. The user
invokes a command that requires a directory as one of its arguments; the user selects a -S
presentation as this argument. In the simple case, the presented domain object property
links the presentation to a directory. uid the resolution istrivial -- iust follow the presented
domain object link. Figure 5-7 illustrates this case and the others to be discussed. The
dotted arrow indicates the path followed by the resolution mechanism in order to reach the
directory instance. (It is the directory instance in all cases that will be returned by the
resolution mechanism.)
The first (and most common) kind of resolution applies when the presented domain
object is a property, and the property's value is of the desired type. Resolution is to the
properly's value. In the case illustrated in the second part of figure 5-7, the user has selected
a presentation of the directory property of a file. "
The second kind of resolution applics only to ccrtain kinds of properties, termed essential
properties. Thesc are properties for which the value is, in some sense, equivalent to the
object owning the property -- equivalent in terms of its use as a referent. The pathname -
property of a file is essential -- any name property is. (Specifying which properties are
essential is part of the task of defining the application database class network.) For
essential properties, the rcsolulion mechanism walks to the owning object. In the case
-. 7.

#### Figure 5-7: Rerercnce Resoluion

IZ I
TFAT 'X
fdRefRS~i-
t~j~J
.7ZE X13
p-C A 5)r
k
...-
e . .-.
'
P... r.Q

illustrated in the third part of figure 5-7, the user has selected a prescntation or the name of
the directory.
The third kind of resolution walks up the presentation hierarchy, from the referenced -. _
presentation to the composite presentation that contains it. looking for a satisfactory * "
presented domain object. In the case illustrated in (he fourth part of figure5-7, the user has .
selected a presentation that is a part of a directory presentation, but which does not itself 0
present something that can be resolved to a directory.

### 5.2 Graphics Redisplay S

This section discusses the next PSBase module shown in figure 5-2, an incremental
graphics redisplay mechanism that has the responsibility for continually displaying the
presentation database. The graphics redisplay module maintains a description of the forms
drawn on the screen. It continually compares this with the presentation database
description. Those presentations whose defining properties have changed are redrawn and
the sc;-en description is updated, new presentations are drawn, and deleted ones erased.
Each presentation instance has atimestamp that isautomatically set whenever any change . -
ismade to that presentation. Graphics redisplay restricts its attention to those presentations
that have changed since the last graphics redisplay. Composite presentations are marked
changed whenever one of their sub-presentations is changed. Therefore, ,he search for
changed presentations is substantially reduced: entire composite presen!ations can be
skipped by asingle check of the composite prescntation's timestamp.
Graphics redisplay connects the presentation database to the Lisp machine's graphics 0
package (extended slightly for PSBasc). The defining properties of the forms to be drawn or
erased are passed as arguments to the appropriate drawing procedures.
114 . . - .
* .-.
~?-..-~ ~
. .9 . .-.. - ,.- ,:

### 5.3 Presentation Editor Functions

I'SBase olffrs a set of presentation editing functions that as a whole can be used as a
general prescntmation editor, or the finctions can be sclectively combined as part of aspecific . .-
user interface. 'he presentation editor functions are independent of the database domain,
presenters. recogniers, and their styles. [he editor functions also have a history-keeping :"-<'.-.'-
mechanism that records commands used and the presentations at'l'cted. Ibis history isused 0
by some editor functions (e.g.. the command to undo a previous erase command) and by
other PSBasc modules ifneeded (e.g.. a recognizer may need to inspect the editing history).
The presentation editor isa combination of a text editor and a diagram editor. The user
can place text at any point on the screen and use Emacs-like commands to edit the text.
There are only a fw such text-editing commands in PS 3ase. However, this is due to the
limited nature of the project, and not to any inherent limitations. A full-scale presentation -
system base following this approach would include a much larger editor module. '[le
diagram-editing capabilities in PSBase include the following:
* Creating lines and arrows between two positions or between two presentations
* Creating ellipses, circles, and rectangles -.
* Creating an ellipse or rectangle around a given presentation, computing the size
and position from the presentation
* Moving a presentation to a new position
* Erasing a presentation or undoing an erase
* Attaching or unattaching two presentations and presenting attachments visually
* Aligning one presentation with another, by center or edge positions

### 5.4 Presenter Support

This section discusses three kinds of presenter support provided by PSBase: first, a data . -
base mechanism for describing certain properties of presentation styles, second, three
general semantic presenters that are driven by these style descriptions, and third, some
...
1 . .. . ... ..
~2Z
. - - - " . -'-. ..-. . . . - . . . . . . . O .*- ° . . °
'- o -

organizational presenters that may be independently combined with the semantic presenters
in order to specify a stylc's layout method.
Presentation Style Descriptions. A presenter has an associated style, which describes how
the presentation isstructured and related to the presented information. There arc four basic
classes of style descriptions in the current PSBasc implementation:
Primitiveprescntation styles do not refer to other presentation styles, nor do they describe
the structure of the presentation. Instead; they specify a procedure that creates it (a
"canned" presenter). One goal of PS ise is to reduce the number of primitive presentation
styles that must be written, as they require considerably more effort than do the other styles
discussed here.
Graphical presentation styles do not refer to other styles either, but do include a
specification of the presentation forms and their properties. These properties may be
computed from properties of the presented domain object and from properties of the
composite presentation being constructed.
Scquence presentation styles specify how to present sequences of objects in the
application database. For instance, a directory contains a sequence of files, along with
other properties of the directory, such as its name and protection. Sequence presentation
styles specify a presentation style to use for the element presentations. They also optionally
may specify prefix, infix, and suffix presentations to separate the presentations of the
elemcnts of the sequence.
Template presentation styles build larger presentation styles out of a fixed number of
smaller ones, interspersed with text presentations that do not present any domain
information, but merely serve as the template.
Each kind of style description also specifies a style name. the class of domain object (in
the database network) for which this style is appropriate, a flag specifying whether this is
the default style for that class, information concerning semantic redisplay, anod an
,-.-. .,,-., .. ,.-,~~~~~~~~~~~......
......... .......... o-......-.-..... . -......... .-..-.- , .,,,-
." " -ao---' ,, *
P " ""- """- "", ' o ,',. . . % . .t " . % ,. .-. o- - , %-o . ". °
. ..- . . .. ' ., . °- -
- ., o e ° ", , -- ,, , '% _' _m
°.-'t 'm % _ , ,--. %,',_'" . ." . ."
°
- ," ,,' ',-° -', ',,0 ".° °° ". °° ."°, , -" -" "°%o*,%.* .-
*- ", ". °° "." ", " "-

organizational presenter. Since domain object classes can be specialized. styles can apply to
a wide variety of objects or to just a specific few. One can think of prescntation styles as S
bcing attached to classes in the database. Thcsc attachments drive the process ofselecting a
Suitable presentation style.
For example, PSBase provides a very general presenter, called the phrasal prcsenter. This
presenter produces (in most cases) noun phrases for a given domain object. This style
description for this presenter specifies that it applies to the class tdonain object. i.e., it applies
to any instance in the database. This applicability derives from the fact that the phrasal
prescntcr can always produce something -- at least something of the form "a" followed by S
the name of the domain object class, e.g., "a file". Furthermore, it takes advantage of the
uniformity of the description mechanism and inspects the properties of the object to see if it
has any property that is a kind of name. If so, it uses the name, e.g., "the file
OZ:<NSR>QUEUF.NOTES.I". The phrasal presenter will be more fully discussed below.
On the other hand. another presentation style anplies to the specific class time of day.
producing text presentations such as "02:04:46".
The presentation style mechanism supports two major operations, finding a named 4- -
presentation style and finding the most specific presentation style applicable for a given
instance in the database. Typically, several styles have a matching class, i.e., attach to .
classes to which the instance belongs. The one with the most specific matching class is
chosen. (E.g., time ofday would be preferred over domain object if both match.) If there are
two or more styles with the same, most-specific class, the default is chosen. Styles that are
not dhICwlts arc invoked specifically by mune. In a larger presentation system base the
comparison could be more involved, taking into account specific properties of the domain
object to be presented.
Style-Driven Senintic Presenters. PSBase offers three semantic presenters whose S
behavior isdetermined by the kinds of style descriptions described above. It also provides a
semantic redisplay mechanism that pcriodically invokes the presenters so that they update
existing presentations. Examples of the three major kinds of style descriptions will be used
.".
- .. ° °- ~~~. .?..
.. . o.'.'-. .°.. ..
. . .
""-." ' . .... . - " .. . -i''. . " - - -'.
° ' "
""-".°

to discuss the action of their associated presenters.
S
Thc first example is a simplc clock prcsentation. The presented domain object is the
current litne of day instance in tlie application database. Ilere, the presentation is a
=:i composite of"two sub-presentations, a circle (the face of the clock) and a vector (the hour
hand). In this simple clock there is no minute hand and there arc no text labels on the face.
* The following is what the interface builder would write to construct this presentation style
(the small function angle-froin-hours-and-ninutes,
which perfbrms the simple trigonometric
calculations, would also have to be written): ,0
(def-graphics-presentation-style CLOCK TIME-OF-DAY nil t 120
((NIL
(circle-presentation
:x (relative-to-parent-x 25)
:y (relative-to-pai-ent-y 25)
:radius 25))
(:HOURS
(vector-presentation
:length 14
:angle (angle-from-hours-and-minutes
. ( Nemd p,'ez~eiLed-dun,). i,,-ubject ':hours ) " i "
-- (send presented-domain-object ':minutes)) -.
:xl (relative-to-parent-x 25)
:yl (relative-to-parent-y 25)))))
The first line specifies five general parameters: te style name, the applicable domain - -
Sobject class, a flag specifying whether this is the default st le for that class (nil here
indicating that it is not the defatult), and two parameters for semantic redisplay. The first of "
* the two. t, is a flag specifying that this is
an active presentation and therefore should be
* updated periodically. The second, 120, specifies how often it should be updated, every 120
seconds. (This updating will be discussed below.)
- Next is a list of presentation specifications. The first one specifies the circle, The nil
" indicates that the circle does not present any domain information Then comes a Lisp
* property list. (circle-presentation ...), specifying that this presentation is a circle and
specifying its properties. For instance, the first property specified is the x coordinate of the
circle's center. Its value isgiven by a form to evaluate, which relates the circle's position to
*i the composite's position (which generally is its upper-left comer).
. ..

Next is the specifiation of the hour-hand vector. The first item gives the property this
presentation presens. namely, the hoursproperty. The property list for the vector is similar
- to the one for the circle, except that it has a more complicated form to specify the angle. In
, particular. it has two message-passing foirms that access properties of the prcsented domain
objcct. (The symbol presented-domain-objectwill be bound to the composite prescntation's
presented domain object.) The first, for example, (send presented-domain-object 'hours), 0
retrievcs the value of the hoursproperty of the presented time ofdcvobject.
The following is what the interface builder would write to create a presentation style,
named set-notation,for presenting instances of the object-sequenceclass: 0
(def-sequence-presentation-style SET-NOTATION OBJECT-SEQUENCE
nil nil nil
just-name
:
horizontal-layout 0
:border-box)
An object-sequence has an elements property containing a list of objects. For example, if
this cere a 11st
ot objects with the names UNL, I WU, and I1l1K EL,the sequence would be
presented inthis style as
IoNe, TO.tree
'Ihe first five arguments are the same as for the graphical presentation style. (In this case,
the last two nils indicate that the style is
not active, i.e..
it
will not be periodically updated.)
The third line of the definition specifies that there will be prefix ("{"),infix (", "), and
sufLix ("}") text presentations. [he fourth line, just-name, names the style to use for
presenting the elements. The fifth line, :horizontal-layout, narnes the organiiational
presenter to use, so that inthis case the element presentations will be laid out horizontally
(with the infix prCscntations interspersed). The last line, :border-box. specifies that a
rectangle should be created. litting around the presentation.
".iThe following is
an example of the last of the three style descriptions, a template style for
°S
.
°

presenting objects of the class time:
(def-teiplate-presentation-style DEFAULT-TIME TIME t
((:date default-date)
(:tine-of-day default-time-of-day))
horizontal -layout)
The presenter constructed produces composite presentations that look like
"04/15/84 14:22:65". The name of the presentation style is default-time. The t after the
name indicates that this isthe default style for class time.
The next three lines specify the domain collector and semantic presenter, building the
template and spccifying the sub-presentations' presenters. The domain collector is
described by naming the properties of the itme object whose values should be collected. (In
more complicated presenter specifications, this can be a list of properties. "walking" from
one domain object to another, starting from the object being presented.)
The first orcciicition, ('d !e def!!.-da ,-9
cau r!hc
dctte propert, of h. , ,,jcct to-
be presented as the first sub-presentation, using the style default date. .
The second specification is a text string containing a single space. This causes the
composite presentation to contain that text as a constant sub-presentation. (I.e., it does not
present any domain object -- it isjust part of the template.)
The third specification, (:time-of-day default-time-of-dai). causes the time ofday property
to be presented as the third sub-presentation, using the style default time ofday.
The last form specifics the organizational presenter, namely horizontal layout. I'his takes
the presentation structure created and positions the three sub-presentations within the
composite presentation, juxtaposed horizontally.
The template below illustrates the use of the property-walking capability that can be used
in presentation styles. The examples given previously have all specified a direct property of
the presented domain object, e.g., the hours of the time. or the elements of the object- . .
- ,-
-,'.

sequence. I Iow Ner. in general it is nc'essary to specify a property path, a list ol properties
to lollow- ,tarting from the presented domain object. 0
Her,, a presenter is created for the class user-at-host, and the style is named
Rl"C733-User-At-IloNt. ("RFC733" is the name of a network protocol. which includes this
format for specifying recipients.) [his produces a form oFelcctronic mail address, such as: S
"Norman S.Rafferty <NSR at MIT-OZ>". Figure 5-8 shows a sample section of the data
base network.
(def-template-presentation-style USER-AT-HOST
RFC733-USER-AT-HOST 0
nil
(((:user :personal-name) default-name)
<9
(:self simple-atword-user-at-host)
:horizontal -layout) S
The specification (.user .personal-name)default-name) tells the domain collector to walk
from the user at host object to its user and from there to the user's personal name. The
result is presented in the default name style- for the example in the figure, it is the string
"Norman S.Rafferty". The .self"property" in the second domain collector specification
mcans that the user at host itself is to be presented, rather than one of its properties. Thus,
the composite presentation, which presents the userat host, will have a sub-presentation that
also presents that userat host, though in a simpler style: "NSR at M IT-OZ".
Organizational Presenters. PSBase provides four general organizational presenters, and -
these may be combined with any of the semantic presenters by the style description. Each -
organizational presenter positions the sub-prcsentations of a composite presentation
according to aspecific layout method.
The first has already been mentioned above: the horizontal organizational presenter
positions the sub-presentations in ahorizontal line, each presentation juxtaposed against the S
right edge of the previous one. This organizational presenter, as well as the others, takes .
advantage of a facility provided by the presentation database mechanism: each
presentation can be asked for its extent, a specification of the upper-left and lower-right

#### Figure 5-8: Result ofaPresentation Style

74e x0
TI-- ~c~0
<S
V N 5
. -07"

corners of a rectangle that would enclose tihe presentation. Ill addition. the presentation
Cditor mechan isni offers a general facility for rni ing pr.ecltations. Using these -
capabilitics. the organi/ational prcsenter does not need to consider the particular kind of
presentation: the presentations are moved so that their extent boxcs are juxtapocd. Note
that the extent box technique works as well Ibr sub-presentations which are themselves
composites of further sub-presentations: the entire composite has an extent computed from
those of its su b-presentations.
Similar to Lhe horizontal layout presenter is the vertical layout presenter. It juxtaposes
sub-presentations vertically, again using the extent boxes as a guide. S
The third organizational presenter uses a tabular layout method. The composite
presentation is assumed to have sub-presentations which will be the rows of a table. These
row presentations will be laid out vertically. Furthermore, each row presentation is itself a
composite (in gcneral). whose sub-presentations are the clements of thc row. These element
presenutions are positioncd so that those presenting the same kind of proicrtv arc aligned
under each other. For example, in a directory listing, those presentations presenting file-
length properties appear aligned under each other.
The fourth organizational presenter is a paragraph filler, positioning the sub-
presentations (generally singlc-word text presentations) within a rectangular area.
The PSBasc graphics presentation style descriptions do not use standard organizational
presenters. Instead. the styles define their own layout in the style description itself by
explicitly positioning the component presentations.
Semantic Redisplay. Fach presentation style specifies whether presentations created in
that style will be active, i.e., whether it isto be periodically updated, and if so, how often it is
to be updated. Thus, for examplc. arm active sequence presentation will be updated to reflect
changes in the elements or in the order of the elements of the prescncd scquence. Or, for
the clock example given above, the properties of the vector presentation (the hour hand)
will be recomptcd from the presented currcnt-time-of-day object.

-ach time an active presentation iscreated, a emanfic redispla /ask iscreated hor it and
added to a list of all current scmantic redisplay tasks. [ach task specifies the presentation.
its presentation style. and the next time that the presentation should be updated.
A background process manages these semantic redisplay tasks. When a task's semantic
redisplay time has arrived, the presenter for its presentation style is invoked on the
presentation. This invocation issimilar to. but slightly diffcrent Irom, that for creating the
presentation in the first place. Here. emphasis is on retaining presentations that can be
rc-used and avoiding conputation for presentations that do not present anything. After
updating the presentation, the presentation style's organiiational presenter is invoked again -
to adjust the presentation's layout.

### 5.5 Recognizer Support

PSBase provides two kinds of support for recognizer control: First is a mechanism that
records the presentations on which a particular recognition depends. The dependency
mechanism allows some recognition to be retracted if changes occur in the presentations
that recognition was based upon. Second isa recognier-invocation mechanism.
PSBase divides recognizers into three kinds, differing in how and when they are invoked.
Continual recognizers have the effect of acting continually as the user gives commands.
General recognizers are invoked on demand, by particular commands. Invocation of general
recognizers is slower than for continual recognizers, and the invocation involves
consideration of a larger portion of the presentation database. PSBase offers two
invocation mechanisms, one for continual and one for general recognizers. The remaining 0
recogniiers are invoked spccifically by other recognizers, to perform particular sub-tasks in
the recognition process.
Recognition Dependencies. Each recognition depends on a set of presentations. For
example, section 4.1 described the Emacs Dired style of annotations to a directory listing:
the user places a "D" by files to mark them for later deletion. Recognition of a "D"(,as a
plan to delete a particular file) depends on two presentations: the "D" and the file
, -.. ' °

presentation. If the user moves that "D" to a different line, however, its original recognition
must be retracted and new recognition performed -- it now presents a plan to delete a
different file.
The PSBase recognition dependency mechanism allows recognizcrs to record the
presentations on which they depended, together with the actions necessary to retract that 0
recognition. Recognizers specify this information as they build the application database
commands.
Invocation of Continual Recognizers. The interface builder specifies a list of continual 0
recognizers. Each isinvoked immediately after each keystroke or mouse command.
Each continual recognizer has two phases. First, it quickly decides whether it is in fact
applicable to the command that the user just gave. Second, if applicable, it triggers and
performs whatever recognition is necessary.
The recognizer has access to the presentation editing history entry for the command just
completed. It also has access to the list of recognizers triggered so fir. if any. The latter -.
allows the recognizer to trigger dependent on whether or not others did. The presentation -
editing history entry specifies what kind of editing function was performed and which
presentations were affected by it. This information allows the recognizer to quickly -
determine whether it is applicable, without performing a search of the presentation data
base. If the recognizer triggers, it too creates an entry in the presentation editing history,
specifying that a recognition was performed, its kind, and the presentations it affected.
Currently, the mechanism for invoking continual recognizers does not usc the recognition
dependency mechanism, because of efficiency reasons and because the continual
recognizers do not in general benefit as much from the possibility of recognition retraction.
Invocation of General Recognizers. A second kind of recogniier invocation mechanism is
provided by PSBase for general recognizers. In contrast to the invocation of continual
recognizers (including their quick checks for applicability), which considered a fixed set of
-7.

recogniters and a small, given set of presentations (those affected by the latest presentation
editing function), invocation ofgcneral recognilers in olves scirchitig the presentation data
base and a larger set ol' potential recognizers.
PSBase supports two kinds of general recognizers. lth are invoked upon a particular
presentation, though they may (and typically will) exaline other prcscn(ations and related
domain inl'ormation in ihe database. The first kind of general recognizer interprets user
edits to presentations that were created by presenters. These recognizers are typically
simple. taking advantage of the existing links from the presentation to the presented domain
object. For example, one such recogniier might interpret a change in text prescnting the S
referencedate properiy of a file. This recognizer simply parses the text, creates a new date
instance, and changes the value of the file property. Note that it does not need to deciu(
between recognition as a date and as something else -- it already knows that it should be a
date presentation from the prcsenter-recordcd information, namcly, the presenteddomain
object property that links it to the file's referencedateproperty.
The second kind of general recognizer is invoked upon presentations for which there is no
presented domain object link, i.e., presentations whose nicaning is unknown. This kind of
rccognicr niust determine the kind of recognition to be performed.
Both kinds of general recognizers are attached to classes of presentations in the
presentation database. For example, the parscr for a file's reference date property would be
attached to thle text presentation class.
The invocation mechanism begins by -:canning the edit history, determining which
presentations have changed since the last recognition. Any recognition that depended on
* - those changed presentations is retracted if possible. This has the effect of allowing the user
to maike changes in a plan (such as the l)ired plan of deletions): the effect is incremental
recognition of the changes, but no specific recognizers for incremental changes need to be 0
- provided.
Second, all presentations that had been created by presenters, but edited by the user
i:'_ :..:.,....',"..':...'..'.''.'.-..."-"..'-...-'....'...'".."-.;.".."...,".."....-......."....."..""...'.'......"."."."""...".."".".'."....""..

(since the previous general recognition), are collected. For each of these presentations, a
gencral recognizer (of the first kind discussed abovc) isinvoked. Selection of this recognizer
isbased on the class of the presentation and the kind of property (such ws reference date).
lhird. recognition is perlornied on all presentations with no presented domain object '
property value. i.e..
those presentations that are unrecogni/ed. (Note that some
presentations may have been previously recognized, but are now unrecogni/ed because of
recognition retraction.) These recognizers are also invoked based on the class of the
presentations they are to recognize.

### 5.6 Basic Style Packages

PSBase offers a supply of presenters, recognizers. and combinations that the user
interface builder may choose to use as componcnts in a user interface. In a sense, one such 5
component has already been mentioned: the presentation editor functions, taken as a
whole.
Presenters. Three presenters are provided, for presenting command sets as menus, for
presenting the execution monitor's current statc by highlighting the current command, and
for presenting any domain object by a noun phrase. Like the other components described
here, these are all independent of any particular application domain. (This is not strictly
true, as the first two deal with the domain of commands; however, that domain, like the
domain of presentations, is universal in that it isalways included in any user interface.)
Command Menus. '[his component is very simple, consisting of a few style descriptions.
Since a command set is a specialization of object-sequence, where the elements property isa
list of command descriptions, a sequcnce presentation style can be used. '[lie Ibllowing is
the dcscription for a vertical command menu style. (The style definition for horizontal
menus is similar.) 6
- ~. ..
- .o
°o. o. . .. -.-.. .. * ..... o. ... ° .. .. -..-- .. ,. -. .. - .--°.',,
"'.. ".-
-... . .. ,. ... , , . .,... ... ...,.* .. . .. .. ,. ', ,"...'., -'- , . ., ", .'.,... .. "< ,,-'.-., ..,.

(def-sequence-presentat ion-style VERTICAL-COMMAND-MENU
COMMAND-SET t
nil nil Not active.
nil nil nil No prefix. infixes, or suffix.
just-name
:vertical-layout :border-box fonts:cptfontb)
Execution State Presenter. PSRLse provides a sifuplc presenter for the cxecution monitor
discussed on page 111. The presenter is invoked whenever the execution monitor places a
command or comnmand application instance on its stack, i.e., when the comniand is
executed. The presenter examines the presentation database to dcterlinc whether the
A command or command application is being presented. If it finds a presentation, it
highlights it.
For example, when the user invokes the erase presentation editing command, the
execution state presenter might find the command presented in a menu of editor
commands. Whether the user invoked the command by referencing that item in the menu
or by typing the delete key, the menu item ishighlighted to present the current state.
There arc other possibilities. Consider the following scenario: A conn)and's -.
documentation is currently being presented. The d(ocumentation compiises three
paragphs, each presenting a step in the command. As that command executes, the
execution state presenter will highlight the three paragraphs in sequence. (The presentation
of the documentation is not strictly a presentation of the command. The presenter will still "
consider the documentation presentation as a suitable reference, using a special version of
the mcchanism for resolving references to essential properties discussed in section 5.1.)
It
PhrasalPresenter. The phrasal presenter produces a phrase describing a domain object, -
in most cases a noun phrase such as "the file OZ:<NSR>.OGIN.CMD.4", "a plan to delete
the file O:<NSRDEMO.TXT.I", or "the reference date of the ile
OZ:(NSI>QUFUE.NOTES.L. Friday. March 23, 1984".
The presentations have comiposite presentation structure that follows the semnantic and
grammiatical structure. The user can therefore reference part of the phrase to indicate a

domain objct other than the one presenled by tile entire phrase. Ior example, given the
reference-dtle presciiiatio mentioned above.the user could reference just the sub-phrase -
"the ile O/:(N,;R>QUVUILNO °_ES.P and therefore indicate the file, instead of its
reference-date propcrty. Similarly, the user could referencejust the date.
The intcrf'ice buildc' provides a set of dictionary entries, templates used by the phrasal
presenter. The phrasal presenter and its dictionary entries are simple in comparison with
those developed in natural language systems (e.g.. [McDonald 83]). 'They should, however,
give an idea how natural language presenters would fit
into a more powerful presentation
system base, and the scheme used here isquite useful as it is. 0
In essence, the dictionary entry hangs offa class node in the database network. 'Themost
specific entry for a given instance ischosen. This section illustrates the phrasal presenter by
showing a sample entry for the class of date instances. Each date instance has four
properties: day ofmonth, month. year, and day of week. The dictionary entry for date refers
to dictionary entries for the values of these properties.
The entry is written as the :phrasca-presen:er-diclionary-enlry method for the Lisp flavor
date, the flavor implementing the date class in the database. The Lisp details below can be
largely ignored. since the definition is simply a template. The template has slots that are
filled in by evaluating Lisp expressions: these slots are indicated by commas. ihe values .
filling the slots may be other filled-in dictionary entries. The result is a grammatically
structured tree of text. The tree isannotated with the domain objects being presented.
The definition therefore drives the domain collector and semantic presenter, but has left
the text positioning details up to a standard organiiational presenter. ('['he organi7ational
prcscnter uscd isthe one that fills a rectangular area with the text, as a paragraph would be
filled.)
The following is the dictionary entry as the builder would write it. to produce text such as
"Thursday, August 9. 1984."
.0.-&'3,
'i-
-"..- .
"' *7
i **.-'
. *-i
.-
' *
" .* ' * % '*''i"
". - -? -i-i . . . ..
".. .--
- " . ' ' '. " -. ".
. . :iiii - -- i - " -" 7 ."

(defmethod (DATE :PkI[IASAL--PRESENtti-DICTIONARY-ENTRY) (
'(:SAY ,self
(J:URTHER-INFO
:SAY-PROVERfY ( ,self :DAY-OF-WE[K)
.(phrasal-presnter-dictioniay-eitry day-of-week)))
(:SAY-PR0P[RIY (,self :MONTHI)
(phrasal -preseitef--dictionary-entry month))
(:SAY-PROP[RfY (,self :DAY-OF-MONTI)
'9,(phrasal -pr-eseniter-dictioniary-entry day-of-month)) 0
(:SAY-PROPERTY (,self :YEAR)
(phrasal-presenter-dictionary-entry year))))
1Thc tree produced has tile following items:
" An identifying symbol, :say
" The presented domain object -- tile date instance, since selfwill be bound to it
" A sub-tree, flagged as carrying non-restrictive further informiation, that accesses
the dictionary entry for the day of week property, labeled as presenlting the dlay
of week property
tA zmb-Lict dia.xs dic uiAiciiaq eniiny ioi dic mn-wf, properly
sub-trece that accesses tile dictionary entry for thle day of month, similarly .1-
Libeled as aproperty presentation
* Somec template text, acomima
* A sub-tree that accesses the dictionary entry for thle year property
Thie sub-trees invoke other phrasal dictionary entries. For the case of "Thursday. August
9, 1984.", the sub-tree entries Would produce, respectively, the text "T
Ihursday", "August",
"9". and "1984". (These are single words; ingeneral, the sub-trees might themselves specify 0
more complex phrases.)
The general phrasal semantic presenter takes this specification tree and produces a
composite presenitation structure. Figure 5-9 illustrates thle resulting presentation structure
and its relation to the database network. Sonic %,ery simple anaphora pr(xessing is
performed if possible (riot possible here). Commas arc added around the non-restrictive
. . . .0

#### Figure 5-9: Result of Phrasal Presenter

IT 0
p.- S
'TI'
-Tex

further-info structures. 1he first letter iscapitalized. and a period :s
added at the end. The
presenter can optionally be invoked to produce a briefer presentation, in which case it
ignores the sub-trees marked as further inlbrmation.
Recogniiers. The next two sub-sections describe particular recogniiers and recogni.'e r
framcworks that PS1Basc provides, 1br recognizing presentation editor coni.iands from
sketches and for recogni/ing commlands fron the movement of presentations.
Curve Recognizers. Presentation editor commands may be invoked in two general ways.
by primitive command signals (such as keystrokes or nouse clicks) and by recognition.
Section 4.2 showed examples of Zmacs editor commands invoked by recognition: tile user
can type commaid names or select commands from amenu.
PSBase offers another kind of extension to the presentation editor: recognition of
presentation editor commands by "sketching curves". Figure 5-10 shows tile screen's
display as the user "sketches" an arrow from the ellipse to the rectangle. The user sketches
by moving the mouse, holding a mouse button down until tile curve has been completed.
The curve is displayed as a set of dots while the user is drawing it. When the button is 0
released, an immediate recognizer interprets the creation of this curve as a presentation
editor command, in this case acommand to connect the ellipse to the rectangle by an arrow.

#### Figure 5-11 shows the result.

Note that these sketched curves are not just recognized as presentations, e.g., not just an
arrow. They are recognized as presentation editor commands. This has two advantages.
First, the user can understand the semantics of the recognition. since the results are just as if
the user had invoked the editor command directly (assuming that the interface provides the
user with that editor command). Second, recognition can be more powerful -- it can do
more than just create a presentation. For example, one could write acurve recognizcr that
interpreted asketched line through apresentation as acommand to dclcte that presentation.
The curve recognizers are, in a simple sense, a series of rules. (This is not a complex
rule-based system --
there isno iteration over the set of rules, for instance. Also, these rules
-
S

#### Figure 5-10: tBcrorc Cur c Rccognition

Edit Commands: 0
Need Menu
L ne
Arrow
Box Around
Ellipse Around
Move
Erase
Presen: Directory
Peoognrize
C,arl e Style
* -
" ~133""
.. ,

#### Figure 5-11: After Curve Recognition

Edit Commands:
Need Menu
Line
Arrow
Box Around
Ellipse Around
M4ove
Erase
Present Directory
Recognize
Chiange Style

do not have declarative patterns, but instead are implcmented by special procCdu res.) HIC
rules are simple. and the success of the recognizers. is due to lbiur. inter-related ficts. First.
there are few possibilities to distinguish. Ihcsc will be listed below. Second. tihe
recognition is fast enotgh It) be ustl l preferred over other %%a s of inokinLg the same
.
commands. Third, the uscr can sce the result and change it it the irccogni,,rs were
mistaken. Fourth, the recogniers are able to use the presentation database to great 0
advantage. A discussion of the curve recoInitiol rules will clarify the last point.
There are three functions that examine only the list of positions defining the curve.
(These functions do not examine the presentation database.) I hey are largely responsible S
for determining the kind of presentation the curve appears most like: line, arrow, circle,
ellipse, or rectangle. The first function determines whether the cutrvC isopen or closed. The
second determines, for open curves, whether there are arrowheads at one or both ends. The
third produces a ranked match to a circle, ellipse, and rectangle, specifying the defining
parameters (e.g., center and radius for a circle).
These functions are not necessarily always invoked -- they are invoked by the rules,
depending on the presentation database structure. As these determinations are made, a
description of the curve is built up and can be used by later rules. The current set of rules
first invokes the function to determine whether tie curve is open or closed. Ifopen, a nuile
asks whether the end positions lie within presentations; if so, the curve is an object of class "
connecting thing (line or arrow). If open, another rule determines whether there are
arrowheads, and extends the description to distinguish between line, single-headed arrow,
or two-heading arrow. Finally, if open and connecting, a rule examines whether the ends
can be "pulled out", i.e., whether there is a surrounding ellipse or box. If so, the line or
arrow will be connected to that outer form.
If the curve is closed, a rule asks whether the curve encloses a presentation. If so, the
rccogni/ed command will be ellipse around or rectangle arounl. The type is determined
either by the style of the diagram (e.g., only ellipses surround text) or by the rule that
classifies closed curves. In the latter case, the default parameters for the form are ignored:
135 .
. .
'....

thc commnand will compUte ti .,se I'roni the circumscribed presentationl.
* There are a few other rules. which deal with particular styles of' diagrams. 'Ilhcsc rules
* prodUce edlitor commands to create particular patterns or presentations.
Move Recognizer Afecc/inismn. PSI~ase offers a framnework for1 implementing con1tinlUal
recogniiers that interpret movement of presentations as comimands, in the style of, for
example, thc Xerox Star and Apple Lisa systems. Section 4.3 illustrated some kinds of move
recognition-, for cxamnple, moving a document presentation to a printer presentation is
recognized as acommand to print that doeumnen
A mnove recognition driver (or just driver when the context is clear) is a predelined
continual recognizer, it provides the first phase of a continual recognizer, checking for
* applicability. It checks for a move command and, if so, determines the presentation being
nmoved and the (possibly several) presentations to which it has been moved. It then matches
these possible candidates against aset of patterns that attach to thle database network.
Each pattern has an associated second-phase recognizer, which is invoked if that is the
pattern that matches. (In this implementation there isno consideration of multiple matches
-- the First entry whose pattern nmtches is used.) It is this associated recognizer that
performs the actual recognition of the move as a database command. This division of the--
recognition process follows the division described in section 2.6: the driver is the
organizational recognizer, and the selected recognizer is the semantic recognizer.
A sample definition of one of these pattern-to-reccognizer associations isthe following, the
one for recognizing miovement of document icons to printer icons:
(def-inove-recogni tion-rule move-document-to-printer
(:overlap (file (documient-icon))
(printer (printer-icon)))
:recognize-printer-movement)
The second and third lines specify the pattern, which consists of three parts. The first part
specifies the kind of overlap between the presentation being moved and the candidate
* . destination presentation. This can be. in order of increasing restrictiveness, near, overlap, or
- 9: "

DS
within. This relation isdetermined fino the presentations' extent boxes.
The next two elements of the pattern specify the class of presented domain object and the
presentation styles. This entry specifies that the presentation being moved must present a
file in the docunient-icon style. (FL-ch prcsenallion has properties connecting it to both the
presented domain object and the presentation style used to create the presentation.) The 0
entry also specifies that the destination presentation must present a printer in the printer-
icon style.
The fourth line specifies the recognizer that will create a command application for S
printing the file.
Combinations. The next three sections describe modules that combine presenters and
recognizers into lairger control structures. 0
Afouse-Tracking Reference. This module provides a mouse-based reference and
docufmentation facility. A simple fast recognizer continuaily watches the movement of the
mouse and determines whether the mouse cursor is within any presentation. This check is
made using the presentations' extent boxes; in the case of more than one presentation
containing the mouse, the one with the smallest extent box is selected. The presentation
database records this choice. --
At the same time, the current choice is presented by being highlighted on the screen.
Thus, as the user moves the mouse, the highlighting continually shows what presentation
contains the mouse cursor.
In addition, about once every second (i.e.. at a rate considerably slower than the operation
of the tracking recognizer and presenter just described), a documentation line at the botton
of the screen is updated. It presents the current choice by using the phrasal presenter,
described earlier. 'this can help to disambiguate somc cases where the highlighting box
alone would be insufficient. It can also be hellful in providing documentation about the
presentation style -- e.g.. to lind out that a particular number in a directory listing is the
.. him

length of a file. No presentation structure iscreated for the documentation line -- the result
issimply a text string -- though the anaphora and other processing is perlbrmed. Further-
information sub-trees are climinated il"the resulting string istoo long.
An additional reference mechanism is provided that allows the user to move the selection
choice up and down the hierarchy of prcsentations, e.g.. moving from a text presentation in
a directory listing up to the row presenting a ile or to the entire directory presentation.
Again, this choice is reflected by the highlighting and phrasal presenters aUtomatically:
these commands al'fcct the presentation database's record of the current choice, which is
continually and automatically presented by them. 0
Open/Close Mechanism. Like the move recognition driver discussed above, this
mechanism provides a general framework for implementing opening and closing of domain
objects, like that used in the Xerox Star and Apple Lisa styles (see section 4.3). In those
systems, opening a document icon, for example, causes the text of the file to be displayed.
Opening and closing domain objects can be thought of as changing presentation styles.
The interface builder specifics links between the domain object class and the opened and
closed presentation styles. The following specification is typical:
(def-open-close-presentation-style file-document
file
document-icon -
text-file-contents
fonts:cptfont)
This specifies that for instances of class file the document icon style will be used for the
closed presentation and the textfile contents style for the opened presentation. The default
font for the opened style isalso specified.
The open command is given a presentation as an argument and a position. It finds the
entry for the presentation, based on the presented domain object, and invokes the presenter
for the opened presentation stylC spccificd by the entry. The presenter creates the opened
presentation at the given position. The original presentation iserased but remembered its a
property of the opened presentation. This allows the original presentation to be redrawn
I . . .. . ,, _ _ . .'-. . .... .. . . . .

when the opened presentation is later closed, if possible, for cfficicncy and so that its
original position is restored. 5
The decisions to erase and record the original presentation arc a matter of style and are
easily changed. " his style attempts. by having only one presentation ofa domiain object at a
time. to give a feeling of directness -- that the visual presentation is the domain object. and 0
opening is a "physical" act. H-lowever, this always-erasc rule is probably too simple: there
are probably certain kinds of presentations, e.g., icons, that do seem "to be" their presented
domain objects, while others. e.g., phrasal presentations, may merely "talk about" them.
Earlier it was mentioned that opening and closing can be considered to be a matter of
changing presentation styles. However, there is another consideration that must generally
be made: signalling the application database that more detail is needed from the outside
world or that it is time to save such dcetail. IThis issue is raised when the application data
base is a model of some outside world. An opened presentation typically involves
presenting much more domain information than a closed presentation. (For example, a
document icon may only be labeled with the file name, while an opened presentation
contains the file's texL)
Thcrefore, the open command also sends a message to the presented domain object to be
sure that its contents are fully described and updated. For a file, this may involve getting -
the file's text. Each class of domain object can provide its own method for handling this
message, or inhcrit a more general one. The dcfault method is to do nothing.
Closing an object requires two actions in addition to the presentation style change. First, 0
recognition of editing changes to the open presentation mus' be performed. Thus, in
general, the user may have changed ome of the parts of the opened presentation, and these
changcs are reflcctcd in changes to the prescntcd domain object's contents in some way.
Second, the domain object is sent a message to save its contents. For a file, this involves
saving the file's text. Again, the inherited default isto do nothing.
Top-Level Control Structures. PSBase provides two alternative control structures that
I 0
.......................................................................................... i.- .-"". '-">" - :'- -'i- - '-i>'.'>.- :' -- '
"i- -
%*o ° °"*-".. . . . . . . .
'- .
. .
" '"
° - ° ' " '
"" ". . . .-- . .°
-""° .% -
"
"*o--''* '".**
'
"
- ' *

I S
processes command signals (keystrokes and nmousc clicks), invoke immediate and other
recognizers, and cause graphics redisplay to be performed. They differ primarily in the
method of command invocation and command argument selection. In tile lirst top-level
style, the user first specifies acommand, then selects its arguments: in the second style, the . -
user selects the arguments Iirst, then specilies the command. .
The first style has the benefit of the command's description while selecting the arguments
for the command. The parameter descriptions have control of the selection, prompting the
user with the parameter name and documentation, and checking that the argument selected
is of the proper type. For example, if the parameter specilies that a file must be selected, it
will immediately reject any selection that is not a file, letting the user make the selection
again. Though the style as provided does not do this, it would be a relatively simple matter
to tailor the mouse-tracking mechanism so that only presentations of the correct type would
be sensitive to selection, i.e., only those being highlighted as the mouse moved across them.
The second style collects selected arg,uments, presenting them by keeping them
highlighted until the command is chosen, and then when a command presentation is
selected, creates a command application for it, letting the command application check that
the arguments are of the proper type.
Each style allows two kinds of mouse clicks to be made: a left-button click selects a
presentation or its presented domain object, and a right-button click selects a position. In
the second style, positions are highlighted with asmall circle-cross mark.
Both styles select commands (as opposed to their arguments) similarly. If the user types a
key, that key is translated into a command, using a standard dispatch table. On the other
hand, when the user selects a presentation, the top level checks whether its presented ---.
domain object can be resolved to a command -- i.e., a simple command recognition is
performed. This is,for example, what happens when the user selects an item in acommand 0
menu.
Similarly, when the user selects a presentation of acommand application, that command
.

application is executed. Inthis case, however, the command application already supplies
the arguments. 0
After each selection, whether argument or command, immediate recognizers are invoked,
and graphics redisplay is performed if there is no typeahead to process. In addition, the -
second top-level style executcs any command applications that have been accumulated, by 0
recogniers such as move recognizers. On the other hand, the first style allows command
applications to be accumulated without; in general, immediate execution. This is the case
when those command applications are presented, as just mentioned above. Section -

### 4.1 illustrated such "plan presentations" in Emacs Dired.

### 5.7 Summary

This chapter opened with sonic general comments about the benefits of a presentation
system base, and in particular, PSBase. Summarizing these brielly: The stnzcturc of PSBase
is based on the structure of the general presentation system model. This is the source of
much generality and modularity, in both PSBasc and the interfaces built on top of it. In
particular, domain-independent and style-independent parts can be identified and provided
in the base. Furthermore, most of the modules in PSBase rely heavily on the uniformity of
the database network, which is used to implement both the presentation database and the .
application database.

## Chapter Six: Constructing Presentation Systems

1 his chapter illustrates tile utility of the presentation system base. PSBase, by discussing
three user interfaces constructed on top of tile base. The interfaces differ in style, but share
the same purpose, to provide an interface to the Tops-20 operating system top level [Tops20
80], as does the Exec, Tops-20's normal top level. The sections below will describe how
these interfaces are constructed, emphasiiing how much of the PSBase mechanism is shared
between them and how relatively little needs to be written by the interface builder.
(Throughout this chapter, the term user refers to the user of the constructed interface. The
term interface builderor just builderrefers to the person who constructs the interface using
the PSBase tools and mechanisms.)

### 6.1 The User's View of the Three Interfaces

The sections below will briefly illustrate the three interfaces by discussing scenarios in
which the user views directories, files, mail, and user information: edits some of these; ' -
prints and deletes files; and scnds messages. Each scenario has the same fictitious user,
Norman S.Rafferty, whose login nane is NSR. The host computer is MIT-OZ. The
discussion will be accompanied by diagrams showing the screen at various points during the
scenarios. In order to save space, not all steps inthe scenarios will be shown.
The first interface incorporates astyle similar to the Xerox Star discussed in chapter four,
emphasizing the manipulation of icons. The second interface incorporates a style
emphasizing the use of text displays with associated command menus. The third style
incorporates astyle emphasizing the use of graphical annotations, an extension of the Ermacs
Dired style discussed in section 4.1.
The annotation interface is somcwhat less complete than the other two in that it offiers an
~7. .- .- " .-'...

interface to tile file system only. This is not an inherent limitation, but instead reflects the
fact that the current implemcntation of PSBase offers less support for building the 0
annotation interlace than for building the others.
It isnot the intention of this report to argue that these particular interface styles are ideal
or even good as implemented here. The styles represent three diffcrent. important classes of 0
styles. The important point is how these interfaces can be designed, constructed, and
changed more easily given a presentation systen base on which to construct them.
Icon-Style Interface. The initial screen display of the icon-style interface scenario is 0
shown in figure 6-1. At the top left isaclock, updated every minute. Below it are icons for
an in-box (received mail), out-box (for sending mail), two printers (the Dover laser printer
and a line printer), and a campfire (used for deleting files). Across the top are icons
showing the users currently logged in. (One of the user figures is not in his chair. This
indicates that the user has not typed anything within tile last twenty minutes and is perhaps
away from the terminal.) The user distlav is updated every few minutes. Below the users
are three folder icons, presenting NSR's three directories, NSR, NSR.R, and NSR.R.T.
(These happen to be hierarchically nested directories, the directories owned by this user,
though any set ofdirectories can be displayed.)
The tier opens the NSR.R.T folder: First, the folder icon is selected, by pointing to it
with the mlouse and pressing a mouse button. While selected, the icon is displayed in
reverse video. The mouse is used to select a position for the opened presentation. The user
types a special open command key. The folder icon disappears and a new display showing
the contents of the directory appears at the selected position, as shown in figure 6-2. This
display shows (lie files in the directory, ts a set of document icons. the full directory name,
and disk space information. 'The "6/20221" indicates that this directory uses 6 disk blocks, - .-
and 20221 disk blocks remain free.
While this opened directory isdisplayed, it will be periodically updated. If the number of
free disk blocks changes, the "20221" will be replaced by the new amount. Also, the
document icons will change if the set of files in the directory changes.
S 0

#### Figure 6-1: Icon-Style Interface

9(D3
F8F11 E

*- °

#### Figure 6-2: Icon-St) le Interface

12 0 0
g 3' -J--.J
- S
OZ < NSR.R.T > 6/202210
D ° '" ~145'. ' " -
i~ o D.DD
iil -
- I
-?~ii; ..:2i i!i:: i:i i,
i i. :...ii:i iliiii~?: i : !i :i~):2 }722:!i !.-.i.-_
:,:!l~iii:i :i._.
. ..
S

Next, the user opens the file AISG.7XT The process is the same as bclbre: the
document icon is selected, a position is selected, and the open command key is typed.
. Figure 6-3 shows the screen at this point. The fS(G.T'XT* icon no longer appears in the
* directory display, since it has been brought out to the desktop area and opened. When
closed, it will retake its place in the directory display as a document icon.

#### Figure 6-3 also shows a change in the logged-in user display: the set of users has

changed.
The user edits the text of the MSG.TXT file. A position within the text is selected, and e
the set edit point command key is typed. A text-editing cursor appears at that place in the
text. Editing takes place by using simple Emacs-like command keys. For instance, typing
letters inserts them, and typing certain control-characters moves the cursor or deletes
characters. 0
The uscr also edits the To field (i.e., destination specification) at the top of the opened file
display. This indicates the user who will receive this file if it is mailed (put in the out-box).
This editing is performed in the same manner as the text editing just discussed. The result,
shown in figure 6-4. is that the user ECD at MIT-OZ will receive a copy of this file when
mailed.
The user now closes AfSG.TXT, by selecting it and typing the close command key. The
opened file display disappears, and the document icon reappears in the opened directory,
Next, the file TEST'TXT is printed. 1he document icon is selected, a position at the
Dover icon is selected, and the move command key is typed. The print icon is highlighted to
show that the print command has been understood and is underway. (The background
process sends a request is made to the host computer to print the file.) The highlighting is
then turned ofl. and the document icon is positioned adjacent to the printer icon. See figure
6-5.
After printing, the user deletes the file by moving the TEST.TXT document icon to the

#### Figure 6-3: Icon-Style Interrace

9 3
OZ < NSR.R.T > 6/20221
MSG. TXT. I To: ???1
I Slw t2 artcl. Yo
ycu cz
sen, me a copy ol the report it
~mentions? (rM-132, I think.)

#### Figure 6-4: Icon-Style Interface

OZ: < NSR.R. > 6/20221
MSG. TXT. I To: ECD@MIT-OZ
U) Ed.
-. 4 t h$.
c r "c a ,, c, 'a s
send me a copy of the report it
mentions? (It was TM-132, I think.)
-- Norm

#### Figure 6-5: Icon-Style Intcrface

'-~
OZ < NSR.R.T > 6/20221
D149
S
SS .
149 .. i-"
..... e. ...................................................................

campfirc. The calmpfire is highlighted as the file is deleted. The highlighting isthen turned
* otfand the document icon disappears.
The user mo cs the AISG. 7I' documlent icon out of the directory to the desktop, i.e., the
- open part or the screcn. lhe user now closes the directory- tile original folder icon is
displayed. instead of the opened directory display. See figure 6-6.
Mail is viewed by opening the in-box icon. This opened presentation shows the messages
in the mail file as sLmmnary lines, shown in figure 6-7. A summary line can be opened,
showing the text of the message. This process is similar to that for viewing directories and
files.
The user can send the contents of a file in two ways. First, he can move the document
* icon to one of the user icons at the top of the screen. This causes the text of the message to
appear as a message on that user's tenninal. Second, the document icon can be moved to
the out-box. 'rhe user takes the latter action, moving the MSG.TXT document icon to the
out-box, causing the contents of the file to be mailed to the user FCD.
Finally, the user opens the /VS!R icon representing himself, displaying information about
* his terminal location and personnel inflormation, such as office, supervisor, etc. This is
shown in figure 6-8. ieupdates the office information, using the same text-editing process
described above, and then closes the display. "
.

F~igure 6-6: Icon-SyICInterface
F'\-
s15
.S

#### Figure 6-7: Icon-Style Interfacc

g 32
* j iiiri~L~Z If
MAIL.TXT0
211 AgYu arhsaEH IAZ-NR@MTO

LS

#### Figure 6-8: Icon-Style Interface

12 19
9 - 3
UName: NSR Fork: FINGER
Idle: Location: MIT-LISPM-2 (Chaos)
Norman S. Rafferty (Norm)
Office: NE43-809 x3-5871 working for HENSON.
ss153

S
Menu-Style Interface. Figure 6-9 shows the initial screen display at the start of the
scenario for the menu-style interface. Across the top is a display of current inflorlilation
about the status of the host computer: the time. the time-sharing load, and the number of S
jobs. (The time-sharing load on Tops-20 is represented by three load averages, the first
specifying the load at the current time, the second, the average load over the past 5 minutes, - -
and the third, the average load over the past 15 minutes.) This display isupdated every few
minutes.
Two command menus are displayed below the host information. The top menu contains
commands for choosing what to present and for updating the host's information from user
editing of the presentations. (The latter is the perform changes command.) The bottom
menu contains presentation editor commands. These commands are invoked by command
keys in the icon-style interface.
The scenario starts with the user invoking the present directory command (the result of
which is shown in figure 6-10): The user first points to the menu item and selects it by
pressing a mouse button. A small window appears at the bottom of the screen, requesting
that the user type the directory's pathname. The user types the pathname "<NSRAR.TY'
(and can edit it using the text-editing commands). When the user types the End key, the
small window disappears, and the user isprompted for the next argument, the position for - - -
the directory presentation. The interface displays these prompts (for domain object,
presentation, and position selection) briefly, in a line at the bottom of the screen (not shown
in these pictures), by specifying the kind of command argument expected. Here, the
prompt is "Position". The user selects a position with the mouse, and the directory is
displayed as shown in figure 6-10. While the command is being executed, i.e., until the
- directory display appears, the present directory item in the menu is highlighted by reverse
.* video.
The directory display isaccompanied by a menu of commands that view, delete, and print
files. The user invokes the present file command from that menu, and then selects (as an
argument to the command), the MSG.TXT ile. This selection can be done by pointing to
. . o ..-
i'i -..
.

#### Figure 6-9: Menu-Style Interface

TO~
NTO ine: 21 :19 Load Avqs: 4.07 3.26 3.28 6 as
* ~Present Directr
Present User Jabs
Presont Mail
Perform Chan es]
E~rase I
move
Set Point
Al155

#### Figure 6-10: Menu-Style Interface

Host MWIT-OZ Time. 21 23 Load Avg 5: 4.07 3.26 3.2L .~~I
Present Directory
Present User Jobs
Present Mail
Perform Clhanges
Erase
Move
Present File OZ < NSR.R.T > 6/ 190530
Delete File
Dover Print File EMACS.INTT.374 3 07/26/84 10:34:57 ??? NSR ???
Line-Print File LOGIN.CMD.34 1 07/03/84 02:4 7:05 ??? NSR ???
mS.X. 1081/4205827 0/38 S CMTO
iETTT12 0/38 03:5 0/38 S ?

just the text presenting the name of the lile. "MSG. XI". the entire Iile row, or cen the
presentations of the tilc's properties (such as the "1''presenting the file length). lhe user
also selects a position for the tile display.
The user at this point can edit the file and its TO icld, just as in the icon-style scenario.
See figure 6-11.
The user prints the file LOGIN.CMD by selecting Dover Print l/e and the file entry in
the directory. (Note that if the user wished to print MISG. TXT at this point, he could either
select its cntry in the directory or select the file display.) As before, while the command
executes, its item in the menu is highlighted.
The user next deletes LOGIN.CMD. Now, in addition to the highlighting of the delete
command mcnu item, the LOGIN.CAID line is removed from the display, as shown in
figure 6-12.
The user now erases the directory listing. ([his isnot a delete commanc -- it just removes
the directory display from view.)
A display of the current user jobs isnext displayed, illustrated in figure 6-13. From left to
right, the fields in this display are: login name, user name, current job, and terminal
information. The terminal infonnation starts, in some cases, with the time the terminal has S
been idle (1:17 for one user, 1 minute for another here) and follows with the terminal
Iqation. The user can get the identification of these fields by pointing to them with the
mouse: the documentation line at the bottom of the screen (not shown here) shows a phrase
identifying the field. For example, pointing to the text "MIT-LISPM-2 (Chaos)", the user
sees "the location of the tcrminal of the user NSR, Norman S.Rafferty". The user edits this
Field to add more information, changing it to "LM2: 7th Iloor". He makes this change take
effect by invoking the perform changes command from the menu at the top left. See figure
6-14.
The user next erases the user display and invokes present nail, resulting in the display - -
?............................-....-.. ........ ? -- .. ......-......... ... .........

#### Figure 6-l1: Menu-Style Interface

fi~ost MIT-OZ Time: 21 :24': Load Avgs: 4.07 3.26 3.28 6 Jobs.
* Present Directory
* Present User Jobs
Present Mail
Perform Changes
Era8se
Move
Set Point
ANPresent File OZ < NSR.R.T > 6/ 19053
Delete File
Dover Print File EMACS.INIT.374 3 07/26/84 10:34:57 ??? NSR ???
Line-Print File LOGIN.CMD.34 1 07/03/84 02:47 :05 ??? NSR 7?
MSG.TXT.1 1 08/13/84 20:58:27 08/13/84 NSR ECOOMIT-0?
TEST.TXT.1 1 08/13/84 20:39:15 08/13/84 NSR ???
MSG.TXT.1 To: ECDOMIT-OZ
LU4
I saw tha article. Could you please
send riea copy of the report it
rnentionsi (It was TM-13Z, I think.)

#### Figure 6-12: Menu-Style Interface

Vost MIT-OZ Time: 21:26 ; Load Avgs: 4.07 3.26 3.28 5 job.
'Present Directory
Present User Jobs
lPresent Mall
jPerform Changes -
Erase I
Move
Set Point
Prtosent File OZ :< NSR.R.T > 6/ 19053
Delete File
Dover Print File EMACS.INIT.374 3 07/26/84 10:34:51 7?? NSR ???
Line-Print File MSG.TXT.1 1 08/13/84 20:58:27 08/13/84 NSR ECDt.OIT-OL
TEST.TXT.1 1 08/13/84 20:39:15 08/13/84 NSR ???
MSG.TXT.1 To: ECD@MIT-OZ
I saw the article. Could you please
send ne a copy of the repart it
nentions? (It was TM-132, I think.)
-- Norm

#### Figure 6-13: Mcnu-Style Interface

Host MIT-OZ Time: 21 :29 1Load Avgs: 4.07 3.26 3.28 5 jobs.J
Present Directory
Present User Jobs
Present Mail
* Perform Changes
* 'Erase
Move
Set Point
User jobs:
PHW Patrick H. Winston EXEC 1:17 MIT-NE43-8A-14UB (Chaos)
FONER Leonard N. Foner VOIREC x8-8260: flialup
BERWICK Robert C. Berwick ZEMACS 1 x8-8268: Dialup
SECRETARY Jerry Roylance LISP ??? ???
NSR Norman S. Rafferty FINGER MIT-LISPM-2 (Chaos)
1bS

#### Figure 6-14: Menu-Style Interface

Host MIT-OZ Time: 21 30 Load Avgs: 4.07 3.26 3,28 5 o.bs.]
Present Oirectory
Present User Jobs
Present Mail
Perform Changes
Erase
Move
Set Point
User jobs:
P14W Patrick H. Winston EXEC 1:17 HIT-NE43-8A-HUS (Chaos)
FONER Leonard N. Foner VDIREC x8-8260: Dialup
BERWICK Robert C. Berwick ZEMACS 1 x8-8268: Dialup
SECRETARY Jerry Roylance LISP ??? ???
NSR Norman S. Rafferty FINGER LM2: 7th floor
*1-
- 161,
-.
.o -

shom
ll in figure 6-15. Jh le
mail summary display is accompanied by a m 'nu
ol)mm lds
for %
iewing metssIges or sending tile contents of files ismessages. Ihe user can mai/ or
(j.Scnld (i.e., send to a tcrilinal, so the recipient sees tile message cluickly) by selecting the
o mm1liltanld. tlhe ,1.'.
iTT file, and then
lia user. hcre are a number of ,was ol'scieting tlhe
rccitpicnl user, bCaLSe L1here ci Ilhle
nuImber off user preeilta ions displayed: in the To of
itile displly, in a display of user jobs. and in iessage sumuiary lines.
r.b
0-,FF"
. ." ". ." ".
-0
7 ." "" . ,

#### Figure 6-15: Mlenu-Style Interface

IHost t4IT-OZ_ Time: 21:32; Load Avgs: 4.07 3.26 3.28 ;6 jobs.
Present Directory
Present User Jobs
Present Mail
Perform Changes
Move
Set Point
Present Message MAIL.TXT.1
Mall File
EQSend File 21 13 -Aug Your cadr has a EHL@MIT-OZ - NSR@1MIT-OZ
Z. 7

-~ - . . .... -- - -.
Annotation-Style Interface. The initial screen display for the annotation-style interface is
very similar to that for the menu-style interface. A new command, recognize, appears in the
top menu, and the presentation editor menu has been expanded to include commands for 0
drawing lines and arrows. In addition, the interface offers the user the curve-recognition
facility tor creating lines and arrows. This expanded menu reflects the larger role the
presentation editor plays in this style of interface: die user creates graphical annotations to
presentations displayed by the system. See the upper left portion of figure 6-16.
[he user starts by presenting the directory 'NSR.R.T. As with the menu-style interface,
the user selects the menu item and is prompted for pathname and position. The directory
display in this interface, however, does not include an associated menu ofcommands.
The user first decides to correct some information in the directory, namely, that the
author of the file EIACS.INIT.374, currently NSR, really should be EAK. To do this, the
user invokes the set point command to place the text-editing cursor in an area above the
displav and then types the text "CHANGE". The text "EAK" iscreated nearby in a similar
manner. The user then connects "CHANGE" to the author presentation by a line, and
connects "CHANGE" to "EAK" by an arrow. The result isshown in 6-16. 0
To check that the system will correctly understand this annotation command, the user
invokes the recognize command. Up to this point, the text, line, and arrow created by the
user had not been recognized by the interface. The recognize command specifically invokes
the annotation recognizer. The menu item is highlighted while the recognition is being
performed. The user then checks the result of the recognition by pointing to the text
"CHANGE". The documentation line now displays "a plan to change the author of the file
OZ:(NSR.R.T>EMACS.INIT.374, NSR, to EAK." This change has not yet been made
-- the user has only had the system confirm the meaning of the planned command.
The user next makes several more annotations, as shown in figure 6-17. These tell the
system to set the reference date of the file EMACS.INIT.374 to be the same as its creation
date, delete the file LOGIN.CMD.34. and print the file TL'ST'IXT.
164 -S1') 22
0°

#### Figure 6-16: Annotation-Style Interface

[41
Hst MIT-OZ Time: 21 45 Load Avgs: 2.6

### 2.83 2.94_;6 ub~

s
Present Directory
Present User Jabs
Present Mail
Recognize
Perform Changes
Li no
Arrow
Erase
Mov e
Set Point-
EAK
CHANGE
OZ < NSR.R.T > 6/ 185611
EMACS.INIT.374 3 07/26/84 10:34:57 ??? NSR ???
LOGIN.CM).34 1 07l/03/84 02:47:05 08/13/84 NSR ???
NISG. Pt. 1 1 08/13/84 20:58:27 08/1.3/84 PJ$R ECDM1 F-oz
I TS
i~ilj ub/i.3/64 eu:j'j:15 Od/lj/b4 Wt.
R tr

#### Figure 6-17: Annotation -Style Interface

*otMIZ Time: 21:48. Load Avgs: 2.64 2.83 2.94 5
6jobs.]
Present Directory
* Present User Jobs
Present Mal
* Recognize
Perform Changes
Line
Arrow
Erase
Move
Set Point
EAK
CHANG
CHANGE
OZ :< JJSR.R.
T > 6/185611
EMACS.INIT.374 3 07/26/84 10:34:57 ??? NSR ???
DELETE >-:LOGIN.CMD.34 1 07/03/84 02:47 :05 08/13/84 NSR ???
MSG.TXT.1 1 08/13/84 20:58:27 08/13/84 tJSR ECDOMIT-OZI
!,,7 1 eiE5i .fAT.i I Co/13/d4 Zu:sJ:lo uu/Ij/84 NZ)N ft

The user now tells the system to perlnorn these commands, by invoking the perfiir
changescommand. The command's menu item is highliighted. 'Ihe first thing the interlace
must do is recogniie the new annotations, s) the recognize command is atolniaticaily
inoked by the interface. The user sees that this istaking place: the recognize nilu item is
now highlighted. After recognition, the commands are executed one by one. As with the -
highlighting of the recognize command, the user sees the progress of tile petform changes
command: the annotation commands are highlighted while they are being executed.
When the annotation commands have all been performed, the display is updated in two
ways. First, the line in the directory presenting the file I.OGIN.CMD.34 is removed, since S
the file has been deleted. Second, the annotation verbs are changcd to past tense. The
resulting display isshown in figure 6-18.

### 6.2 Common Inplementation Details

The basic order of development of the user interface was as follows:
* Create application database network and a background process to connect it .
with the operating system. _
Define some initial presentation styles so that further development can be tested
with them (e.g., icons).
* Enable selected PSlase basic style packages, especially top-level control S
structure, edit functions, and the mouse-tracking reference mechanism.
* Detine and describe commands and command sets, select menu presentation
styles.
* Specify move recognition and open/close rules.
Write recognizers as needed (move recognizers, direct-edit recognizers).
* Deline and change presentation styles as desired.
Commnon Implementation. Certain parts of the user interface implementation are shared
between all three of the styles. These parts, once constructed, are ilvariint under further
,° °. . * -. -.. .. A ... .. ° .,. o-. ,.. .
.. . ' . .
.° -.°.± .
±'°%1 °° . . °° °°
-,." .
L S.... ' % "-'"""" .i . .'" ."

#### Figure 6-18: Annotation-Style Interface

Host MiT-OZ Time: 21 :49 Load Avgs: 2.64 2.83 2.94 6 jobs. 0
Present Directory
Present User Jobs
Present Mail
Recognize
Perform Changes
EA0
Linege
changed
OZ < NSR.R.T > 6/ 18561
EMACS.INIT.374 3 07/2r,/84 10:34:57 r?? NSR ???
MSG.TXT.1 1 08/13 /84 2 0:58:27 08j'13/84 NSR FCfl@MIT-OZ
!.;c- TESr.TXT.1 1 0 8/13/84 20:39:15 08/13/84 NSR ???

development and experimentation with interface styles.
j The most important of these parts isthe application database, whose development will be 0
discussed separately in the following sub-section. [hc application database models the
operating system, and at first it seems relundant. Yet it is well worth the wodest effort to
construct it: The uniformity of the database network is vital to the utility of the PSllase
mcchanisns. In future systems. applications may be built from the first with this kind of 0
database, completely relieving the interface builder from this work. (The benefits of a
uniform database mechanism in modeling the application are not limited to the
mechanisnis of the user interface.) A sub-section below discusses the continual updating of 0
the application database in more detail.
A number of simple parsers are provided as part of the general recognizer mechanism
that recognizes user edits of property presentations. These are called direct edits and are
also discussed in detail in asub-section below.
Finally, all the styles share a number of PSBase components. Since these components are
simply selected and enabled, requiring almost no work on the part of the interface builder,
the components that appear in the three style implementations will be listed here:
*The two top-level control structures (argument-first for the icon-style
implementation, command-first for the menu-style and annotation-style
implementations) "
* The command execution presenter (for highlighting commands as they execute)
* The mouse-tracking/refercnce mechanism
* Vertical command menu presentation styles (for the menu-style and annotation-
style implementations)
* Presentation editor functions: all styles include move, set text cursor position,
and text-editing commands; menu style adds erase; annotation style adds line " -
and arrow 0
* Curve recogniers for the annotation style.
,. . . . . . . . . . . . . . . .

The Application Database. I ike PSlase, tliis interface is inllcncnlcd on the %III Lisp
machine. The Lisp machine acts as the user's terminal: the ILisp machine c(o
mmu nicates
with the host computcr via network connections. The user of tile interlace, hoevcr, does
not need to be aware of these connections.
The large scale structure of this system isshown in figurc 6-19. lhe application database
nodels the current state of relevant parts of the host computer, Ising the uIIilori database
mechanism provided by PSBase. A background process maintains the application database
by periodically polling the host computer, getting infbrmation about the users currently
logged in, the timc-sharing load, the contents of relevant directories, and the contents of the
user's mail file ("in box").
Some host information is retrieved or saved upon demand, rather than by regular polling.
For instance, when the user opens a document icon, the presented file instance in the 0
application database receives a make-contents message: the file instance must expand its
description to include the text contents of tile file. At this point. therefore. the ile is read
into the Lisp machine from the host computer. Similarly, when the file instance receives a
save-contents message, the text of the file iswritten back to the host computer.
Recognizers for Direct Editing. Three instances of direct editing of a presentation occur
in the icon-style interface scenario: editing of the file text, the file destination field, and
fields in the user information display. All such direct editing is handled in the same
manner. The PSBase recognizer control structure finds those presentations created by
presenters and edited by the user. For each of these, it invokes a specific recognizer to
handle that kind of presentation; currently, only text presentations have such a recognizer.
This recogniier, still part of the general mechanism, checks for a parser specifically for the
kind of presented domain object and invokes it.
The interface builder must therefore provide such parsers for those kinds of application
database instances that are specire to this interface. The following are two sample parsers.
Note that both are specified not by the class of domain object, but by the property name.
Text presentations that are directly edited arc presentations of properties (since they are
" "-
" ...".. + . .. ". "" " - - ".
." "" " "" "" " - "'" - "- .' "" .- "" - " - " -

#### Figure 6-19: Application IDaui Base Management

AI: I ASO
b^ TA
sE?
iNc
S

-
S * . .
I _ . - . . .. . . - - - - ° - . . .
parts of a larger style). This approach is clearly limited: for instarcc, even it based on the
property namne, the spccilfication really should include the kind of owning object or the kind
of property value, since property name alone may be ambiguous.
(defmethod (TEXI-PRESINTAJION
:PARSE-WORIK-PHIONE--PRESENTED-DOMAIN-OBJECT) (
string)
(defmethod (TEXT-PRESENTATION
:PARSE-REFERENCE-DATE-PRESENTED-DOMAIN-OBJECT) ()
(make-instance 'date
':universal-time (time:parse-universal-time string
0 nil nil)))
The First parser simply returns the string of the text presentation as the string to use for
the value of the presented domain object's property. In fact, most of the parsers for these
interfaces have such trivial parsers, since most of these properties have string values. Here,
for example, the user instance in the application database has a work phone property; its
value isnot a database instance, but issimply astring.
The second parser is only slightly more complicated. The reference dateproperty of a file
instance has a value that is a date instance. The date instance in turn has a universaltime
property, encoding a time or date as a number. The Lisp machine provides a package of
functions for manipulating such time representations, including the parsing function used
here that returns a universal time given a string. Thus, there are two phases, the actual
parsing of the string and the creation of the database instance. (These phases are simnp!e
cases of what section 2.6 described as the semantic recognizerand domain changerparts of
the recognizer.)
The number of parsers to be specified varies with the number of properties in the
application database that will be edited. It
does not depend on the number of presentation
styles presenting these properties. Thus,the interface can becomc quite extensive without
requiring much additional work inthis regard. For example,the icon and menu styles both -
show a user's terminal location, but they embed this indifferent styles, one inadisplay of
information about asingle user,and the other in a table of information about all the users.
172 .
.2.

S
However, once the parser for the location property has been created, both prCsltaltion
styles immediately offer the user the ability to edit this field. -

### 6.3 Icon-Style Interface llnplelneitation

This section and the fbllowing two describe the implementation of the interfaces just e
described, building on PSBase. The icon-style interface inplcmcntiation consists of five
major parts: presentation style descriptions, open/close mechanism, move recognition,
recognizers for direct editing, and simple use of various PSBase components.
Presentation Style Descriptions. In general, the icon-style interface uses a graphical
presentation style to define the icons, and template and sequence presentation styles to
define the opened presentations. Examples of these styles' specifications will be given
below.
The icon style descriptions are simple, though somewhat verbose (as each line, circle,
rectangle. etc., must be specified by listing its properties). These descriptions are easily
generated, though one would expcc* a full-scale presentation system base to provide more
tools for creating icons by editing pictures. (Whether the pictures are constructed from
lines, circles, etc., as here, or from bitmap, or a combination, is an independent issue. The
non-bitmap approach used here was chosen because it used existing PSBase facilities.)
The presentation style description for the document icon isshown below:
....
7. ..
il.. . .-.. . . -
.
. .. . . . , --.
- .. ' -.. - - . . -. .. , . - " " . .

(def-graph ics-presentation-style DOCUMENT-ICON FILE nil
nil nil0
(LINE-PRESENTATION Top
:xl (relative-to-parent-x 0)
:yl (relative-to-pai'ent-y 0)
:x2 (relative-to-parent-x 16)
:y2 (relative-to-parent-y 0)))
(nil
(LINE-PRESENTATION ;Left
:xl (relative-to-parent-x 0)
:yl (relative-to-parent-y 0)
:x2 (relative-to-parent-x 0)
:y2 (relative-to-parent-y 30)))
(( :PATHNAME :STRING-FOR-EDITOR)
(TEXT -PRESENT ATI ON
:x (relative-to-parent-x 2)
:y (relative-to-parent-y 9)
:font 'fonts:hl6
* :mouse-tr'ackable-p ':no-track
:str ing (substring-or-null-string
(send presented-domain-object ' :component-walk
(:pathname :stiing-for-editor))
0 4)))
(( :PATHNAME :SIRING-FOR-EDITOR) -
(TEXT-PRESENTATIONS
:x (relative-to-parent-x 2)
:y (relative-to-parent-y 19)
:font 'fonts:h]6
:mouse-trackable-p ':no-track
:string (substring-or-nul 1-string
(send presented-domain-object ':component-walk
(:pathname :string-for-editor))
4 8))))
nil)
Just as with the examiple shown in section 5.4, the first two lines of this style description
* specify the namic, documnent-icon, the application database class to which it applies, file, and
* flags specifying herc that it is not the default style for files, nor is it an active presentation.
The first prescntation description in the following list specifies the line across the top of the
icon. The nil that starts the specification indicates that this line alone does not present
anything. The description flor the line dtown the left side of the icon is similar, as are the live
line descr-iptions that have been elided.
* T'he style description ends with entries for the two lines of text presenting the file name.

Fbach Starts witLh a SpecIhe1aL ion of tileC presen tedl doiiiai ii oabjet. (:-puinaum'
:Vrt.rlig-fir'-editor).
"I
Illis means that (lhe tc \t I,,0 i; Putcd fromn (lie srig-) -'Iurpropperty
of,thle file's pathnanlile. (A pathliii has severall string" properties. SI)eeitf
ri Jilicren \\N~s
oF \%
rit rg the pathnme,) The strings for thle tc\ et prsI tat
11 )f0lS
are"k
c)I) L h)
p1
i61 -11ii1S
thati extract the first Ifour letters for-thle first line. and thle seCOnd lolh)]-
o thle SCCGIn line.
1~ li
Te text presenttat ion entLries also specify mousc- rackabli-Pproperties. A :no-imack al ne
ii Oriis thie mionse-tracking mcchan isin that these text piCc~cl tation Sshould not he mlouse-
senisitive. The intent of'the style is that an ico n be an atomic im it, and there Iiire no Smaller
part of it should be mouLse-senlsitive. By denICIlt these pre'sentat0ios MonIld be itiotise-
senisitive, since they present something. Thie lines, on thle Other hand, wNonid not he mouise-
sensitive by defaul.1t.
0' [he following are representative of' style descriptions for opened presentations, Using
template and seCLciIce presentation styles. I here are three primuary styles here: a template
stvle for the directory label and disk uIsage line, a1
seuenIceI St\ ICflor the row of' document
icons, and a template style that combines the labell and row styles.
The Following isthe template for the directory header. TI
his style is also used lby the other
directory styles, those Used in thle other two interfaces.
(def-template-presentat ion-style TOPS2O-DJRECTORY-1IEADER
DIRECTORY nil
((:selr' tops2O-dir'ectory-nane fonts:cptfontb)
(:disk-space-used active-text)
(:free-disk-space active-text))
0 :horizontal -layout
Two other styles are referred to by this template. T[he fopx.2-irectorv
,-nauw~l style simlply
presents thle dlirectory's host and name in a text tenmplate of colon and brackets. e.g..
5 '"0/:<N SRY'. [hec aciie-Iext style is a Simple graph1iical preseniittioli st~l l tht defines a
text presentation whose string is thle same as that it presenls. and which isspecified as being
a16C,\1e updted eveI-rlrin utC. Un like most graphical presentaition styles, it onIly specifies
S
S

one presentation, the text presentation. The reason for IL','
,
bt is simply to specify its
active nature.
The following is tile presentation style description for the row of document icons in the
directory display:
(def-sequence-presentat ion-style
ICON-DIRECTORY-F ILE-GROUP-STYLE
(LIST-PROPERTY DIRECTORY :FILES FILE)
nil t 999999
nil nil nil
document-icon
* :horizontal-layout)
The third line of this description, (list-property...
),specifies the property of the directory
being presented, namely, the files property, and the kind of objects in the list, namely, file
instances. TIhe fourth line spccil-, s that this isnot the default style for such properties, and
that, while it is an active presentation. it should not (in effect) be periodically updated -- it
will instead be updated automatically whlenever the directory instance in the application
database ischanged.
This sequence has no prefix, infix, or suffix presentations (fifth line). The style used to
present the elements of the files list is document-icon. The document icons will be
positioned in a horizontal row.
Finally, the flollowing is the template style description that composes the above two styles
into the overall opened-directory style:
(def-teinpl ate-presentation-style
TOPS20-DIRECTORY-ICON-LISTING-SIYLE DIRECTORY nil
((:self tops20-directory-header)
(:files icon-directory-file-group-style))
:vertical-layout
:border-box)
*' The third line of this template specifies that the directory (selJ) will be presented both by
the whole composite and by the header line. Fhe null string in the fourth line effectively
, produces a blank line separating the header from the document row. And, as mentioned
previously, the files property of' tie directory, a list of"files, will be presented in the style
1,

wh ich lines theiiitip as a row of (locu nient icons. "I
he header, blink linfe, anid docutment row
are lai1d out' ertically. and a1
border box isplaced around hil entire di rectory presenltation.0
Opening, Closing, thle PSBase mechanism for openinug and closing presenltaiious is
driven b aset of spcci fications linkinug domlain object classes and thle prescn tation stylecs for
their openedL and closed presentations. These areceasily pro'. ided: thle Ii)loN iug isone of
these SpccihI CationS (there are four Others, all similar):
(def-open-close-presentat ion-style message-open-close
inessage
mes sage-sumimary
full-nes sage
fonts: cptfont)
Move Receognition. Chapter five described the general move recognition mechanism
provided by PSBasc. TO use this mechanism, thle interface builder must provide the move
* recognition rules and somec small semantic recognizers to handle the recognition, once the
general organizational recognizer has determined that it applies. The following specifies the
* move recognition rule used for recogniiing movement of a document icon to a directory
(either a folder icon or an opened directory display) as a command to move thle File to that
directory (there are 1*ou.r other similar rules specified for the interface):
(def-move-recognition-rule move-documient-to-directory
(:overlap (file (document-icon))
(directory (folder-icon
tops2O-directory-icon-l isting))) 0
.recognize-file-directory-movement)
The semantic recognizers for move recognition are all very similar. ThFie following is a
* sample:
(defmethod (PRESENTATION :RECOGNIZE-MAIL-FILE-MOVEMENT)
(out-box-presentation edit-hi story-entry)
(let* ((file (send self ':resolve-presented-dIomain-object
#typep 'file))
(conmand-appi icat ion
(make-command-appl icat ion
* (intern-command 'seud-file-as-mail-1)
(list file))))
(send coninand-appl ication ' :execute)
(send self ':move-next-to-presentation
out-box-presentation edit-history-entry ':right)))

This recogniier is invoked by sending a recognize-mail-file-movcrenti mcssage to the
presentation being movcd, the document icon. It is givcn the out-box icon as one of its
arguments. The first binding form in the let* resolves the presented domain objcct to a file
instance. The second binding form creates the command application, specifying the
send-file-as-mail-I command and an argument list with the file as the single argument.
The body of the let* executes the command application (the general PSBase command
exccution presenter will take care of the highlighting automatically) and ends by moving the
document icon to a standard position to the right of the out-box.
The other move recognizers are about this simple. Unfortunately, some need to specify
highlighting themselves because of inadequacies in the general command execution
presenter. (Specifically, the presenter looks for presentations of the command or the
command application. However, moving a document to a printer does not involve a
command presentation -- the printer icon presents a printer, not acommand. The out-box,
on the other hand. presents the mail command. Perhaps the command execution presenter
could be improved to handle such cases. In any case, the highlighting isa simple matter to
specify.) -

### 6.4 Menu-Style Interface Implene 'Aion

The implementation of the menu-style interface consists primarily of presentation style -
descriptions. For example, the host information at the top of the screen is produced by the
following template style:
* (def-template-presentation-style HOST-INFO HOST nil
("Host "
(:name nil)
Time:
(:current-time digital-clock-no-border)
* (:load-averages host-info-load-averages)
(:number-of-jobs nil)
jobs.")
:horizontal-layout :border-box)
"""' '-"" -".. .
. . . . . . . . .. ,."... .. .'.
. .... .. . .'.- ... i.,... . . . .,... .-. ,z.-,-.. -- ,---
?--"L'.. ' * ''," "--i'~~~~~~~~~~~~~~.. .. '. ... ,
... ......... ,,.. .. .... *.- . .. .. . . . ... .,.. .. ,. i ,,. =

This style is similar to the other template styles discussed. One distinguishing feature
here is the presentation style specified for the name and number ofjobs properties: nil "
indicates that the database network should be searched for the best applicable delfiult style.
The two other sub-styles named are straight forward templates.
Implementing displays with associated menus has two parts: specifying the relevant
command set in the application database and defining the presentation styles. The
directory presentation will be used here as an example.
The directory presentation and menu combination is a template-style composite
presentation, and as a whole it presents the directory. It has two sub-presentations, the
menu and the directory display. These must, by the nature of PSBase template presentation
styles, present propertles of the directory (or the directory itself again -- the directory
* display falls into the latter category.) Thus, the interface builder must be sure that a
command set is defined, consisting of the relevant commands (present file, delete file, etc.),
and that this command set serves as the value of some property of the directory to be
presented. Since all directories will share the same command set, this is a property of the .
entire class, inherited by each directory instance.
This is implemented in the current PS13ase database mechanism by defining a method -
for directory. (All properties are accessed by the message passing. Some properties are - .
defined by the contents of slots in the instances; but the Lisp machine message-passing
system automatically creates methods to retrieve these as well. Thus, the property accessing
isunifbrm.) This method isshown below:
(de,'method (DIRECTORY :FILE-COMMAND-SET) () S
*sthort-f ile-conimand-set*)
This defines the file command set property for directories. It returns the command set
instance in the database network that the variable *short-fil-eonuand-set*
is bound to.
That variable and the command set instance in turn are created from the following S
specification:
°'. 0
........................................................... ." .l

(defvar *SHIORT-FILE-COMMAND-SET*
(make-command-set- from-spec
' present-f i Ile 0
delete-file
dover-pr in t-f i le
line-print-file)))
This specification defines a command set instance by simply listing the names of the
commands to be included. These commands are dIcfincd indi idnmlly elsewhere. (They
may be included in several different command sets. The PSBase command description
mechanism interns command instances in the database network based on their Lisp
function specifications.) For example, the command description for the present-file
command iswritten as follows:
(def-command PRESENT-FILE
:arglist ((parameter :select zdomain-object
:domain-object-type file
:presentation-type t) S
(parameter :select :position)))
The interface builder must also write the functions for the presentation commands that
appear in these menus. The definition of the present-file function isas follows:
(defun PRESENT-FILE (file-instance position) -
(send file-instance ':maL'-contents)
(present file-instance
(position-x position) (position-y position)
nil
'text-file-contents))
This function (like the open mechanism discussed in chapter five) first ensures that the
file instance includes the current contents (the text of the file). The file is then presented:
the present function is ageneral one that takes as arguments the application database object
(the file instance) to be presented, the position for the presentation, the default fonit (none
specified here), and the name of the presentation style to use (text-file-contents). Since
these present-.., functions all tend to have this same structu,re, there is potential for
converting this task of writing functions to simply describing the action, as is done with
0 open/close mechanism, 5
Some of the presentation styles were shared with the icon-style interface. (In the icon-
style interlace these were all used as opened presentations.) These shared styles are, first,
".
. . . . . . . . . . . . . . . . - " .. .- -> . -' "-.... " .
i .- ,- .. "?'."'7 -' - '-"?-'-" -
.'- '"." "-"+ .. '.-'.7 "-" -" '-L.".." . -'-.".-'-...-?.?, .-.
i.. .. "...-m.a.- --. '... -?L.? - -.- .-?.- -?,.L.-"
.

the presentation of files 3howing pathnane, destination, and text contents- second, the
presentation of the mail File by showing message sumnary lines: and third, the presentation
ofthe text of messages.
The recognition of direct edits iscxactly the same as in the icon-style interlice. In fact, no
additional work was done at all here, since all ie pars-rs for the properties had already
been defined.

### 6.5 Annotation-Style Interface Implementation

The annotation-style interface uses the same presentation styles as the menu-style
interface, differing only in the choice of the command sets and top level presentation style
for the directory. (In the annotation-style interface the top-level directory presentation is
just the directory listing, without the associated menu.)
The command execution presenter provides the facility whercby the annotation verbs are
changed to past tense (in addition to providing the command highlighting). The annotation
recognizer only needs to record the presentation style (namely, the annotation presentation 0
style) in the annotation presentation instance. The command execution presenter checks
the command presentation (which it has been highlighting) for being of that style; if so, the
verb is changed to past tense.
The bulk of the effort was devoted to writing the annotation recognizer. Unlike the other
*mechanisms discussed in these interface implementations. the annotation recognizer isfairly
large and is both style-specific and domain-specific. It did not prove very difficult to
tmodify at various times, as parts of the structure seem almost descriptive. However, a better
.- approach for future development would be to abstract a general PSBase mechanism driven
*- by a set of interface-specific annotation descriptions. This seems to be plausible, judging
from the final structure of the programs. 5
Recognition of the annotations works by matching structural pattcrns against the
* presentation database structuire and checking presented domain objects of eligible
181 .
. S

presentations. For example, consider the case of an arrow connecting the text "delete" with
a presentation of a file. The recognicr starts by chccking that the text presentation is a
command verb. Its job is now to vcrify that this is indeed a presentation of a delete
command application and to determine its arguments.
The organizational recognizer collects lines and arrows attached to the text presentation
and collects the presentations at the other ends, here, only one arrow iscollected.
The semantic recognizer part checks that the presentation at the other end of the arrow
matches (by reference resolution if necessary) something that can be deleted. In this case,
the domain object is a file, and the command application can be created, with the ile as its
single argument.
Even though the annotation recognizer is a fairly large and complex, hand-written
program, compared with the other interface-specific parts of the project the annotation
recognizer still benefits from PSBase support. Its recognition task is simplified by having a
structured presentation database: it does not have to do any work to find arrows and lines
connected to the verb text. And because the presentation database records presented 0
domain objects for tile rich structure created by the directory presenter, recognition is an
incremental task -- only tile annotations to the directory need be recognized, and the
recognizer can easily check that presentations at the ends of delete arrows present files, or
those at the end of change lines present properties that may be changed, for instance.
These ch,.:cks are aided too by the PSBase reference resolution mechanism: whether the
presentation at the end of the change arrow presents a date, a time-and-date, a property
whose value is one of those, etc., is immaterial -- when the recognizer checks a change-
reference-date annotation, it need only ask the resolution mechanism to check for a date . . .-
instance.
Part of the previous two points, and a more general benefit as well, is the fact that the
application database is constructed from auniform database mechanism.

And finally. the larger, interactive nature of the interface benefits from the general
PSBase recognition dependency and retraction mechanism. The annotation recogni,.cr does
not need to consider changes in the annotation s,-ucture from a previously recognized state
-- any such changes cause the previous recognition to be retractcd automatically. The
recognizer only needs to consider the recognition from an unllrecognized state and to inform
the dependency mechanism of the preseltations on which the recognition depends and how -
to retract the recognition it specifies.

### 6.6 Other Style Possibilities

Combinations. These interfaces do not have to be (and were not in this project)
constructed separately. The interface builder can develop them together, combining them
at various times, experimenting with combinations of presentation styles in order to develop
a desired overall style, and so on. One command that PSBase provides in this regard isthe
change presentation style command. The command isgiven a presentation as its argument.
Th, sct of,,!!,rpSp,,t.,,on styles ,,ppi,,bl to the pr'2cntation'' presentcd , -,-
.j " tis
collected. The user selects one of the applicable styles from a menu, and the presentation is
replaced with a new one, of the same domain object, in the selected style. Thus, the builder
or user can be offered control over the way the objects in the application database are
presented.
Planning. In the interfaces developed here, only the annotation-style included planning
-- the separation of accumulation and recognition of commands from their execution. The
other styles appear to inherently be more of a direct manipulation style of interface.
However, one can imagine developing extensions of those styles, adding features of the
annotation style to add planning.
The user could create arrows between presenutions in the icon-style interface to present a
planned move -- and therefore a planned command using the move recognizer. For "
instance, the user could draw an arrow from a document icon to a printer icon. This could
be recognized as a plan to print that file. The user could see this recognition documented,
A ."*.-'-r"
-. .. . - ,
=:'-?.:.2::--' -
.',-'..'-'--'... -F- -,-?- .?. :" ... . . . . .
.-.... .,.. ."-.-, .""." .-'".
.--.-. .... . . ... .. ,..-..
. . . . . . . .:=' '-

as in the annotation-style interface, and accumulate a set of move-arrow plans before giving
the command to executc them.
Similarly, some commands could be planned by drawing arrows in the ficrin-style "-: -
interface, an arrow from the deletefleC
mnu i11m to a file presentation, for example. Somc
menu commands might require more than one input, which would require a somewhat
more complicated visual style to distinguish and group the different inputs to a planned
command application.

### 6.7 Summary

This chapter has described the construction of a user interface on top of the PSBase
system described in chapter five. Three alternative styles were implemented. The
implementation comprised two major phases: S
The first phase was style-independent, primarily the creation of the application database
, (and the background process that periodically updates the application database). Other
style-independent work isthe writing of the simple direct-edit recognizers.
The second phase (for the icon-style and menu-style interfaces, at least) primarily
consisted in using the PSBase-provided tools for defining and describing presentation styles,
commands, command sets, move recognition rules, and presentation styles for opened and .
closed domain objects. These definitions have been illustrated in this chapter, and each is
small and can be quickly and independently written. The examples given in this chapter are
representative: the others are of about the same difficulty and size. The annotation-style
interface required significant additional work in writing its recognizer. An improved
.. PSBase would reduce this work to the scale of the other styles: the builder would simply
write a few simple descriptions of the annotation style.
In other words, once the style-independent work has been completed, implementing a
particular style isgenerally a miatter of writing a relatively few small pieces using PSBase
tools and choosing some standard PSBase components. This project has demonstrated that
- - "°. -.- . . .
" . .- - ". - - - " "

even the small number of features provided by I'SBase, a prototype presentation systcm
base. covers a substantial amount of ground, enhanced by the ability to combine
mechanisms in an independent manner.
Some rough statistics on the project reported here may help to support the claims about
the ease and speed with which interfaces can be built on top of a presentation system base.
(This discussion primarily covers just the icon-style and mcnu-style interfaces, since the
annotation-style interface was developed together with PSBase at an earlier stage.) Of the
roughly thirty days spent on the project, more than half were devoted to further work on
PSBase itself. About five or six days were devoted to creating the application database, the 0
background management process, and the other common parts of the implementation. The
background process took most of the time, more than anticipated, partly due to the
problems of getting information from a distant host via communication network
connections. (A few days involved determining the network scheme best suited for this
experiment.)
About seven days were required to build the icon-style and menu-stylc interfaces (and the
parts of the annotation-style interface that had not yet been completed -- the parts other
than the annotation recognizer). This includes time spent at the end changing styles to
' experiment with the look of things.
Thus. six days were required for style-independent work and seven days for the style-
specific work on the three different style implementations. An interesting note is that, while
many interface builders will be constructing only one interface, some builders will want to
experiment with different styles. This project illustrates how the experimentation process is 0
helped too: the stylc-iidependcnt work, nearly half the effort here, is done just once.
Another statistic is the number of presentation styles. At the project's end there were
about 80 styles defined. Several of the PSBase tools evolved during the project, and this 0
number would be less if the presentation styles were defined from scratch now -- the
number might be closer to 50 or 60. This chapter and chapter five have shown seven of"
these. These numbers, in any case, are not very large. and the dclinitions arc simplified by
--.
:.. : .....
...
:. ... .. ..
. ,.
. ... ..:..
...
. . . : . . . ... -. . ... ...
. .. - .,.0

the fact that they do not have complex interactions. (They have few interactions, in fact
-- merely the static inclusion of one style within another.)
Similarly, though only one move recognition rule and one open/close rule have been
included here (and one of each in (le previous chapter), there are only about tlve others in
each category. Thc total in both categories isno more than a page ofdelinitions.
The characteristics and statistics discussed lend credence to claims that a presentation
system base greatly eases and speeds the development of a user interface. these are not
flawless arguments, ualortunately. First. this has only been one project. It benefits in
generality by including different styles, but there are a few categorics that have not been
included; one such is command completion [Iops2O 801 [Zmacs 84] (and see section 4.2,
page 78). Second, the project is a demonstration, not a user interface that will really be
used. It lacks many features that would be required. The intent was to pick a representative S
sample of these features and to attempt to at least mimic styles and characteristics that are
used in good-QualitV user interfaces. However, one cannot say that a good-quality.
production user interface has yet been constructed on a presentation system base. More
work needs to be done, to build more substantial presentation system bases and to discover
just what benefits they can provide.

## Chapter Seven: Areas for Further Research

Ihis reCport discuIsses preSCII tation based user inte rlAcCS in) two nuiOr phaMSCs: li-st,
discu ssion of' the prese ntatio S)SLCIstemodel and its use inl deseti h~g C.\iSU ug user
intcrfaces: and second, discuIssion Of' lSBasc, thle protot~ pe presentation s~ stcml base for
hu iHingL user interfaces. Fach area can bc la rtlicr stud ied both the modelI and PS Base have
the character of' araework and need to be fleshed ouL
Ihe presentation systcrn model Could be developed further, its structure refined. More
general paaetrs could 1)e identified, kinds of presenter and recogni/cr control, for
instance, or general amibiguities in recogniier action.
1hcrc is currca:Iy hlunlan 11'actors research into what uIser interf1'M.CN );Iuui'd du for
particular1 uIser groups. for instance, what properties they should have, what the stru[cture' Of
dialo(gs should be, and what error melssage's should say. I lowever. there needs to be more
* ~ ork done From the opposite end, determining what user interfaces can do -- what the range
of' possible styles is. In termis of the definition of styles as patterns of presentation systemn
parameters, thle possible fuindatmntal struCttn res for these patterns should be determined,
thus defining broad classes ofstyles.

### 7.1 PSihise ~imiilttionis

PsI kse has sevcrail liminitat ions. )SBase isa Prototype. not A(iiIl-scale pRU01
r~dtiEinsysteml.
SC\ CIAl parts of its Implementation are pateliy or somewhat inconsistenit. resuilting fro-(iii thle
C~olition of, its dc"i'ii and thle I e-CSSure o1' timeI. It pro ideCs esa1ImilS o' ar11ioUS fealture's
th.t a presenrtationl systeml should have, enough;1 inl fact to build theC interf1,mce di"eiisscd inl thle
nec~
'A hapter. [F
h ,.e'~cr. mwe 1eattires in echl category need to be pro\ idcd. the c\ itii1'
* umlichiilisims neecd to be imrllpmx d. especially ill inder to better um1actl~e NIluctitre of' the

presentation system model, and various mechanisms could benefit from being unified.
More Features Offered. Although this chapter has not fully entMiellratCd all the ILCtures 0
ofl'ered in each major category, most of' the features have been illustrated. [he F'ollowing
lists what would be required for a full-scale presentation system base:
* More kinds of presentations, presentation relations
* More presentation editor functions
* More curve recognizers
* More command argument parameter types 5
* More (and cleverer) organizational presenters
* More presenters
* More recognizers, recognizer drivers
Better Mechanisms. In addition to providing more each kind of feature or mechanism,
those that have been provided could be improved, by being made more general, more
efficient, or more intelligent. The following lists the most important improvements needed;
the first three are important in a general sense, in that they are requirements that PS13ase
match the structure of the model more closely:
* Allow specification of semantic presenter style separate from domain collector,
so it can be shared between styles, as organizational collector is
* Allow identification of parts of presentation database as PPS units
* Allow recognizer invocation to depend on presentation context, or vary between 6
PPS units
* Improve the data Hse niechanism: richer structure, knowledge representation
language, perhaps: better matching procedures
* Have move recogniers driven more from descriptions, so interface builder does
not need to write the semantic recogniers
"/.. . . ..

Inified Nlechlniisinls. [wNo miiiaj kinds of' un IIic,:anin needs to Ke awc c\d inl PS l~asc
Inc(hIllis"ilis. 1irst is the imOIU01Caio Of' cont6iual andI gCneral iecoLgiiiei. Ihe dIsinCtiOn
bctv\ ccn the t\\o kinds of iccoizni/ers does not sceill to Ke anl ihecit one. ut ISit a sharp
distinction c:Cen
in the ciirrcnclt iileincnI~tatio01i. Perhaptls thcrc could be a single vccogniier
invocationl mechan sinl.
Second. thle Var11iS prcsCenttionl styl I cscriptions should he unilfied iii~o a single
llngnal'C lor dlescibin piesen tation styles. 'fhe thricc kinds of' descri ptions1 showii in
Seto 5.A. fi- Liehning ljiphical, sequence. and temiplate precntio ti s
e5 are very
simlilar. NIaking a single description language that mlerges theC capabilities of' these thrlecc
kinds of dining form11s should not he (1iffiCUlt.
Beyond that, however, thle decscription of presentation style i ih he interpretcd by more
than jUiSt a presenter. Perhaps it COuld be iverprCtcd by a recogn iter its well. I Iiis would
then Ciisn re that many presenters and recogn iiers wNonlc
1(e invrscs, allowing thle interfh1e
bu ilcrC to 1p
rovidf $reater tlin il'orilit v in thle interfatce style. bet%\\cc n the presen tat ion style
Usedl for onltpnLt (constructed by presenters) and tile presentation style Used for inIput
(reCcogri i CId fromt User COnlStrLIetiOnlS).
LS

-015S 311 PRESENTATION BASED USER INTERFACES(U) MASSACHUSETTS 3/3
INST OF TECH CRMBRIDGE ARTIFICIAL INTELLIGENCE LAB
E C CICARELLI RUG 84 RI-TR-794 N899614-75-C-9522
UNCLASSIFIED F/G 9/2 NL

### 1.0 ~

I. II- -°.
m 2."°'
%'-°
' .o..
o .
J&.2
NAT)ONAL
BUREAU Of STANDARDS-
1963-A ' "'oi
6- °
[ t .,
%.%-
%" 16! %

. 7. -
References
[Attardi & Simni 811
Attardi. G., and Simni, M.
Senmntics of Inheritance and Attributions inthe Description System Omega.
In Proceedingsof IJCAI 81. IJCAI, Vancouver, B.C.. Canada. August. 1981.
* [Barber 821
Barber, 0.
Office Semantics.
PhD thesis, Massachusetts Institute of Technology, February, 1982.
IBcil 821
Beil, D.H.
The V-isiCalc Book.
Reston Publishing Co., Inc., Reston, VA, 1982.
[Bleser & Foley 821
Bleser, T. and Foley, J.D.
Toward Snecifying -wd Ev'aluating the Human Factors of User-Conputer
Interraccs.
In Human 1-aclorsin ComputerSystems, pages 309-314. ACM, March, 1982.
[Brach man 781
Brachman, R.J.
AStructuralParadigmfor RepresentingKnowledge.
Report 3605, Bolt Beranek and Newman, Inc., May, 1978.
[Brach man & Schmolze 85]
Brachnian. R.J., and Schrnolze, £.
An Overview ofthe KL-ONE Knowledge Representation System. -
CognitiveScience, 1985.
To appear.
[Brown 821
Brown.,J. W.
Controlling the Complexity of Menu Networks.
Communicationsofthe ACM 25(7):412-418, July, 1982.
(Brown & Sedgewick 84aJ
Brown. M.H.and Sedgewick, R.
ASystem for Algorithm Animation.
Technical Report CS-84-01, Brown University, January, 1984.

[Brown &Sedgewick 84bJ
Brown, M.H.and Sedgewick, R.
TFechniquesfor Algorithm Animation.
Technical Report CS-84-02. Brown University. January, 1984.
[Brown &Sedgewick 84c]
Brown, M.H.and Sedgewick. R.
Progress Report: Brown University Instructional computing L~aboratory.
In 15th Annual rechnicalSymposium on ComputerScience Educafion(ACM
SIGCSE). ACM. February. 1984.
Also available as Brown University Technical Report No. CS-83-28
fCCA 79J
Program Visualization Concept Paper.
Computer Corporation of America.
Cambridge, MA
* [diSessa 851
diSessa, A.
A Principled Design for an Integrated Computational Environment.
Human-ComputerInteraction1(l), January, 1985.
To appear.
[Donelson 781
Donelson, W. S _
SpatialManagementof Data.
ACM, Atlanta. GA, 1978.
[Foley & Van Dam 821
Folcy. J.D.and Van Dam, A.-
FundamentalsofInteractiveComputerGraphics.
Addison-Wesley, Reading, MA, 1982.
* (Forbus 81)
Forbus, K.D.
An InteractveLaboraloryfor TcachingControlSystem Concepts.
Report 4752, Bolt Beranek and Newman, Inc., September, 1981.
[Friedell 831
Friedell, M.
A itomatic Graphics Environment Synthesis.
Technical Report CCA-83-03. Computer Corporation ofAmerica, 1983.

[Gnianarngari 811
Gnanamgari. S. ______
information Presentation through Default Displays. *
Computer and Information Sciences technical report 81-05-02, University of
Pennsylvania. 1981.
[Hayes 841
Hayes, P.J.
Executable Interface Definitions Using Formn-Based Interface Abstractions.
In H. R.Hartson. editor, Advances in Computer-Human Interaction. Ablex, New
Jersey, 1984.
[Herot 801
1-Irot. C.F.
Spatial Management of Data.
ACM Transactions on Database Systems 5(4):493-513, Decemnber, 1980.
[Jacob 821
Jacob, R.J.K.
Using Formnal Specifications in the Design of aHuman-Computer Interface. 6
In Human Factors inComputer Systems, pages 315-321. ACM, March, 1982.
[K~aczniarek. Mirkc Wilczynski 811
Kaczmarek, T., Mark, W., and Wilczynski, D.
The CUE Project.
InSoftFair -- Software Development: Tools, Techniques. and Alternatives, pages
383-389. IEEE, July, 1983.
[Lieberman 831
Liecberman, H-.
Designing Interactive Systems from the User's Viewpoint.
In P.Degano and E Sandewall, editors, Integrated Interactive Computer Systems,
pages 45-59. North-I-olland, Amsterdam, 1983.
[Liebermnan 841
Lieberman, H.
Seeing What Your Programs Are Ding.
International Journal ofMlan-Mlachine Studies, July. 1984.
[Lisa 841
Apple Lisa reference manual
1984.0

fMark 811
Mark, W.
Representation and Inference inthe Consul System. 0
In Proceedings-ofIJCAl 81, pages 375-381. IJCAl. Vancouver, B.C., Canada.
August, 1981.
[McDonald 831
McDonald. Dlivid D.
Natural Language Generation as aComputational Problem: an ifntroduction.
InBady & 11crwick. editors, Computational Models ofDiscourse, pages 209-264. ...
MIT Press. 1983.
[Newman & Sproiall 79]
Newman, W.M.and Sproull. R.F.
Principles ofInteractive Computer Graphics. 2nd edition.
McGraw-l-jill, New York. 1979.
[Purvy, Farrell & Klose 83]
Purvy, R., Farrell, J., and Klose, P.
The Design of Star's Records Processing: Data Processing for the Noncomputer
Professional.
ACM Transactions on Database Systems 1(1):3, January, 1983.
(Reisner 811
Reisner, P.
Formal Grammar and I-luman Factors Design of an Interactive Graphics System.
IEEE Transactions on Softwvare Engineering SE-7(2):229-240. March. 1981.
[Reisner 821
Reisner, P.
Further Developments Toward Using Formal Grammar as aDesign Tool.
In Human Factors inComputer Systems, pages 304-308. ACM, March, 1982. -
(Shneiderman 801
Shneiderman. B.
Software Psychology-~Human Factors in Computer and Information Systems.0
Little. Brown, and Co., Boston, MA, 1980.
[Shncidcrman 831 .-
Shneiderman, B.
Direct Manipulation: AStep Beyond Programming.
IEEE C'omputer, August. 1983. v....*

[Shneiderman & Mayer 79]
Shnciderman, B.. Mayer. R.
Syntactic/Semantic Interactions in Programmer Behavior: A Model and
Experimental Results.
InternationalJournal ofComputer and Information Sciences8(3):219-239, 1979.
[Smith. Irby, Kimball, Verplank & Harslem 831
Smith, D.C., Irby, C.. Kimball, R., Verplank, B., and Harslem, E.
Designing the Star User Interface.
In P.Degano and E.Sandewall, editors, Integrated Interactive Computer Systems,
pages 297-313. North-Holland, Amsterdam, 1983.
[Stallman 811
Stallman, R.M. .
EMACS Manualfor ITS Users.
Al Memo 554, Massachusetts Institute of Technology Artificial Intelligence
Laboratory, April, 1981.
Now only available as report AD-A093-186 from the National Technical Information
Service, U.S. Dept.ofCommerce, Reports Division, 5285 Port Royal Road,
Springfield, Virginia 22161.
[Stevens & Roberts 831
Siveus, A., wid Roberts, B.
Quantitative and Qualitative Simulation in Computer Based Training.
Journal ofComputer-Based Instruction 10(1,2):16-19, summer, 1983. A
[Stevens, Roberts & Stead 831
Stevens, A., Roberts, B., and Stead, L
The Use ofaSophisticated Graphics Interface in Computer-Assisted Instruction.
IEEE Computer Graphics and Applications :25-31, March/April, 1983.
[Tops20 801
TOPS-20 User's Guide.
Digital Fquipment Corporation, Marlboro, MA, 1980.
Order no. AA-4179C-'TM. Sections 2.2-2.4 discuss command completion.
[Weinreb, Moon & Stallman 831
Weinreb, D. L., Moon, D. A., and Stallman, R.M.
Lisp Machine ManuaL
Fifth edition, Massachusetts Institute ofTechnology Artificial Intelligence
Laboratory, Cambridge, MA, 1983.
4-.. ,;.-'
€'.. ~.-,.:...
r dh-

[Zdyhcl. Gibbons. Green feld & Yonke 81]
Zdybel. F.. Gibbons, J.. Greenfleld. N.&Yonke, M.
Appliculion of.Svmbolic IProcessing to Command and con trol: An Advanced
Information Presentation System.
Report 4752. Dolt Bleranek and Newman, Inc., Au~gust, 1981.
[Zdybcl. Greenrfeld. Yonke &Gibbo~ns 81]
Zdybcl, F., G~reenl'cd. N.. Yonkc, M.& Gibbons. J.
i An In
formatiioni Presentation System.
In Proceedings of IJCAI 81. IJCAI, Vancouver. B.C., Canada. August, 1981.
[Zloof82]
Zloof, M.M.
Oftice-by-Example: A BuISiness Language that Unifies Data and Word Processing
and Elewronic Mail.
IBAISystemis Journal21(3):272-304, 1982.
[Zloof& dcJong771
ZloofI M. M.and de Jong, S.P.
The System for Business Automation (SBA): Programming Language.
Communicationsofthe ACA! 20(6), June, 1977.
[7mnirc 84]
Zmacs Manual
Synmbolics Inc., Cambridge, MA, 1984.

FILMED
Ib D
3-85
.~,....DTIC ...
