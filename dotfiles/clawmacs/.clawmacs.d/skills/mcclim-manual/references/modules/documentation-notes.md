# McCLIM Implementation Notes


# Extended Stream Input


# Introduction

This writeup purpose is to summarize the specification of input streams. CLIM provides a stream-oriented input layer that is implemented **on top** of the sheet input architecture.

# Glossary

EIS
Extended Input Stream

BIS
Basic Input Stream

# [Extended Stream Input](http://bauhh.dyndns.org:8000/clim-spec/22.html)

The specification defines [Basic Input Streams](http://bauhh.dyndns.org:8000/clim-spec/22-1.html) and [Extended Input Streams](http://bauhh.dyndns.org:8000/clim-spec/22-2.html). Basic input streams define a `handle-event` method for keystroke events and extended input streams define `handle-event` methods for keystroke and pointer events. `handle-event` methods are specified to queue resulting gestures in a per-stream input buffer.

- basic input stream is a character input stream
- extended input stream is an input stream (characters and pointer gestures)

Basic input stream protocol implements the Gray's character stream protocol and we can assume, that only characters are available in it.

Extended input stream has its own protocol which allows specifying wait timeouts and auxiliary input test functions (see a function `read-gesture`). That means in particular EIS is not a subclass of BIS.

Classes `standard-input-stream` and `standard-extended-input-stream` are specified to be based on "CLIM's input kernel", a term which is not explicitly defined in the spec. Extended input stream is specified to be a subclass of a class `input-stream` (which is also not specified).

## Input buffer

The input buffer is not specified for basic input streams (there is a concept of the same name specified for input editing streams). The specification of EIS talks about the accessor `stream-input-buffer` where the input buffer is defined as a "vector with a fill pointer capable of holding general input gesture objects". In the same section it is said that the input buffer may be shared by multiple streams.

# Problems with the specification

## EIS initargs

Extended input streams are specified to accept initargs `:input-buffer`, `:pointer` and `:text-cursor`:

- Specifying `:input-buffer` make sense because we want to allow sharing the same buffer by multiple streams (as defined in `stream-input-buffer`)

- The `pointer` purpose is not clear – functions of the protocol which operate on the pointer are specified to default to the `port-pointer` (undefined), also it is not up to the stream to say, which events are queued for it – it might be also that the stream is expected to "update" its private pointer state based on pointer events, but that is not specified

- Including `:text-cursor` seems to be out of place, because the text cursor protocol is described in [15.3 The Text Cursor](http://bauhh.dyndns.org:8000/clim-spec/15-3.html), which is part of the chapter [15 Extended Stream Output](http://bauhh.dyndns.org:8000/clim-spec/15.html) (so it makes sense to interactive streams), also there is no mention of functions which operate (or even return) the cursor

## CLIM input kernel

This term is not specified. It could be interpreted as either:

- the input abstraction defined for sheets (event-queue etc)
- the implementation-specific input-stream class interacting with event-queue

Saying, that they are "based on" seems to imply, that it is a stream class (that is the latter option), as opposed to being "implemented on top of the sheet input architecture", as it is stated in the chapter 22 introduction.

## Input buffer

As mentioned before, the term is mentioned for BIS, but it is defined only later for EIS with the accessor `stream-input-buffer`. This specification has a few problems:

What happens when we "read" from the input buffer? Since it is a vector, "popping" the element from it does not make sense. We could copy the vector except for the first element and decrement the fill pointer, but it sounds terribly inefficient compared to ordinary queue. Another idea is to have a separate scan pointer (inspired by input editing streams), but this idea breaks when we account for shared input buffers, because the scan pointer must be shared too.

The idea of copying the vector to shift it by one is not sound. Let's assume that streams in fact share a structure `(cons scan-pointer input-buffer)`. In this scenario events accumulate very fast (pointer motion events are also appended to the buffer), so the buffer should be cleared at some point; however it is not clear when the function `stream-clear-input` (n.b specified only for BIS) should be called.

## Unspecified functionality

- there is no `gesture-available-p` function defined for EIS, which would check whether there is available input in the input buffer (equivalent of `peek-char-no-hang`) – it is different from "peeking" for a gesture with a timeout 0, because `stream-input-wait` may advance the event queue what may not be desired

- the function `stream-process-gesture` is defined for input editing streams, but it would be also useful for EIS to allow gesture translations like changing a keyboard gesture to a character (if applicable)

- the function `stream-append-gesture` to allow pushing the event to the input buffer (expected to be called from `handle-event`)

- all of EIS protocol make perfect sense for BIS too, for instance `stream-read-gesture`; `stream-pointer-position` also makes sense if we assume, that the pointer defaults to the `port-pointer` of the stream's port (and that's how it is specified), the only difference between them is that BIS is a character stream while EIS contains also pointer events

- `stream-input-wait` is specified to "wait for input to become available on the stream", but it is not said how it does that nor what it returns, it is also not clear when the `input-wait-test` is called (more on that later)

- `stream-read-gesture` accepts both `timeout` and `input-wait-test` as well as a `pointer-button-press-handler` and `input-wait-handler`, but the specification of how they are treated is sloppy at best. For example:

  - Should the event be removed from the queue before `pointer-button-press-handler` is invoked? This handler may perform a non-local exit i.e by throwing the presentation.

  - Should `stream-read-gesture` loop over to read the next gesture or return after invoking one a button press handler or input wait handler?

  - Should handlers be invoked when peek-p is true?

# Current practice

Both McCLIM and CLIM-TOS assume, that the input-buffer is the sheet's event queue (which is by default "inherited" from the frame). In the source code of CLIM-TOS someone raises in comment a concern whether it is correct. In both cases EIS protocol implementation is just a trampoline to event functions.

What's more, SEIS in McCLIM is implemented as a subclass of BIS (a character stream), so when the `read-char` is invoked all pointer events are discared.

Drawbacks:

- the abstraction is violated and the method because the function `handle-event` may not be called for all sheet events. That makes stream-sheets not obey the sheet input protocol

- it is not possible to have streams having different event queues to interact with each other (i.e select the presentation from a different application frame for the active input context)

McCLIM introduces a concept of the `port-frame-keyboard-input-focus` which is harmful for two reasons: it assumes that all sheets are panes and duplicates what can be done directly with `port-keyboard-input-focus`, so there doesn't seem to be a good reason for adding this abstraction.

Handlers and testers bound by the macro `with-input-context` also operate on the event queue and sometimes "steal" events when they see fit. Most notably no pointer events remain

# Proposed solution

1.  Implement `input-stream-kernel` class without `handle-event` methods specialized on it. It defines basic versions of the EIS protocol which interact with the sheet's event queue.

2.  Make the input-buffer a queue (not a vector), but the sheet event queue can't be the same object as the stream's input buffer.

3.  Make the `standard-input-stream` inherit from the `input-stream-kernel`, define the `handle-event` method on keystroke gestures to append only characters and implement the character stream protocol on it. Thanks to that `standard-input-stream` can be used as a drop-in replacement for the `standard-extended-input-stream` but it doesn't enqueue pointer events.

4.  Carefully specify how `stream-read-gesture` and `stream-input-wait` work

5.  \[This still requires some thought\] Make a default input-buffer for all stream a global queue which is shared across whole image, so it is possible to exchange presentations between different application frames (with different queues and ports).

## STREAM-READ-GESTURE

Interactions between the event queue and functions arguments.

### Reading a gesture from EIS (specified algorithm)

1.  bind **input-wait-test**, **input-wait-handler** and **pointer-button-press-handler** to the function arguments

    *these arguments default to these variables*

2.  Wait for input by invoking:

    ``` commonlisp
    (stream-input-wait stream
                      :timeout timeout
                      :input-wait-test input-wait-test)
    ```

3.  Process the result

    1.  timeout reached: return (values nil :timeout)

    2.  input-wait reached: call input-wait-handler

        /and what then? return (values nil :input-wait-test)? loop over to the point "1." and try again? The latter is more feasible, because input-wait-\* are specified as means for interactive feedback./

    3.  pointer button pressed: call pointer-button-press-handler

        /should we remove the event from the input buffer first? a default handler estabilished by with-input-context performs a non-local exit and throws the presentation, so we may end up in the infinite loop./

    4.  otherwise process the gesture

        abort gesture
        signal abort-gesture condition

        accelerator-gesture
        signal accelerator-gesture

        some other processing?
        return the gesture

4.  When the boolean peek-p is true, then leave in the input buffer

    /does not apply to "normal" frame loop, but if peek-p is true, should handlers be respected for? Or do we only return the event and ignore handler parameters (i.e binding to NIL)?/

### How the function is used (in McCLIM)

1.  `accept-1` encapsulates the stream in `with-input-editing`

2.  Function is called inside `with-input-context` which binds the input wait test, the input wait handler and the pointer button press handler:

    input-context-wait-test
    (and event-p pointer/keyboard-p)

    input-context-event-handler
    highlight-applicable-presentation

    input-context-button-press-handler
    throw-highlighted-presentation

    *it is not clear whether the event is consumed or not, neither whether the event is taken from the input buffer or the event queue.*

3.  `read-token` or similar is called from the presentation method `accept`

4.  `read-gesture` is called with `input-wait-handler` and `pointer-button-press-handler` (the stream is an input-editing stream), without `timeout` nor `peek-p` specified)

