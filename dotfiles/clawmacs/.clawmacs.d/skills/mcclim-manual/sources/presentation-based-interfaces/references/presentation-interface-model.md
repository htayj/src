# Presentation-Based Interface Model

This synthesis is about presentation-based user interfaces as a design architecture, not about any one implementation. Ciccarelli's thesis supplies the broad system model; McKay, York, and McMahon's Dynamic Windows paper supplies the typed-object interaction model that later influenced CLIM-style systems; the supplemental presentation-types note is used only for terminology around presentation type lattices and presentation methods.

## Core Idea

A presentation-based interface keeps an explicit semantic link between application objects and their visible representations. The user does not merely click coordinates, widgets, or active regions. The user acts on presentations: visible text or graphics that stand for application-level objects, commands, or intermediate plans.

The system records enough information to answer three questions at interaction time:

- What application object does this visible thing represent?
- What semantic type does that object have in the user interface?
- What operations, conversions, or input roles are valid for that object in the current context?

This is the key difference from event/callback interfaces. Events are still present internally, but the application programmer works mostly in terms of typed domain objects, typed output, typed input, and semantic operations.

## Ciccarelli's Presentation System Model

Ciccarelli describes a presentation system as a relation-maintaining machine between an application database and a presentation database.

The main components are:

- Application database: the domain state or model the application cares about.
- Presentation database: the symbolic screen description, containing visible forms and their structure.
- Presenter: turns application state into presentation state and keeps the display current.
- Presentation editor: lets the user manipulate the visible forms.
- Recognizer: translates the user's manipulation of presentations back into application-level database commands.

The primitive presentation system model is a direct-manipulation loop. The presenter makes application state visible; the editor changes the visible presentation; the recognizer interprets those changes as semantic application operations. The point is not merely that the display changes immediately. The point is that presentation and recognition are paired: the interface has both a forward semantic mapping from object to display and a reverse mapping from display manipulation to object-level intent.

Ciccarelli also generalizes the primitive model by attaching additional presentation systems. This handles cases where the user edits a planned future state, manipulates a visible command list rather than immediate state, or controls the presenter/recognizer themselves through another interface. This is important because real interfaces often contain several coupled presentation systems rather than a single object-to-screen loop.

## Dynamic Windows Typed Presentation Model

McKay, York, and McMahon refine the idea around typed application objects. A presentation has three parts:

- the underlying application object;
- the presentation type, meaning the semantic UI type of that object;
- the displayed representation, textual or graphical.

Typed output creates these presentation records while drawing. Typed input establishes an input context: the type of object the application currently wants. Presentations whose type satisfies the input context become selectable, and others are ignored. This yields automatic context-sensitive feedback, because the interface can highlight only the presentations that are valid input at that point.

Presentation types form a lattice. Operations can be defined on broad semantic types and inherited by narrower ones. For example, an operation can apply to all devices, while a more specific operation applies only to resistors or capacitors. This makes interface consistency follow from the application's semantic structure rather than from a hand-maintained grid of callbacks.

## Translators And Commands

A presentation-based interface needs more than exact type matching. Sometimes an object of one presentation type can satisfy an input context of another type. Dynamic Windows calls the code that performs such a conversion a translator. A translator maps a source presentation, a gesture, and context into a target object or command.

Commands can themselves be presentations. This is the bridge from direct manipulation to command languages: the user may type a command, select operands from visible presentations, select a command presentation from a menu, or use a gesture that translates a presented object into a command. The same semantic machinery can support keyboard, menu, icon, graphical annotation, and mixed-mode styles.

## Nested And Compound Presentations

Presentation-based systems support nested structure. A larger presentation may contain smaller presentations, and a single visible entity may expose several semantic handles. For example, a table row might be a presentation of a record while individual cells are presentations of fields. A file icon may present a file object, while its label presents a pathname or name. Nested presentations allow the interface to choose the most specific valid object for the current input context.

Compound presentation types model structured input and output. A command line, coordinate, pathname, or form can be assembled from smaller typed parts. The important design rule is that parsing and printing should remain dual where possible: if a system can present an object in text, it should often be able to accept a corresponding textual representation, while still allowing pointer selection to bypass parsing when the object is already present on screen.

## Style Independence

Presentation-based does not mean one visual style. Ciccarelli uses the model to describe icons, menus, text editors, annotations, and simulation schematics. The same semantic architecture can produce different styles by changing presenters, recognizers, editors, and presentation style packages.

A useful way to design with the model is to separate:

- domain semantics: what objects and operations exist;
- presentation semantics: what visible things stand for those objects;
- interaction semantics: what gestures, commands, contexts, and translations are valid;
- visual style: how the objects are laid out, drawn, emphasized, grouped, or annotated.

This separation is not absolute, but it prevents the common failure mode where the domain model is hidden behind widget callbacks and pixel regions.

## Design Checklist

When designing a presentation-based interface, answer these questions:

- What are the domain objects that users should act on directly?
- What presentation types describe those objects in UI terms?
- What visible representations will be generated for each type?
- Where is the presentation record stored so the interface can recover object, type, and display region later?
- What input contexts occur during commands and workflows?
- Which presentation types satisfy each input context by inheritance or type relation?
- Which translators convert one presented object into another object or command?
- Which presentations are nested, and how does the system choose between parent and child presentations?
- Which operations belong on broad supertypes, and which belong on specialized subtypes?
- Which parts of the interface are immediate, planned, command-oriented, or interfaces to the presenter/recognizer themselves?

## Common Pitfalls

- Treating presentations as widgets. A widget is usually a control surface; a presentation is a semantic link between a visible representation and an application object.
- Losing the object link after drawing. If output is not recorded with object and type metadata, later input falls back to coordinates and ad hoc hit testing.
- Encoding semantics only in callbacks. Presentation systems should let the application define operations on semantic types, not only on event sources.
- Making visual style determine semantics. The same object may appear as text, icon, menu item, graph node, or annotation while keeping the same semantic identity.
- Forgetting reverse mapping. The presenter maps application state to display; the recognizer or translator maps user manipulation back to application intent.
- Overfitting to one implementation. CLIM and Dynamic Windows are important examples, but the presentation-based model can be applied outside Lisp and outside McCLIM.
