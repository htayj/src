# Presentation-Based Interfaces Source Index

Use this first to route questions without loading the full source conversions.

## Primary References
- `presentation-interface-model.md`: synthesized model and design checklist. Read this first for conceptual or design questions.
- `presentation-based-user-interfaces.md`: Ciccarelli 1984 thesis, broad presentation-system architecture: application database, presentation database, presenter, presentation editor, recognizer, PSBase, and style-independent interface construction.
- `application-semantics-presentation-manager.md`: McKay/York/McMahon 1989 paper, typed object presentations, presentation type lattice, typed output/input, input contexts, translators, commands, nested presentations, and comparison with widgets.

## Supplemental Reference
- `supplemental-presentation-types-note.md`: implementation-oriented terminology around presentation type categories and presentation methods. Use cautiously; it is supplementary and McCLIM-specific in origin.

## External Copies
- `/home/tay/reference/external_docs/presentation-based-interfaces/source/presentation-user-interfaces.pdf`
- `/home/tay/reference/external_docs/presentation-based-interfaces/source/73660.73678.pdf`
- `/home/tay/reference/external_docs/presentation-based-interfaces/markdown/presentation-based-user-interfaces.md`
- `/home/tay/reference/external_docs/presentation-based-interfaces/markdown/application-semantics-presentation-manager.md`

## Generated Heading Index

### Synthesis
- L1: Presentation-Based Interface Model
- L5:   Core Idea
- L17:   Ciccarelli's Presentation System Model
- L33:   Dynamic Windows Typed Presentation Model
- L45:   Translators And Commands
- L51:   Nested And Compound Presentations
- L57:   Style Independence
- L70:   Design Checklist
- L85:   Common Pitfalls