5.  `read-gesture` trampolines to the encapsulating stream method `stream-read-gesture` and passes all arguments to it

6.  When the enacpsulating stream method needs a new gesture it passes all arguments except `peek-p` to the underlying stream (EIS)

    *peek-p is always nil anyways on the analyzed code path*

### Proposed solution

1.  stream-read-gesture specialized on input-stream-kernel:

    1.  When peek-p is true, just check the input buffer and return

        *don't call stream-input-wait, call stream-gesture-available-p*

    2.  bind **input-wait-test**, **input-wait-handler** and **pointer-button-press-handler** to the function arguments

    3.  Decay the timeout (if applicable)

    4.  Wait for input by invoking:

        ``` commonlisp
        (stream-input-wait stream
                           :timeout timeout
                           :input-wait-test input-wait-test)
        ```

    5.  timeout reached: return (values nil :timeout)

    6.  input-wait reached: call input-wait-handler and goto point 4.

    7.  process the gesture

        - remove a gesture from the input buffer
        - (setf gesture (stream-process-gesture gesture))
        - when the gesture is NIL, goto point 4.
        - when the gesture is pointer-button-press-event call the handler

    8.  return the gesture

2.  stream-process-gesture specialized on input-stream-kernel

    1.  When the gesture is abort, signal abort-gesture
    2.  When the gesture is accelerator, signal accelerator-gesture
    3.  If gesture can be coerced, return (values char 'standard-character)
    4.  Otherwise, return (values gesture (type-of gesture))

    This makes also BIS conform to abort and accelerator gestures. Note, that this method never returns NIL, looping over on NIL in stream-read-gesture is specified for sake of extensions (i.e gesture causes some side effect). For instance input-editing-stream implements with that editor commands (however it has different stream-process-gesture method).

    Signalling abort and accelerator gesture conditions does not necessarily transfer the program control - both are non-serious conditions and are ignored if not explicitly handled.

## STREAM-WAIT-INPUT

### (Un)specified algorithm

> Waits for input to become available on the extended input stream stream. timeout and input-wait-test are as for stream-read-gesture.

So basically not specified. While not specifying *how* it interacts with the event queue is easy to understand, this entry should specify the function return values and the order of probing things:

- first check input-wait-test then for the event
- first check for the event then input-wait-test

The difference seemingly small is actually quite meaningful: imagine that input-wait-test returns, when motion event is available in the queue - if we return nothing, then stream-read-gesture executes the handler and calls again the input-wait-test, which again returns to call input-wait-handler. That leads to infinite loop and is clearly not desired. On the other hand, if we first check for the event, then input-wait-test (assuming it waits for motion events) will be never called and handler will never highlight the presentation. Also not desired.

### How the function is used (in McCLIM)

The function is only called from the primary method `stream-read-gesture` specified for the `standard-extended-input-stream`. Function may be considered as a more elaborate version of the function `stream-listen`.

### \[rejected\] Proposed solution

This solution is rejected, because if we want to share the input buffer between different streams (not having the same event queue), then input-wait-test should operate on the input buffer, not the event queue, and this solution operates under assumption that it operates on the latter.

1.  Check if a gesture is already available in the input-buffer (fast path)

2.  Call input-wait-test, when returns T, then handle-event if avaiable and return (values nil :input-wait-test)

    *calling handle-event on event which was possibly read assures the event queue progress by putting the gesture in the input-buffer (compare 1.)*

3.  Decay the timeout if applicable

4.  Call event-listen-or-wait and process the result

    - if returns t, call handle-event and goto 1.
    - if it is timeout, return (nil :timeout)
    - if it is wait-function, then handle event if available and return (values nil :input-wait-test)

### Proposed solution

1.  If the gesture is already available in the input-buffer return true
2.  Decay the timeout if applicable
3.  Call event-listen-or-wait and process results
    true
    do nothing

    (values nil :timeout)
    return (nil :timeout)

    (values nil :wait-function)
    do nothing
4.  When read-event-no-hang returns an event, call handle-event
5.  Call input-wait-test and process the result
    true
    return (values :input-wait-test)

    false
    go to 1.

This algorithm ensures, that:

- stream input-buffer progresses even when input-wait-test returns always T
- input-wait-handler is called at most once for each event

## Input buffer and event sheet interaction

With this change EIS and BIS both implement the protocol which is useful from the higher abstraction perspective. Additionally they respect the abstraction separation what makes them better composable with systems built on top of the lower CLIM abstractions which were known on Genera as `Silica`.

At the bottom there is the backend which is advanced with calls to `process-next~event`. Events are either queued in the queue specific to the sheet or handled immedietely (depends on the sheet mixin).

- when they are handled immedietely, the input buffer is filled from the `handle-event` method called directly from `dispatch-event`

- when they are enqueued, `stream-input-wait` advances the queue processing with `event-listen-or-wait` and handles them when available

In this sense `stream-input-wait` never advances the input buffer, but advances the sheet event queue. After the event is put in the input buffer it may be read in the `stream-read-buffer`. That "drains" the input buffer and after processing may lead to a non-local transfer control (the abort gesture, pointer button press on a sensitive presentation etc).

## Input buffer and input context handlers interaction

# Future work

`stream-input-wait` should be able to be build on top of the `immediate-sheet-input-mixin` which doesn't have any queue. In this scenario it should either call `process-next-event` directly, or the immediate mixin should have a specialization on the function `event-listen-or-wait` which is a simple trampoline to the `process-next-event` (other functions which trampoline to queue should have somewhat similar implementations which directly interact with the port). This is a subject of possible improvements after input buffers are separated from event queues (indeed, without such separation it would be impossible to have EIS working on top of the `immediate-sheet-input-mixin`).

Share by default the input buffer between all EIS, so it is possible to handle contextual input across different frames. Before doing that a proper input focus should be implemented (there is a pull request doing that).


# Layout Protocol


# Layout protocol

The layout protocol is triggered by a call to `layout-frame`. This function may be called as a result of:

- adopting the frame by a frame manager
- external event that changes the frame geometry `window-configuration-event`
- user call to change the frame layout
- user call to change the space requierments `change-space-requirements`

The protocol is executed in two passes:

## Composition

The function `(compose-space pane &key width height)` takes parameters that denote a suggested width and height of the pane and uses the user space requirements provided when the pane is created (`:min-width`, `:width` etc) and returns an instance of the class `standard-space-requierement` that specifies min, max and optimum size of the pane.

Results of `compose-space` are cached. The cached value is invalided by a call to `change-space-requirements`.

## Allocation

The function `(allocate-space pane width height)` is responsible for arranging the pane children by changing their geometry and invoking `allocate-space` on each of them. `allocate-space` does not change the geometry of its "own" pane. Sometimes it is not possible to meet the pane requirements, in that case `allocate-space` may be called with values that are "outside" of the pane space requirement.

# Changing the space requirements

When space requirements are changed with `change-space-requirements`, then user preferences are updated. Then the parent is notified about that with `(note-sheet-requirements-changed parent pane)`. The parent may decide to re-allocate the space for children or to escalate the changed requirements to its own parents.

Sometimes numerous changes to space requirements happen in a single batch of invocations. For example the pane requirement may be specified as `:compute`, that is to be able to contain the stream output history. In that case when we redisplay the frame, then first we call `window-clear` and then we produce a new output history. That results in two calls to `change-space-requirements`. To avoid consecutive changes to the sheet size all these calls may be wrapped in `changing-space-requirements` - as a result all changes will be merged and executed only once the top-most macro invocation exits.

Merging calls inside `changing-space-requirements` may be a little tricky, because changes may happen at different points in the hierarchy with different options. It is important for each call to update the user preferences, invalidate intervening cached values of `compose-space` and call depending on options either `allocate-space` or `layout-frame`.


# Presentation Types


# Introduction

Presentation types are integral part of CLIM. They are used to implement typed I/O. The concept originates from the paper [Presentation Based User Interfaces (1981)](https://dspace.mit.edu/bitstream/handle/1721.1/41161/AI_WP_219.pdf?sequence=4) and is further adapted to Common Lisp realities in the paper `A Presentation Manager Based on
Application Semantics (1989)`. The concept was implemented on Genera in `Dynamic Windows` framework and then became integral part of the [CLIM specification](http://bauhh.dyndns.org:8000/clim-spec/index.html)[^1].

More information, however not binding for McCLIM which implements CLIM II, is available in user guides available from CLIM vendors [Franz](https://franz.com/support/documentation/current/doc/clim-ug.pdf) and [LispWorks](http://www.lispworks.com/documentation/lww42/CLIM-W/html/climguide.htm). There is also a mailing list [mcclim-devel](https://mailman.common-lisp.net/pipermail/mcclim-devel/) (less organized) and McCLIM [bug tracker](https://codeberg.org/McCLIM/McCLIM/issues/).

Regarding implementations of CLIM and the presentation system, there are two independent projects which source is available for inspection:


descendent of Symbolics CLIM (1990)


clean-slate implementation (2000)

This document focuses on presentation types and how they are used for the presentation generic function dispatch and how they relate to objects which are presented[^2]. It is written from a perspective of McCLIM codebase unless explicitly noted. The Symbolics descendant will be referred as CLIM-TOS.

# Presentation type categories

Presentation types may be categorized as follows:

- class presentation types (attached to a standard-class[^3])
- class presentation types (attached to a standard-class, parametrized)
- basic presentation types (not attached to a standard-class)

Additionally there are presentation types which need special handling:

- T (supertype of all ptypes), NIL (subtype of all ptypes)
- sequence presentation types (sequence, sequence-enumerated)
- one-of/some-of presentation types (completion, subset-completion)
- meta presentation types (or, and)

# Presentation methods

It is worth noting, that currently there is no "legitimate" way to define new presentation generic functions, because the first argument[^4] of the function must be named by a symbol in `clim-internals` package.

present
constructs a presentation from an object and a ptype

accept
accepts a presentation based on its type

describe-presentation-type
textually describes the ptype

presentation-type-specifier-p
validates parameters and options

presentation-typep
returns T when object matches the ptype

presentation-subytpep
relation between two ptypes

map-over-presentation-type-supertypes
maps over superclasses

accept-present-default
accepting-values calls this to show value

presentation-type-history
returns (not specified) history object

presentation-default-preprocessor
coerces object to the ptype

presentation-refined-position-test
used for pointer selection

highlight-presentation
as name suggests, highlights the object

Some presentation methods have the ordinary function counterpart which may be called without using `funcall-presentation-generic-function`. That serves as a trampoline, but the ordinary function may introduce also some additional semantics.

Default behavior of the presentation generic function may be specified with a macro `define-default-presentation-method` and specializations are defined with `define-presentation-method`. Each presentation generic function has an argument named `type` which has a special meaning during the pgf dispatch.

When defining a presentation method with `define-presentation-method` programmer specializes the argument `type` with the presentation type name. The macro makes this argument **not** specialized in the actual CLOS method and moves this specialization to the hidden type-key or type-class argument on which the actual dispatch is performed. Value of the argument type in the method body is a presentation type specifier, i.e `((integer 0 15) :base 16)`.

``` example
> (clim:define-presentation-generic-function foo foo (climi::type-key type))
> (clim:define-default-presentation-method foo (type) `(default ,type))
> (clim:define-presentation-method foo ((type integer)) type)
> (clim:funcall-presentation-generic-function foo '((integer 0 15) :base 16))
((INTEGER 0 15) :BASE 16)
> (clim:funcall-presentation-generic-function foo '(real 0 15))
(DEFAULT (REAL 0 15))
```

# Presentation type inheritance

Presentation types may inherit from each other. After [23.1](http://bauhh.dyndns.org:8000/clim-spec/23-1.html):

> The set of presentation types forms a type lattice, an extension of the Common Lisp CLOS type lattice. When a new presentation type is defined as a subtype of another presentation type it inherits all the attributes of the supertype except those explicitly overridden in the definition.

From the fact that a type lattice is an extension of CLOS type lattice we conclude that it is hierarchical (that is hinted in multiple other places). There are few exceptions from this rule:

- "one-of" type `completion` and "some-of" type `subset-completion`
- meta types `or` and `and`[^5]
- the universal subtype `nil`[^6]

A new presentation type can't inherit from these presentation types. When the object is of a particular presentation type, it is also of a type of all its supers. When the presentation type is defined, the value of the argument `:inherit-from` must one or more basic/class presentation types. Multiple inheritance is specified with `and`, but this does **not** mean that the presentation type inherits from the meta presentation type `and`. In the following example the inherit-form must be (and defaults to) `(and a b c)`, otherwise the class presentation type would not match the standard class itself:

``` commonlisp
(defclass foo (a b c) ())
(define-presentation-type foo () :inherit-from '(and a b c))
```

The presentation type `t` is specified as an universal supertype of all CLIM presentation types. The protocol for this presentation type is implemented manually in McCLIM - it doesn't have any parameters and options. Its relation to other presentation types is special-cased in function predicates. The presentation type inheritance looks as following:

``` example
T --+-- clos presentation types --+-- [standard classes]* ---+
    |                             |                          |
    |                             +-- [parametrized]* -------+
    |                                                        |
    +-- basic presentation types -+-- [subtypes]* -----------+
    |                             |                          |
    |                             +-- COMPLETION ------------+
    |                             |                          |
    |                             +-- SUBSET-COMPLETION -----+
    |                                                        |
    +-- "meta" presentation types --- (OR, AND) -------------+-- NIL
```

NIL is the universal subtype of all presentation types, it is the only point where these all subtypes of T meet again. Programmer may create new class presentation types and basic presentation types, while "other" presentation types can't be inherited from[^7].

- when the presentation type inherits from t, it is a basic presentation type
- otherwise it is a class presentation type

When the argument `:inherit-from` is not supplied, it defaults to the `standard-object` unless the presentation type name coincides with a standard class name, then it defaults to that class ancestors (specified with `and`). Since the presentation type `T` does not implement the presentation method for `presentation-typep` it is obligatory for new presentation types inheriting from T to implement that method, otherwise an error will be signaled.

# Correspondence between lisp objects and presentation types

As noted before, the class presentation type is attached to a `standard-class` and the basic presentation type is not. The function `presentation-type-of` is specified to return the most specific presentation type of which `object` is a member.

- for built-in objects the correspondence is manually estabilished
- for standard objects returns a matching clos presentation type[^8]
- for unknown objects returns a presentation type `expression`

This function is not specified as a generic function and should not be extended. Otherwise a correspondence between presentation types and standard classes may be broken leading to undefined consequences. The function is also used internally by McCLIM[^9].

The function `presentation-typep` is a predicate which decide whether an object is a member of the presentation type. Specification of both functions implies, that the following should be always true:

``` commonlisp
(presentation-typep object (presentation-type-of object))
```

The presentation type `expression` is a wildcard basic presentation type, that is any Lisp object is its member. That clearly shows, that presentations doesn't need to have anything in common with presented objects. For example:

``` commonlisp
(deftype iso-time () `fixnum)
(define-presentation-type iso-time () :inherit-from 'expression)
```

Note, that if the `iso-time` were a standard class, then the presentation type should have a different name to avoid associating it with the class[^10].

In the Franz CLIM Guide ([8.6.2](https://franz.com/support/documentation/current/doc/clim-ug.pdf#G10.400)) it is mentioned, that if the class presentation type doesn't have parameters, then there is no need for defining the presentation type to use it. That is indeed how McCLIM imprements presentation types. This is because for the class presentation types without parameters there is no need for a separate predicate which determines the object membership, so there is no need for implementing presentation methods `presentation-type-of` and `presentation-typep`. This is additionally reinforced by the specification of the presentation method `presentation-typep`:

> The presentation-typep method is called when the presentation-typep function requires type-specific knowledge. If the type name in the presentation type type is a CLOS class or names a CLOS class, the method is called only if object is a member of the class and type contains parameters, and the method simply tests whether object is a member of the subtype specified by the parameters. For non-class types, the method is always called.

When the presentation type is not attached to the class or when it has parameters, it must implement the `presentation-typep` method to allow determining membership for arbitrary object (because that can't be determined based on the class hierarchy!).

Another clue is contained in the specification of the macro `define-presentation-type` ([23.3.1](http://bauhh.dyndns.org:8000/clim-spec/23-3.html#_1148)), that both `presentation-typep` and `presentation-subtypep` are used to **refine** tests for type inclusion, not to replace them.

> For example, the parameters are used by presentation-typep and presentation-subtypep methods to refine their tests for type inclusion.

This part is also very relevant to signaling the error when appropriate methods are not defined:

> If a presentation type has parameters, it must define presentation methods for presentation-typep and presentation-subtypep that handle the parameters, or inherit appropriate presentation methods.

The old McCLIM behavior was not adhering to this specification, because it called the `presentation-typep` presentation method always when parameters were present (even when the object was not a member of the corresponding standard class).

Moreover, `presentation-typep` default method returned true (by a mistake, but still), what lead to a lot of invalid code with presentations inheriting from `t` which were in fact equivalent to presentations inheriting from `expression`. Moreover, presentations with parameters inheriting from standard classes, returned truth for objects which did not belong to the class.

That was clearly bogus from the specification perspective. Changing the behavior to conform to the specification makes the presentation type abstraction more intuitive and consistent. Changing this behavior doesn't come without a cost. `presentation-typep` and `presentation-subtypep` are called by presentation translators and acceptors. With invalid semantics of said operators things seemingly worked, however they were broken in many subtle ways which sometimes put the programmer in the debugger - code which relies on these invalid semantics will require modifications, otherwise it won't work.

An instance of the presentation is created by a function `present` or in a macro `with-output-as-presentation`. In both cases the programmer is expected to supply the object and the presentation type. Timothy Moore (designer of the current McCLIM presentation implementation) writes:

> I believe that the user (programmer) has the freedom to pair any object with any presentation type in a presentation; if that breaks other code, then that's his problem. If an application needs a strong guarantee that the user (user) enters a valid object for a presentation type then the accept method should check that before returning.

I disagree with this permissive interpretation. There are no convincing benefits of using presentation type which doesn't conform to the object, and there are a few reasons why this is a bad idea:

- we already have non-clos based presentation types, so it is enough to just inherit from the ptype `expression`

- that breaks a direct pharsing in the spec, where it is said that the object is of the presentation type (that is, we are conformingly allowed to check that, and in other words a program which does not meet these conditions is not conforming)

- like in compilers, being strict with validating input allows to detect errors early, instead of letting them subtly break program later on (case in point, changing this behavior in McCLIM shown a few mistakes, i.e in the `presentation-typep` of a `command`

- having valid object in the presentation allows other presentation methods to assume a correct type, instead of rechecking the same thing over and over again, or signaling unexpected errors i.e due to adding `(+ 3 "foobar")`, where the presentation type is integer

The only potential argument would be that it may be costful from the performance perspective, but that would require evidence.

Permissive pairing or objects and types encourages invalid code and puts an additional burden on the programmer: they need to validate the presentation type of t he object in *every* method which deals with objects, otherwise it is possible to land in the debugger out of the blue. When the presentation method is specialized on the presentation type `integer` it is the least surprising to have the object of the type integer. Otherwise the method:

``` commonlisp
(define-presentation-method foo (object (type integer))
  (< object 14))
```

is invalid, because object is not guaranteed to be a number. That applies to all presentation methods dealing with objects, most notably `accept` and `presentation-typep`, which are called from code implementing typed input.

Not without a merit is the fact, that `accept` is is permissive, while translators rely on a strict implementation. McCLIM abstractions doesn't have a consistent interpretation with this regard.

# Examples

1.  There is no need to define a presentation type for a class, it is

already possible to use it as a presentation type.

``` commonlisp
(defclass foo () ())
(clim:find-presentation-type-class 'foo)
;; #
```

1.  It is possible to define a presentation type for existing standard

class to parametrize it.

``` commonlisp
(defclass person () ((age :initarg :age :accessor age)))
(clim:define-presentation-type person (from upto))
(clim:define-presentation-type-abbreviation minor  () `(person nil 17))
(clim:define-presentation-type-abbreviation adult  () `(person 18  99))
(clim:define-presentation-type-abbreviation senior () `(person 99 nil))
(clim:define-presentation-method clim:presentation-typep (object (type person))
  (let ((age (age object)))
    (and (or (null from) (>= age from))
         (or (null upto) (<= age upto)))))

(clim:presentation-typep (make-instance 'person :age 15)
                         (clim:expand-presentation-type-abbreviation 'minor))
;; -> T T
(clim:presentation-typep (make-instance 'person :age 15)
                         (clim:expand-presentation-type-abbreviation 'adult))
;; -> NIL T
(clim:presentation-typep (make-instance 'person :age 15)
                         (clim:expand-presentation-type-abbreviation 'senior))
;; -> NIL T
```

The presentation type of an instance of person is `standard-object`!

``` commonlisp
(presentation-type-of (make-instance 'person :age 15)) ; -> standard-object
(present (make-instance 'person :age 33))
```

That is because the presentation type `person` has required parameters. If it the expected behavior and while not intuitive at first, it makes sense, because:

``` commonlisp
(subtypep 'person 'standard-object) ; -> t t
```

And the macro `with-input-context` for the accepted type `(person 18 99)` will test whether the accepted type is a presentation-subtypep to the presentation's type. In our case:

``` commonlisp
;; (accept 'adult) ; accept will first check class, then the exact type
(clim:presentation-subtypep '(person 10 20) 'standard-object) ; -> t   t
;; (clim:presentation-subtypep '(person 10 20) person)        ; -> nil t
```

That's the initial test, which later needs to be narrowed by calling `(presentation-typep object '(preson 10 20))`[^11].

1.  *XXX doesn't work* It is possible to inherit from a class.

``` commonlisp
(defclass foo () ())
(clim:define-presentation-type qux () :inherit-from 'foo)
```

It doesn't work because we are very sloppy with how we traverse the presentation supertypes. We only check whether qux has a class with `(find-class 'qux nil)` instead of checking also its supertypes. It is McCLIM's bug.

1.  *XXX doesn't work* It is possible to inherit from multiple

presentation types[^12].

``` commonlisp
(defclass foo () ())
(defclass bar () ())
(clim:define-presentation-type bar (a) :inherit-from 'clim:expression)
(clim:define-presentation-type lex () :inherit-from 'clim:expression)
(clim:define-presentation-type qux () :inherit-from '(and foo (bar 14) lex))
```

In this case the object presented with the presentation type `qux` must be an instance of the class `foo` and of the class `bar`, and must qualify as `(bar
14)` and as `lex` by means of calling the presentation method `presentation-typep`.

1.  It is possible to create presentation type orthogonal to a class

hierarchy.

``` commonlisp
(defclass qux () ())
(defclass bar () ())
(clim:define-presentation-type foo () :inherit-from 'clim:expression)
(clim:define-presentation-method clim:presentation-typep (object (type foo))
  (or (typep object 'qux)
      (typep object 'bar)))
```

The presentation type `foo` is not a subclass nor a subtype of either `qux` or `bar`, it is a subtype of the presentation type `clim:expression`. It narrows its members to instances of the class `qux` and the class `bar`.

1.  Presentation types are hierarchical.

``` commonlisp
(defmacro exp (type) `(expand-presentation-type-abbreviation ',type))

(clim:define-presentation-type foo () :inherit-from '(integer 1 15))
(clim:define-presentation-type-abbreviation bar ()  '(integer 1 15))

(clim:presentation-subtypep '(integer 4 8) '(integer 1 15))      ;-> T   T
(clim:presentation-subtypep '(integer 4 8)  (exp foo))           ;-> NIL T
(clim:presentation-subtypep '(integer 4 8)  (exp bar))           ;-> T   T
(clim:presentation-subtypep  (exp foo)     '(integer 1 15))      ;-> T   T
(clim:presentation-subtypep  (exp bar)     '(integer 1 15))      ;-> T   T
(clim:presentation-subtypep '(integer 1 15) (exp foo))           ;-> NIL T
(clim:presentation-subtypep '(integer 1 15) (exp bar))           ;-> T   T
(clim:presentation-subtypep  (exp foo)      (exp bar))           ;-> T   T
(clim:presentation-subtypep  (exp bar)      (exp foo))           ;-> NIL T
```

# Footnotes

[^1]: The specification is also available in McCLIM repository with a few modifications. We try to improve it to remove typos and ambigous parts from it.

[^2]: It is written to help finding the best solution for a problem raised in the [pull request](https://codeberg.org/McCLIM/McCLIM/pulls/1026) to McCLIM which proposes more strict enforcing of the presentation type implementation and the presentation object belonging to the presentation type used.

[^3]: There is inconsistency between PRESENTATION-TYPE-OF and the rest of the system. The function returns the class name of the structure-class instances too. This probably needs to be addressed.

[^4]: McCLIM doesn't distinguish between symbols `type-key` and `type-class`, but they have a different meaning when it comes to the presentation generic function dispatch (and each presentation method have specified which it is). CLIM-TOS takes that into account. AFAIK that is not explicitly explained in the specification and that issue needs to be addressed.

[^5]: The presentation type `and` allows "predicates" `satisfies` and `not` as its parameters, i.e `(and integer (satisfies oddp))`.

[^6]: The universal supertype `t` is not an exception - all presentation types inherit from it, so it is a root of the presentation type hierarchy.

[^7]: These types must be special-cased in the presentation-subtypep function. Inheriting from them would break the hierarchical model of the presentation type inheritance and would make things much less comprehensible (or even - impossible to implement).

[^8]: When the presentation type doesn't exist it returns the object's class name (and if nil, the class itself). When it does, but the presentation type has required parameters, `standard-object` is returned because it is not possible to decide whether the object is a member of the presentation type.

[^9]: The function is implemented as a generic function and to prevent such problems that implementation should be changed to a non-generic function as specified. Alternatively we could allow extending this function, but assert `(presentation-typep object (presentation-type-of object))`, and specify that this condition must be met, otherwise the consequences are undefined.

[^10]: If they had the same name however, `:inherit-from` argument wouldn't match the class supertype and that should signal an error. McCLIM currently quietly accepts that.

[^11]: Currently this is done correctly in presentation translators and in the function `accept-using-read`. McCLIM should check that in all `accept` calls.

    This issue is orthogonal to checking whether the presentation object and type match, because we may call `(present *person-10-20* 'standard-object)` and it is rightfully a valid input for the input context `(person 10 20)`, while it is not valid for the input context `(person 8 15)`.

[^12]: CLIM-TOS allows inheriting with `and` only from unparametrized classes. McCLIM allows inheriting also from presentation types and classes with and without parameters. It is very cleverly done. Currently such presentation types are not very useful because of other (than inheritance) problems, which full scope of necessary changes and regression tests is yet to be determined.


# Regions


# Introduction

"Technically correct to the real world is what mathematically equal is to the floating-point arithmetic." – me

Prerequisite reading (minimum):

-
-

Glossary:

simple region
a region instance that is not a region set

composable regions
simple regions which composition yields a simple region

CLIM specification defines numerous regions that are later generalised as a subset of all possible designs. The programmer may construct general regions like points, paths and areas of specified types. Regions may be combined as unions, intersections and differences, moreover and they may be transformed with affine transformations.

CLIM doesn't explicitly specify the complement operation, however it may be constructed using existing operators. `+nowhere+` and `+everywhere+` are constants representing the empty set and the universe. The region complement could be constructed as `(region-difference +everywhere+ region)`.

Regions may be queried about certain properties with the following functions:

pointp, pathp, areap
predicates for dimensionality

bounding-rectangle\*
min-x, min-y, max-x, max-y

region-contains-position-p
P ∈ REGION

region-equal
A = B

region-contains-region-p
A ⊆ B

region-intersects-region-p
A ⋂ B ≠ ∅

Composition:

region-union
A ⋃ B

region-intersection
A ⋂ B

region-difference
A \\ B

CLIM imposes a "dimensionality rule" for set operations - composing two regions should always return a region of a single dimensionality. For example (region-union \ \) should return only the rectangle. This contradicts the design protocol specification that says that union operations is the same as the operation `compose-over`.

Transformation (there are more operations not strictly relevant to the region protocol, like `transform-position`):

transform-region
⋃(∀P ∈ REGION : T(P))

issue
McCLIM implements `transform-region` for elliptical things by transform only the center and diameters - this yields invalid result for shearing transformation. Either signal an error or convert the ellipse to some other object that is mathematically accurate (or at least visually accurate - i.e a bezigon).

The specification permits for CLIM implementations to implement only a subset of full region composition, however the union of rectangular regions must be fully implemented. The implementation should error on unsupported case (details are left to the implementation).

issue
McCLIM doesn't implement most operations for bezigons and polybeziers. The literature is out there (!). So bezier things are mostly useful for rendering purposes.

# Region types

Basic regions (i.e not results of composition nor transformation) that may be instationed:

points
standard-point

paths
standard-line, standard-polyline, standard-elliptical-arc; McCLIM extension: standard-polybezier

areas
standard-rectangle, standard-polygon, standard-ellipse; McCLIM extension: standard-bezigon

These standard regions are subclasses of many protocol classes. For example `standard-line` implements the polyline and the polybezier protocols.

Sometimes it is not possible to represent composed regions as a simple contiguous region. In order to support these cases classes are specified to represent such compositions:

- standard-region-union
- standard-region-intersection
- standard-region-difference
- McCLIM extension: standard-rectangle-set

Along with a protocol:

- region-set-p
- region-set-regions
- map-over-region-set-regions

# Simple region composition - canonical form

Two regions may be composable, then the result is another simple region, or they can't be composed, then the result is a region set.

Points are not composable when:

- they are not equal

Paths are not composable when (or):

- their start and end point doesn't meet and they don't coincide
- they have incompatible representation (i.e a line and a curve)

Areas can't be composed when (or):

- they are disjoint
- they have incompatible representation (i.e a polygon and an ellipse)

The case of paths requires additional explanation. Paths have a start and end point and the order does matter. Otherwise we wouldn't be able to provide a canonical form for path composition of polylines.

case 1
(region-union \#\ \#\) ;-\> \#\

case 2
(region-union \#\ \#\)

- incorrect (connect starts of both paths) ;-\> \#\ ; wrong
- correct (ensure idempotent result) ;-\> \#\

case 3
(region-union \#\ \#\) ;-\> \#\

case 4
(region-union \#\ \#\) ;-\> \#\ alternatively (also correct) ;-\> \#\

# Canonical form of the region composition

As noted earlier, sometimes it is not possible to represent a region composition as a simple region. Sometimes a composition has numerous valid set representations - for example `(A ⋃ B) ⋂ C` may be represented as:

- \#\ C\>
- \#\ \#\\>

Both are mathematically valid however not having a canonical representation may lead to two problems:

- region-equal is more often wrong than it could be
- ad-hoc simplification rules may lead to the infinite recursion

To that end McCLIM imposes the following rule:

> Each region composition is represented as either a simple region, an intersection, or an union of simple regions and intersections.

It is easy to notice that the region difference is not accounted for in this definition. This is because the region difference doesn't satisfy many identies like a distributive property and composing them with other sets gets tricky really fast.

When the result of `(region-difference a b)` can't be represented as a simple region, then we represent it as `#`.

The class `standard-region-complement` is used to represent region complements. The method `bounding-rectangle*` signals an error because the region is not bound.

# Unbound region algebra

McCLIM didn't implement the unbounded region arithmetic beyond basic cases like `(region-intersection r +nowhere+) -> +nowhere+`. Thanks to the fact that we canonicalize region sets now, and that we may represent the region complement, it is possible to set some rules that will make McCLIM region algebra closed under defined set operations.

Utilities:

region-complement
for a bounded region it returns an unbounded region and vice versa

To make the algebra work for "unbound" regions we need to specify an additional canonicalization rules. The gist of these is that all unbound regions must represented as the region complement of a bound region. Below regions that are unbound have an asterix after their name (i.e `B*`).

For unions and intersections of two region complements we'll use De Morgan's laws:

- (region-union A\* B\*) ; -\> \#\\>
- (region-intersection A\* B\*) ; -\> \#\\>

Combining bound and unbound regions have different results depending on the operation. For the union the result is unbound and for the intersection the result is bound:

- (region-union A B\*) ; -\> \#\\>
- (region-intersection A B\*); -\> \#\

Region differences are delegated to the region intersection (like before):

- (region-difference A B) ; -\> (region-intersection A B\*) ; \#\

- (region-difference A\* B\*) ; -\> (region-intersection A\* B) ; \#\

- (region-difference A\* B) ; -\> (region-intersection A\* B\*) ; \#\\>

- (region-difference A B\*) ; -\> (region-intersection A B) ; \#\\>

Given the above we may with certainity signal an error from the function `bounding-rectangle*` when the region is a `standard-region-difference`. Unbounding rectangle may be used to further narrow the bounding rectangle of the region intersection.


# Sheet Geometry


# Sheet geometry for sheets

## Coordinate systems

We distinguish five types of coordinate systems in relation to a sheet:

local
coordinates as passed to drawing functions

sheet
coordinates are relative to the sheet's region[^1]

parent
coordinates are relative to the parent's region

native
coordinates are relative to the mirror's region

screen
coordinates are relative to the graft's region

## Transformations

``` commonlisp
(medium-transformation       sheet) ; (local -> sheet)
(sheet-transformation        sheet) ; (sheet -> parent)
(sheet-native-transformation sheet) ; (sheet -> mirror)
(sheet-device-transformation sheet) ; (local -> mirror)
```

Sheets are arranged in a tree hierarchy. To acquire a transformation between two sheets coordinate systems we use a function `sheet-delta-transformation`, where the second argument must be an ancestor (or nil) of the first sheet.

``` commonlisp
;; Parent transformation (sheet -> parent)
(sheet-delta-transformation sheet (sheet-parent sheet))
;; Native transformation (sheet -> mirrored-ancestor -> mirror)
(let ((mirrored-ancestor (sheet-mirrored-ancestor sheet)))
  (compose-transformations
   (sheet-native-transformation mirrored-ancestor)
   (sheet-delta-transformation sheet mirrored-ancestor)))
;; Screen transformation (sheet -> graft)
(sheet-delta-transformation sheet nil)
```

Given the above, the following relation is always true:

``` commonlisp
(transformation-equal (sheet-device-transformation sheet)
                      (compose-transformations
                       (sheet-native-transformation sheet)
                       (medium-transformation sheet)))
```

Both `sheet-transformation` and `medium-transformation` are setf-able. Changing the former invalidates the cached `sheet-native-transformation`. Moreover `move-sheet` may change the `sheet-transformation`.

## Regions

Every sheet has a region which is an area (for example an intersection between two ellipses[^2]). It is accessed with a function `sheet-region`.

The operators `sheet-native-region` and `sheet-device-region`[^3] work in a similar way to the transformation operators with one important difference: the region of the parent clips the region of the child. Each region is expressed in its coordinate system (i.e sheet-native-region is expressed in the native coordinate system).

``` commonlisp
(medium-clipping-region sheet) ; local clip
(sheet-region sheet)           ; sheet clip
(sheet-native-region sheet)    ; intersection of all sheet regions between the sheet and its mirrored ancestor
(sheet-device-region sheet)    ; intersection of the native region and a local clip
```

`sheet-region` is setf-able. Moreover `resize-sheet` may be called on the sheet to change the sheet's region[^4]. The function `move-and-resize-sheet` modifies both the transformation and the region.

## Sheets and mirrors

Each mirror also has a transformation and a region, however they are a subject to certain restrictions:

- a mirror transformation must always be a translation (or the identity)
- a mirror region must always be a rectangle starting at the point \[0, 0\]

Some backends may impose additional restrictions. For example the X11 protocol specifies that the window position is specified as two int16 coordinates and its size as two uint16 values.

When a mirrored sheet has a region that is not a rectangle, then the mirror region is a bounding-rectangle of that sheet.

## The sheet geometry modifiers

The transformation and the region of a sheet are changed with:

- (setf sheet-transformation)
- (setf sheet-region)

The sheet geometry is also modified with functions `resize-sheet`, `move-sheet` and `move-and-resize-sheet`. The last function is just a composition of the former two.

The CLIM specification proposes the following implementations:

``` commonlisp
(defmethod move-sheet ((sheet basic-sheet) x y)
  (let ((transform (sheet-transformation sheet)))
    (multiple-value-bind (old-x old-y)
        (transform-position transform 0 0)
      (setf (sheet-transformation sheet)
            (compose-translation-with-transformation
              transform (- x old-x) (- y old-y))))))

(defmethod resize-sheet ((sheet basic-sheet) width height)
  (setf (sheet-region sheet)
        (make-bounding-rectangle 0 0 width height)))

(defmethod move-and-resize-sheet ((sheet basic-sheet) x y width height)
  (move-sheet sheet x y)
  (resize-sheet sheet width height))
```

Proposed definitions of functions `move-sheet` and `resize-sheet` have a problem, because they assume that a sheet is a rectangle \[0 0 width height\] and that its transformation is a translation.

We could define these functions by operating on the bounding rectangle of the sheet region in the coordinate system of the parent:

``` commonlisp
(defmethod move-sheet ((sheet basic-sheet) x y)
  (let ((transf (sheet-transformation sheet))
        (region (sheet-region sheet)))
    (multiple-value-bind (old-x old-y)
        (bounding-rectangle-position (transform-region transf region))
      (unless (and (coordinate= old-x x)
                   (coordinate= old-y y))
        (let ((dx (- x old-x))
              (dy (- y old-y)))
          (setf (sheet-transformation sheet)
                (compose-transformation-with-translation transf dx dy)))))))

;;; RESIZE-SHEET dimensions WIDTH and HEIGHT are expressed in the device
;;; coordinates. When we resize the sheet its region is scaled without changing
;;; the transformation except for the following situations:
;;;
;;; - old-width=0 or old-height=0 we can't compute sx or sy
;;;
;;; - new-width=0 or new-height=0 we can't transform the region because it will
;;;   be canonicalized to +nowhere+ and the sheet position will be lost.
;;;
;;; In both cases we throw in the towel and replace the old region with a
;;; bounding rectangle (to preserve a position of the sheet). -- jd 2021-02-24
(defmethod resize-sheet ((sheet basic-sheet) width height)
  (let* ((region (sheet-region sheet))
         (transf (sheet-device-transformation sheet))
         (region* (transform-region transf region)))
    (with-bounding-rectangle* (x1 y1 x2 y2) region*
      (let ((new-width (max width 0))
            (new-height (max height 0))
            (old-width (- x2 x1))
            (old-height (- y2 y1)))
        (setf (sheet-region sheet)
              (if (or (= old-width 0) (= old-height 0)
                      (= new-width 0) (= new-height 0))
                  (multiple-value-bind (x1 y1)
                      (bounding-rectangle-position region)
                    (make-bounding-rectangle
                     x1 y1 (+ x1 new-width) (+ y1 new-height)))
                  (let* ((sx (/ new-width old-width))
                         (sy (/ new-height old-height))
                         (transf* (make-scaling-transformation* sx sy x1 y1))
                         (resized-region* (transform-region transf* region*)))
                    (untransform-region transf resized-region*))))))))
```

Note, that `resize-sheet` does not affect the `sheet-transformation`.

- position `[x, y]` is expressed in the parent coordinate system
- dimensions `[width, height]` are expressed in device units[^5]

# Sheet geometry for panes

Panes are special sheet classes[^6]. Pane is specified to be a rectangular object and all CLIM-specified panes are indeed rectangular. Composite panes are

McCLIM does its best to handle non-rectangular panes by operating on their bounding rectangles during composition.

## The layout protocol

The layout protocol is specified for panes. Functions `compose-space` and `allocate-space` are called with arguments `width` and `height`.

The function `compose-space` returns an instance of the class `space-requirement`. This instance also encapsulates width and height components (minimum, maximum and suggested values for each dimension).

All distances are specified in device units, hence are uniform under the same graft. Each sheet must do necessary computations at its own accord to account for its transformation (with `sheet-device-transformation`).

McCLIM defines to important mixins helping to implement this protocol:

layout-protocol-mixin
caches the space requirements and resizes panes

``` commonlisp
(defmethod allocate-space :around ((pane layout-protocol-mixin) width height)
  (unless (top-level-sheet-pane-p pane)
    (resize-sheet pane width height))
  (call-next-method))

(defmethod compose-space :around ((pane layout-protocol-mixin) &key width height)
  (declare (ignore width height))
  (or (pane-space-requirement pane)
      (setf (pane-space-requirement pane)
            (call-next-method))))
```

space-requirement-options-mixin
implements 29.3.1 (layout pane options) by adding initargs mentioned in "29.3.1 Layout Pane Options":

- `:width :min-width :max-width`
- `:height :min-height :max-height`
- `:align-x :align-y`
- `:spacing :x-spacing :y-spacing`

`:contents` initarg is handled by individual initialize-instance methods. The alignment[^7] and the spacing values are relating to arrangement of the pane contents within its region (when applicable).

`compose-space` `:around` method is defined to merge options specified by the user and pane's own space requirements:

``` commonlisp
(defmethod compose-space :around ((pane space-requirement-options-mixin)
                                  &key width height)
  (let ((sr (call-next-method)))
    (unless sr
      (warn "~S has no idea about its space-requirements." pane)
      (setf sr (make-space-requirement :width width :height height)))
    (merge-user-specified-options pane sr)))
```

## basic-pane

A class `basic-pane` is "the basic class on which all CLIM panes are built." It is not specified what are "CLIM panes"; McCLIM interpretes this that all generic panes (as opposed to the adaptive panes) must subclass the class `basic-pane` and that this class is a subclass of the class `basic-sheet`, `layout-protocol-mixin` and `space-requirement-options-mixin`.

## clim-stream-pane

The CLIM stream is a rectangular pane with the output history. Its size is determined by three factors:

- a preference expressed during the pane creation with initargs
- its output history bounding rectangle
- the point \[0,0\] is always part of the sheet region

## composite-pane

`allocate-space` method defined on a composite pane should first change the child transformation so its bounding rectangle is located at the appropriate position and then call `allocate-space` on the child.

``` commonlisp
(defmethod allocate-space ((pane dummy-composite-pane) width height)
  (resize-sheet pane width height)
  (let ((child (sheet-child pane))
        (tansf (sheet-device-transformation pane)))
    (move-sheet child 0 0)
    (allocate-space child width height)))
```

The key takeaway points from this section are:

- the layout protocol measurements are specified in device units
- allocate-space callee is responsible for changing its own region
- allocate-space caller is responsible for changing the sheet transformation

## scroller-pane

The viewport pane is a composition pane with one child. It provides a "hole" through which we may see part of the child. The scrolling is performed by modifying the scrollee `sheet-transformation` - this operation does not change its local coordinate system.

The scrolled sheet may have non-rectangular region extending below the point (0, 0) and a transformation that is not a translation. Scrolling modifies the translation so the bounding rectangle of the scrolled sheet in the viewport coordiantes is *not constant*. To make scrolling possible:

- scroll minimum value is always 0
- scroll maximum value is always the size (either the width or height) of the bounding rectangle of the scrollee in the viewport coordinate system[^8]

When the scroll bar is at the initial position then the position of the bounding rectangle in the viewport coordinate system of the scrollee is located at the viewport coordinate 0.

# Footnotes

[^1]: The sheet region is also known as a "drawing plane"

[^2]: Don't do that though.

[^3]: Technically speaking the mirrored ancestor sheet region should be clipped by the mirror region, however we stipulate that the mirror is big enough to contain whole mirrored sheet region, thus the following is true:

    ``` commonlisp
    (let ((mirror (sheet-direct-mirror msheet))
          (region (transform-region (sheet-native-transformation msheet)
                                    (sheet-region msheet))))
      (region-equal region
                    (region-intersection region (mirror-region mirror))))
    ```

[^4]: It is not clear what shoudl happen when the current region is not a rectangle - replace it with a rectangle or maybe rather scale it so the bounding rectangle has a matching width and height?

[^5]: CLIM does not specify the coordinate system of dimensions. We use device units for easier interop with the layout protocol (defined for panes).

[^6]: It is not specified whether a basic-pane is a subclass of a basic-sheet or not - in McCLIM we assume that it is.

[^7]: Specification does a good job with confusing the implementer by hinting that the alignment values are used to specify the content alignment within the pane, yet at the same time that the alignment works similar to formatting-cell. The latter is specified to layout the cell within its column - not the cell content! After looking into CLIM UG and the source code of CLIM-TOS it seems that the specification of the macro `formatting-cell` is botched and the alignment applies to the pane's content (i.e the composite pane children), not to the pane's position within its parent.

[^8]: The bounding rectangle of the scrollee in the viewport coordinate system:

    ``` commonlisp
    (bounding-rectangle* (transform-region
                          (sheet-delta-transformation scrollee vewport)
                          (sheet-region scrollee))
    ```
