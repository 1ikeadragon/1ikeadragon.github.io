---
title: "Decompilation for Game Preservation"
date: 2024-09-17T19:53:53+05:30
draft: true
toc: true
images:
tags:
  - reverse engineering
---

I have looked through amazing projects like xyz and always wondered how they breath life into an old game. How much work it takes. The passion that's required. Frankly, I always got a bit overwhelmed at the complexity as I've only ever done reversing to find unintended functionality and not reproduce source from a binary. 

One fine day I was browsing through reddit and came across a post titled "Decompiling Hitman Code Name 47". Immediately I clicked and found their discord which eventually led to this blog post. Here, I have documented my learnings from decompiling a binary to it's compilable(almost) source without any previous experience. It was a great challenge thhat I enjoyed, and I hope you enjoy this writeup too :)

## Stage 1: Setting Up the Stage for Team Decompilation with IDA PRO
