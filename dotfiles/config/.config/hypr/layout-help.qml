pragma ComponentBehavior: Bound

import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland

ShellRoot {
    id: root
    readonly property var help: JSON.parse(Quickshell.env("HYPR_LAYOUT_HELP"))
    property var scheme: ({})
    readonly property string home: Quickshell.env("HOME")
    readonly property string stateHome: Quickshell.env("XDG_STATE_HOME") || home + "/.local/state"
    readonly property string targetScreen: {
        const screens = Quickshell.screens;
        for (let i = 0; i < screens.length; ++i)
            if (screens[i].name === help.screen)
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

    function colour(name, fallback) {
        const value = scheme.colours && scheme.colours[name];
        return "#" + (value || fallback);
    }

    function loadScheme(text) {
        try {
            root.scheme = JSON.parse(text);
        } catch (error) {
            console.warn("Layout help: could not read Caelestia scheme:", error);
        }
    }

    Component.onCompleted: Quickshell.watchFiles = false

    FileView {
        path: root.stateHome + "/caelestia/scheme.json"
        watchChanges: true
        onFileChanged: reload()
        onLoaded: root.loadScheme(text())
    }

    Variants {
        model: Quickshell.screens

        PanelWindow {
            id: overlay
            required property var modelData
            screen: modelData
            visible: modelData.name === root.targetScreen
            color: "transparent"
            exclusionMode: ExclusionMode.Ignore
            anchors {
                top: true
                bottom: true
                left: true
                right: true
            }
            // The unique namespace is also the supervisor's compositor map receipt.
            WlrLayershell.namespace: Quickshell.env("HYPR_LAYOUT_NAMESPACE")
            WlrLayershell.layer: WlrLayer.Overlay
            WlrLayershell.keyboardFocus: WlrKeyboardFocus.None
            // No pointer or keyboard grab: Hyprland owns every selection and Escape.
            mask: Region {}

            Rectangle {
                id: card
                anchors.centerIn: parent
                width: Math.max(1, Math.min(760, parent.width - 48))
                height: body.height + 48
                radius: 24
                color: root.surface
                border.color: root.outline
                border.width: 1

                Column {
                    id: body
                    x: 24
                    y: 24
                    width: parent.width - 48
                    spacing: 14

                    Text {
                        width: parent.width
                        text: "Workspace layout"
                        color: root.foreground
                        font.family: "Rubik"
                        font.pixelSize: 28
                        font.weight: Font.DemiBold
                        textFormat: Text.PlainText
                    }

                    Text {
                        width: parent.width
                        text: "Release Right Alt, then choose · Focused workspace only"
                        color: root.muted
                        font.family: "Rubik"
                        font.pixelSize: 14
                        textFormat: Text.PlainText
                        wrapMode: Text.WordWrap
                    }

                    Grid {
                        id: rows
                        width: parent.width
                        columns: card.width < 620 ? 1 : 2
                        columnSpacing: 24
                        rowSpacing: 10

                        Repeater {
                            model: root.help.rows

                            Item {
                                id: bindingRow
                                required property var modelData
                                width: (rows.width - rows.columnSpacing * (rows.columns - 1)) / rows.columns
                                height: Math.max(keycap.height, description.implicitHeight)

                                Rectangle {
                                    id: keycap
                                    width: Math.max(46, keyLabel.implicitWidth + 20)
                                    height: keyLabel.implicitHeight + 12
                                    radius: 8
                                    color: root.keyBackground

                                    Text {
                                        id: keyLabel
                                        anchors.centerIn: parent
                                        text: bindingRow.modelData.keys
                                        color: root.keyForeground
                                        font.family: "Rubik"
                                        font.pixelSize: 14
                                        font.weight: Font.Medium
                                        textFormat: Text.PlainText
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
                                    font.pixelSize: 14
                                    textFormat: Text.PlainText
                                    wrapMode: Text.Wrap
                                }
                            }
                        }
                    }

                    Text {
                        width: parent.width
                        text: "hy3 group actions require hy3 · Escape cancels · Other keys keep this menu open"
                        color: root.muted
                        font.family: "Rubik"
                        font.pixelSize: 13
                        textFormat: Text.PlainText
                        wrapMode: Text.WordWrap
                    }
                }
            }
        }
    }
}
