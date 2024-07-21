---
title: "Setting up Ghidra on Linux"
date: 2023-12-15T14:16:56+05:30

draft: false
toc: true 
images:
tags:
  - reverse engineering
  - ghidra 
  - linux
---


The recent release of Ghidra 11.0 caught my eye and I wanted to give it a spin again after a distasteful first experience of using it in 2020.I am sharing these installtion notes to help those who find Ghidra's no-installer no-shortcut approach rather tedious.
## Installing Ghidra
Nothing much in this section, the docs cover it well. You need jdk 17 to run Ghidra. Simple command gets the job done:
```bash
apt install -y openjdk-17-jdk
```
## Setting up App Shortcut
As you must know by now, to run Ghidra you'll have to manually execute the script inside the folder. That's quite tedious and unintuitive. Here's a workaround to add a desktop shortcut + add Ghidra to the app drawer  (the thing that pops up on pressing Super key) and pin it to dock.

1. Open a terminal.
1. Move the Ghidra installation folder wherever you wish. I moved it to **/opt/**.
1. cd into Desktop directory and create a new Desktop entry file:
    ```bash
    cd Desktop
    touch Ghidra.desktop
    ```
1. Download this file with `wget https://github.com/NationalSecurityAgency/ghidra/files/3853902/ghidra_ico.zip ` and place it inside the **<ghidra_dir>/support/**.
1. Add these lines inside the Ghidra.desktop file:
    ```bash
    [Desktop Entry]
    Categories=Application;Development;
    Comment=Ghidra Software Reverse Engineering Suite
    Exec=/opt/ghidra/ghidraRun
    GenericName=Ghidra Software Reverse Engineering Suite
    Icon=/opt/ghidra/support/ghidra.ico
    MimeType=
    Name=Ghidra
    Path=/opt/ghidra
    StartupNotify=false
    Terminal=false
    TerminalOptions=
    Type=Application
    Version=11.0
    ```
1. Move the file into **/usr/share/ubuntu/applications/**
1. Logout
1. ???
1. Success

That's all for this short blog. I'll post more in future with tips and other notes on using Ghidra as my primary SRE framework.
