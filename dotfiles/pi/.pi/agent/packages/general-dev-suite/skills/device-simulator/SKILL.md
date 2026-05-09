---
name: device-simulator
description: Use when building custom network/device simulators for tests, demos, failure injection, state machines, or protocol behavior.
---
# Device Simulator

Design simulators around explicit state and protocols.

- Define the device model: identity, capabilities, state variables, timers, failure modes.
- Pick protocols to emulate (HTTP, TCP, UDP, SNMP, SSH, telnet, WebSocket, etc.).
- Keep fixture data deterministic and easy to reset.
- Add controls for state transitions and fault injection.
- Provide a README with startup commands, ports, sample requests, and teardown.
- Add integration tests for protocol behavior where practical.
