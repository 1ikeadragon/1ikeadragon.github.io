---
title: "Setting Up Lumen on Ida Pro 9"
date: 2024-09-19T10:06:36+05:30
draft: false
author: 1ikeadragon
toc: true
images:
tags:
  - reverse engineering
  - idapro
---
![screenshot of lumina working on IDA PRO 9 Linux](image.png)
Straight to the point private Lumen server setup guide tested on Linux, IDA PRO 9 BETA;

## Install OpenLumina Plugin

1. Go to [OpenLumina repo](https://github.com/tomrus88/OpenLumina) and clone it.
1. Build the plugin or download it from releases page of the repo and install it in IDA PRO.
1. Go to `lumina_ca` directory and run `./commands.sh`. This will generate the certificates in `out` directory.
1. Copy `hexrays.crt` from `out` directory into your IDA PRO 9 installation directory.

## Set Up Lumen Server

1. Go to [lumen repo](https://github.com/naim94a/lumen) and clone it.
1. Run `docker-compose up`. You might need to enable `build-kit` for docker-compose. Also, you might need to edit the `docker-compose.yml` file and omit `name:` param.
1. The lumen server should start.

## Connecting to Lumen from IDA PRO

1. Open IDA PRO 9.
1. Go to Options > General > Lumina 
1. Use `127.0.0.1` as server and `1234` as port with credentials `guest:guest`.

Enjoy.