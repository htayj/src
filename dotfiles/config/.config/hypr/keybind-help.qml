pragma ComponentBehavior: Bound

import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

ShellRoot {
    id: root

    property var help: null
    property var scheme: ({})
    property bool dismissing: false
    property bool quitRequested: false
    property int dismissKey: 0
    property int dismissButton: 0
    readonly property string home: Quickshell.env("HOME")
    readonly property string stateHome: Quickshell.env("XDG_STATE_HOME") || home + "/.local/state"
    readonly property var sections: help ? help.sections : []
    // Resolve to exactly one screen, including a monitor disappearing during startup.
    readonly property string targetScreen: {
        const screens = Quickshell.screens;
        for (let i = 0; i < screens.length; ++i)
            if (help && screens[i].name === help.screen)
                return screens[i].name;
        return screens.length ? screens[0].name : "";
    }
    readonly property color surface: colour("surfaceContainer", "1a1a1a")
    readonly property color foreground: colour("onSurface", "e5e5e5")
    readonly property color muted: colour("onSurfaceVariant", "ababab")
    readonly property color outline: colour("outlineVariant", "484848")
    readonly property color accent: colour("primary", "c6c6c6")
    readonly property color keyBackground: colour("secondaryContainer", "3b3b3b")
    readonly property color keyForeground: colour("onSecondaryContainer", "bfbfbf")
    readonly property color scrim: colour("scrim", "000000")

    function colour(name, fallback) {
        // Caelestia's scheme stores unprefixed M3 names and bare RRGGBB values.
        const value = scheme.colours && scheme.colours[name];
        return "#" + (value || fallback);
    }

    function loadScheme(text) {
        try {
            root.scheme = JSON.parse(text);
        } catch (error) {
            console.warn("Keybind help: could not read Caelestia scheme:", error);
        }
    }
    function finish() {
        if (root.quitRequested)
            return;
        root.quitRequested = true;
        releaseTimeout.stop();
        // Qt.quit tears down the surfaces but hangs in this Guix Qt runtime.
        // The launcher verifies this exact PID/config before signalling it.
        Quickshell.execDetached(["python3", root.home + "/.config/hypr/keybind-help.py", "--dismiss", String(Quickshell.processId)]);
    }


    function loadHelp(text) {
        try {
            root.help = JSON.parse(text);
        } catch (error) {
            console.error("Keybind help: invalid binding data:", error);
            root.finish();
        }
    }

    function columns(count) {
        const result = [];
        const sizes = [];
        for (let i = 0; i < count; ++i) {
            result.push([]);
            sizes.push(0);
        }
        // Keep each category together while balancing the readable columns.
        for (const section of root.sections) {
            let column = 0;
            for (let i = 1; i < count; ++i)
                if (sizes[i] < sizes[column])
                    column = i;
            result[column].push(section);
            sizes[column] += section.rows.length + 2;
        }
        return result;
    }

    function beginKey(event) {
        event.accepted = true;
        // Releases from RAlt+? and repeats of its held key are not new presses.
        if (event.isAutoRepeat || root.dismissing)
            return;
        root.dismissKey = event.key;
        root.dismissing = true;
        releaseTimeout.start();
    }

    function endKey(event) {
        event.accepted = true;
        if (!event.isAutoRepeat && root.dismissing && root.dismissKey === event.key)
            root.finish();
    }

    function beginMouse(button) {
        if (root.dismissing)
            return;
        root.dismissButton = button;
        root.dismissing = true;
        releaseTimeout.start();
    }

    function endMouse(button) {
        if (root.dismissing && root.dismissButton === button)
            root.finish();
    }

    // Retain the transparent input surfaces until the dismissal release is consumed.
    // A lost release must not leave an invisible exclusive grab indefinitely.
    Timer {
        id: releaseTimeout
        interval: 2000
        onTriggered: root.finish()
    }

    Component.onCompleted: Quickshell.watchFiles = false

    FileView {
        path: root.stateHome + "/caelestia/scheme.json"
        watchChanges: true
        onFileChanged: reload()
        onLoaded: root.loadScheme(text())
    }

    Process {
        command: ["python3", root.home + "/.config/hypr/keybind-help.py", "--data"]
        running: true
        stdout: StdioCollector {
            onStreamFinished: root.loadHelp(text)
        }
        stderr: StdioCollector {
            onStreamFinished: if (text.trim()) console.warn("Keybind help:", text.trim())
        }
        onExited: (exitCode, exitStatus) => {
            if (exitCode !== 0) {
                console.error("Keybind help: data command exited with", exitCode);
                root.finish();
            }
        }
    }

    Variants {
        model: Quickshell.screens

        PanelWindow {
            id: overlay
            required property var modelData
            readonly property bool primary: modelData.name === root.targetScreen
            readonly property bool inputOwner: modelData.name === (Hyprland.focusedMonitor ? Hyprland.focusedMonitor.name : root.targetScreen)

            screen: modelData
            visible: root.help !== null
            color: "transparent"
            exclusionMode: ExclusionMode.Ignore
            anchors {
                top: true
                bottom: true
                left: true
                right: true
            }
            WlrLayershell.namespace: "hypr-keybind-help"
            WlrLayershell.layer: WlrLayer.Overlay
            // Hyprland routes pointer input only to its currently focused exclusive layer.
            // Transfer the single keyboard grab with monitor focus; never create competing grabs.
            WlrLayershell.keyboardFocus: inputOwner ? WlrKeyboardFocus.Exclusive : WlrKeyboardFocus.None

            ShortcutInhibitor {
                window: overlay
                enabled: overlay.inputOwner
                onCancelled: console.warn("Keybind help: compositor cancelled shortcut inhibition")
            }

            Item {
                anchors.fill: parent
                focus: overlay.inputOwner
                Keys.onPressed: event => root.beginKey(event)
                Keys.onReleased: event => root.endKey(event)

                Rectangle {
                    anchors.fill: parent
                    color: Qt.alpha(root.scrim, 0.48)
                    visible: !root.dismissing
                }

                Loader {
                    id: cardLoader
                    anchors.centerIn: parent
                    width: Math.max(1, Math.min(2100, parent.width - 48))
                    height: Math.max(1, parent.height - 48)
                    active: overlay.primary
                    visible: !root.dismissing

                    sourceComponent: Rectangle {
                        id: card
                        readonly property int padding: width < 900 ? 20 : 28
                        readonly property int columnGap: 24
                        readonly property int columnCount: Math.max(1, Math.min(4, Math.floor((width - padding * 2 + columnGap) / (460 + columnGap))))
                        readonly property real columnWidth: (width - padding * 2 - columnGap * (columnCount - 1)) / columnCount
                        readonly property int bodySize: width < 900 ? 14 : 16
                        readonly property real maximumBodyHeight: Math.max(1, cardLoader.height - header.height - footer.height - padding * 2 - 28)

                        width: cardLoader.width
                        height: Math.min(cardLoader.height, header.height + Math.min(categories.height, maximumBodyHeight) + footer.height + padding * 2 + 28)
                        anchors.centerIn: parent
                        radius: width < 900 ? 24 : 32
                        color: root.surface
                        border.color: root.outline
                        border.width: 1

                        function scrollBy(delta) {
                            list.contentY = Math.max(0, Math.min(Math.max(0, list.contentHeight - list.height), list.contentY + delta));
                        }

                        Column {
                            id: header
                            x: card.padding
                            y: card.padding
                            width: parent.width - card.padding * 2
                            spacing: 6

                            Text {
                                width: parent.width
                                text: "Keyboard shortcuts"
                                color: root.foreground
                                font.family: "Rubik"
                                font.pixelSize: card.width < 900 ? 26 : 34
                                font.weight: Font.DemiBold
                                textFormat: Text.PlainText
                                wrapMode: Text.WordWrap
                            }
                            Text {
                                width: parent.width
                                text: "Live Hyprland bindings · Right Alt is your main modifier"
                                color: root.muted
                                font.family: "Rubik"
                                font.pixelSize: card.bodySize
                                textFormat: Text.PlainText
                                wrapMode: Text.WordWrap
                            }
                        }

                        Flickable {
                            id: list
                            x: card.padding
                            y: header.y + header.height + 18
                            width: parent.width - card.padding * 2
                            height: Math.min(categories.height, card.maximumBodyHeight)
                            contentWidth: width
                            contentHeight: categories.height
                            clip: true
                            interactive: false

                            Row {
                                id: categories
                                width: list.width
                                spacing: card.columnGap

                                Repeater {
                                    model: root.columns(card.columnCount)

                                    Column {
                                        id: categoryColumn
                                        required property var modelData
                                        width: card.columnWidth
                                        spacing: 20

                                        Repeater {
                                            model: categoryColumn.modelData

                                            Column {
                                                id: category
                                                required property var modelData
                                                width: categoryColumn.width
                                                spacing: 8

                                                Text {
                                                    width: parent.width
                                                    text: category.modelData.title
                                                    color: root.accent
                                                    font.family: "Rubik"
                                                    font.pixelSize: card.bodySize + 3
                                                    font.weight: Font.DemiBold
                                                    textFormat: Text.PlainText
                                                    wrapMode: Text.WordWrap
                                                }

                                                Repeater {
                                                    model: category.modelData.rows

                                                    Item {
                                                        id: bindingRow
                                                        required property var modelData
                                                        width: category.width
                                                        height: Math.max(keycap.height, description.implicitHeight) + 6

                                                        Rectangle {
                                                            id: keycap
                                                            width: Math.min(bindingRow.width * 0.44, Math.max(62, keyLabel.implicitWidth + 20))
                                                            height: keyLabel.implicitHeight + 12
                                                            radius: 8
                                                            color: root.keyBackground

                                                            Text {
                                                                id: keyLabel
                                                                x: 10
                                                                y: 6
                                                                width: parent.width - 20
                                                                text: bindingRow.modelData.keys
                                                                color: root.keyForeground
                                                                font.family: "Rubik"
                                                                font.pixelSize: card.bodySize - 1
                                                                font.weight: Font.Medium
                                                                textFormat: Text.PlainText
                                                                wrapMode: Text.Wrap
                                                            }
                                                        }

                                                        Text {
                                                            id: description
                                                            x: keycap.width + 12
                                                            y: Math.max(0, (keycap.height - implicitHeight) / 2)
                                                            width: bindingRow.width - x
                                                            text: bindingRow.modelData.description
                                                            color: root.foreground
                                                            font.family: "Rubik"
                                                            font.pixelSize: card.bodySize
                                                            textFormat: Text.PlainText
                                                            wrapMode: Text.Wrap
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        Rectangle {
                            x: card.width - card.padding + 6
                            y: list.y + (list.contentHeight > list.height ? list.contentY / list.contentHeight * list.height : 0)
                            width: 3
                            height: Math.max(18, list.height * list.height / Math.max(list.height, list.contentHeight))
                            radius: 2
                            color: root.accent
                            visible: list.contentHeight > list.height
                        }

                        Text {
                            id: footer
                            x: card.padding
                            y: list.y + list.height + 10
                            width: parent.width - card.padding * 2
                            text: list.contentHeight > list.height ? "Scroll to see all shortcuts · Any key or mouse button closes" : "Any key or mouse button closes"
                            color: root.muted
                            font.family: "Rubik"
                            font.pixelSize: card.bodySize - 1
                            textFormat: Text.PlainText
                            wrapMode: Text.WordWrap
                        }
                    }
                }

                // Above the card as well as the dim area; dismissal never clicks through.
                MouseArea {
                    anchors.fill: parent
                    z: 1
                    acceptedButtons: Qt.AllButtons
                    preventStealing: true
                    onPressed: mouse => {
                        mouse.accepted = true;
                        root.beginMouse(mouse.button);
                    }
                    onReleased: mouse => {
                        mouse.accepted = true;
                        root.endMouse(mouse.button);
                    }
                    onWheel: wheel => {
                        wheel.accepted = true;
                        if (cardLoader.item && !root.dismissing) {
                            const delta = wheel.pixelDelta.y || wheel.angleDelta.y / 120 * 72;
                            cardLoader.item.scrollBy(-delta);
                        }
                    }
                }
            }
        }
    }
}
