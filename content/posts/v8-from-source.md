---
title: "Building v8 From Source"
date: 2024-02-29T17:57:22+05:30
draft: false
toc: true 
images:
tags:
  - v8
  - programming
---

v8 is Chromium/Chrome's JavaScript engine. If you've read the [init post](https://debxrshi.github.io/posts/init) , you'd know that it's in my goals for this year to learn more about and exploit v8. For that, setting up an ideal test environment is crucial. This'll be a short post detailing the steps required to build v8 from source. I have also createad a script to automate the same. Consider checking that out as well.
## Step 1: Pulling the v8 Source Code
Pull the v8 source code using the depot_tools utilities. You probably don't have them installed, so here's the command to install them:
```bash
git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git
echo 'export PATH=/path/to/depot_tools:$PATH' >> ~/.bashrc
source ~/.bashrc
```
After downloading the tools run gclient and fetch to get the v8 source:

```bash
fetch v8
cd v8/
gclient sync
```
## Step 2: Preparing Build Environment
With source code ready, it's time to install the dependencies required to build v8. Run the **install-build-deps.sh** script and additionally pull in lastest changes.
```bash
./build/install-build-deps.sh
git pull && gclient sync
```
## Step 3: Building v8
Now that the build environment is set up, you can start compiling v8 with the **gm.py** helper script.
```bash
tools/dev/gm.py x64.release #change release to debug if you want the debug build instead
```
This will take quite a while depending on the cores of your VM so grab something to eat and chill out.
> Make sure you have python3.7 or above installed otherwise you might run into build errors. Install a newer version or select a pre-installed one with update-alternatives
## Step 4: d8 goes drrrr
After the compilation is over you can find all the built binaries in the out folder. Try exectuing d8, v8's dev shell:
```bash
./out/d8
```
That's all. Now you can play around with v8, fuzz it, hack it, whatever you want! If you don't want to manually go through all these steps you can rely on this handy script I wrote to automate installtion of v8 and switching builds.