### Ciccarelli
- L1: Presentation Based User Interfaces
- L152:   Acknowledgments
- L171:   Table of Contents
- L179:   Table of Figures
- L201:   Chapter One: Introduction and Overview
- L254:     1.1 The Primitive Presentation System Model
- L299:       Figure 1-1: A Rudimentary User Interface
- L337:       Figure 1-2: The Representation Shift Model
- L377:       Figure 1-3: Thc Primitive Presenitation Systcm (PPS) Model
- L386:     1.2 ('onstructing Larger lPresentation System Models
- L422:     1.3 Describing Presentation Systems
- L447:     1.4 PSBase: A Presentation System Base
- L459:       Figure 1-4 shows the overall structure of PSBase. The data base mechanisms provide
- L482:       Figure 1-4: Structure of PSBase
- L508:     1.5 Constructing User Interfaces
- L528:     1.6 Related Work
- L735:   Chapter Two: The Primitive Presentation System (PPS) Model
- L743:     2.1 PPSCalc
- L763:       Figure 2-1: Thei Primitike Prcscnmatiot System (PPS) Model
- L783:       Figure 2-2: PPSCalc -- Formula Display
- L793:       Figure 2-3: PlVSCalc -- Value Display
- L817:       Figure 2-4: PPSCalc -- After Editing
- L844:       Figure 2-6: PPSCalc -- New Formulas
- L855:       Figure 2-7: PPSCalc -- Values of New Formulas
- L866:     2.2 The Application Data Base
- L911:       Figure 2-8: World Model
- L942:     2.3 'tePresentation Data Base
- L1056:     2.4 [he Presentation Editor
- L1079:     2.5 The Presenter
- L1091:       Figure 29: Prescnter Paris 0
- L1171:     2.6 The Recognizer
- L1200:       Figure 2-10: Recogn izer Parts
- L1229:       Figure 2-I I: PPSCalc -- Value Moved
- L1254:       Figure 2-12: PPSCalc -- Formula Moved
- L1269:       Figure 2-13: PPSCalc -- Preparing to Copy Formula
- L1322:     2.7 The Representation Shift Model and Direct Manipulation
- L1350:       Figure 2-14: Representation Shift Model
- L1424:       Figure 2-15: Functional Mapping in the PPS Model
- L1459:   Chapter Three: Constructing Larger Presentation System Models
- L1479:     3.1 Adding a Planned Data Base
- L1516:       Figure 3-1: Planned Dala Base Extension
- L1524:       Figure 3-2: FExtension with Both PlIanning and Immediatc Changes
- L1532:     3.2 Adding a Data Base of ('onmmands
- L1549:       Figure 3-3 shows an extended presentation system in which the user can interact with the
- L1564:       Figure 3-3: Comm~and Data Base Extension
- L1581:     3.3 Adding Interfaces to PPS Components
- L1602:       Figure 3-4 shows one such interface, providing a representation shift interface to the
- L1606:       Figure 3-4: Presentler Intcrface [xtension
- L1628:       Figure 3-5 shows an alternative extension for controlling the presenter. Here. instead of
- L1640:     3.4 Sh:ired Screen Space g(nd Iresentaion Structure
- L1649:       Figure 3-5: Presenter Commands Extension
- L1727:     3.5 Concluding Remarks
- L1736:   Chapter Four: Describing Presentation Systems
- L1769:     4.1 Emacs Dired
- L1967:     4.2 Zmacs
- L1987:       Figure 4-2: Zrnacs Model
- L2145:     4.3 Xerox Star
- L2155:       Figure 4-3: Zmacs Scroll Bar
- L2202:       Figure 4-4: Xerox Star -- Desktop Display
- L2222:       Figure 4-5: Xerox Star Opened Folder
- L2265:       Figure 4-6: Xerox Star -. Property Sheet
- L2277:       Figure 4-7: Xerox Sur -- Deltc Conifirmation
- L2281:       Figure 4-8: Xerox Star Model
- L2328:     4.4 Steamer
- L2350:       Figure 4-9: Sample Steamer Schematic
- L2398:       Figure 410: Stc~trncr Menu Consoic
- L2456:       Figure 4-11I: Steamer Model
- L2466:       Figure 4-12: Sample of Steamecr Icons
- L2595:   Chapter Five: PSBase: A Presentation System Base
- L2630:       Figure 5-1: PSBIasc Support of'PPS Components
- L2635:       Figure 5-2: Structulre of PSBasc
- L2710:       Figure 5-3: AClass Description Network
- L2731:       Figure 5-4 shows part of the presentation data base and its relation to the application data
- L2755:       Figure 5-4: Sample Presentation [)aLi Base Structure
- L2761:       Figure 5-5: Inter-Prescn Lation Relationships
- L2798:       Figure 5-6: Command Description SLIpport
- L2868:       Figure 5-7: Rerercnce Resoluion
- L2890:     5.2 Graphics Redisplay S
- L2912:     5.3 Presentation Editor Functions
- L2936:     5.4 Presenter Support
- L3158:       Figure 5-8: Result ofaPresentation Style
- L3205:     5.5 Recognizer Support
- L3292:     5.6 Basic Style Packages
- L3420:       Figure 5-9: Result of Phrasal Presenter
- L3446:       Figure 5-11 shows the result.
- L3461:       Figure 5-10: tBcrorc Cur c Rccognition
- L3478:       Figure 5-11: After Curve Recognition
- L3697:     4.1 illustrated such "plan presentations" in Emacs Dired.
- L3699:     5.7 Summary
- L3710:   Chapter Six: Constructing Presentation Systems
- L3722:     6.1 The User's View of the Three Interfaces
- L3768:       Figure 6-1: Icon-Style Interface
- L3775:       Figure 6-2: Icon-St) le Interface
- L3797:       Figure 6-3 also shows a change in the logged-in user display: the set of users has
- L3820:       Figure 6-3: Icon-Style Interrace
- L3830:       Figure 6-4: Icon-Style Interface
- L3841:       Figure 6-5: Icon-Style Intcrface
- L3876:       Figure 6-7: Icon-Style Interfacc
- L3885:       Figure 6-8: Icon-Style Interface
- L3928:       Figure 6-9: Menu-Style Interface
- L3941:       Figure 6-10: Menu-Style Interface
- L3985:       Figure 6-l1: Menu-Style Interface
- L4007:       Figure 6-12: Menu-Style Interface
- L4028:       Figure 6-13: Mcnu-Style Interface
- L4046:       Figure 6-14: Menu-Style Interface
- L4086:       Figure 6-15: Mlenu-Style Interface
- L4131:       Figure 6-16: Annotation-Style Interface
- L4136:     2.83 2.94_;6 ub~
- L4159:       Figure 6-17: Annotation -Style Interface
- L4195:     6.2 Common Inplementation Details
- L4218:       Figure 6-18: Annotation-Style Interface
- L4296:       Figure 6-19: Application IDaui Base Management
- L4345:     6.3 Icon-Style Interface llnplelneitation
- L4550:     6.4 Menu-Style Interface Implene 'Aion
- L4650:     6.5 Annotation-Style Interface Implementation
- L4709:     6.6 Other Style Possibilities
- L4748:     6.7 Summary
- L4827:   Chapter Seven: Areas for Further Research
- L4845:     7.1 PSihise ~imiilttionis
- L4911:     1.0 ~

### Dynamic Windows
- L1: A Presentation Manager Based on Application Semantics
- L7:   Abstract
- L22:   Introduction
- L67:   Motivation and Design
- L112:       Figure 1. The relationship between an application object
- L119:     Semantic Types for Application Objects
- L180:     Output of Typed Objects
- L227:       Figure 2. The presentation produced by some application
- L258:     Specification of Typed Objects as Input
- L322:     Nested Presentations and Contexts
- L361:     Gestures: Using the Mouse to Select Input
- L388:     Type Coercion
- L441:     Selection of Translators
- L502:     Application Architecture
- L605:     Building an Application
- L626:     Design Details
- L633:     Further Specialization of Presentation Types
- L661:     Further Presentation Type Operations
- L694:     Application-Building Aids
- L711:     Experiences and Evaluation
- L713:     Implementation Details and Problems
- L783:     Observations
- L814:     Comparison with Conventional Toolkits
- L846:   Conclusions
- L894:   Acknowledgments
- L906:   References

### Supplement
- L1: Supplemental Presentation Types Note
- L7:   Introduction
- L34:   Presentation type categories
- L49:   Presentation methods
- L98:   Presentation type inheritance
- L167:   Correspondence between lisp objects and presentation types
- L328:   Examples
- L455:   Footnotes
